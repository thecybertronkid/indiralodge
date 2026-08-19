import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;

    const totalUsers = await db.user.count({
      where: { organizationId: session.organizationId },
    });

    const activeUsers = await db.user.count({
      where: { organizationId: session.organizationId, status: 'ACTIVE' },
    });

    const totalProperties = await db.property.count({
      where: { organizationId: session.organizationId },
    });

    const totalAuditLogs = await db.auditLog.count({
      where: { organizationId: session.organizationId },
    });

    // Real Phase 2 Operational Metrics
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const totalRooms = propertyId ? await db.room.count({ where: { propertyId, isActive: true } }) : 0;
    const occupiedRooms = propertyId ? await db.room.count({ where: { propertyId, isActive: true, availabilityStatus: 'OCCUPIED' } }) : 0;
    const reservedRooms = propertyId ? await db.room.count({ where: { propertyId, isActive: true, availabilityStatus: 'RESERVED' } }) : 0;
    const availableRooms = propertyId ? await db.room.count({ where: { propertyId, isActive: true, availabilityStatus: 'AVAILABLE', housekeepingStatus: 'CLEAN', maintenanceStatus: 'OPERATIONAL' } }) : 0;

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const todayArrivals = propertyId
      ? await db.reservation.count({
          where: {
            propertyId,
            arrivalDate: { gte: startOfDay, lte: endOfDay },
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          },
        })
      : 0;

    const todayDepartures = propertyId
      ? await db.reservation.count({
          where: {
            propertyId,
            departureDate: { gte: startOfDay, lte: endOfDay },
            status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
          },
        })
      : 0;

    const todayPaymentsAgg = propertyId
      ? await db.payment.aggregate({
          where: {
            propertyId,
            date: { gte: startOfDay, lte: endOfDay },
          },
          _sum: { amount: true },
        })
      : { _sum: { amount: 0 } };

    const todayRevenue = todayPaymentsAgg._sum.amount || 0;

    const recentActivity = await db.auditLog.findMany({
      where: { organizationId: session.organizationId },
      include: {
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    const systemAlerts = [];
    if (totalUsers === 1) {
      systemAlerts.push({
        id: 'alert-1',
        title: 'Initial Single Staff Member',
        message: 'Only 1 administrator user exists in the system. Consider creating staff roles in Users & Staff.',
        type: 'INFO',
      });
    }

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        totalProperties,
        totalAuditLogs,
        occupancyRate: totalRooms > 0 ? occupancyRate : null,
        availableRooms: totalRooms > 0 ? availableRooms : null,
        todayArrivals: totalRooms > 0 ? todayArrivals : null,
        todayDepartures: totalRooms > 0 ? todayDepartures : null,
        todayRevenue: totalRooms > 0 ? todayRevenue : null,
        outstandingPayments: null,
      },
      recentActivity,
      systemAlerts,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 });
  }
}
