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

    // Calculate Financial Breakdown
    const roomCharges = reservation.roomRate * reservation.nights;
    const discount = reservation.discountAmount || 0;
    const taxableSubtotal = Math.max(0, roomCharges - discount);

    let cgstAmount = 0;
    let sgstAmount = 0;
    let totalAmount = taxableSubtotal;

    if (isGst) {
      // 18% GST (9% CGST + 9% SGST)
      cgstAmount = Math.round(taxableSubtotal * 0.09 * 100) / 100;
      sgstAmount = Math.round(taxableSubtotal * 0.09 * 100) / 100;
      totalAmount = Math.round((taxableSubtotal + cgstAmount + sgstAmount) * 100) / 100;
    }

    const refPrefix = isGst ? 'INV' : 'BIL';
    const invoiceRef = await generateReferenceNumber(propertyId, refPrefix);

    const folioId = reservation.folios?.[0]?.id || null;

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
        subtotal: roomCharges,
        discount,
        cgstAmount,
        sgstAmount,
        totalAmount,
        status: 'ISSUED',
        issuedById: session.userId,
        lines: {
          create: [
            {
              description: `Accommodation Charges (${reservation.roomType.name} - Room ${reservation.assignedRoom?.roomNumber || 'N/A'}) x ${reservation.nights} Nights`,
              hsnSacCode: '996311',
              quantity: reservation.nights,
              unitPrice: reservation.roomRate,
              taxableAmount: taxableSubtotal,
              cgstAmount,
              sgstAmount,
            },
          ],
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
