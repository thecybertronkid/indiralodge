import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { calculateReservationPricing } from '@/lib/pricing';
import { checkRoomTypeAvailability, isRoomAvailable } from '@/lib/availability';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'reservation.view')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sourceId = searchParams.get('sourceId') || '';
    const roomTypeId = searchParams.get('roomTypeId') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const skip = (page - 1) * limit;

    const where: any = {
      propertyId,
      ...(status ? { status } : {}),
      ...(sourceId ? { bookingSourceId: sourceId } : {}),
      ...(roomTypeId ? { roomTypeId } : {}),
      ...(search
        ? {
            OR: [
              { reservationRef: { contains: search } },
              { guest: { displayName: { contains: search } } },
              { guest: { phone: { contains: search } } },
              { assignedRoom: { roomNumber: { contains: search } } },
            ],
          }
        : {}),
    };

    const reservations = await db.reservation.findMany({
      where,
      include: {
        guest: { select: { id: true, guestRef: true, displayName: true, phone: true, email: true } },
        roomType: { select: { name: true, code: true, baseRate: true } },
        assignedRoom: { select: { id: true, roomNumber: true, floor: true } },
        bookingSource: { select: { name: true, code: true } },
        folios: { select: { id: true, folioNumber: true, balanceAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await db.reservation.count({ where });

    return NextResponse.json({ reservations, total, page, limit });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'reservation.create')) {
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
      address,
      age,
      gender,
      occupation,
      idType,
      idNumber,
      bookingSourceId,
      roomTypeId,
      assignedRoomId,
      arrivalDate,
      arrivalTime,
      departureDate,
      departureTime,
      adults,
      children,
      comingFrom,
      purposeOfVisit,
      discountAmount,
      discountReason,
      depositAmount,
      specialRequests,
    } = body;

    if (!roomTypeId || !arrivalDate || !departureDate) {
      return NextResponse.json({ error: 'Room type, arrival date, and departure date are required.' }, { status: 400 });
    }

    // 1. Guest Handling: Create or Update Guest Profile
    let finalGuestId = guestId;

    if (!finalGuestId) {
      if (!firstName || !phone) {
        return NextResponse.json({ error: 'Guest name and phone number are required.' }, { status: 400 });
      }

      // Check duplicate guest by phone
      const existingGuest = await db.guest.findFirst({
        where: { organizationId: session.organizationId, phone: phone.trim() },
      });

      if (existingGuest) {
        finalGuestId = existingGuest.id;
        await db.guest.update({
          where: { id: finalGuestId },
          data: {
            ...(address ? { address: address.trim() } : {}),
            ...(age ? { age: parseInt(String(age), 10) } : {}),
            ...(gender ? { gender } : {}),
            ...(occupation ? { occupation: occupation.trim() } : {}),
            ...(idType ? { idType } : {}),
            ...(idNumber ? { idNumber: idNumber.trim() } : {}),
          },
        });
      } else {
        const guestRef = await generateReferenceNumber(propertyId, 'GST');
        const newGuest = await db.guest.create({
          data: {
            organizationId: session.organizationId,
            guestRef,
            firstName: firstName.trim(),
            lastName: lastName ? lastName.trim() : '',
            displayName: `${firstName.trim()} ${lastName ? lastName.trim() : ''}`.trim(),
            phone: phone.trim(),
            email: email ? email.trim().toLowerCase() : null,
            address: address ? address.trim() : null,
            age: age ? parseInt(String(age), 10) : null,
            gender: gender || 'Other',
            occupation: occupation ? occupation.trim() : null,
            idType: idType || null,
            idNumber: idNumber ? idNumber.trim() : null,
          },
        });
        finalGuestId = newGuest.id;
      }
    } else {
      // Update existing guest profile with latest age, occupation, ID details
      await db.guest.update({
        where: { id: finalGuestId },
        data: {
          ...(address ? { address: address.trim() } : {}),
          ...(age ? { age: parseInt(String(age), 10) } : {}),
          ...(gender ? { gender } : {}),
          ...(occupation ? { occupation: occupation.trim() } : {}),
          ...(idType ? { idType } : {}),
          ...(idNumber ? { idNumber: idNumber.trim() } : {}),
        },
      });
    }

    const arr = new Date(arrivalDate);
    const dep = new Date(departureDate);

    if (dep <= arr) {
      return NextResponse.json({ error: 'Departure date must be after arrival date.' }, { status: 400 });
    }

    // 2. Room Type & Auto-Allocation of Physical Room
    const roomTypeAvail = await checkRoomTypeAvailability(propertyId, arr, dep);
    const targetType = roomTypeAvail.find((rt) => rt.roomTypeId === roomTypeId);

    if (!targetType || targetType.availableRooms <= 0) {
      return NextResponse.json({ error: 'No available rooms for the selected room type and dates.' }, { status: 400 });
    }

    let targetRoomId = assignedRoomId || null;

    // Auto-allocate physical room if unassigned
    if (!targetRoomId) {
      const physicalRooms = await db.room.findMany({
        where: {
          propertyId,
          roomTypeId,
          isActive: true,
          availabilityStatus: 'AVAILABLE',
          housekeepingStatus: 'CLEAN',
          maintenanceStatus: 'OPERATIONAL',
        },
        orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
      });

      for (const pr of physicalRooms) {
        const avail = await isRoomAvailable(pr.id, arr, dep);
        if (avail) {
          targetRoomId = pr.id;
          break;
        }
      }
    }

    // 3. Fallback Booking Source
    let targetSourceId = bookingSourceId;
    if (!targetSourceId) {
      let defSource = await db.bookingSource.findFirst({ where: { propertyId, code: 'DIRECT' } });
      if (!defSource) {
        defSource = await db.bookingSource.create({ data: { propertyId, code: 'DIRECT', name: 'Direct Desk Booking' } });
      }
      targetSourceId = defSource.id;
    }

    // 4. Server-side Pricing Calculation
    const pricing = await calculateReservationPricing({
      propertyId,
      roomTypeId,
      arrivalDate: arr,
      departureDate: dep,
      adults: parseInt(adults || '1', 10),
      children: parseInt(children || '0', 10),
      discountAmount: discountAmount ? parseFloat(discountAmount) : 0,
    });

    const reservationRef = await generateReferenceNumber(propertyId, 'RES');
    const advDeposit = depositAmount ? parseFloat(depositAmount) : 0;
    const paidAmount = advDeposit;
    const balanceAmount = Math.max(0, pricing.totalAmount - paidAmount);

    // 5. Create Reservation with all 19 fields
    const reservation = await db.reservation.create({
      data: {
        propertyId,
        reservationRef,
        guestId: finalGuestId,
        bookingSourceId: targetSourceId,
        status: 'CONFIRMED',
        arrivalDate: arr,
        arrivalTime: arrivalTime || '14:00',
        departureDate: dep,
        departureTime: departureTime || '11:00',
        nights: pricing.nights,
        adults: parseInt(adults || '1', 10),
        children: parseInt(children || '0', 10),
        comingFrom: comingFrom ? comingFrom.trim() : null,
        purposeOfVisit: purposeOfVisit ? purposeOfVisit.trim() : null,
        roomTypeId,
        assignedRoomId: targetRoomId,
        roomRate: pricing.baseRate,
        discountAmount: pricing.discountAmount,
        discountReason: discountReason || null,
        taxAmount: pricing.taxAmount,
        totalAmount: pricing.totalAmount,
        depositAmount: advDeposit,
        paidAmount,
        balanceAmount,
        specialRequests: specialRequests || null,
        createdById: session.userId,
      },
      include: {
        guest: { select: { displayName: true, phone: true } },
        roomType: { select: { name: true, baseRate: true } },
        assignedRoom: { select: { roomNumber: true } },
      },
    });

    // Mark allocated room as RESERVED if check-in is today
    if (targetRoomId) {
      await db.room.update({
        where: { id: targetRoomId },
        data: { availabilityStatus: 'RESERVED' },
      });
    }

    // Log Audit Event
    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId,
      userId: session.userId,
      action: 'RESERVATION_CREATED',
      module: 'reservations',
      entityId: reservation.id,
      afterData: { reservationRef, arrivalDate, departureDate, totalAmount: pricing.totalAmount },
    });

    return NextResponse.json({ success: true, reservation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create reservation' }, { status: 500 });
  }
}
