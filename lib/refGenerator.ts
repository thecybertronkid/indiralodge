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
