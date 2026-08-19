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

    if (!hasPermission(session.permissions, 'housekeeping.tasks.view')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedStaffId = searchParams.get('assignedStaffId');
    const roomId = searchParams.get('roomId');
    const floor = searchParams.get('floor');

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const whereClause: any = { propertyId };
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (assignedStaffId) whereClause.assignedStaffId = assignedStaffId;
    if (roomId) whereClause.roomId = roomId;
    if (floor) {
      whereClause.room = { floor };
    }

    const tasks = await db.housekeepingTask.findMany({
      where: whereClause,
      include: {
        room: {
          select: { roomNumber: true, floor: true, availabilityStatus: true, housekeepingStatus: true, roomType: { select: { name: true } } },
        },
        assignedStaff: { select: { id: true, fullName: true, email: true } },
        assignedSupervisor: { select: { id: true, fullName: true } },
        guest: { select: { displayName: true, phone: true } },
        inspections: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch housekeeping tasks' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'housekeeping.tasks.create')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const body = await req.json();
    const { roomId, taskType, priority, assignedStaffId, notes, estimatedDuration, guestId, reservationId, isVip } = body;

    if (!roomId || !taskType) {
      return NextResponse.json({ error: 'Room ID and Task Type are required.' }, { status: 400 });
    }

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const taskRef = await generateReferenceNumber(propertyId, 'HK');
    const task = await db.housekeepingTask.create({
      data: {
        taskRef,
        propertyId,
        roomId,
        taskType,
        priority: priority || 'NORMAL',
        status: assignedStaffId ? 'ASSIGNED' : 'PENDING',
        assignedStaffId: assignedStaffId || null,
        createdById: session.userId,
        reservationId: reservationId || null,
        guestId: guestId || null,
        estimatedDuration: parseInt(estimatedDuration || '30', 10),
        notes: notes || null,
        isVip: !!isVip,
      },
      include: {
        room: { select: { roomNumber: true } },
        assignedStaff: { select: { fullName: true } },
      },
    });

    // Update room status if task is deep cleaning or stayover
    if (taskType === 'TOUCHUP_CLEANING' || taskType === 'DEEP_CLEANING') {
      await db.room.update({
        where: { id: roomId },
        data: { housekeepingStatus: 'CLEANING' },
      });
    }

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId,
      userId: session.userId,
      action: 'HOUSEKEEPING_TASK_CREATED',
      module: 'housekeeping',
      entityId: task.id,
      afterData: { taskRef, taskType, roomId, priority },
    });

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create housekeeping task' }, { status: 500 });
  }
}
