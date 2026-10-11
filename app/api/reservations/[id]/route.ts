import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { isRoomAvailable } from '@/lib/availability';
import { logAuditEvent } from '@/lib/audit';
import { generateReferenceNumber } from '@/lib/refGenerator';

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
      const { discountAmount, specialRequests, roomRate, arrivalDate, departureDate, nights: reqNights } = body;
      const prevRate = reservation.roomRate;
      let newRoomRate = roomRate !== undefined && roomRate !== '' ? parseFloat(String(roomRate)) : reservation.roomRate;
      if (isNaN(newRoomRate) || newRoomRate < 0) newRoomRate = 0;

      // Calculate dates and nights
      let newArrivalDate = reservation.arrivalDate;
      let newDepartureDate = reservation.departureDate;
      let newNights = reservation.nights;

      if (arrivalDate && departureDate) {
        const arr = new Date(arrivalDate + 'T00:00:00');
        const dep = new Date(departureDate + 'T00:00:00');
        if (dep <= arr) {
          return NextResponse.json({ error: 'Check-out date must be after check-in date.' }, { status: 400 });
        }
        newArrivalDate = arr;
        newDepartureDate = dep;
        const diff = Math.abs(dep.getTime() - arr.getTime());
        newNights = Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
      } else if (reqNights && Number(reqNights) > 0) {
        newNights = Number(reqNights);
      }

      // If room is assigned, verify room is available for the new date window (excluding this reservation)
      if (reservation.assignedRoomId && (arrivalDate || departureDate)) {
        const available = await isRoomAvailable(reservation.assignedRoomId, newArrivalDate, newDepartureDate, reservationId);
        if (!available) {
          return NextResponse.json(
            {
              error: `The assigned Room is not available for the updated stay dates (${newArrivalDate.toLocaleDateString('en-IN')} to ${newDepartureDate.toLocaleDateString('en-IN')}). Please choose alternative dates or reassign the room first.`,
            },
            { status: 400 }
          );
        }
      }

      const discountVal = discountAmount !== undefined && discountAmount !== '' ? parseFloat(String(discountAmount)) : 0;
      
      if (discountVal > 0 && newNights > 0) {
        const totalTariff = Math.max(0, (newRoomRate * newNights) - discountVal);
        newRoomRate = Math.round((totalTariff / newNights) * 100) / 100;
      }

      const totalRoomCharge = Math.round((newRoomRate * newNights) * 100) / 100;
      const newTaxAmount = Math.round((totalRoomCharge * 0.05) * 100) / 100;

      // Find any folios attached to this reservation
      const folios = await db.folio.findMany({
        where: { reservationId },
        include: { transactions: true },
      });

      let calculatedTotal = totalRoomCharge;

      if (folios.length > 0) {
        for (const folio of folios) {
          const roomChargeTxs = folio.transactions.filter((t) => t.category === 'ROOM_CHARGE');

          if (roomChargeTxs.length > 0) {
            // Keep the first room charge tx and update it to the full totalRoomCharge
            const primaryRoomTx = roomChargeTxs[0];
            await db.folioTransaction.update({
              where: { id: primaryRoomTx.id },
              data: {
                unitPrice: newRoomRate,
                quantity: newNights,
                amount: totalRoomCharge,
                description: `Room charge for ${newNights} night(s) @ ₹${newRoomRate}/night`,
              },
            });

            // If there are duplicate or obsolete extension room charge transactions, delete them
            if (roomChargeTxs.length > 1) {
              const extraRoomTxIds = roomChargeTxs.slice(1).map((t) => t.id);
              await db.folioTransaction.deleteMany({
                where: { id: { in: extraRoomTxIds } },
              });
            }
          } else {
            // Create the room charge transaction if missing
            const trxRef = await generateReferenceNumber(reservation.propertyId, 'TRX');
            await db.folioTransaction.create({
              data: {
                folioId: folio.id,
                transactionRef: trxRef,
                type: 'DEBIT',
                category: 'ROOM_CHARGE',
                description: `Room charge for ${newNights} night(s) @ ₹${newRoomRate}/night`,
                quantity: newNights,
                unitPrice: newRoomRate,
                amount: totalRoomCharge,
                status: 'POSTED',
                postedById: session.userId,
              },
            });
          }

          // Recalculate other debits (strictly non-room charges: FOOD, EXTRA_BED, etc.)
          const otherDebits = folio.transactions
            .filter((t) => t.category !== 'ROOM_CHARGE' && t.type === 'DEBIT')
            .reduce((sum, t) => sum + t.amount, 0);

          const totalCredits = folio.transactions
            .filter((t) => t.type === 'CREDIT')
            .reduce((sum, t) => sum + t.amount, 0);

          const actualPayments = Math.max(folio.totalPayments, totalCredits);
          const newTotalCharges = totalRoomCharge + otherDebits;
          const newBalance = Math.max(0, newTotalCharges - actualPayments);

          await db.folio.update({
            where: { id: folio.id },
            data: {
              totalCharges: newTotalCharges,
              totalPayments: actualPayments,
              balanceAmount: newBalance,
            },
          });

          calculatedTotal = newTotalCharges;
        }
      }

      const balanceAmount = Math.max(0, calculatedTotal - reservation.paidAmount);

      let updatedCheckInAt = reservation.actualCheckInAt;
      if (arrivalDate && reservation.actualCheckInAt) {
        const prev = new Date(reservation.actualCheckInAt);
        const newArr = new Date(arrivalDate + 'T00:00:00');
        updatedCheckInAt = new Date(
          newArr.getFullYear(),
          newArr.getMonth(),
          newArr.getDate(),
          prev.getHours(),
          prev.getMinutes(),
          prev.getSeconds()
        );
      }

      const updated = await db.reservation.update({
        where: { id: reservationId },
        data: {
          arrivalDate: newArrivalDate,
          departureDate: newDepartureDate,
          actualCheckInAt: updatedCheckInAt,
          nights: newNights,
          roomRate: newRoomRate,
          discountAmount: 0,
          taxAmount: newTaxAmount,
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
        beforeData: {
          arrivalDate: reservation.arrivalDate,
          departureDate: reservation.departureDate,
          nights: reservation.nights,
          roomRate: prevRate,
          totalAmount: reservation.totalAmount,
          balanceAmount: reservation.balanceAmount,
        },
        afterData: {
          arrivalDate: newArrivalDate,
          departureDate: newDepartureDate,
          nights: newNights,
          roomRate: newRoomRate,
          totalAmount: calculatedTotal,
          balanceAmount,
          specialRequests,
        },
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
