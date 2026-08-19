import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const linens = await db.linenLedger.findMany({
      where: { propertyId },
      include: { recordedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ linens });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch linen log' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const { itemType, action, quantity, notes } = body;

    if (!itemType || !action || !quantity) {
      return NextResponse.json({ error: 'Item type, action, and quantity are required.' }, { status: 400 });
    }

    const linen = await db.linenLedger.create({
      data: {
        propertyId,
        itemType,
        action,
        quantity: parseInt(quantity, 10),
        notes: notes || null,
        recordedById: session.userId,
      },
    });

    return NextResponse.json({ success: true, linen });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record linen log' }, { status: 500 });
  }
}
