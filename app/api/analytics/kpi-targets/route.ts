import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    let targets = await db.kpiTarget.findMany({
      where: { propertyId },
    });

    if (targets.length === 0) {
      // Seed default KPI targets
      const defaults = [
        { kpiCode: 'OCCUPANCY', kpiName: 'Target Occupancy Rate', targetValue: 75.0, unit: '%' },
        { kpiCode: 'ADR', kpiName: 'Target Average Daily Rate', targetValue: 4000.0, unit: 'INR' },
        { kpiCode: 'REVPAR', kpiName: 'Target RevPAR', targetValue: 3000.0, unit: 'INR' },
        { kpiCode: 'HK_TURNAROUND', kpiName: 'Target Room Turnaround Time', targetValue: 30.0, unit: 'MINS' },
        { kpiCode: 'MAINT_RESOLUTION', kpiName: 'Target Maintenance Resolution', targetValue: 4.0, unit: 'HOURS' },
      ];

      for (const d of defaults) {
        await db.kpiTarget.upsert({
          where: { propertyId_kpiCode: { propertyId, kpiCode: d.kpiCode } },
          update: { targetValue: d.targetValue },
          create: { propertyId, ...d },
        });
      }

      targets = await db.kpiTarget.findMany({ where: { propertyId } });
    }

    return NextResponse.json({ targets });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch KPI targets' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const { kpiCode, kpiName, targetValue, unit } = body;

    if (!kpiCode || targetValue === undefined) {
      return NextResponse.json({ error: 'KPI code and target value are required.' }, { status: 400 });
    }

    const target = await db.kpiTarget.upsert({
      where: { propertyId_kpiCode: { propertyId, kpiCode } },
      update: { targetValue: parseFloat(targetValue), unit: unit || '%' },
      create: {
        propertyId,
        kpiCode,
        kpiName: kpiName || kpiCode,
        targetValue: parseFloat(targetValue),
        unit: unit || '%',
      },
    });

    return NextResponse.json({ success: true, target });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update KPI target' }, { status: 500 });
  }
}
