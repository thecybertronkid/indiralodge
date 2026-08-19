import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { isRoomAvailable } from '@/lib/availability';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'room.transfer')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const body = await req.json();
    const { reservationId, newRoomId, reason } = body;

    if (!reservationId || !newRoomId) {
      return NextResponse.json({ error: 'Reservation ID and new room selection are required.' }, { status: 400 });
    }

    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: { assignedRoom: true },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found.' }, { status: 404 });
    }

    if (reservation.status !== 'CHECKED_IN') {
      return NextResponse.json({ error: 'Room transfer can only be performed on active checked-in stays.' }, { status: 400 });
    }

    const oldRoomId = reservation.assignedRoomId;
    if (oldRoomId === newRoomId) {
      return NextResponse.json({ error: 'New room must be different from current room.' }, { status: 400 });
    }

    // Verify new room availability
    const isAvail = await isRoomAvailable(newRoomId, new Date(), reservation.departureDate, reservationId);
    if (!isAvail) {
      return NextResponse.json({ error: 'Selected destination room is not available.' }, { status: 400 });
    }

    // 1. Update Old Room -> AVAILABLE & DIRTY
    if (oldRoomId) {
      await db.room.update({
        where: { id: oldRoomId },
        data: {
          availabilityStatus: 'AVAILABLE',
          housekeepingStatus: 'DIRTY',
        },
      });
    }

    // 2. Update New Room -> OCCUPIED
    await db.room.update({
      where: { id: newRoomId },
      data: {
        availabilityStatus: 'OCCUPIED',
      },
    });

    // 3. Update Reservation assignedRoomId
    const updatedRes = await db.reservation.update({
      where: { id: reservationId },
      data: { assignedRoomId: newRoomId },
    });

    // 4. Log Stay History record
    await db.stayHistory.create({
      data: {
        reservationId,
        previousRoomId: oldRoomId,
        newRoomId,
        type: 'TRANSFER',
        reason: reason || 'Guest requested room change',
        performedById: session.userId,
      },
    });

    // 5. Log Audit Event
    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: reservation.propertyId,
      userId: session.userId,
      action: 'ROOM_TRANSFER_COMPLETED',
      module: 'front_office',
      entityId: reservationId,
      afterData: { previousRoomId: oldRoomId, newRoomId, reason },
    });

    return NextResponse.json({ success: true, reservation: updatedRes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Room transfer failed' }, { status: 500 });
  }
}
