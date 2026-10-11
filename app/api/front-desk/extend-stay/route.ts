import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { isRoomAvailable } from '@/lib/availability';
import { calculateReservationPricing } from '@/lib/pricing';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'stay.extend')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const body = await req.json();
    const { reservationId, newDepartureDate, reason } = body;

    if (!reservationId || !newDepartureDate) {
      return NextResponse.json({ error: 'Reservation ID and new departure date are required.' }, { status: 400 });
    }

    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: { roomType: true, folios: true },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found.' }, { status: 404 });
    }

    const newDep = new Date(newDepartureDate);
    const oldDep = new Date(reservation.departureDate);

    if (newDep <= oldDep) {
      return NextResponse.json({ error: 'New departure date must be after current departure date.' }, { status: 400 });
    }

    // 1. Verify physical room availability for the extended period
    if (reservation.assignedRoomId) {
      const isAvail = await isRoomAvailable(reservation.assignedRoomId, oldDep, newDep, reservationId);
      if (!isAvail) {
        return NextResponse.json({
          error: 'Current assigned room is not available for the extension period due to a conflicting booking.',
        }, { status: 400 });
      }
    }

    // 2. Calculate Additional Stay and Pricing
    // In Indira Lodge, the extra amount for stay extension is strictly the walk-in / reserved room rate times additional nights
    const diffTime = Math.max(1, newDep.getTime() - oldDep.getTime());
    const additionalNights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    const nightlyRate = reservation.roomRate;
    const additionalAmount = additionalNights * nightlyRate;
    const newTotalNights = reservation.nights + additionalNights;
    const newTotalRoomCharge = newTotalNights * nightlyRate;
    const newTaxAmount = Math.round((newTotalRoomCharge * 0.05) * 100) / 100;

    // 3. Update Reservation
    const updatedRes = await db.reservation.update({
      where: { id: reservationId },
      data: {
        departureDate: newDep,
        nights: newTotalNights,
        taxAmount: newTaxAmount,
        totalAmount: { increment: additionalAmount },
        balanceAmount: { increment: additionalAmount },
      },
    });

    // 4. Update Guest Folio with extension charge
    const folio = reservation.folios[0];
    if (folio) {
      const trxRef = await generateReferenceNumber(reservation.propertyId, 'TRX');
      await db.folioTransaction.create({
        data: {
          folioId: folio.id,
          transactionRef: trxRef,
          type: 'DEBIT',
          category: 'ROOM_CHARGE',
          description: `Stay Extension (${additionalNights} Additional Night${additionalNights > 1 ? 's' : ''})`,
          quantity: additionalNights,
          unitPrice: nightlyRate,
          amount: additionalAmount,
          status: 'POSTED',
          postedById: session.userId,
        },
      });

      await db.folio.update({
        where: { id: folio.id },
        data: {
          totalCharges: { increment: additionalAmount },
          balanceAmount: { increment: additionalAmount },
        },
      });
    }

    // 5. Record Stay History Log
    await db.stayHistory.create({
      data: {
        reservationId,
        previousCheckOut: oldDep,
        newCheckOut: newDep,
        type: 'EXTENSION',
        reason: reason || 'Guest extended stay',
        performedById: session.userId,
      },
    });

    // 6. Log Audit Event
    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: reservation.propertyId,
      userId: session.userId,
      action: 'STAY_EXTENDED',
      module: 'front_office',
      entityId: reservationId,
      afterData: { previousCheckOut: oldDep, newCheckOut: newDep, additionalAmount },
    });

    return NextResponse.json({ success: true, reservation: updatedRes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Stay extension failed' }, { status: 500 });
  }
}
