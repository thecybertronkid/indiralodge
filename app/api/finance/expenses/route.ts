import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { getOrCreateOpenPeriod } from '@/lib/accountingPosting';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const expenses = await db.expense.findMany({
      where: { propertyId },
      include: {
        account: { select: { code: true, name: true } },
        vendor: { select: { name: true, vendorRef: true } },
        createdBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const { category, accountId, vendorId, amount, taxAmount, paymentMethod, description, attachmentUrl } = body;

    if (!category || !accountId || !amount || !description) {
      return NextResponse.json({ error: 'Category, account, amount, and description are required.' }, { status: 400 });
    }

    const baseAmount = parseFloat(amount);
    const tax = parseFloat(taxAmount || '0');
    const totalAmount = baseAmount + tax;

    const expenseRef = await generateReferenceNumber(propertyId, 'EXP');

    const expense = await db.expense.create({
      data: {
        expenseRef,
        propertyId,
        date: new Date(),
        category,
        accountId,
        vendorId: vendorId || null,
        amount: baseAmount,
        taxAmount: tax,
        totalAmount,
        paymentMethod: paymentMethod || 'CASH',
        description: description.trim(),
        attachmentUrl: attachmentUrl || null,
        status: 'SUBMITTED',
        createdById: session.userId,
      },
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit expense' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { expenseId, action } = body; // action: 'approve' | 'post' | 'reject'

    if (!expenseId || !action) {
      return NextResponse.json({ error: 'Expense ID and action are required.' }, { status: 400 });
    }

    const expense = await db.expense.findUnique({
      where: { id: expenseId },
      include: { account: true },
    });

    if (!expense) return NextResponse.json({ error: 'Expense not found.' }, { status: 404 });

    if (action === 'approve') {
      const updated = await db.expense.update({
        where: { id: expenseId },
        data: {
          status: 'APPROVED',
          approvedById: session.userId,
          approvedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, expense: updated, message: 'Expense approved!' });
    }

    if (action === 'post') {
      if (expense.status !== 'APPROVED') {
        return NextResponse.json({ error: 'Expense must be APPROVED before posting to General Ledger.' }, { status: 400 });
      }

      const period = await getOrCreateOpenPeriod(expense.propertyId);

      // Determine Credit Account (Cash 1100, Bank 1200, or Accounts Payable 2100)
      let creditCode = '1100';
      if (expense.paymentMethod === 'BANK_TRANSFER') creditCode = '1200';
      if (expense.paymentMethod === 'CREDIT' || expense.vendorId) creditCode = '2100';

      const creditAccount = await db.chartOfAccount.findUnique({
        where: { propertyId_code: { propertyId: expense.propertyId, code: creditCode } },
      });

      if (!creditAccount) {
        return NextResponse.json({ error: `System Account ${creditCode} not found for expense posting.` }, { status: 400 });
      }

      const jeRef = await generateReferenceNumber(expense.propertyId, 'JE');

      // Create Double-Entry Journal Entry for Expense
      await db.journalEntry.create({
        data: {
          entryRef: jeRef,
          propertyId: expense.propertyId,
          periodId: period.id,
          date: new Date(),
          sourceModule: 'EXPENSE',
          sourceReference: expense.expenseRef,
          description: `Expense Posting: ${expense.expenseRef} (${expense.description})`,
          status: 'POSTED',
          totalDebit: expense.totalAmount,
          totalCredit: expense.totalAmount,
          createdById: session.userId,
          postedById: session.userId,
          postedAt: new Date(),
          lines: {
            create: [
              { accountId: expense.accountId, debit: expense.totalAmount, credit: 0, description: expense.description, costCenter: 'ADMIN' },
              { accountId: creditAccount.id, debit: 0, credit: expense.totalAmount, description: `Expense Offset (${expense.paymentMethod})`, costCenter: 'ADMIN' },
            ],
          },
        },
      });

      const updated = await db.expense.update({
        where: { id: expenseId },
        data: { status: 'POSTED' },
      });

      return NextResponse.json({ success: true, expense: updated, message: 'Expense posted to General Ledger!' });
    }

    if (action === 'reject') {
      const updated = await db.expense.update({
        where: { id: expenseId },
        data: { status: 'REJECTED' },
      });
      return NextResponse.json({ success: true, expense: updated, message: 'Expense rejected.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update expense' }, { status: 500 });
  }
}
