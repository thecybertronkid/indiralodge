import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : null;

    let startDate: Date;
    let endDate: Date;

    if (month !== null) {
      startDate = new Date(year, month - 1, 1, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else {
      startDate = new Date(year, 0, 1, 0, 0, 0);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    }

    const invoices = await db.taxInvoice.findMany({
      where: {
        propertyId,
        invoiceType: 'GST',
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: {
        guest: { select: { displayName: true, phone: true, gstin: true } },
        reservation: { select: { reservationRef: true, arrivalDate: true, departureDate: true } },
        lines: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const totalTaxable = invoices.reduce((sum, inv) => sum + (inv.subtotal - inv.discount), 0);
    const totalCgst = invoices.reduce((sum, inv) => sum + inv.cgstAmount, 0);
    const totalSgst = invoices.reduce((sum, inv) => sum + inv.sgstAmount, 0);
    const totalIgst = invoices.reduce((sum, inv) => sum + inv.igstAmount, 0);
    const totalGstCollected = totalCgst + totalSgst + totalIgst;
    const grossTotal = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // Monthly breakdown aggregation for annual view
    const monthlyBreakdown: { [key: number]: { monthName: string; count: number; taxable: number; gst: number; total: number } } = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let m = 0; m < 12; m++) {
      monthlyBreakdown[m + 1] = {
        monthName: monthNames[m],
        count: 0,
        taxable: 0,
        gst: 0,
        total: 0,
      };
    }

    invoices.forEach((inv) => {
      const invMonth = new Date(inv.invoiceDate).getMonth() + 1;
      if (monthlyBreakdown[invMonth]) {
        monthlyBreakdown[invMonth].count += 1;
        monthlyBreakdown[invMonth].taxable += (inv.subtotal - inv.discount);
        monthlyBreakdown[invMonth].gst += (inv.cgstAmount + inv.sgstAmount + inv.igstAmount);
        monthlyBreakdown[invMonth].total += inv.totalAmount;
      }
    });

    return NextResponse.json({
      year,
      month,
      summary: {
        totalInvoices: invoices.length,
        totalTaxable: Math.round(totalTaxable * 100) / 100,
        totalCgst: Math.round(totalCgst * 100) / 100,
        totalSgst: Math.round(totalSgst * 100) / 100,
        totalIgst: Math.round(totalIgst * 100) / 100,
        totalGstCollected: Math.round(totalGstCollected * 100) / 100,
        grossTotal: Math.round(grossTotal * 100) / 100,
      },
      monthlyBreakdown: Object.values(monthlyBreakdown),
      invoices,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate GST report' }, { status: 500 });
  }
}
