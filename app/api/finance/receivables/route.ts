import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const folios = await db.folio.findMany({
      where: { propertyId, balanceAmount: { gt: 0 } },
      include: {
        guest: { select: { displayName: true, phone: true, company: true } },
        reservation: { select: { reservationRef: true, departureDate: true } },
      },
      orderBy: { balanceAmount: 'desc' },
    });

    const now = new Date();
    let current = 0;
    let days1to30 = 0;
    let days31to60 = 0;
    let days61to90 = 0;
    let days90Plus = 0;

    const enrichedFolios = folios.map((f) => {
      const depDate = new Date(f.reservation.departureDate);
      const diffTime = Math.max(0, now.getTime() - depDate.getTime());
      const ageDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (ageDays <= 0) current += f.balanceAmount;
      else if (ageDays <= 30) days1to30 += f.balanceAmount;
      else if (ageDays <= 60) days31to60 += f.balanceAmount;
      else if (ageDays <= 90) days61to90 += f.balanceAmount;
      else days90Plus += f.balanceAmount;

      return {
        id: f.id,
        folioNumber: f.folioNumber,
        reservationRef: f.reservation.reservationRef,
        guestName: f.guest.displayName,
        company: f.guest.company || 'Individual',
        totalCharges: f.totalCharges,
        totalPayments: f.totalPayments,
        balanceAmount: f.balanceAmount,
        ageDays,
      };
    });

    const totalOutstanding = enrichedFolios.reduce((sum, f) => sum + f.balanceAmount, 0);

    return NextResponse.json({
      receivables: enrichedFolios,
      summary: {
        totalOutstanding,
        current,
        days1to30,
        days31to60,
        days61to90,
        days90Plus,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Accounts Receivable' }, { status: 500 });
  }
}
