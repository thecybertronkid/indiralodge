import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'reports.view')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    let propertyId = session.propertyId;
    if (!propertyId) {
      const prop = await db.property.findFirst({ where: { organizationId: session.organizationId }, select: { id: true } });
      propertyId = prop?.id || null;
    }
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const [y, m, d] = dateStr.split('-').map(Number);
    const localStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    const localEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
    const utcStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    const utcEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
    const startOfDay = localStart < utcStart ? localStart : utcStart;
    const endOfDay = localEnd > utcEnd ? localEnd : utcEnd;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;

    // Parallelize all report queries concurrently
    const [
      totalRooms,
      occupiedRooms,
      reservedRooms,
      outOfOrderRooms,
      arrivals,
      departures,
      inHouseGuests,
      todayPayments,
    ] = await Promise.all([
      db.room.count({ where: { propertyId, isActive: true } }),
      db.room.count({ where: { propertyId, isActive: true, availabilityStatus: 'OCCUPIED' } }),
      db.room.count({ where: { propertyId, isActive: true, availabilityStatus: 'RESERVED' } }),
      db.room.count({
        where: {
          propertyId,
          isActive: true,
          OR: [{ availabilityStatus: 'BLOCKED' }, { maintenanceStatus: 'OUT_OF_ORDER' }, { maintenanceStatus: 'MAINTENANCE' }],
        },
      }),
      // Arrivals for the selected date
      db.reservation.findMany({
        where: {
          propertyId,
          arrivalDate: { gte: startOfDay, lte: endOfDay },
          status: { in: isToday ? ['CONFIRMED', 'CHECKED_IN'] : ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
        },
        include: {
          guest: { select: { displayName: true, phone: true, guestRef: true } },
          roomType: { select: { name: true, code: true } },
          assignedRoom: { select: { id: true, roomNumber: true } },
          bookingSource: { select: { name: true } },
        },
        orderBy: { arrivalDate: 'asc' },
      }),
      // Departures for the selected date
      db.reservation.findMany({
        where: {
          propertyId,
          OR: [
            {
              departureDate: { gte: startOfDay, lte: endOfDay },
              status: { in: ['CHECKED_IN', 'CONFIRMED', 'CHECKED_OUT'] },
            },
            {
              actualCheckOutAt: { gte: startOfDay, lte: endOfDay },
              status: 'CHECKED_OUT',
            },
          ],
        },
        include: {
          guest: { select: { displayName: true, phone: true, guestRef: true, gstin: true, company: true } },
          roomType: { select: { name: true, code: true } },
          assignedRoom: { select: { id: true, roomNumber: true } },
          folios: { select: { id: true, folioNumber: true, balanceAmount: true, totalCharges: true, totalPayments: true } },
        },
        orderBy: [{ actualCheckOutAt: 'desc' }, { departureDate: 'asc' }],
      }),
      // In-House guests on the selected date
      db.reservation.findMany({
        where: isToday
          ? {
              propertyId,
              status: 'CHECKED_IN',
            }
          : {
              propertyId,
              status: { in: ['CHECKED_IN', 'CHECKED_OUT', 'CONFIRMED'] },
              arrivalDate: { lte: endOfDay },
              OR: [
                { actualCheckOutAt: { gte: startOfDay } },
                { actualCheckOutAt: null, departureDate: { gte: startOfDay } },
              ],
            },
        include: {
          guest: { select: { displayName: true, phone: true, email: true, guestRef: true, company: true, gstin: true } },
          assignedRoom: { select: { roomNumber: true, floor: true } },
          roomType: { select: { name: true, code: true } },
          folios: { select: { id: true, folioNumber: true, balanceAmount: true, totalCharges: true, totalPayments: true } },
        },
        orderBy: { assignedRoom: { roomNumber: 'asc' } },
      }),
      db.payment.aggregate({
        where: {
          propertyId,
          date: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { amount: true },
      }),
    ]);

    const effectiveOccupied = isToday ? occupiedRooms : inHouseGuests.length;
    const availableRooms = Math.max(0, totalRooms - effectiveOccupied - reservedRooms - outOfOrderRooms);
    const occupancyRate = totalRooms > 0 ? ((effectiveOccupied / totalRooms) * 100).toFixed(1) : '0';
    const roomRevenue = todayPayments._sum.amount || 0;

    return NextResponse.json({
      date: dateStr,
      occupancy: {
        totalRooms,
        availableRooms,
        occupiedRooms,
        reservedRooms,
        outOfOrderRooms,
        occupancyRate,
      },
      arrivals,
      departures,
      inHouseGuests,
      roomRevenue,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate front office reports' }, { status: 500 });
  }
}
