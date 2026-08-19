import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const amenities = await db.amenitiesConsumption.findMany({
      where: { propertyId },
      include: {
        room: { select: { roomNumber: true } },
        recordedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ amenities });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch amenities log' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const { roomId, item, quantity } = body;

    if (!roomId || !item) {
      return NextResponse.json({ error: 'Room ID and Item name are required.' }, { status: 400 });
    }

    const log = await db.amenitiesConsumption.create({
      data: {
        propertyId,
        roomId,
        item,
        quantity: parseInt(quantity || '1', 10),
        recordedById: session.userId,
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to log amenity consumption' }, { status: 500 });
  }
}
