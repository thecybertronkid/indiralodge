import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { seedPropertyDefaults } from '@/lib/seed';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    let sources = await db.bookingSource.findMany({
      where: { propertyId, isActive: true },
      orderBy: { name: 'asc' },
    });

    if (sources.length === 0) {
      await seedPropertyDefaults(propertyId);
      sources = await db.bookingSource.findMany({
        where: { propertyId, isActive: true },
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json({ sources });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch booking sources' }, { status: 500 });
  }
}
