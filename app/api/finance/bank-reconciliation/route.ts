import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    let bankAccounts = await db.bankAccount.findMany({
      where: { propertyId },
      include: { reconciliations: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });

    if (bankAccounts.length === 0) {
      // Seed default bank account linked to Chart of Accounts code 1200
      const bankCoa = await db.chartOfAccount.findUnique({
        where: { propertyId_code: { propertyId, code: '1200' } },
      });

      const defaultBank = await db.bankAccount.create({
        data: {
          propertyId,
          accountName: 'HDFC Hotel Operating Account',
          bankName: 'HDFC Bank',
          accountNumberMasked: '*******4921',
          accountType: 'CURRENT',
          openingBalance: 250000.0,
          currentBalance: 250000.0,
          accountId: bankCoa?.id || null,
        },
        include: { reconciliations: true },
      });

      bankAccounts = [defaultBank];
    }

    return NextResponse.json({ bankAccounts });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bank accounts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const { bankAccountId, statementClosingBalance, periodStart, periodEnd } = body;

    if (!bankAccountId || statementClosingBalance === undefined) {
      return NextResponse.json({ error: 'Bank account and statement closing balance are required.' }, { status: 400 });
    }

    const bankAcc = await db.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!bankAcc) return NextResponse.json({ error: 'Bank account not found.' }, { status: 404 });

    const stmtBalance = parseFloat(statementClosingBalance);
    const bookBalance = bankAcc.currentBalance;
    const discrepancy = Math.round((stmtBalance - bookBalance) * 100) / 100;

    const recon = await db.bankReconciliation.create({
      data: {
        propertyId,
        bankAccountId,
        periodStart: periodStart ? new Date(periodStart) : new Date(Date.now() - 30 * 86400000),
        periodEnd: periodEnd ? new Date(periodEnd) : new Date(),
        statementClosingBalance: stmtBalance,
        bookBalance,
        reconciledBalance: stmtBalance,
        discrepancy,
        status: 'COMPLETED',
        reconciledById: session.userId,
      },
    });

    return NextResponse.json({ success: true, reconciliation: recon });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to execute bank reconciliation' }, { status: 500 });
  }
}
