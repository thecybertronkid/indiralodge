import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateExecutiveMetrics } from '@/lib/analyticsEngine';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 86400000);

    const metrics = await calculateExecutiveMetrics(propertyId, startDate, now);

    // 1. Room Type Performance Breakdown
    const roomTypes = await db.roomType.findMany({
      where: { propertyId },
      include: {
        rooms: { select: { id: true, roomNumber: true } },
        reservations: {
          where: { createdAt: { gte: startDate } },
        },
      },
    });

    const roomTypePerformance = roomTypes.map((rt) => {
      const soldNights = rt.reservations.reduce((sum, r) => sum + (r.nights || 1), 0);
      const totalRevenue = rt.reservations.reduce((sum, r) => sum + r.totalAmount, 0);
      const rtTotalRooms = Math.max(1, rt.rooms.length);
      const availNights = rtTotalRooms * 30;
      const rtOcc = Math.min(100, Math.round((soldNights / availNights) * 1000) / 10);
      const rtAdr = soldNights > 0 ? Math.round((totalRevenue / soldNights) * 100) / 100 : rt.baseRate;
      const rtRevPar = Math.round((totalRevenue / availNights) * 100) / 100;

      return {
        id: rt.id,
        code: rt.code,
        name: rt.name,
        totalRooms: rt.rooms.length,
        baseRate: rt.baseRate,
        soldNights,
        totalRevenue,
        occupancyRate: rtOcc,
        adr: rtAdr,
        revPar: rtRevPar,
      };
    });

    // 2. Individual Room Performance Matrix
    const rooms = await db.room.findMany({
      where: { propertyId },
      include: {
        roomType: { select: { name: true, baseRate: true } },
        reservations: { where: { createdAt: { gte: startDate } } },
        maintTickets: { where: { status: { not: 'RESOLVED' } } },
      },
      orderBy: { roomNumber: 'asc' },
    });

    const roomMatrix = rooms.map((r) => {
      const soldNights = r.reservations.reduce((sum, res) => sum + (res.nights || 1), 0);
      const roomRev = r.reservations.reduce((sum, res) => sum + res.totalAmount, 0);
      const roomOcc = Math.min(100, Math.round((soldNights / 30) * 1000) / 10);
      const roomAdr = soldNights > 0 ? Math.round((roomRev / soldNights) * 100) / 100 : r.roomType.baseRate;
      const roomRevPar = Math.round((roomRev / 30) * 100) / 100;

      return {
        id: r.id,
        roomNumber: r.roomNumber,
        roomType: r.roomType.name,
        floor: r.floor,
        housekeepingStatus: r.housekeepingStatus,
        maintenanceStatus: r.maintenanceStatus,
        soldNights,
        roomRev,
        occupancyRate: roomOcc,
        adr: roomAdr,
        revPar: roomRevPar,
        openMaintIssues: r.maintTickets.length,
      };
    });

    return NextResponse.json({
      summary: metrics,
      roomTypePerformance,
      roomMatrix,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch occupancy analytics' }, { status: 500 });
  }
}
