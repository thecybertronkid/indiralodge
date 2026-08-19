import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateExecutiveMetrics, generateExecutiveInsights } from '@/lib/analyticsEngine';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const periodParam = searchParams.get('period') || '30DAYS'; // TODAY, 7DAYS, 30DAYS, THIS_MONTH, THIS_YEAR

    const now = new Date();
    let startDate = new Date(now.getTime() - 30 * 86400000);
    let endDate = now;

    if (periodParam === 'TODAY') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (periodParam === '7DAYS') {
      startDate = new Date(now.getTime() - 7 * 86400000);
    } else if (periodParam === 'THIS_MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (periodParam === 'THIS_YEAR') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    // Current Period Metrics
    const metrics = await calculateExecutiveMetrics(propertyId, startDate, endDate);

    // Baseline Previous Period Metrics (Same duration prior)
    const diffMs = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - diffMs);
    const prevEndDate = startDate;
    const prevMetrics = await calculateExecutiveMetrics(propertyId, prevStartDate, prevEndDate);

    // Automated Insights
    const insights = generateExecutiveInsights(metrics, prevMetrics);

    return NextResponse.json({
      period: periodParam,
      startDate,
      endDate,
      metrics,
      prevMetrics,
      insights,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch executive analytics' }, { status: 500 });
  }
}
