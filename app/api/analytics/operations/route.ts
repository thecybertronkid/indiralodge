import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateOperationalAnalytics } from '@/lib/analyticsEngine';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 86400000);

    const ops = await calculateOperationalAnalytics(propertyId, startDate, now);

    // Staff Workload Breakdown
    const staffTasks = await db.housekeepingTask.findMany({
      where: { propertyId, createdAt: { gte: startDate } },
      include: { assignedStaff: { select: { fullName: true } } },
    });

    const staffMap: Record<string, { name: string; total: number; completed: number }> = {};
    staffTasks.forEach((t) => {
      const staffName = t.assignedStaff?.fullName || 'Unassigned';
      if (!staffMap[staffName]) staffMap[staffName] = { name: staffName, total: 0, completed: 0 };
      staffMap[staffName].total++;
      if (t.status === 'READY' || t.status === 'INSPECTION_REQUIRED') staffMap[staffName].completed++;
    });

    // Asset Maintenance Cost Breakdown
    const assets = await db.maintenanceAsset.findMany({
      where: { propertyId },
      include: {
        tickets: { select: { actualCost: true, status: true } },
      },
    });

    const assetCostMatrix = assets.map((a) => {
      const totalCost = a.tickets.reduce((sum, t) => sum + (t.actualCost || 0), 0);
      return {
        id: a.id,
        assetRef: a.assetRef,
        name: a.name,
        category: a.category,
        ticketCount: a.tickets.length,
        totalCost,
      };
    });

    return NextResponse.json({
      operationalKPIs: ops,
      staffWorkload: Object.values(staffMap),
      assetCostMatrix,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch operational analytics' }, { status: 500 });
  }
}
