import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const savedReports = await db.savedReport.findMany({
      where: { propertyId },
      include: { owner: { select: { fullName: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ savedReports });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch saved reports' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const { reportName, dataset, dimensions, metrics, filters } = body;

    if (!reportName || !dataset) {
      return NextResponse.json({ error: 'Report name and dataset are required.' }, { status: 400 });
    }

    const saved = await db.savedReport.create({
      data: {
        propertyId,
        ownerId: session.userId,
        reportName: reportName.trim(),
        dataset,
        dimensions: JSON.stringify(dimensions || []),
        metrics: JSON.stringify(metrics || []),
        filters: JSON.stringify(filters || {}),
        isFavorite: false,
      },
    });

    return NextResponse.json({ success: true, savedReport: saved });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save report configuration' }, { status: 500 });
  }
}
