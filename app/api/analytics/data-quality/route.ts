import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { reconcileOperationalVsAccountingRevenue } from '@/lib/analyticsEngine';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    // 1. Revenue Reconciliation (Folio vs GL)
    const revenueRecon = await reconcileOperationalVsAccountingRevenue(propertyId);

    // 2. Data Quality Anomaly Audits
    const unpostedJournals = await db.journalEntry.count({
      where: { propertyId, status: { in: ['DRAFT', 'PENDING_APPROVAL'] } },
    });

    const unassignedBookings = await db.reservation.count({
      where: { propertyId, status: 'CONFIRMED', assignedRoomId: null },
    });

    const unassignedHkTasks = await db.housekeepingTask.count({
      where: { propertyId, status: 'PENDING', assignedStaffId: null },
    });

    const unassignedMaintTickets = await db.maintenanceTicket.count({
      where: { propertyId, status: 'REPORTED', assignedTechnicianId: null },
    });

    const healthScore = Math.max(0, 100 - (unpostedJournals * 10 + unassignedBookings * 5 + (revenueRecon.isReconciled ? 0 : 20)));

    return NextResponse.json({
      healthScore,
      revenueRecon,
      audits: {
        unpostedJournals,
        unassignedBookings,
        unassignedHkTasks,
        unassignedMaintTickets,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to run data quality audit' }, { status: 500 });
  }
}
