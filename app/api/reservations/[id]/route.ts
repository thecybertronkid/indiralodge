import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { isRoomAvailable } from '@/lib/availability';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const reservationId = params.id;
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: {
        guest: {
          include: { documents: true },
        },
        roomType: true,
        assignedRoom: true,
        bookingSource: true,
        createdBy: { select: { fullName: true, email: true } },
        folios: {
          include: {
            transactions: {
              include: { postedBy: { select: { fullName: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        payments: {
          include: { receivedBy: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        stayHistories: {
          include: {
            previousRoom: { select: { roomNumber: true } },
            newRoom: { select: { roomNumber: true } },
            performedBy: { select: { fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // Fetch related audit trail items for chronological activity timeline
    const auditEvents = await db.auditLog.findMany({
      where: {
        entityId: reservationId,
      },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ reservation, auditEvents });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch reservation details' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const reservationId = params.id;
    const body = await req.json();
    const { action, assignedRoomId, cancelledReason, notes } = body;

    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: { assignedRoom: true },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // STRICT BILLING LOCK: If already billed, no modifications allowed
    if (reservation.isBilled) {
      return NextResponse.json(
        { error: 'This booking has already been billed. Reservation and billing records are locked and cannot be modified.' },
        { status: 400 }
      );
    }

    // Action: Update Guest Details Before Billing
    if (action === 'update_guest') {
      const { firstName, lastName, displayName, phone, email, company, gstin, address, city, state } = body;
      await db.guest.update({
        where: { id: reservation.guestId },
        data: {
          ...(firstName ? { firstName: firstName.trim() } : {}),
          ...(lastName ? { lastName: lastName.trim() } : {}),
          ...(displayName ? { displayName: displayName.trim() } : {}),
          ...(phone ? { phone: phone.trim() } : {}),
          ...(email ? { email: email.trim().toLowerCase() } : {}),
          ...(company !== undefined ? { company: company ? company.trim() : null } : {}),
          ...(gstin !== undefined ? { gstin: gstin ? gstin.trim().toUpperCase() : null } : {}),
          ...(address !== undefined ? { address: address ? address.trim() : null } : {}),
          ...(city !== undefined ? { city: city ? city.trim() : null } : {}),
          ...(state !== undefined ? { state: state ? state.trim() : null } : {}),
        },
      });

      return NextResponse.json({ success: true, message: 'Guest details updated successfully.' });
    }

    // Action: Update Booking Details Before Billing
    if (action === 'update_booking') {
      const { discountAmount, specialRequests, roomRate } = body;
      const prevRate = reservation.roomRate;
      let newRoomRate = roomRate !== undefined && roomRate !== '' ? parseFloat(String(roomRate)) : reservation.roomRate;
      if (isNaN(newRoomRate) || newRoomRate < 0) newRoomRate = 0;

      const discountVal = discountAmount !== undefined && discountAmount !== '' ? parseFloat(String(discountAmount)) : 0;
      
      if (discountVal > 0 && reservation.nights > 0) {
        const totalTariff = Math.max(0, (newRoomRate * reservation.nights) - discountVal);
        newRoomRate = Math.round((totalTariff / reservation.nights) * 100) / 100;
      }

      const totalRoomCharge = Math.round((newRoomRate * reservation.nights) * 100) / 100;

      // Find any folios attached to this reservation
      const folios = await db.folio.findMany({
        where: { reservationId },
        include: { transactions: true },
      });

      let calculatedTotal = totalRoomCharge;

      if (folios.length > 0) {
        for (const folio of folios) {
          // Find the ROOM_CHARGE transaction
          const roomChargeTx = folio.transactions.find((t) => t.category === 'ROOM_CHARGE');
          if (roomChargeTx) {
            await db.folioTransaction.update({
              where: { id: roomChargeTx.id },
              data: {
                unitPrice: newRoomRate,
                quantity: reservation.nights,
                amount: totalRoomCharge,
                description: `Room charge for ${reservation.nights} night(s) @ ₹${newRoomRate}/night`,
              },
            });
          }

          // Recalculate folio total charges from transactions
          const otherDebits = folio.transactions
            .filter((t) => t.id !== (roomChargeTx?.id || '') && t.type === 'DEBIT')
            .reduce((sum, t) => sum + t.amount, 0);

          const newTotalCharges = totalRoomCharge + otherDebits;
          const newBalance = Math.max(0, newTotalCharges - folio.totalPayments);

          await db.folio.update({
            where: { id: folio.id },
            data: {
              totalCharges: newTotalCharges,
              balanceAmount: newBalance,
            },
          });

          calculatedTotal = newTotalCharges;
        }
      }

      const balanceAmount = Math.max(0, calculatedTotal - reservation.paidAmount);

      const updated = await db.reservation.update({
        where: { id: reservationId },
        data: {
          roomRate: newRoomRate,
          discountAmount: 0,
          totalAmount: calculatedTotal,
          balanceAmount,
          ...(specialRequests !== undefined ? { specialRequests: specialRequests ? specialRequests.trim() : null } : {}),
        },
      });

      await logAuditEvent({
        organizationId: session.organizationId,
        propertyId: reservation.propertyId,
        userId: session.userId,
        action: 'RESERVATION_DETAILS_UPDATED',
        module: 'reservations',
        entityId: reservationId,
        beforeData: { roomRate: prevRate, totalAmount: reservation.totalAmount, balanceAmount: reservation.balanceAmount },
        afterData: { roomRate: newRoomRate, totalAmount: calculatedTotal, balanceAmount, specialRequests },
      });

      return NextResponse.json({ success: true, reservation: updated });
    }

    // Action 1: Assign Room Number
    if (action === 'assign_room') {
      if (!hasPermission(session.permissions, 'reservation.assign_room')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
      }

      if (!assignedRoomId) return NextResponse.json({ error: 'Physical room ID is required.' }, { status: 400 });

      const isAvail = await isRoomAvailable(assignedRoomId, reservation.arrivalDate, reservation.departureDate, reservationId);
      if (!isAvail) {
        return NextResponse.json({ error: 'Selected physical room is not available for these stay dates.' }, { status: 400 });
      }

      const updated = await db.reservation.update({
        where: { id: reservationId },
        data: { assignedRoomId },
      });

      await logAuditEvent({
        organizationId: session.organizationId,
        propertyId: reservation.propertyId,
        userId: session.userId,
        action: 'ROOM_ASSIGNED_TO_RESERVATION',
        module: 'reservations',
        entityId: reservationId,
        afterData: { assignedRoomId },
      });

      return NextResponse.json({ success: true, reservation: updated });
    }

    // Action 2: Cancel Reservation
    if (action === 'cancel') {
      if (!hasPermission(session.permissions, 'reservation.cancel')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
      }

      const updated = await db.reservation.update({
        where: { id: reservationId },
        data: {
          status: 'CANCELLED',
          cancelledReason: cancelledReason || 'Guest requested cancellation',
          cancelledAt: new Date(),
        },
      });

      // Free assigned physical room if applicable
      if (reservation.assignedRoomId && reservation.status === 'CONFIRMED') {
        await db.room.update({
          where: { id: reservation.assignedRoomId },
          data: { availabilityStatus: 'AVAILABLE' },
        });
      }

      await logAuditEvent({
        organizationId: session.organizationId,
        propertyId: reservation.propertyId,
        userId: session.userId,
        action: 'RESERVATION_CANCELLED',
        module: 'reservations',
        entityId: reservationId,
        afterData: { cancelledReason },
      });

      return NextResponse.json({ success: true, reservation: updated });
    }

    // Action 3: Process No-Show
    if (action === 'no_show') {
      if (!hasPermission(session.permissions, 'reservation.no_show')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
      }

      const updated = await db.reservation.update({
        where: { id: reservationId },
        data: {
          status: 'NO_SHOW',
          noShowAt: new Date(),
        },
      });

      if (reservation.assignedRoomId) {
        await db.room.update({
          where: { id: reservation.assignedRoomId },
          data: { availabilityStatus: 'AVAILABLE' },
        });
      }

      await logAuditEvent({
        organizationId: session.organizationId,
        propertyId: reservation.propertyId,
        userId: session.userId,
        action: 'RESERVATION_NO_SHOW',
        module: 'reservations',
        entityId: reservationId,
      });

      return NextResponse.json({ success: true, reservation: updated });
    }

    // Action 4: Update Notes
    if (notes !== undefined) {
      const updated = await db.reservation.update({
        where: { id: reservationId },
        data: { internalNotes: notes },
      });
      return NextResponse.json({ success: true, reservation: updated });
    }

    return NextResponse.json({ error: 'Invalid modification action specified' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update reservation' }, { status: 500 });
  }
}
