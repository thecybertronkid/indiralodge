import { db } from '@/lib/db';
import { generateReferenceNumber } from '@/lib/refGenerator';

/**
 * Ensures initial Account Groups & Default Chart of Accounts exist for a property
 */
export async function seedDefaultChartOfAccounts(propertyId: string) {
  // 1. Ensure Account Groups
  const groups = [
    { code: '1000', name: 'ASSETS', normalBalance: 'DEBIT' },
    { code: '2000', name: 'LIABILITIES', normalBalance: 'CREDIT' },
    { code: '3000', name: 'EQUITY', normalBalance: 'CREDIT' },
    { code: '4000', name: 'REVENUE', normalBalance: 'CREDIT' },
    { code: '5000', name: 'EXPENSES', normalBalance: 'DEBIT' },
  ];

  for (const g of groups) {
    await db.accountGroup.upsert({
      where: { code: g.code },
      update: { name: g.name, normalBalance: g.normalBalance },
      create: { code: g.code, name: g.name, normalBalance: g.normalBalance },
    });
  }

  const assetGroup = await db.accountGroup.findUnique({ where: { code: '1000' } });
  const liabGroup = await db.accountGroup.findUnique({ where: { code: '2000' } });
  const eqGroup = await db.accountGroup.findUnique({ where: { code: '3000' } });
  const revGroup = await db.accountGroup.findUnique({ where: { code: '4000' } });
  const expGroup = await db.accountGroup.findUnique({ where: { code: '5000' } });

  if (!assetGroup || !liabGroup || !eqGroup || !revGroup || !expGroup) return;

  const defaultAccounts = [
    { code: '1100', name: 'Cash in Safe / Counter', type: 'ASSET', accountGroupId: assetGroup.id, normalBalance: 'DEBIT', isSystemAccount: true, systemType: 'CASH' },
    { code: '1200', name: 'Bank Account (HDFC/Operating)', type: 'ASSET', accountGroupId: assetGroup.id, normalBalance: 'DEBIT', isSystemAccount: true, systemType: 'BANK' },
    { code: '1300', name: 'Guest Accounts Receivable', type: 'ASSET', accountGroupId: assetGroup.id, normalBalance: 'DEBIT', isSystemAccount: true, systemType: 'AR' },
    { code: '2100', name: 'Accounts Payable (Vendors)', type: 'LIABILITY', accountGroupId: liabGroup.id, normalBalance: 'CREDIT', isSystemAccount: true, systemType: 'AP' },
    { code: '2200', name: 'Guest Advance / Deposit Liability', type: 'LIABILITY', accountGroupId: liabGroup.id, normalBalance: 'CREDIT', isSystemAccount: true, systemType: 'GUEST_DEPOSIT' },
    { code: '2300', name: 'GST Tax Payable (CGST/SGST/IGST)', type: 'LIABILITY', accountGroupId: liabGroup.id, normalBalance: 'CREDIT', isSystemAccount: true, systemType: 'TAX_PAYABLE' },
    { code: '3100', name: 'Owner Equity Capital', type: 'EQUITY', accountGroupId: eqGroup.id, normalBalance: 'CREDIT', isSystemAccount: true, systemType: null },
    { code: '3200', name: 'Retained Earnings', type: 'EQUITY', accountGroupId: eqGroup.id, normalBalance: 'CREDIT', isSystemAccount: true, systemType: 'RETAINED_EARNINGS' },
    { code: '4100', name: 'Room Night Tariff Revenue', type: 'REVENUE', accountGroupId: revGroup.id, normalBalance: 'CREDIT', isSystemAccount: true, systemType: 'ROOM_REVENUE' },
    { code: '4200', name: 'Other Hotel Services Revenue', type: 'REVENUE', accountGroupId: revGroup.id, normalBalance: 'CREDIT', isSystemAccount: false, systemType: null },
    { code: '5100', name: 'Maintenance & Repair Expense', type: 'EXPENSE', accountGroupId: expGroup.id, normalBalance: 'DEBIT', isSystemAccount: false, systemType: null },
    { code: '5200', name: 'Electricity & Utilities Expense', type: 'EXPENSE', accountGroupId: expGroup.id, normalBalance: 'DEBIT', isSystemAccount: false, systemType: null },
    { code: '5300', name: 'Housekeeping & Supplies Expense', type: 'EXPENSE', accountGroupId: expGroup.id, normalBalance: 'DEBIT', isSystemAccount: false, systemType: null },
    { code: '5400', name: 'Staff Salaries Expense', type: 'EXPENSE', accountGroupId: expGroup.id, normalBalance: 'DEBIT', isSystemAccount: false, systemType: null },
  ];

  for (const acc of defaultAccounts) {
    await db.chartOfAccount.upsert({
      where: { propertyId_code: { propertyId, code: acc.code } },
      update: { name: acc.name, type: acc.type, isSystemAccount: acc.isSystemAccount, systemType: acc.systemType },
      create: { propertyId, ...acc },
    });
  }
}

/**
 * Gets or creates the current month's open accounting period
 */
export async function getOrCreateOpenPeriod(propertyId: string) {
  const now = new Date();
  const monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let period = await db.accountingPeriod.findUnique({
    where: { propertyId_name: { propertyId, name: monthName } },
  });

  if (!period) {
    period = await db.accountingPeriod.create({
      data: {
        propertyId,
        name: monthName,
        startDate,
        endDate,
        status: 'OPEN',
      },
    });
  }

  return period;
}

/**
 * Automatic Posting for Room Charges:
 * Debit: Guest Accounts Receivable (1300)
 * Credit: Room Revenue (4100)
 */
export async function postRoomChargeJournal(params: {
  propertyId: string;
  amount: number;
  description: string;
  sourceReference: string; // Folio transactionRef
  userId?: string;
}) {
  await seedDefaultChartOfAccounts(params.propertyId);
  const period = await getOrCreateOpenPeriod(params.propertyId);

  // Idempotency check: Don't post twice for same sourceReference
  const existing = await db.journalEntry.findFirst({
    where: { propertyId: params.propertyId, sourceReference: params.sourceReference },
  });

  if (existing) return existing;

  const arAccount = await db.chartOfAccount.findUnique({
    where: { propertyId_code: { propertyId: params.propertyId, code: '1300' } },
  });
  const revAccount = await db.chartOfAccount.findUnique({
    where: { propertyId_code: { propertyId: params.propertyId, code: '4100' } },
  });

  if (!arAccount || !revAccount) throw new Error('System Chart of Accounts (1300/4100) missing');

  const jeRef = await generateReferenceNumber(params.propertyId, 'JE');

  return await db.journalEntry.create({
    data: {
      entryRef: jeRef,
      propertyId: params.propertyId,
      periodId: period.id,
      date: new Date(),
      sourceModule: 'FOLIO',
      sourceReference: params.sourceReference,
      description: params.description,
      status: 'POSTED',
      totalDebit: params.amount,
      totalCredit: params.amount,
      createdById: params.userId || null,
      postedById: params.userId || null,
      postedAt: new Date(),
      lines: {
        create: [
          { accountId: arAccount.id, debit: params.amount, credit: 0, description: 'Guest Folio Debit', costCenter: 'FRONT_OFFICE' },
          { accountId: revAccount.id, debit: 0, credit: params.amount, description: 'Room Tariff Revenue', costCenter: 'FRONT_OFFICE' },
        ],
      },
    },
  });
}

/**
 * Automatic Posting for Payments:
 * Debit: Cash (1100) or Bank (1200)
 * Credit: Guest Accounts Receivable (1300)
 */
export async function postPaymentJournal(params: {
  propertyId: string;
  amount: number;
  method: string;
  description: string;
  sourceReference: string; // paymentRef
  userId?: string;
}) {
  await seedDefaultChartOfAccounts(params.propertyId);
  const period = await getOrCreateOpenPeriod(params.propertyId);

  const existing = await db.journalEntry.findFirst({
    where: { propertyId: params.propertyId, sourceReference: params.sourceReference },
  });

  if (existing) return existing;

  const isCash = params.method === 'CASH';
  const targetCode = isCash ? '1100' : '1200';

  const assetAccount = await db.chartOfAccount.findUnique({
    where: { propertyId_code: { propertyId: params.propertyId, code: targetCode } },
  });
  const arAccount = await db.chartOfAccount.findUnique({
    where: { propertyId_code: { propertyId: params.propertyId, code: '1300' } },
  });

  if (!assetAccount || !arAccount) throw new Error('System Chart of Accounts missing');

  const jeRef = await generateReferenceNumber(params.propertyId, 'JE');

  return await db.journalEntry.create({
    data: {
      entryRef: jeRef,
      propertyId: params.propertyId,
      periodId: period.id,
      date: new Date(),
      sourceModule: 'PAYMENT',
      sourceReference: params.sourceReference,
      description: params.description,
      status: 'POSTED',
      totalDebit: params.amount,
      totalCredit: params.amount,
      createdById: params.userId || null,
      postedById: params.userId || null,
      postedAt: new Date(),
      lines: {
        create: [
          { accountId: assetAccount.id, debit: params.amount, credit: 0, description: `Payment Received (${params.method})`, costCenter: 'FRONT_OFFICE' },
          { accountId: arAccount.id, debit: 0, credit: params.amount, description: 'Guest Receivable Credit', costCenter: 'FRONT_OFFICE' },
        ],
      },
    },
  });
}
