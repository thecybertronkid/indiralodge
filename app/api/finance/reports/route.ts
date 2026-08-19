import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { seedDefaultChartOfAccounts } from '@/lib/accountingPosting';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    await seedDefaultChartOfAccounts(propertyId);

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('type') || 'TRIAL_BALANCE'; // TRIAL_BALANCE, PNL, BALANCE_SHEET, GENERAL_LEDGER
    const accountId = searchParams.get('accountId');

    // 1. Fetch Chart of Accounts with lines
    const accounts = await db.chartOfAccount.findMany({
      where: { propertyId },
      include: {
        accountGroup: true,
        journalLines: {
          include: {
            journalEntry: { select: { entryRef: true, date: true, description: true, status: true } },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    // Compute Account Balances from General Ledger lines
    const processedAccounts = accounts.map((acc) => {
      const postedLines = acc.journalLines.filter((l) => l.journalEntry?.status === 'POSTED');
      const totalDebit = postedLines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = postedLines.reduce((sum, l) => sum + l.credit, 0);

      const netBalance = acc.normalBalance === 'DEBIT' ? totalDebit - totalCredit : totalCredit - totalDebit;

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        groupName: acc.accountGroup?.name || acc.type,
        normalBalance: acc.normalBalance,
        totalDebit,
        totalCredit,
        netBalance,
        lines: postedLines,
      };
    });

    // REPORT TYPE 1: TRIAL BALANCE
    if (reportType === 'TRIAL_BALANCE') {
      let totalDebits = 0;
      let totalCredits = 0;

      const tbLines = processedAccounts.map((acc) => {
        let debitCol = 0;
        let creditCol = 0;

        if (acc.normalBalance === 'DEBIT') {
          debitCol = Math.max(0, acc.netBalance);
          creditCol = acc.netBalance < 0 ? Math.abs(acc.netBalance) : 0;
        } else {
          creditCol = Math.max(0, acc.netBalance);
          debitCol = acc.netBalance < 0 ? Math.abs(acc.netBalance) : 0;
        }

        totalDebits += debitCol;
        totalCredits += creditCol;

        return {
          code: acc.code,
          name: acc.name,
          type: acc.type,
          debit: debitCol,
          credit: creditCol,
        };
      });

      return NextResponse.json({
        report: 'TRIAL_BALANCE',
        tbLines,
        totalDebits,
        totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      });
    }

    // REPORT TYPE 2: PROFIT & LOSS STATEMENT (P&L)
    if (reportType === 'PNL') {
      const revenues = processedAccounts.filter((a) => a.type === 'REVENUE');
      const expenses = processedAccounts.filter((a) => a.type === 'EXPENSE');

      const totalRevenue = revenues.reduce((sum, a) => sum + Math.max(0, a.netBalance), 0);
      const totalExpenses = expenses.reduce((sum, a) => sum + Math.max(0, a.netBalance), 0);
      const netProfit = totalRevenue - totalExpenses;

      return NextResponse.json({
        report: 'PROFIT_AND_LOSS',
        revenues: revenues.map((r) => ({ code: r.code, name: r.name, amount: Math.max(0, r.netBalance) })),
        expenses: expenses.map((e) => ({ code: e.code, name: e.name, amount: Math.max(0, e.netBalance) })),
        totalRevenue,
        totalExpenses,
        netProfit,
      });
    }

    // REPORT TYPE 3: BALANCE SHEET
    if (reportType === 'BALANCE_SHEET') {
      const assets = processedAccounts.filter((a) => a.type === 'ASSET');
      const liabilities = processedAccounts.filter((a) => a.type === 'LIABILITY');
      const equity = processedAccounts.filter((a) => a.type === 'EQUITY');

      const revenues = processedAccounts.filter((a) => a.type === 'REVENUE');
      const exp = processedAccounts.filter((a) => a.type === 'EXPENSE');
      const currentPeriodProfit = revenues.reduce((sum, a) => sum + Math.max(0, a.netBalance), 0) - exp.reduce((sum, a) => sum + Math.max(0, a.netBalance), 0);

      const totalAssets = assets.reduce((sum, a) => sum + Math.max(0, a.netBalance), 0);
      const totalLiabilities = liabilities.reduce((sum, a) => sum + Math.max(0, a.netBalance), 0);
      const totalEquity = equity.reduce((sum, a) => sum + Math.max(0, a.netBalance), 0) + currentPeriodProfit;

      return NextResponse.json({
        report: 'BALANCE_SHEET',
        assets: assets.map((a) => ({ code: a.code, name: a.name, amount: Math.max(0, a.netBalance) })),
        liabilities: liabilities.map((l) => ({ code: l.code, name: l.name, amount: Math.max(0, l.netBalance) })),
        equity: equity.map((e) => ({ code: e.code, name: e.name, amount: Math.max(0, e.netBalance) })),
        currentPeriodProfit,
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      });
    }

    // REPORT TYPE 4: GENERAL LEDGER RUNNING BALANCE
    if (reportType === 'GENERAL_LEDGER') {
      const targetAcc = accountId ? processedAccounts.find((a) => a.id === accountId) : processedAccounts[0];

      if (!targetAcc) return NextResponse.json({ ledgerLines: [], runningBalance: 0 });

      let runningBalance = 0;
      const ledgerLines = targetAcc.lines.map((l) => {
        const debit = l.debit;
        const credit = l.credit;

        if (targetAcc.normalBalance === 'DEBIT') {
          runningBalance += debit - credit;
        } else {
          runningBalance += credit - debit;
        }

        return {
          id: l.id,
          date: l.journalEntry.date,
          entryRef: l.journalEntry.entryRef,
          description: l.description || l.journalEntry.description,
          debit,
          credit,
          runningBalance,
        };
      });

      return NextResponse.json({
        report: 'GENERAL_LEDGER',
        account: { code: targetAcc.code, name: targetAcc.name, type: targetAcc.type },
        ledgerLines,
        closingBalance: runningBalance,
      });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate financial report' }, { status: 500 });
  }
}
