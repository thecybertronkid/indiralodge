import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateReferenceNumber } from '@/lib/refGenerator';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const invoices = await db.taxInvoice.findMany({
      where: { propertyId },
      include: {
        guest: { select: { displayName: true, phone: true, gstin: true } },
        reservation: { select: { reservationRef: true } },
        lines: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tax invoices' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const { folioId, reservationId, guestId, customerGstin, companyName, placeOfSupply } = body;

    if (!guestId) {
      return NextResponse.json({ error: 'Guest ID is required to issue a tax invoice.' }, { status: 400 });
    }

    if (companyName !== undefined || customerGstin !== undefined) {
      await db.guest.update({
        where: { id: guestId },
        data: {
          ...(companyName !== undefined ? { company: companyName.trim() || null } : {}),
          ...(customerGstin !== undefined ? { gstin: customerGstin.trim().toUpperCase() || null } : {}),
        },
      });
    }

    let subtotal = 0;
    let lineItemsData: any[] = [];

    // Fetch folio transactions if folioId provided
    if (folioId) {
      const folio = await db.folio.findUnique({
        where: { id: folioId },
        include: { transactions: true },
      });

      if (folio) {
        subtotal = folio.transactions.reduce((sum, t) => sum + (t.type === 'DEBIT' ? t.amount : 0), 0);
        lineItemsData = folio.transactions
          .filter((t) => t.type === 'DEBIT')
          .map((t) => {
            const taxBase = Math.round((t.amount / 1.05) * 100) / 100;
            const gst = Math.round((t.amount - taxBase) * 100) / 100;
            const cgst = Math.round((gst / 2) * 100) / 100;
            const sgst = Math.round((gst - cgst) * 100) / 100;
            return {
              description: t.description,
              hsnSacCode: '996311', // Hotel lodging SAC
              quantity: t.quantity,
              unitPrice: t.unitPrice,
              taxableAmount: taxBase,
              cgstAmount: cgst,
              sgstAmount: sgst,
              igstAmount: 0,
              totalAmount: t.amount,
            };
          });
      }
    }

    if (lineItemsData.length === 0) {
      // Default line item
      subtotal = 2500.0;
      const taxBase = Math.round((2500.0 / 1.05) * 100) / 100;
      const gst = Math.round((2500.0 - taxBase) * 100) / 100;
      const cgst = Math.round((gst / 2) * 100) / 100;
      const sgst = Math.round((gst - cgst) * 100) / 100;
      lineItemsData = [
        {
          description: 'Hotel Accommodation Stay Tariff',
          hsnSacCode: '996311',
          quantity: 1,
          unitPrice: 2500.0,
          taxableAmount: taxBase,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: 0,
          totalAmount: 2500.0,
        },
      ];
    }

    const cgstAmount = lineItemsData.reduce((sum, l) => sum + l.cgstAmount, 0);
    const sgstAmount = lineItemsData.reduce((sum, l) => sum + l.sgstAmount, 0);
    const igstAmount = lineItemsData.reduce((sum, l) => sum + l.igstAmount, 0);
    const totalAmount = subtotal;

    const invoiceRef = await generateReferenceNumber(propertyId, 'INV');

    const invoice = await db.taxInvoice.create({
      data: {
        invoiceRef,
        propertyId,
        reservationId: reservationId || null,
        folioId: folioId || null,
        guestId,
        customerGstin: customerGstin || null,
        placeOfSupply: placeOfSupply || 'State',
        subtotal,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalAmount,
        status: 'ISSUED',
        issuedById: session.userId,
        issuedAt: new Date(),
        lines: {
          create: lineItemsData,
        },
      },
      include: {
        guest: true,
        lines: true,
      },
    });

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to issue tax invoice' }, { status: 500 });
  }
}
