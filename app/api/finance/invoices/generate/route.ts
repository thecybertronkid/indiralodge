import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const reservationId = searchParams.get('reservationId');
    const invoiceId = searchParams.get('invoiceId');

    if (!reservationId && !invoiceId) {
      return NextResponse.json({ error: 'reservationId or invoiceId is required' }, { status: 400 });
    }

    const whereClause: any = {};
    if (invoiceId) {
      whereClause.id = invoiceId;
    } else if (reservationId) {
      whereClause.reservationId = reservationId;
    }

    const invoice = await db.taxInvoice.findFirst({
      where: whereClause,
      include: {
        lines: true,
        guest: true,
        property: true,
        reservation: {
          include: { assignedRoom: true, roomType: true, folios: { include: { payments: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch invoice' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { reservationId, invoiceType, customerGstin, companyName } = body; // invoiceType: 'GST' | 'NON_GST'

    if (!reservationId || !invoiceType) {
      return NextResponse.json({ error: 'Reservation ID and invoice type (GST or NON_GST) are required.' }, { status: 400 });
    }

    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: {
        guest: true,
        roomType: true,
        assignedRoom: true,
        folios: { include: { transactions: true, payments: true } },
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // Sync guest company or gstin if updated during bill generation
    if (reservation.guestId && (companyName !== undefined || customerGstin !== undefined)) {
      await db.guest.update({
        where: { id: reservation.guestId },
        data: {
          ...(companyName !== undefined ? { company: companyName.trim() || null } : {}),
          ...(customerGstin !== undefined ? { gstin: customerGstin.trim().toUpperCase() || null } : {}),
        },
      });
    }

    // If already billed, return existing invoice for printing
    if (reservation.isBilled && reservation.billedInvoiceId) {
      const existingInvoice = await db.taxInvoice.findUnique({
        where: { id: reservation.billedInvoiceId },
        include: {
          lines: true,
          guest: true,
          property: true,
          reservation: {
            include: { assignedRoom: true, roomType: true, folios: { include: { payments: true } } },
          },
        },
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
    // If a discount was attached to the reservation, absorb it into the effective nightly base rate so the discounted price becomes the base price on the bill
    const rawDiscount = reservation.discountAmount || 0;
    const effectiveTotalRoomTariff = Math.max(0, (reservation.roomRate * reservation.nights) - rawDiscount);
    const effectiveNightlyRate = reservation.nights > 0 ? Math.round((effectiveTotalRoomTariff / reservation.nights) * 100) / 100 : reservation.roomRate;
    const roomCharges = effectiveNightlyRate * reservation.nights;
    const extraChargesTotal = extraCharges.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const grossSubtotal = roomCharges + extraChargesTotal;
    const discount = 0; // Discounted rate is now the base price
    const netTotal = grossSubtotal;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let taxableSubtotal = netTotal;
    const totalAmount = netTotal;

    if (isGst) {
      // 5% GST (2.5% CGST + 2.5% SGST) extracted from inclusive total
      taxableSubtotal = Math.round((netTotal / 1.05) * 100) / 100;
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
        unitPrice: effectiveNightlyRate,
        taxableAmount: isGst ? Math.round((roomCharges / 1.05) * 100) / 100 : roomCharges,
        cgstAmount: isGst ? Math.round(((roomCharges - Math.round((roomCharges / 1.05) * 100) / 100) / 2) * 100) / 100 : 0,
        sgstAmount: isGst ? Math.round(((roomCharges - Math.round((roomCharges / 1.05) * 100) / 100) / 2) * 100) / 100 : 0,
        totalAmount: roomCharges,
      },
    ];

    for (const ec of extraCharges) {
      const isFood = ec.category === 'FOOD_BEVERAGE' || ec.category === 'ROOM_SERVICE';
      const sac = isFood ? '996331' : '996311';
      const itemTaxBase = isGst ? Math.round((ec.amount / 1.05) * 100) / 100 : ec.amount;
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
          include: { assignedRoom: true, roomType: true, folios: { include: { payments: true } } },
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
        roomRate: effectiveNightlyRate,
        discountAmount: 0,
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
