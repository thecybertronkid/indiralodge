import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ticketId = params.id;
    const body = await req.json();
    const { action, assignedTechnicianId, status, resolutionSummary, labourCost, partsCost, actualCost } = body;

    const ticket = await db.maintenanceTicket.findUnique({
      where: { id: ticketId },
      include: { room: true },
    });

    if (!ticket) return NextResponse.json({ error: 'Maintenance ticket not found' }, { status: 404 });

    // Handle Assign Action
    if (assignedTechnicianId !== undefined) {
      if (!hasPermission(session.permissions, 'maintenance.ticket.assign')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
      }

      const updated = await db.maintenanceTicket.update({
        where: { id: ticketId },
        data: {
          assignedTechnicianId,
          status: ticket.status === 'REPORTED' ? 'ASSIGNED' : ticket.status,
        },
      });

      return NextResponse.json({ success: true, ticket: updated });
    }

    // Handle Start Work Action
    if (action === 'start') {
      if (!hasPermission(session.permissions, 'maintenance.ticket.manage')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
      }

      const updated = await db.maintenanceTicket.update({
        where: { id: ticketId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          assignedTechnicianId: session.userId,
        },
      });

      if (ticket.roomId) {
        await db.room.update({
          where: { id: ticket.roomId },
          data: { maintenanceStatus: 'MAINTENANCE' },
        });
      }

      return NextResponse.json({ success: true, ticket: updated });
    }

    // Handle Complete Repair Action
    if (action === 'complete') {
      if (!hasPermission(session.permissions, 'maintenance.ticket.manage')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
      }

      const lab = labourCost ? parseFloat(labourCost) : ticket.labourCost;
      const prt = partsCost ? parseFloat(partsCost) : ticket.partsCost;
      const tot = actualCost ? parseFloat(actualCost) : lab + prt;

      const updated = await db.maintenanceTicket.update({
        where: { id: taskIdCheck(ticketId) },
        data: {
          status: 'VERIFICATION_REQUIRED',
          resolutionSummary: resolutionSummary || 'Repair completed by technician',
          labourCost: lab,
          partsCost: prt,
          actualCost: tot,
        },
      });

      return NextResponse.json({ success: true, ticket: updated });
    }

    // Handle Verification & Resolution Action
    if (action === 'resolve') {
      if (!hasPermission(session.permissions, 'maintenance.ticket.resolve')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
      }

      const now = new Date();
      const updated = await db.maintenanceTicket.update({
        where: { id: ticketId },
        data: {
          status: 'RESOLVED',
          resolvedAt: now,
          verifiedAt: now,
        },
      });

      // If linked to room, return room maintenance status to OPERATIONAL & AVAILABLE
      if (ticket.roomId) {
        await db.room.update({
          where: { id: ticket.roomId },
          data: {
            maintenanceStatus: 'OPERATIONAL',
            availabilityStatus: 'AVAILABLE',
          },
        });
      }

      await logAuditEvent({
        organizationId: session.organizationId,
        propertyId: ticket.propertyId,
        userId: session.userId,
        action: 'MAINTENANCE_TICKET_RESOLVED',
        module: 'maintenance',
        entityId: ticketId,
        afterData: { ticketRef: ticket.ticketRef, actualCost: updated.actualCost },
      });

      return NextResponse.json({ success: true, ticket: updated });
    }

    // Handle Reopen Action
    if (action === 'reopen') {
      if (!hasPermission(session.permissions, 'maintenance.ticket.reopen')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
      }

      const updated = await db.maintenanceTicket.update({
        where: { id: ticketId },
        data: {
          status: 'REOPENED',
        },
      });

      return NextResponse.json({ success: true, ticket: updated });
    }

    return NextResponse.json({ error: 'Invalid maintenance action specified' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ticket update failed' }, { status: 500 });
  }
}

function taskIdCheck(id: string) {
  return id;
}
