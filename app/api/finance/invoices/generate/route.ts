import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { logAuditEvent } from '@/lib/audit';
import { getStayDayInfo } from '@/lib/billPrinter';

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
        folios: {
          include: {
            transactions: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
            payments: true,
          },
        },
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

    // Calculate Financial Breakdown
    // If a discount was attached to the reservation, absorb it into the effective nightly base rate so the discounted price becomes the base price on the bill
    const rawDiscount = reservation.discountAmount || 0;
    const effectiveTotalRoomTariff = Math.max(0, (reservation.roomRate * reservation.nights) - rawDiscount);
    const roomCharges = effectiveTotalRoomTariff;
    const extraChargesTotal = extraCharges.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const discount = 0; // Discounted rate is now the base price

    let cgstAmount = 0;
    let sgstAmount = 0;
    let totalTax = 0;
    const baseRoomTariff = roomCharges;
    let finalRoomTariff = baseRoomTariff;
    const unitBaseRate = reservation.nights > 0 ? Math.round((baseRoomTariff / reservation.nights) * 100) / 100 : reservation.roomRate;

    if (isGst) {
      // In GST Bill, 5% GST is charged ABOVE the base tariff:
      // e.g. Base Tariff 1000 => SGST 25 (2.5%) + CGST 25 (2.5%) => Final Room Tariff = 1050
      cgstAmount = Math.round((baseRoomTariff * 0.025) * 100) / 100;
      sgstAmount = Math.round((baseRoomTariff * 0.025) * 100) / 100;
      totalTax = cgstAmount + sgstAmount;
      finalRoomTariff = Math.round((baseRoomTariff + totalTax) * 100) / 100;
    }

    // Total payable is final room tariff (1050 for GST / 1000 for Non-GST) + extra charges
    const totalAmount = Math.round((finalRoomTariff + extraChargesTotal) * 100) / 100;
    const taxableSubtotal = Math.round((baseRoomTariff + extraChargesTotal) * 100) / 100;

    const refPrefix = isGst ? 'INV' : 'BIL';
    const invoiceRef = await generateReferenceNumber(propertyId, refPrefix);

    const folioId = folio?.id || null;

    // Accommodation Line:
    // If GST: taxableAmount is 1000, cgst is 25, sgst is 25, totalAmount is 1050
    // If Non-GST: taxableAmount is 1000, cgst is 0, sgst is 0, totalAmount is 1000
    const invoiceLinesToCreate: any[] = [
      {
        description: `Accommodation Charges (${reservation.roomType.name} - Room ${reservation.assignedRoom?.roomNumber || 'N/A'}) x ${reservation.nights} Night${reservation.nights > 1 ? 's' : ''}`,
        hsnSacCode: '996311',
        quantity: reservation.nights,
        unitPrice: unitBaseRate,
        taxableAmount: baseRoomTariff,
        cgstAmount,
        sgstAmount,
        totalAmount: finalRoomTariff,
      },
    ];

    // Sort extra charges chronologically date-wise
    const sortedExtraCharges = [...extraCharges].sort((a: any, b: any) => {
      const timeA = new Date(a.date || a.createdAt).getTime();
      const timeB = new Date(b.date || b.createdAt).getTime();
      return timeA - timeB;
    });

    for (const ec of sortedExtraCharges) {
      const isFood = ec.category === 'FOOD_BEVERAGE' || ec.category === 'ROOM_SERVICE';
      const sac = isFood ? '996331' : '996311';
      const itemAmount = ec.amount;
      const stayDay = getStayDayInfo(ec.date || ec.createdAt, reservation.arrivalDate);
      const lineDesc = (ec.description || '').startsWith('[Day')
        ? ec.description
        : `[${stayDay.fullLabel}] ${ec.description || 'Room Service / Extra Charge'}`;

      // GST is charged strictly on room tariff only, not on extra room orders
      invoiceLinesToCreate.push({
        description: lineDesc,
        hsnSacCode: sac,
        quantity: ec.quantity || 1,
        unitPrice: ec.unitPrice || ec.amount,
        taxableAmount: itemAmount,
        cgstAmount: 0,
        sgstAmount: 0,
        totalAmount: itemAmount,
        createdAt: ec.date ? new Date(ec.date) : new Date(),
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
        subtotal: taxableSubtotal,
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
    const newBalanceAmount = Math.max(0, totalAmount - reservation.paidAmount);
    await db.reservation.update({
      where: { id: reservationId },
      data: {
        isBilled: true,
        billType: isGst ? 'GST' : 'NON_GST',
        billedAt: new Date(),
        billedInvoiceId: invoice.id,
        roomRate: reservation.roomRate,
        discountAmount: 0,
        taxAmount: totalTax,
        totalAmount,
        balanceAmount: newBalanceAmount,
      },
    });

    // Synchronize folio total charges and balance amount with finalized invoice
    if (folio) {
      const folioPayments = folio.totalPayments || 0;
      const newFolioBalance = Math.max(0, totalAmount - folioPayments);
      await db.folio.update({
        where: { id: folio.id },
        data: {
          totalCharges: totalAmount,
          balanceAmount: newFolioBalance,
        },
      });
    }

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
