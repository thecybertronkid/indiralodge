import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let propertyId = session.propertyId;
    if (!propertyId) {
      const prop = await db.property.findFirst({ where: { organizationId: session.organizationId }, select: { id: true } });
      propertyId = prop?.id || null;
    }
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const roomTypes = await db.roomType.findMany({
      where: { propertyId },
      include: {
        _count: { select: { rooms: true } },
      },
      orderBy: { baseRate: 'asc' },
    });

    return NextResponse.json({ roomTypes });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch room types' }, { status: 500 });
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
    const { code, name, description, maxOccupancy, adultsCapacity, childrenCapacity, baseRate, extraAdultRate, extraChildRate, bedType, amenities } = body;

    if (!code || !name || !baseRate) {
      return NextResponse.json({ error: 'Code, name, and base rate are required.' }, { status: 400 });
    }

    const roomType = await db.roomType.create({
      data: {
        propertyId,
        code: code.toUpperCase().trim(),
        name: name.trim(),
        description: description || null,
        maxOccupancy: parseInt(maxOccupancy || '2', 10),
        adultsCapacity: parseInt(adultsCapacity || '2', 10),
        childrenCapacity: parseInt(childrenCapacity || '1', 10),
        baseRate: parseFloat(baseRate),
        extraAdultRate: parseFloat(extraAdultRate || '1000'),
        extraChildRate: parseFloat(extraChildRate || '500'),
        bedType: bedType || 'King Bed',
        amenities: amenities ? JSON.stringify(amenities) : null,
      },
    });

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId,
      userId: session.userId,
      action: 'ROOM_TYPE_CREATED',
      module: 'rooms',
      entityId: roomType.id,
      afterData: { code, name, baseRate },
    });

    return NextResponse.json({ success: true, roomType });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create room type' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const roomTypeId = searchParams.get('id');

    if (!roomTypeId) return NextResponse.json({ error: 'Room type ID is required' }, { status: 400 });

    const roomType = await db.roomType.findUnique({
      where: { id: roomTypeId },
      include: {
        _count: { select: { rooms: true, reservations: true } },
      },
    });

    if (!roomType) return NextResponse.json({ error: 'Room type not found' }, { status: 404 });

    if (roomType._count.rooms > 0) {
      return NextResponse.json(
        { error: `Cannot delete '${roomType.name}': ${roomType._count.rooms} physical rooms belong to this category. Delete assigned physical rooms first.` },
        { status: 400 }
      );
    }

    await db.roomType.delete({ where: { id: roomTypeId } });

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: roomType.propertyId,
      userId: session.userId,
      action: 'ROOM_TYPE_DELETED',
      module: 'rooms',
      entityId: roomTypeId,
      beforeData: { name: roomType.name, code: roomType.code },
    });

    return NextResponse.json({ success: true, message: `Room type ${roomType.name} deleted successfully.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete room type' }, { status: 500 });
  }
}
