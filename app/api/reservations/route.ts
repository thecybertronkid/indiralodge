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
      bookingSourceId,
      roomTypeId,
      assignedRoomId,
      arrivalDate,
      departureDate,
      adults,
      children,
      discountAmount,
      discountReason,
      depositAmount,
      specialRequests,
      internalNotes,
      customRate,
    } = body;

    if (!guestId || !bookingSourceId || !roomTypeId || !arrivalDate || !departureDate) {
      return NextResponse.json({ error: 'Guest, source, room type, arrival, and departure dates are required.' }, { status: 400 });
    }

    const arr = new Date(arrivalDate);
    const dep = new Date(departureDate);

    if (dep <= arr) {
      return NextResponse.json({ error: 'Departure date must be after arrival date.' }, { status: 400 });
    }

    // 1. Availability Check for Room Type
    const roomTypeAvail = await checkRoomTypeAvailability(propertyId, arr, dep);
    const targetType = roomTypeAvail.find((rt) => rt.roomTypeId === roomTypeId);

    if (!targetType || targetType.availableRooms <= 0) {
      return NextResponse.json({ error: 'No available rooms for the selected room type and dates.' }, { status: 400 });
    }

    // 2. Physical Room Availability Check if room assigned
    if (assignedRoomId) {
      const isAvail = await isRoomAvailable(assignedRoomId, arr, dep);
      if (!isAvail) {
        return NextResponse.json({ error: 'The selected physical room is no longer available for these dates.' }, { status: 400 });
      }
    }

    // 3. Server-side Pricing Calculation
    const pricing = await calculateReservationPricing({
      propertyId,
      roomTypeId,
      arrivalDate: arr,
      departureDate: dep,
      adults: parseInt(adults || '1', 10),
      children: parseInt(children || '0', 10),
      discountAmount: discountAmount ? parseFloat(discountAmount) : 0,
      customRoomRate: customRate ? parseFloat(customRate) : undefined,
    });

    const reservationRef = await generateReferenceNumber(propertyId, 'RES');
    const advDeposit = depositAmount ? parseFloat(depositAmount) : 0;
    const paidAmount = advDeposit;
    const balanceAmount = Math.max(0, pricing.totalAmount - paidAmount);

    // 4. Transactionally create Reservation
    const reservation = await db.reservation.create({
      data: {
        propertyId,
        reservationRef,
        guestId,
        bookingSourceId,
        status: 'CONFIRMED',
        arrivalDate: arr,
        departureDate: dep,
        nights: pricing.nights,
        adults: parseInt(adults || '1', 10),
        children: parseInt(children || '0', 10),
        roomTypeId,
        assignedRoomId: assignedRoomId || null,
        roomRate: pricing.baseRate,
        discountAmount: pricing.discountAmount,
        discountReason: discountReason || null,
        taxAmount: pricing.taxAmount,
        totalAmount: pricing.totalAmount,
        depositAmount: advDeposit,
        paidAmount,
        balanceAmount,
        specialRequests: specialRequests || null,
        internalNotes: internalNotes || null,
        createdById: session.userId,
      },
      include: {
        guest: { select: { displayName: true, phone: true } },
        roomType: { select: { name: true } },
        assignedRoom: { select: { roomNumber: true } },
      },
    });

    // Update assigned room status to RESERVED if arrival is today
    if (assignedRoomId) {
      await db.room.update({
        where: { id: assignedRoomId },
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
