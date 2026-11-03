import { db } from '@/lib/db';

export type RefPrefix =
  | 'GST'
  | 'RES'
  | 'FOL'
  | 'TRX'
  | 'PAY'
  | 'HK'
  | 'LF'
  | 'MT'
  | 'AST'
  | 'ACC'
  | 'JE'
  | 'INV'
  | 'BIL'
  | 'CN'
  | 'DN'
  | 'EXP'
  | 'VND';

/**
 * Multi-prefix Reference Sequence Generator
 * Produces codes formatted as: PREFIX-YYYY-XXXXXX (e.g. JE-2026-000001, INV-2026-000001, EXP-2026-000001)
 */
export async function generateReferenceNumber(
  propertyId: string,
  prefix: RefPrefix = 'RES'
): Promise<string> {
  const currentYear = new Date().getFullYear();

  return await db.$transaction(async (tx) => {
    const counter = await tx.referenceCounter.upsert({
      where: {
        propertyId_prefix_year: {
          propertyId,
          prefix,
          year: currentYear,
        },
      },
      update: {
        lastSequence: {
          increment: 1,
        },
      },
      create: {
        propertyId,
        prefix,
        year: currentYear,
        lastSequence: 1,
      },
    });

    const sequenceString = counter.lastSequence.toString().padStart(6, '0');
    return `${prefix}-${currentYear}-${sequenceString}`;
  });
}

/**
 * Returns the 2-digit financial year format (e.g. "26-27" for FY 2026-2027)
 * In India, FY starts on April 1 and ends on March 31.
 */
export function getCurrentFinancialYearCode(date: Date = new Date()): string {
  const d = new Date(date);
  const month = d.getMonth() + 1; // 1 to 12
  const year = d.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  const startYY = String(startYear % 100).padStart(2, '0');
  const endYY = String(endYear % 100).padStart(2, '0');
  return `${startYY}-${endYY}`;
}

/**
 * Queries database to find the next sequential 3-digit number for GST bills.
 * Initial sequence starts at 049 (e.g. T 26-27-049).
 */
export async function getNextGstInvoiceSequence(propertyId?: string): Promise<number> {
  const fyCode = getCurrentFinancialYearCode();

  const where: any = {
    OR: [
      { invoiceRef: { startsWith: `T ${fyCode}-` } },
      { invoiceRef: { startsWith: `T-${fyCode}-` } },
    ],
  };
  if (propertyId) {
    where.propertyId = propertyId;
  }

  const existingInvoices = await db.taxInvoice.findMany({
    where,
    select: { invoiceRef: true },
  });

  let maxSeq = 48; // So next default is 49 (which formats to 049)
  for (const inv of existingInvoices) {
    const parts = inv.invoiceRef.split('-');
    const lastPart = parts[parts.length - 1]?.trim();
    const num = parseInt(lastPart, 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }

  return maxSeq + 1;
}

/**
 * Generates official GST invoice numbers in the format: T 26-27-XXX
 * If customSuffix is provided, it uses the custom last digits (padded to 3 digits).
 */
export async function generateGstInvoiceNumber(
  propertyId: string,
  customSuffix?: string | number | null
): Promise<string> {
  const fyCode = getCurrentFinancialYearCode();

  if (customSuffix !== undefined && customSuffix !== null && String(customSuffix).trim() !== '') {
    const cleanDigits = String(customSuffix).replace(/\D/g, '');
    const cleanSuffix = cleanDigits ? cleanDigits.padStart(3, '0') : '049';
    return `T ${fyCode}-${cleanSuffix}`;
  }

  const nextSeq = await getNextGstInvoiceSequence(propertyId);
  const seqStr = String(nextSeq).padStart(3, '0');
  return `T ${fyCode}-${seqStr}`;
}

