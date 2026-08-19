import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { seedDefaultChartOfAccounts } from '@/lib/accountingPosting';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    // Seed default Chart of Accounts if empty
    await seedDefaultChartOfAccounts(propertyId);

    const accounts = await db.chartOfAccount.findMany({
      where: { propertyId },
      include: {
        accountGroup: { select: { name: true, normalBalance: true } },
        parentAccount: { select: { name: true, code: true } },
        journalLines: { select: { debit: true, credit: true } },
      },
      orderBy: { code: 'asc' },
    });

    const enrichedAccounts = accounts.map((acc) => {
      const totalDebits = acc.journalLines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredits = acc.journalLines.reduce((sum, l) => sum + l.credit, 0);
      const balance = acc.normalBalance === 'DEBIT' ? totalDebits - totalCredits : totalCredits - totalDebits;

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        groupName: acc.accountGroup?.name || acc.type,
        parentAccount: acc.parentAccount ? `${acc.parentAccount.code} - ${acc.parentAccount.name}` : null,
        normalBalance: acc.normalBalance,
        isSystemAccount: acc.isSystemAccount,
        systemType: acc.systemType,
        isActive: acc.isActive,
        totalDebits,
        totalCredits,
        balance,
      };
    });

    return NextResponse.json({ accounts: enrichedAccounts });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Chart of Accounts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const { code, name, type, parentAccountId, description } = body;

    if (!code || !name || !type) {
      return NextResponse.json({ error: 'Account code, name, and type are required.' }, { status: 400 });
    }

    const groupCodeMap: Record<string, string> = {
      ASSET: '1000',
      LIABILITY: '2000',
      EQUITY: '3000',
      REVENUE: '4000',
      EXPENSE: '5000',
    };

    const group = await db.accountGroup.findUnique({ where: { code: groupCodeMap[type] || '1000' } });
    if (!group) return NextResponse.json({ error: 'Invalid account group mapping' }, { status: 400 });

    const normalBalance = type === 'ASSET' || type === 'EXPENSE' ? 'DEBIT' : 'CREDIT';

    const account = await db.chartOfAccount.create({
      data: {
        propertyId,
        code: code.trim(),
        name: name.trim(),
        type,
        accountGroupId: group.id,
        parentAccountId: parentAccountId || null,
        normalBalance,
        isSystemAccount: false,
        description: description || null,
      },
    });

    return NextResponse.json({ success: true, account });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create account' }, { status: 500 });
  }
}
