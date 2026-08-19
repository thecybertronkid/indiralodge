import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 86400000);

    const bookingSources = await db.bookingSource.findMany({
      where: { propertyId },
      include: {
        reservations: {
          where: { createdAt: { gte: startDate } },
        },
      },
    });

    const totalReservationsCount = bookingSources.reduce((sum, s) => sum + s.reservations.length, 1);

    const sourceAnalytics = bookingSources.map((s) => {
      const totalBookings = s.reservations.length;
      const totalRevenue = s.reservations.reduce((sum, r) => sum + r.totalAmount, 0);
      const totalNights = s.reservations.reduce((sum, r) => sum + (r.nights || 1), 0);
      const cancellations = s.reservations.filter((r) => r.status === 'CANCELLED').length;
      const noShows = s.reservations.filter((r) => r.status === 'NO_SHOW').length;

      const pctOfTotal = Math.round((totalBookings / totalReservationsCount) * 100);
      const avgStayLength = totalBookings > 0 ? Math.round((totalNights / totalBookings) * 10) / 10 : 1.0;
      const avgBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;
      const cancellationRate = totalBookings > 0 ? Math.round((cancellations / totalBookings) * 100) : 0;

      return {
        id: s.id,
        code: s.code,
        name: s.name,
        totalBookings,
        totalRevenue,
        totalNights,
        pctOfTotal,
        avgStayLength,
        avgBookingValue,
        cancellationRate,
        noShows,
      };
    });

    // Lead Time Distribution
    const allRes = await db.reservation.findMany({
      where: { propertyId, createdAt: { gte: startDate } },
    });

    let lead0to1 = 0;
    let lead2to7 = 0;
    let lead8to30 = 0;
    let lead31Plus = 0;

    allRes.forEach((r) => {
      const arrMs = new Date(r.arrivalDate).getTime();
      const createdMs = new Date(r.createdAt).getTime();
      const leadDays = Math.max(0, Math.floor((arrMs - createdMs) / (1000 * 60 * 60 * 24)));

      if (leadDays <= 1) lead0to1++;
      else if (leadDays <= 7) lead2to7++;
      else if (leadDays <= 30) lead8to30++;
      else lead31Plus++;
    });

    return NextResponse.json({
      sources: sourceAnalytics,
      leadTimeDistribution: {
        sameDay0to1: lead0to1,
        short2to7: lead2to7,
        medium8to30: lead8to30,
        advance31Plus: lead31Plus,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch revenue source analytics' }, { status: 500 });
  }
}
