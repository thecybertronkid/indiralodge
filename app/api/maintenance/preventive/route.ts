import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const plans = await db.preventiveMaintenancePlan.findMany({
      where: { propertyId },
      include: {
        asset: { select: { name: true, assetRef: true } },
        room: { select: { roomNumber: true } },
        assignedTechnician: { select: { fullName: true } },
      },
      orderBy: { nextDue: 'asc' },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch preventive maintenance plans' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const { taskTitle, frequencyDays, assetId, roomId, assignedTechnicianId } = body;

    if (!taskTitle || !frequencyDays) {
      return NextResponse.json({ error: 'Task title and frequency days are required.' }, { status: 400 });
    }

    const freq = parseInt(frequencyDays, 10);
    const nextDue = new Date(Date.now() + freq * 86400000);

    const plan = await db.preventiveMaintenancePlan.create({
      data: {
        propertyId,
        taskTitle: taskTitle.trim(),
        frequencyDays: freq,
        assetId: assetId || null,
        roomId: roomId || null,
        assignedTechnicianId: assignedTechnicianId || null,
        nextDue,
      },
    });

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create preventive plan' }, { status: 500 });
  }
}
