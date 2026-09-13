import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { isRoomAvailable } from '@/lib/availability';
import { postRoomChargeJournal, postPaymentJournal } from '@/lib/accountingPosting';
import { logAuditEvent } from '@/lib/audit';
import { notifyAllStaff } from '@/lib/notifications';

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'checkin.create')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const body = await req.json();
    const { reservationId, roomId } = body;

    if (!reservationId) {
      return NextResponse.json({ error: 'Reservation ID is required for check-in.' }, { status: 400 });
    }

    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: { guest: true, roomType: true },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found.' }, { status: 404 });
    }

    if (reservation.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: `Cannot check in reservation with status '${reservation.status}'. Only CONFIRMED bookings can be checked in.` },
        { status: 400 }
      );
    }

    const targetRoomId = roomId || reservation.assignedRoomId;
    if (!targetRoomId) {
      return NextResponse.json({ error: 'Please assign a physical room before completing check-in.' }, { status: 400 });
    }

    // Verify room availability if assigning now
    if (targetRoomId !== reservation.assignedRoomId) {
      const isAvail = await isRoomAvailable(targetRoomId, reservation.arrivalDate, reservation.departureDate, reservationId);
      if (!isAvail) {
        return NextResponse.json({ error: 'The selected physical room is not available for check-in.' }, { status: 400 });
      }
    }

    // 1. Update Reservation
    const updatedRes = await db.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'CHECKED_IN',
        assignedRoomId: targetRoomId,
        actualCheckInAt: new Date(),
      },
    });

    // 2. Update Physical Room Status
    await db.room.update({
      where: { id: targetRoomId },
      data: {
        availabilityStatus: 'OCCUPIED',
      },
    });

    // 3. Create or Get Guest Folio
    let folio = await db.folio.findFirst({
      where: { reservationId },
    });

    if (!folio) {
      const folioNumber = await generateReferenceNumber(reservation.propertyId, 'FOL');
      folio = await db.folio.create({
        data: {
          propertyId: reservation.propertyId,
          reservationId,
          guestId: reservation.guestId,
          folioNumber,
          status: 'ACTIVE',
          totalCharges: reservation.totalAmount,
          totalPayments: reservation.paidAmount,
          balanceAmount: Math.max(0, reservation.totalAmount - reservation.paidAmount),
        },
      });

      // Post initial room charge transaction to folio
      const trxRef = await generateReferenceNumber(reservation.propertyId, 'TRX');
      await db.folioTransaction.create({
        data: {
          folioId: folio.id,
          transactionRef: trxRef,
          type: 'DEBIT',
          category: 'ROOM_CHARGE',
          description: `Room Charge (${reservation.roomType.name} - ${reservation.nights} Night Stay)`,
          quantity: reservation.nights,
          unitPrice: reservation.roomRate,
          discount: reservation.discountAmount,
          tax: reservation.taxAmount,
          amount: reservation.totalAmount,
          status: 'POSTED',
          postedById: session.userId,
        },
      });

      // PHASE 4 AUTOMATIC DOUBLE-ENTRY ACCOUNTING POSTING
      try {
        await postRoomChargeJournal({
          propertyId: reservation.propertyId,
          amount: reservation.totalAmount,
          description: `Room Tariff Charge for ${reservation.guest.displayName} (${folio.folioNumber})`,
          sourceReference: trxRef,
          userId: session.userId,
        });
      } catch (err) {
        console.error('Room charge accounting posting warning:', err);
      }

      // If advance deposit was paid, post credit transaction & journal
      if (reservation.paidAmount > 0) {
        const payTrxRef = await generateReferenceNumber(reservation.propertyId, 'TRX');
        await db.folioTransaction.create({
          data: {
            folioId: folio.id,
            transactionRef: payTrxRef,
            type: 'CREDIT',
            category: 'PAYMENT',
            description: 'Advance Deposit Received',
            quantity: 1,
            unitPrice: reservation.paidAmount,
            amount: reservation.paidAmount,
            status: 'POSTED',
            postedById: session.userId,
          },
        });

        try {
          await postPaymentJournal({
            propertyId: reservation.propertyId,
            amount: reservation.paidAmount,
            method: 'CASH',
            description: `Advance Deposit Payment from ${reservation.guest.displayName}`,
            sourceReference: payTrxRef,
            userId: session.userId,
          });
        } catch (err) {
          console.error('Payment accounting posting warning:', err);
        }
      }
    }

    // 4. Log Audit & Broadcast Real-Time Alert to All Staff
    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: reservation.propertyId,
      userId: session.userId,
      action: 'GUEST_CHECKED_IN',
      module: 'front_office',
      entityId: reservationId,
      afterData: { guestName: reservation.guest.displayName, roomId: targetRoomId, folioNumber: folio.folioNumber },
    });

    const roomInfo = await db.room.findUnique({ where: { id: targetRoomId }, select: { roomNumber: true } });
    const roomNo = roomInfo?.roomNumber ? `Room ${roomInfo.roomNumber}` : 'assigned room';

    await notifyAllStaff({
      propertyId: reservation.propertyId,
      title: '🛎️ Guest Checked In',
      message: `${reservation.guest.displayName} checked in to ${roomNo}.`,
      type: 'SUCCESS',
      priority: 'HIGH',
      module: 'front_office',
      entityId: reservationId,
      url: `/reservations/${reservationId}`,
    });

    return NextResponse.json({ success: true, reservation: updatedRes, folio });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Check-in failed' }, { status: 500 });
  }
}
