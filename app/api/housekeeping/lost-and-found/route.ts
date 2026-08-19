import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'housekeeping.lost_found.view')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const items = await db.lostAndFoundItem.findMany({
      where: { propertyId },
      include: {
        room: { select: { roomNumber: true } },
        foundBy: { select: { fullName: true } },
        guest: { select: { displayName: true, phone: true } },
        handedOverBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch lost and found register' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'housekeeping.lost_found.manage')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const body = await req.json();
    const { roomId, category, description, storageLocation, guestId, notes } = body;

    if (!description || !storageLocation) {
      return NextResponse.json({ error: 'Item description and storage location are required.' }, { status: 400 });
    }

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const itemRef = await generateReferenceNumber(propertyId, 'LF');
    const item = await db.lostAndFoundItem.create({
      data: {
        itemRef,
        propertyId,
        roomId: roomId || null,
        foundById: session.userId,
        guestId: guestId || null,
        category: category || 'OTHER',
        description: description.trim(),
        storageLocation: storageLocation.trim(),
        status: 'STORED',
        notes: notes || null,
      },
    });

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId,
      userId: session.userId,
      action: 'LOST_AND_FOUND_REGISTERED',
      module: 'housekeeping',
      entityId: item.id,
      afterData: { itemRef, description, storageLocation },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to register lost item' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'housekeeping.lost_found.manage')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const body = await req.json();
    const { itemId, status, handedOverTo, notes } = body;

    if (!itemId || !status) {
      return NextResponse.json({ error: 'Item ID and Status are required.' }, { status: 400 });
    }

    const item = await db.lostAndFoundItem.findUnique({ where: { id: itemId } });
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    const isHandover = status === 'CLAIMED' || status === 'RETURNED';

    const updated = await db.lostAndFoundItem.update({
      where: { id: itemId },
      data: {
        status,
        handedOverTo: handedOverTo ? handedOverTo.trim() : item.handedOverTo,
        handedOverAt: isHandover ? new Date() : item.handedOverAt,
        handedOverById: isHandover ? session.userId : item.handedOverById,
        notes: notes ? `${item.notes || ''}\nUpdate: ${notes}` : item.notes,
      },
    });

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: item.propertyId,
      userId: session.userId,
      action: 'LOST_AND_FOUND_HANDOVER',
      module: 'housekeeping',
      entityId: itemId,
      afterData: { itemRef: item.itemRef, status, handedOverTo },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Handover update failed' }, { status: 500 });
  }
}
