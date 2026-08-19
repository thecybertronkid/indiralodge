import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateReferenceNumber } from '@/lib/refGenerator';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const assets = await db.maintenanceAsset.findMany({
      where: { propertyId },
      include: {
        room: { select: { roomNumber: true } },
        tickets: { select: { id: true, status: true } },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 86400000);

    const enrichedAssets = assets.map((a) => {
      const isExpiringSoon = a.warrantyExpiry ? new Date(a.warrantyExpiry) <= thirtyDaysAhead && new Date(a.warrantyExpiry) >= now : false;
      return {
        ...a,
        isExpiringSoon,
      };
    });

    return NextResponse.json({ assets: enrichedAssets });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch assets register' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const { name, category, roomId, brand, model, serialNumber, location, warrantyExpiry, notes } = body;

    if (!name || !category) {
      return NextResponse.json({ error: 'Asset name and category are required.' }, { status: 400 });
    }

    const assetRef = await generateReferenceNumber(propertyId, 'AST');
    const asset = await db.maintenanceAsset.create({
      data: {
        assetRef,
        propertyId,
        roomId: roomId || null,
        name: name.trim(),
        category,
        brand: brand || null,
        model: model || null,
        serialNumber: serialNumber || null,
        location: location || null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, asset });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}
