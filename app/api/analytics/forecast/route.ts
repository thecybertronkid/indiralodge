import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateForecast } from '@/lib/analyticsEngine';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const forecastData = await generateForecast(propertyId);

    return NextResponse.json(forecastData);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate occupancy and revenue forecast' }, { status: 500 });
  }
}
