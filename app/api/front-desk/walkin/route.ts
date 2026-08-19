import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { calculateReservationPricing } from '@/lib/pricing';
import { isRoomAvailable } from '@/lib/availability';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'checkin.create')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const {
      guestId,
      firstName,
      lastName,
      phone,
      email,
      roomId,
      arrivalDate,
      departureDate,
      adults,
      children,
      depositAmount,
      paymentMethod,
    } = body;

    let targetGuestId = guestId;

    // 1. Create guest if new
    if (!targetGuestId) {
      if (!firstName || !lastName || !phone) {
        return NextResponse.json({ error: 'First name, last name, and phone are required for new walk-in guest.' }, { status: 400 });
      }
      const guestRef = await generateReferenceNumber(propertyId, 'GST');
      const newGuest = await db.guest.create({
        data: {
          organizationId: session.organizationId,
          guestRef,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName: `${firstName.trim()} ${lastName.trim()}`,
          phone: phone.trim(),
          email: email ? email.toLowerCase().trim() : null,
          guestType: 'INDIVIDUAL',
        },
      });
      targetGuestId = newGuest.id;
    }

    if (!roomId || !arrivalDate || !departureDate) {
      return NextResponse.json({ error: 'Room selection, arrival date, and departure date are required.' }, { status: 400 });
    }

    const arr = new Date(arrivalDate);
    const dep = new Date(departureDate);

    // 2. Fetch Room & Check Availability
    const room = await db.room.findUnique({
      where: { id: roomId },
      include: { roomType: true },
    });

    if (!room || !room.isActive) {
      return NextResponse.json({ error: 'Selected physical room is not valid.' }, { status: 400 });
    }

    const isAvail = await isRoomAvailable(roomId, arr, dep);
    if (!isAvail) {
      return NextResponse.json({ error: `Room ${room.roomNumber} is not available for the requested dates.` }, { status: 400 });
    }

    // 3. Find Walk-in Booking Source
    let walkinSource = await db.bookingSource.findFirst({
      where: { propertyId, code: 'WALKIN' },
    });
    if (!walkinSource) {
      walkinSource = await db.bookingSource.create({
        data: { propertyId, code: 'WALKIN', name: 'Walk-in Guest' },
      });
    }

    // 4. Calculate Pricing
    const pricing = await calculateReservationPricing({
      propertyId,
      roomTypeId: room.roomTypeId,
      arrivalDate: arr,
      departureDate: dep,
      adults: parseInt(adults || '1', 10),
      children: parseInt(children || '0', 10),
    });

    const resRef = await generateReferenceNumber(propertyId, 'RES');
    const deposit = depositAmount ? parseFloat(depositAmount) : 0;

    // 5. Create Checked-in Reservation
    const reservation = await db.reservation.create({
      data: {
        propertyId,
        reservationRef: resRef,
        guestId: targetGuestId,
        bookingSourceId: walkinSource.id,
        status: 'CHECKED_IN',
        arrivalDate: arr,
        departureDate: dep,
        actualCheckInAt: new Date(),
        nights: pricing.nights,
        adults: parseInt(adults || '1', 10),
        children: parseInt(children || '0', 10),
        roomTypeId: room.roomTypeId,
        assignedRoomId: roomId,
        roomRate: pricing.baseRate,
        taxAmount: pricing.taxAmount,
        totalAmount: pricing.totalAmount,
        depositAmount: deposit,
        paidAmount: deposit,
        balanceAmount: Math.max(0, pricing.totalAmount - deposit),
        createdById: session.userId,
      },
      include: {
        guest: { select: { displayName: true } },
        assignedRoom: { select: { roomNumber: true } },
      },
    });

    // 6. Update Physical Room -> OCCUPIED
    await db.room.update({
      where: { id: roomId },
      data: { availabilityStatus: 'OCCUPIED' },
    });

    // 7. Create Folio & Transactions
    const folioRef = await generateReferenceNumber(propertyId, 'FOL');
    const folio = await db.folio.create({
      data: {
        propertyId,
        reservationId: reservation.id,
        guestId: targetGuestId,
        folioNumber: folioRef,
        status: 'ACTIVE',
        totalCharges: pricing.totalAmount,
        totalPayments: deposit,
        balanceAmount: Math.max(0, pricing.totalAmount - deposit),
      },
    });

    const trxRef = await generateReferenceNumber(propertyId, 'TRX');
    await db.folioTransaction.create({
      data: {
        folioId: folio.id,
        transactionRef: trxRef,
        type: 'DEBIT',
        category: 'ROOM_CHARGE',
        description: `Walk-in Room Charge (Room ${room.roomNumber} - ${pricing.nights} Nights)`,
        quantity: pricing.nights,
        unitPrice: pricing.baseRate,
        tax: pricing.taxAmount,
        amount: pricing.totalAmount,
        status: 'POSTED',
        postedById: session.userId,
      },
    });

    if (deposit > 0) {
      const payRef = await generateReferenceNumber(propertyId, 'PAY');
      await db.payment.create({
        data: {
          propertyId,
          folioId: folio.id,
          reservationId: reservation.id,
          guestId: targetGuestId,
          paymentRef: payRef,
          amount: deposit,
          method: paymentMethod || 'CASH',
          receivedById: session.userId,
        },
      });

      const payTrxRef = await generateReferenceNumber(propertyId, 'TRX');
      await db.folioTransaction.create({
        data: {
          folioId: folio.id,
          transactionRef: payTrxRef,
          type: 'CREDIT',
          category: 'PAYMENT',
          description: `Walk-in Deposit (${paymentMethod || 'CASH'})`,
          quantity: 1,
          unitPrice: deposit,
          amount: deposit,
          status: 'POSTED',
          postedById: session.userId,
        },
      });
    }

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId,
      userId: session.userId,
      action: 'WALKIN_CHECKIN_COMPLETED',
      module: 'front_office',
      entityId: reservation.id,
      afterData: { resRef, roomNumber: room.roomNumber, deposit },
    });

    return NextResponse.json({ success: true, reservation, folio });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Walk-in check-in failed' }, { status: 500 });
  }
}
