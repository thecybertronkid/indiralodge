import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    let items = await db.housekeepingChecklist.findMany({
      where: { propertyId },
      orderBy: { category: 'asc' },
    });

    // Seed standard initial items if empty
    if (items.length === 0) {
      const defaults = [
        { category: 'BEDROOM', itemText: 'Bed properly made & clean linen replaced', isRequired: true },
        { category: 'BEDROOM', itemText: 'Pillows arranged & bedsheets tight', isRequired: true },
        { category: 'BEDROOM', itemText: 'Floor vacuumed / swept clean', isRequired: true },
        { category: 'BEDROOM', itemText: 'Furniture dusted and clean', isRequired: false },
        { category: 'BATHROOM', itemText: 'Toilet disinfected and cleaned', isRequired: true },
        { category: 'BATHROOM', itemText: 'Shower glass & tiles scrubbed clean', isRequired: true },
        { category: 'BATHROOM', itemText: 'Sink & mirror streak-free', isRequired: true },
        { category: 'BATHROOM', itemText: 'Fresh bath & hand towels placed', isRequired: true },
        { category: 'BATHROOM', itemText: 'Toiletries & soap replenished', isRequired: true },
        { category: 'ROOM_GENERAL', itemText: 'AC unit & remote functioning', isRequired: true },
        { category: 'ROOM_GENERAL', itemText: 'TV & set-top box remote checked', isRequired: false },
        { category: 'ROOM_GENERAL', itemText: 'All room lights & switches operational', isRequired: true },
        { category: 'ROOM_GENERAL', itemText: 'Curtains clean & dustbin emptied', isRequired: true },
      ];

      for (const d of defaults) {
        await db.housekeepingChecklist.create({
          data: { propertyId, ...d },
        });
      }

      items = await db.housekeepingChecklist.findMany({
        where: { propertyId },
        orderBy: { category: 'asc' },
      });
    }

    return NextResponse.json({ checklists: items });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch checklists' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const { category, itemText, isRequired } = body;

    if (!category || !itemText) {
      return NextResponse.json({ error: 'Category and item text are required.' }, { status: 400 });
    }

    const item = await db.housekeepingChecklist.create({
      data: {
        propertyId,
        category,
        itemText: itemText.trim(),
        isRequired: !!isRequired,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add checklist item' }, { status: 500 });
  }
}
