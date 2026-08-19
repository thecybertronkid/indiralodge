import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'housekeeping.inspection.manage')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const body = await req.json();
    const { taskId, result, checklistData, failedItems, reason } = body;

    if (!taskId || !result) {
      return NextResponse.json({ error: 'Task ID and inspection result (PASS/FAIL) are required.' }, { status: 400 });
    }

    const task = await db.housekeepingTask.findUnique({
      where: { id: taskId },
      include: { room: true },
    });

    if (!task) return NextResponse.json({ error: 'Housekeeping task not found' }, { status: 404 });

    // Create Inspection Record
    const inspection = await db.housekeepingInspection.create({
      data: {
        taskId,
        roomId: task.roomId,
        inspectorId: session.userId,
        result,
        checklistData: checklistData ? JSON.stringify(checklistData) : null,
        failedItems: failedItems ? JSON.stringify(failedItems) : null,
        reason: reason || null,
      },
    });

    if (result === 'PASS') {
      // 1. Task becomes READY
      await db.housekeepingTask.update({
        where: { id: taskId },
        data: {
          status: 'READY',
          inspectedAt: new Date(),
          assignedSupervisorId: session.userId,
        },
      });

      // 2. Update physical room status to CLEAN
      await db.room.update({
        where: { id: task.roomId },
        data: {
          housekeepingStatus: 'CLEAN',
        },
      });
    } else {
      // FAIL: Task returned to IN_PROGRESS / INSPECTION_FAILED
      await db.housekeepingTask.update({
        where: { id: taskId },
        data: {
          status: 'INSPECTION_FAILED',
          failedReason: reason || 'Inspection checklist failed',
          assignedSupervisorId: session.userId,
        },
      });

      // Room returns to DIRTY / Cleaning Required
      await db.room.update({
        where: { id: task.roomId },
        data: {
          housekeepingStatus: 'DIRTY',
        },
      });
    }

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: task.propertyId,
      userId: session.userId,
      action: result === 'PASS' ? 'ROOM_INSPECTION_PASSED' : 'ROOM_INSPECTION_FAILED',
      module: 'housekeeping',
      entityId: inspection.id,
      afterData: { roomNumber: task.room.roomNumber, result, reason },
    });

    return NextResponse.json({ success: true, inspection });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Inspection recording failed' }, { status: 500 });
  }
}
