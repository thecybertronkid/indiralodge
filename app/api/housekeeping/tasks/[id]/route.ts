import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const taskId = params.id;
    const body = await req.json();
    const { action, assignedStaffId, priority, notes } = body;

    const task = await db.housekeepingTask.findUnique({
      where: { id: taskId },
      include: { room: true },
    });

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // Handle Assign Action
    if (assignedStaffId !== undefined) {
      if (!hasPermission(session.permissions, 'housekeeping.tasks.assign')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permission to assign staff' }, { status: 403 });
      }

      const updated = await db.housekeepingTask.update({
        where: { id: taskId },
        data: {
          assignedStaffId,
          status: task.status === 'PENDING' ? 'ASSIGNED' : task.status,
        },
      });

      return NextResponse.json({ success: true, task: updated });
    }

    // Handle Start Cleaning Action
    if (action === 'start') {
      if (!hasPermission(session.permissions, 'housekeeping.tasks.manage')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
      }

      // Concurrency protection: Reject if already in progress or completed
      if (task.status === 'IN_PROGRESS' || task.status === 'CLEANING_COMPLETED') {
        return NextResponse.json({
          error: `Task is already ${task.status.replace(/_/g, ' ').toLowerCase()} by another user.`,
        }, { status: 409 });
      }

      const updated = await db.housekeepingTask.update({
        where: { id: taskId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          assignedStaffId: session.userId,
        },
      });

      // Update room status
      await db.room.update({
        where: { id: task.roomId },
        data: { housekeepingStatus: 'CLEANING' },
      });

      await logAuditEvent({
        organizationId: session.organizationId,
        propertyId: task.propertyId,
        userId: session.userId,
        action: 'HOUSEKEEPING_TASK_STARTED',
        module: 'housekeeping',
        entityId: taskId,
        afterData: { roomNumber: task.room.roomNumber },
      });

      return NextResponse.json({ success: true, task: updated });
    }

    // Handle Complete Cleaning Action
    if (action === 'complete') {
      if (!hasPermission(session.permissions, 'housekeeping.tasks.manage')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
      }

      const completedAt = new Date();
      let actualDuration = task.estimatedDuration;
      if (task.startedAt) {
        actualDuration = Math.max(1, Math.round((completedAt.getTime() - new Date(task.startedAt).getTime()) / (1000 * 60)));
      }

      const updated = await db.housekeepingTask.update({
        where: { id: taskId },
        data: {
          status: 'INSPECTION_REQUIRED',
          completedAt,
          actualDuration,
          notes: notes ? `${task.notes || ''}\nCompletion Note: ${notes}` : task.notes,
        },
      });

      // Update room housekeeping status
      await db.room.update({
        where: { id: task.roomId },
        data: { housekeepingStatus: 'INSPECTED' },
      });

      await logAuditEvent({
        organizationId: session.organizationId,
        propertyId: task.propertyId,
        userId: session.userId,
        action: 'HOUSEKEEPING_TASK_COMPLETED',
        module: 'housekeeping',
        entityId: taskId,
        afterData: { actualDuration },
      });

      return NextResponse.json({ success: true, task: updated });
    }

    return NextResponse.json({ error: 'Invalid task action specified' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Task update failed' }, { status: 500 });
  }
}
