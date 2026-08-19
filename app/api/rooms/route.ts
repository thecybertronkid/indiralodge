import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const floorFilter = searchParams.get('floor') || '';
    const roomTypeFilter = searchParams.get('roomTypeId') || '';
    const availabilityFilter = searchParams.get('availability') || '';

    const rooms = await db.room.findMany({
      where: {
        propertyId,
        isActive: true,
        ...(floorFilter ? { floor: floorFilter } : {}),
        ...(roomTypeFilter ? { roomTypeId: roomTypeFilter } : {}),
        ...(availabilityFilter ? { availabilityStatus: availabilityFilter } : {}),
      },
      include: {
        roomType: { select: { name: true, code: true, baseRate: true } },
        reservations: {
          where: { status: 'CHECKED_IN' },
          include: {
            guest: { select: { displayName: true, phone: true, guestRef: true } },
            folios: { select: { balanceAmount: true } },
          },
          take: 1,
        },
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    return NextResponse.json({ rooms });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'room.create')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const { roomNumber, roomTypeId, floor, buildingBlock, description } = body;

    if (!roomNumber || !roomTypeId || !floor) {
      return NextResponse.json({ error: 'Room number, floor, and room type are required.' }, { status: 400 });
    }

    const existing = await db.room.findUnique({
      where: {
        propertyId_roomNumber: {
          propertyId,
          roomNumber: roomNumber.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: `Room ${roomNumber} already exists in this property.` }, { status: 400 });
    }

    const newRoom = await db.room.create({
      data: {
        propertyId,
        roomTypeId,
        roomNumber: roomNumber.trim(),
        floor: floor.trim(),
        buildingBlock: buildingBlock || 'Main Wing',
        description: description || null,
        availabilityStatus: 'AVAILABLE',
        housekeepingStatus: 'CLEAN',
        maintenanceStatus: 'OPERATIONAL',
      },
    });

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId,
      userId: session.userId,
      action: 'ROOM_CREATED',
      module: 'rooms',
      entityId: newRoom.id,
      afterData: { roomNumber, floor },
    });

    return NextResponse.json({ success: true, room: newRoom });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create room' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'room.status.manage')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const body = await req.json();
    const { roomId, availabilityStatus, housekeepingStatus, maintenanceStatus } = body;

    if (!roomId) return NextResponse.json({ error: 'Room ID is required.' }, { status: 400 });

    const room = await db.room.findUnique({ where: { id: roomId } });
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    const updatedRoom = await db.room.update({
      where: { id: roomId },
      data: {
        ...(availabilityStatus ? { availabilityStatus } : {}),
        ...(housekeepingStatus ? { housekeepingStatus } : {}),
        ...(maintenanceStatus ? { maintenanceStatus } : {}),
      },
    });

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: session.propertyId,
      userId: session.userId,
      action: 'ROOM_STATUS_UPDATED',
      module: 'rooms',
      entityId: roomId,
      beforeData: {
        availabilityStatus: room.availabilityStatus,
        housekeepingStatus: room.housekeepingStatus,
        maintenanceStatus: room.maintenanceStatus,
      },
      afterData: { availabilityStatus, housekeepingStatus, maintenanceStatus },
    });

    return NextResponse.json({ success: true, room: updatedRoom });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update room status' }, { status: 500 });
  }
}
