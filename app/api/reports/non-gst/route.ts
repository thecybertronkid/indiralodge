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

    const bills = await db.taxInvoice.findMany({
      where: {
        propertyId,
        invoiceType: 'NON_GST',
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: {
        guest: { select: { displayName: true, phone: true } },
        reservation: { select: { reservationRef: true, arrivalDate: true, departureDate: true } },
        lines: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const totalSubtotal = bills.reduce((sum, b) => sum + b.subtotal, 0);
    const totalDiscount = bills.reduce((sum, b) => sum + b.discount, 0);
    const totalRevenue = bills.reduce((sum, b) => sum + b.totalAmount, 0);

    // Monthly breakdown aggregation for annual view
    const monthlyBreakdown: { [key: number]: { monthName: string; count: number; subtotal: number; discount: number; total: number } } = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let m = 0; m < 12; m++) {
      monthlyBreakdown[m + 1] = {
        monthName: monthNames[m],
        count: 0,
        subtotal: 0,
        discount: 0,
        total: 0,
      };
    }

    bills.forEach((b) => {
      const bMonth = new Date(b.invoiceDate).getMonth() + 1;
      if (monthlyBreakdown[bMonth]) {
        monthlyBreakdown[bMonth].count += 1;
        monthlyBreakdown[bMonth].subtotal += b.subtotal;
        monthlyBreakdown[bMonth].discount += b.discount;
        monthlyBreakdown[bMonth].total += b.totalAmount;
      }
    });

    return NextResponse.json({
      year,
      month,
      summary: {
        totalBills: bills.length,
        totalSubtotal: Math.round(totalSubtotal * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
      },
      monthlyBreakdown: Object.values(monthlyBreakdown),
      bills,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate Non-GST report' }, { status: 500 });
  }
}
