import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'room.block')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const body = await req.json();
    const { roomId, startDate, endDate, reason, notes } = body;

    if (!roomId || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'Room, dates, and block reason are required.' }, { status: 400 });
    }

    const room = await db.room.findUnique({ where: { id: roomId } });
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    const block = await db.roomBlock.create({
      data: {
        propertyId: room.propertyId,
        roomId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason.trim(),
        notes: notes || null,
        createdById: session.userId,
      },
    });

    // Update room maintenance status
    await db.room.update({
      where: { id: roomId },
      data: {
        availabilityStatus: 'BLOCKED',
        maintenanceStatus: 'UNDER_MAINTENANCE',
      },
    });

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: room.propertyId,
      userId: session.userId,
      action: 'ROOM_BLOCKED',
      module: 'rooms',
      entityId: roomId,
      afterData: { startDate, endDate, reason },
    });

    return NextResponse.json({ success: true, block });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to block room' }, { status: 500 });
  }
}
