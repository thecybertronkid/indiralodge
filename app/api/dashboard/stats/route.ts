import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let propertyId = session.propertyId;
    if (!propertyId) {
      const prop = await db.property.findFirst({ where: { organizationId: session.organizationId }, select: { id: true } });
      propertyId = prop?.id || null;
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Parallelize all dashboard queries concurrently
    const [
      totalUsers,
      activeUsers,
      totalProperties,
      totalAuditLogs,
      totalRooms,
      occupiedRooms,
      reservedRooms,
      availableRooms,
      dirtyRooms,
      cleaningRooms,
      maintenanceRooms,
      outOfOrderRooms,
      todayArrivals,
      todayDepartures,
      todayPaymentsAgg,
      roomsList,
      recentActivity,
    ] = await Promise.all([
      db.user.count({ where: { organizationId: session.organizationId } }),
      db.user.count({ where: { organizationId: session.organizationId, status: 'ACTIVE' } }),
      db.property.count({ where: { organizationId: session.organizationId } }),
      db.auditLog.count({ where: { organizationId: session.organizationId } }),
      propertyId ? db.room.count({ where: { propertyId, isActive: true } }) : Promise.resolve(0),
      propertyId ? db.room.count({ where: { propertyId, isActive: true, availabilityStatus: 'OCCUPIED' } }) : Promise.resolve(0),
      propertyId ? db.room.count({ where: { propertyId, isActive: true, availabilityStatus: 'RESERVED' } }) : Promise.resolve(0),
      propertyId ? db.room.count({ where: { propertyId, isActive: true, availabilityStatus: 'AVAILABLE' } }) : Promise.resolve(0),
      propertyId ? db.room.count({ where: { propertyId, isActive: true, housekeepingStatus: 'DIRTY' } }) : Promise.resolve(0),
      propertyId ? db.room.count({ where: { propertyId, isActive: true, housekeepingStatus: 'CLEANING' } }) : Promise.resolve(0),
      propertyId ? db.room.count({ where: { propertyId, isActive: true, maintenanceStatus: 'UNDER_MAINTENANCE' } }) : Promise.resolve(0),
      propertyId ? db.room.count({ where: { propertyId, isActive: true, availabilityStatus: 'BLOCKED' } }) : Promise.resolve(0),
      propertyId
        ? db.reservation.count({
            where: {
              propertyId,
              arrivalDate: { gte: startOfDay, lte: endOfDay },
              status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            },
          })
        : Promise.resolve(0),
      propertyId
        ? db.reservation.count({
            where: {
              propertyId,
              departureDate: { gte: startOfDay, lte: endOfDay },
              status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
            },
          })
        : Promise.resolve(0),
      propertyId
        ? db.payment.aggregate({
            where: {
              propertyId,
              date: { gte: startOfDay, lte: endOfDay },
            },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: 0 } }),
      propertyId
        ? db.room.findMany({
            where: { propertyId, isActive: true },
            select: {
              id: true,
              roomNumber: true,
              floor: true,
              availabilityStatus: true,
              housekeepingStatus: true,
              maintenanceStatus: true,
              roomType: { select: { code: true, name: true } },
              reservations: {
                where: { status: 'CHECKED_IN' },
                select: { guest: { select: { displayName: true } } },
                take: 1,
              },
            },
            orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
            take: 12,
          })
        : Promise.resolve([]),
      db.auditLog.findMany({
        where: { organizationId: session.organizationId },
        include: {
          user: { select: { fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    const todayRevenue = todayPaymentsAgg._sum.amount || 0;

    const systemAlerts = [];
    if (totalUsers === 1) {
      systemAlerts.push({
        id: 'alert-1',
        title: 'Single Staff Account',
        message: 'Only 1 staff account exists. Additional staff accounts can be invited from Users.',
        type: 'INFO',
      });
    }

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        totalProperties,
        totalAuditLogs,
        totalRooms,
        occupancyRate: totalRooms > 0 ? occupancyRate : null,
        availableRooms: totalRooms > 0 ? availableRooms : null,
        todayArrivals: totalRooms > 0 ? todayArrivals : null,
        todayDepartures: totalRooms > 0 ? todayDepartures : null,
        todayRevenue: totalRooms > 0 ? todayRevenue : null,
        roomBreakdown: {
          available: availableRooms,
          occupied: occupiedRooms,
          dirty: dirtyRooms,
          cleaning: cleaningRooms,
          maintenance: maintenanceRooms,
          outOfOrder: outOfOrderRooms,
        },
        roomsList,
      },
      recentActivity,
      systemAlerts,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 });
  }
}
