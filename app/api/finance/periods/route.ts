import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getOrCreateOpenPeriod } from '@/lib/accountingPosting';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    // Ensure current period is initialized
    await getOrCreateOpenPeriod(propertyId);

    const periods = await db.accountingPeriod.findMany({
      where: { propertyId },
      include: {
        closedBy: { select: { fullName: true } },
        _count: { select: { journalEntries: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json({ periods });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch accounting periods' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const { periodId, action } = body; // action: 'close' | 'reopen'

    if (!periodId) {
      return NextResponse.json({ error: 'Period ID is required.' }, { status: 400 });
    }

    const period = await db.accountingPeriod.findUnique({
      where: { id: periodId },
      include: { journalEntries: true },
    });

    if (!period) return NextResponse.json({ error: 'Period not found.' }, { status: 404 });

    if (action === 'close') {
      // PERIOD CLOSING VALIDATION CHECKS
      const unpostedJournals = period.journalEntries.filter((j) => j.status === 'DRAFT' || j.status === 'PENDING_APPROVAL');
      if (unpostedJournals.length > 0) {
        return NextResponse.json(
          { error: `Cannot close period. There are ${unpostedJournals.length} unposted draft journal entries.` },
          { status: 400 }
        );
      }

      const updated = await db.accountingPeriod.update({
        where: { id: periodId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          closedById: session.userId,
        },
      });

      return NextResponse.json({ success: true, period: updated, message: 'Accounting period closed successfully.' });
    }

    if (action === 'reopen') {
      const updated = await db.accountingPeriod.update({
        where: { id: periodId },
        data: {
          status: 'OPEN',
          closedAt: null,
          closedById: null,
        },
      });

      return NextResponse.json({ success: true, period: updated, message: 'Accounting period reopened.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update period' }, { status: 500 });
  }
}
