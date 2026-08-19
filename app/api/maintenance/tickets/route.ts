import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { createNotification } from '@/lib/notifications';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'maintenance.ticket.view')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const status = searchParams.get('status');
    const technicianId = searchParams.get('technicianId');
    const roomId = searchParams.get('roomId');

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const whereClause: any = { propertyId };
    if (category) whereClause.category = category;
    if (priority) whereClause.priority = priority;
    if (status) whereClause.status = status;
    if (technicianId) whereClause.assignedTechnicianId = technicianId;
    if (roomId) whereClause.roomId = roomId;

    const tickets = await db.maintenanceTicket.findMany({
      where: whereClause,
      include: {
        room: { select: { roomNumber: true, floor: true } },
        asset: { select: { name: true, assetRef: true } },
        reportedBy: { select: { fullName: true } },
        assignedTechnician: { select: { id: true, fullName: true, email: true } },
        comments: {
          include: { user: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch maintenance tickets' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'maintenance.ticket.create')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const body = await req.json();
    const { roomId, assetId, category, title, description, priority, assignedTechnicianId, estimatedCost } = body;

    if (!title || !description || !category) {
      return NextResponse.json({ error: 'Category, title, and description are required.' }, { status: 400 });
    }

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const ticketRef = await generateReferenceNumber(propertyId, 'MT');
    const isCritical = priority === 'CRITICAL';

    const ticket = await db.maintenanceTicket.create({
      data: {
        ticketRef,
        propertyId,
        roomId: roomId || null,
        assetId: assetId || null,
        category,
        title: title.trim(),
        description: description.trim(),
        priority: priority || 'NORMAL',
        status: assignedTechnicianId ? 'ASSIGNED' : 'REPORTED',
        reportedById: session.userId,
        assignedTechnicianId: assignedTechnicianId || null,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : 0,
      },
      include: {
        room: { select: { roomNumber: true } },
        assignedTechnician: { select: { fullName: true } },
      },
    });

    // If Priority is CRITICAL and linked to room, set room maintenance status -> OUT_OF_ORDER
    if (roomId && isCritical) {
      await db.room.update({
        where: { id: roomId },
        data: {
          maintenanceStatus: 'OUT_OF_ORDER',
          availabilityStatus: 'BLOCKED', // Exclude room from sellable availability
        },
      });

      // Send urgent alert notification
      await createNotification({
        propertyId,
        userId: session.userId,
        title: `CRITICAL Maintenance Ticket (${ticketRef})`,
        message: `Critical maintenance reported for Room ${ticket.room?.roomNumber || ''}: ${title}. Room set to OUT_OF_ORDER.`,
        type: 'ERROR',
        priority: 'URGENT',
        module: 'maintenance',
        entityId: ticket.id,
      });
    }

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId,
      userId: session.userId,
      action: 'MAINTENANCE_TICKET_CREATED',
      module: 'maintenance',
      entityId: ticket.id,
      afterData: { ticketRef, category, priority, roomId },
    });

    return NextResponse.json({ success: true, ticket });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create maintenance ticket' }, { status: 500 });
  }
}
