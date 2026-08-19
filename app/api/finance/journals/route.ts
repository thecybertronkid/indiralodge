import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { getOrCreateOpenPeriod } from '@/lib/accountingPosting';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const sourceModule = searchParams.get('sourceModule');

    const where: any = { propertyId };
    if (sourceModule && sourceModule !== 'ALL') {
      where.sourceModule = sourceModule;
    }

    const journals = await db.journalEntry.findMany({
      where,
      include: {
        period: { select: { name: true } },
        createdBy: { select: { fullName: true } },
        postedBy: { select: { fullName: true } },
        lines: {
          include: {
            account: { select: { code: true, name: true, type: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ journals });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch journal entries' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const { description, lines, sourceModule } = body;

    if (!description || !lines || !Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json({ error: 'A journal entry must have a description and at least two lines.' }, { status: 400 });
    }

    const period = await getOrCreateOpenPeriod(propertyId);
    if (period.status !== 'OPEN') {
      return NextResponse.json({ error: 'Cannot post journal entry to a closed accounting period.' }, { status: 400 });
    }

    // Double-Entry Accounting Rule Validation
    let totalDebit = 0;
    let totalCredit = 0;

    const formattedLines = lines.map((l: any) => {
      const debit = parseFloat(l.debit || '0');
      const credit = parseFloat(l.credit || '0');
      totalDebit += debit;
      totalCredit += credit;

      return {
        accountId: l.accountId,
        debit,
        credit,
        description: l.description || description,
        costCenter: l.costCenter || 'GENERAL',
      };
    });

    // Check balance (allowing minor 0.01 precision delta)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: `Unbalanced journal entry! Total Debits (₹${totalDebit.toFixed(2)}) must equal Total Credits (₹${totalCredit.toFixed(2)}).` },
        { status: 400 }
      );
    }

    const entryRef = await generateReferenceNumber(propertyId, 'JE');

    const journal = await db.journalEntry.create({
      data: {
        entryRef,
        propertyId,
        periodId: period.id,
        date: new Date(),
        sourceModule: sourceModule || 'MANUAL',
        description: description.trim(),
        status: 'POSTED',
        totalDebit,
        totalCredit,
        createdById: session.userId,
        postedById: session.userId,
        postedAt: new Date(),
        lines: {
          create: formattedLines,
        },
      },
      include: {
        lines: {
          include: { account: { select: { code: true, name: true } } },
        },
      },
    });

    return NextResponse.json({ success: true, journal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to post journal entry' }, { status: 500 });
  }
}
