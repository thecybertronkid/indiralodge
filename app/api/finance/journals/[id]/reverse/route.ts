import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { getOrCreateOpenPeriod } from '@/lib/accountingPosting';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const journalId = params.id;
    const journal = await db.journalEntry.findUnique({
      where: { id: journalId },
      include: { lines: true },
    });

    if (!journal) return NextResponse.json({ error: 'Journal entry not found.' }, { status: 404 });
    if (journal.status === 'REVERSED') {
      return NextResponse.json({ error: 'Journal entry is already reversed.' }, { status: 400 });
    }

    const period = await getOrCreateOpenPeriod(journal.propertyId);
    if (period.status !== 'OPEN') {
      return NextResponse.json({ error: 'Cannot post reversal to a closed accounting period.' }, { status: 400 });
    }

    const reversalRef = await generateReferenceNumber(journal.propertyId, 'JE');

    // Create reversing lines by swapping Debits and Credits
    const reversingLines = journal.lines.map((l) => ({
      accountId: l.accountId,
      debit: l.credit,
      credit: l.debit,
      description: `Reversal of ${journal.entryRef}: ${l.description || ''}`,
      costCenter: l.costCenter,
    }));

    const reversalJournal = await db.journalEntry.create({
      data: {
        entryRef: reversalRef,
        propertyId: journal.propertyId,
        periodId: period.id,
        date: new Date(),
        sourceModule: journal.sourceModule,
        sourceReference: journal.entryRef,
        description: `REVERSAL ENTRY for ${journal.entryRef} - ${journal.description}`,
        status: 'POSTED',
        totalDebit: journal.totalCredit,
        totalCredit: journal.totalDebit,
        isReversal: true,
        reversedRef: journal.entryRef,
        createdById: session.userId,
        postedById: session.userId,
        postedAt: new Date(),
        lines: {
          create: reversingLines,
        },
      },
    });

    // Mark original journal as REVERSED
    await db.journalEntry.update({
      where: { id: journalId },
      data: {
        status: 'REVERSED',
        reversedRef: reversalRef,
      },
    });

    return NextResponse.json({ success: true, reversalJournal });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to reverse journal entry' }, { status: 500 });
  }
}
