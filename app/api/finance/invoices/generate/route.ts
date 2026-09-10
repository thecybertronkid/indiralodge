import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { reservationId, invoiceType, customerGstin } = body; // invoiceType: 'GST' | 'NON_GST'

    if (!reservationId || !invoiceType) {
      return NextResponse.json({ error: 'Reservation ID and invoice type (GST or NON_GST) are required.' }, { status: 400 });
    }

    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: {
        guest: true,
        roomType: true,
        assignedRoom: true,
        folios: { include: { transactions: true } },
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // If already billed, return existing invoice for printing
    if (reservation.isBilled && reservation.billedInvoiceId) {
      const existingInvoice = await db.taxInvoice.findUnique({
        where: { id: reservation.billedInvoiceId },
        include: { lines: true, guest: true, property: true, reservation: true },
      });
      if (existingInvoice) {
        return NextResponse.json({ success: true, invoice: existingInvoice, alreadyBilled: true });
      }
    }

    const propertyId = reservation.propertyId;
    const isGst = invoiceType === 'GST';

    const folio = reservation.folios?.[0] || null;
    const extraCharges = folio?.transactions?.filter(
      (t: any) => t.type === 'DEBIT' && t.category !== 'ROOM_CHARGE'
    ) || [];

    // Calculate Financial Breakdown (Room rates are GST-inclusive)
    const roomCharges = reservation.roomRate * reservation.nights;
    const extraChargesTotal = extraCharges.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const grossSubtotal = roomCharges + extraChargesTotal;
    const discount = reservation.discountAmount || 0;
    const netTotal = Math.max(0, grossSubtotal - discount);

    let cgstAmount = 0;
    let sgstAmount = 0;
    let taxableSubtotal = netTotal;
    const totalAmount = netTotal;

    if (isGst) {
      // 18% GST (9% CGST + 9% SGST) extracted from inclusive total
      taxableSubtotal = Math.round((netTotal / 1.18) * 100) / 100;
      const totalGst = Math.round((netTotal - taxableSubtotal) * 100) / 100;
      cgstAmount = Math.round((totalGst / 2) * 100) / 100;
      sgstAmount = Math.round((totalGst - cgstAmount) * 100) / 100;
    }

    const refPrefix = isGst ? 'INV' : 'BIL';
    const invoiceRef = await generateReferenceNumber(propertyId, refPrefix);

    const folioId = folio?.id || null;

    // Build itemized invoice lines: Accommodation + all room service/extra items
    const invoiceLinesToCreate: any[] = [
      {
        description: `Accommodation Charges (${reservation.roomType.name} - Room ${reservation.assignedRoom?.roomNumber || 'N/A'}) x ${reservation.nights} Night${reservation.nights > 1 ? 's' : ''}`,
        hsnSacCode: '996311',
        quantity: reservation.nights,
        unitPrice: reservation.roomRate,
        taxableAmount: isGst ? Math.round((roomCharges / 1.18) * 100) / 100 : roomCharges,
        cgstAmount: isGst ? Math.round(((roomCharges - Math.round((roomCharges / 1.18) * 100) / 100) / 2) * 100) / 100 : 0,
        sgstAmount: isGst ? Math.round(((roomCharges - Math.round((roomCharges / 1.18) * 100) / 100) / 2) * 100) / 100 : 0,
        totalAmount: roomCharges,
      },
    ];

    for (const ec of extraCharges) {
      const isFood = ec.category === 'FOOD_BEVERAGE' || ec.category === 'ROOM_SERVICE';
      const sac = isFood ? '996331' : '996311';
      const itemTaxBase = isGst ? Math.round((ec.amount / 1.18) * 100) / 100 : ec.amount;
      const itemGst = isGst ? Math.round((ec.amount - itemTaxBase) * 100) / 100 : 0;
      const itemCgst = Math.round((itemGst / 2) * 100) / 100;
      const itemSgst = Math.round((itemGst - itemCgst) * 100) / 100;

      invoiceLinesToCreate.push({
        description: ec.description,
        hsnSacCode: sac,
        quantity: ec.quantity || 1,
        unitPrice: ec.unitPrice || ec.amount,
        taxableAmount: itemTaxBase,
        cgstAmount: itemCgst,
        sgstAmount: itemSgst,
        totalAmount: ec.amount,
      });
    }

    // Create Tax Invoice
    const invoice = await db.taxInvoice.create({
      data: {
        propertyId,
        invoiceRef,
        reservationId,
        folioId,
        guestId: reservation.guestId,
        invoiceDate: new Date(),
        customerGstin: customerGstin || reservation.guest.gstin || null,
        invoiceType: isGst ? 'GST' : 'NON_GST',
        isGstBill: isGst,
        subtotal: grossSubtotal,
        discount,
        cgstAmount,
        sgstAmount,
        totalAmount,
        status: 'ISSUED',
        issuedById: session.userId,
        lines: {
          create: invoiceLinesToCreate,
        },
      },
      include: {
        lines: true,
        guest: true,
        property: true,
        reservation: {
          include: { assignedRoom: true, roomType: true },
        },
      },
    });

    // Update reservation -> Mark as BILLED & LOCKED
    await db.reservation.update({
      where: { id: reservationId },
      data: {
        isBilled: true,
        billType: isGst ? 'GST' : 'NON_GST',
        billedAt: new Date(),
        billedInvoiceId: invoice.id,
        taxAmount: cgstAmount + sgstAmount,
        totalAmount,
      },
    });

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId,
      userId: session.userId,
      action: isGst ? 'GST_BILL_GENERATED' : 'NON_GST_BILL_GENERATED',
      module: 'finance',
      entityId: invoice.id,
      afterData: { invoiceRef, totalAmount, invoiceType },
    });

    return NextResponse.json({ success: true, invoice, alreadyBilled: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate bill' }, { status: 500 });
  }
}
