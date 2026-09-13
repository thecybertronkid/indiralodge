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

    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

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
      db.reservation.findMany({
        where: {
          propertyId,
          arrivalDate: { gte: startOfDay, lte: endOfDay },
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
        include: {
          guest: { select: { displayName: true, phone: true, guestRef: true } },
          roomType: { select: { name: true, code: true } },
          assignedRoom: { select: { roomNumber: true } },
          bookingSource: { select: { name: true } },
        },
        orderBy: { arrivalDate: 'asc' },
      }),
      db.reservation.findMany({
        where: {
          propertyId,
          departureDate: { gte: startOfDay, lte: endOfDay },
          status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        },
        include: {
          guest: { select: { displayName: true, phone: true, guestRef: true } },
          roomType: { select: { name: true, code: true } },
          assignedRoom: { select: { roomNumber: true } },
          folios: { select: { balanceAmount: true } },
        },
        orderBy: { departureDate: 'asc' },
      }),
      db.reservation.findMany({
        where: {
          propertyId,
          status: 'CHECKED_IN',
        },
        include: {
          guest: { select: { displayName: true, phone: true, email: true, guestRef: true } },
          assignedRoom: { select: { roomNumber: true, floor: true } },
          roomType: { select: { name: true, code: true } },
          folios: { select: { folioNumber: true, balanceAmount: true, totalCharges: true, totalPayments: true } },
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

    const availableRooms = Math.max(0, totalRooms - occupiedRooms - reservedRooms - outOfOrderRooms);
    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : '0';
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
