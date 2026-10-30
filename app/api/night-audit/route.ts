import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess =
      hasPermission(session.permissions, 'finance.view') ||
      hasPermission(session.permissions, 'cash.view') ||
      hasPermission(session.permissions, 'frontdesk.view') ||
      hasPermission(session.permissions, 'reports.view') ||
      session.roles?.includes('Super Admin') ||
      session.roles?.includes('Owner') ||
      session.roles?.includes('General Manager');

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions for Night Audit' }, { status: 403 });
    }

    let propertyId = session.propertyId;
    if (!propertyId) {
      const prop = await db.property.findFirst({
        where: { organizationId: session.organizationId },
        select: { id: true },
      });
      propertyId = prop?.id || null;
    }

    if (!propertyId) {
      return NextResponse.json({ error: 'No active property found' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const todayKolkata = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const businessDate = searchParams.get('date') || todayKolkata;

    const [y, m, d] = businessDate.split('-').map(Number);
    const localStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    const localEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
    const utcStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    const utcEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
    const startOfDay = localStart < utcStart ? localStart : utcStart;
    const endOfDay = localEnd > utcEnd ? localEnd : utcEnd;

    // Check if this date has already been audited
    const existingAudit = await db.savedReport.findFirst({
      where: {
        propertyId,
        dataset: 'NIGHT_AUDIT',
        reportName: `Night Audit - ${businessDate}`,
      },
    });

    // 1. Fetch Property Info & Settings
    const property = await db.property.findUnique({
      where: { id: propertyId },
      include: { settings: true },
    });

    // 2. Fetch Room Status Overview
    const allRooms = await db.room.findMany({
      where: { propertyId, isActive: true },
      include: { roomType: true },
    });

    const totalRooms = allRooms.length;
    const occupiedRooms = allRooms.filter((r) => r.availabilityStatus === 'OCCUPIED').length;
    const blockedRooms = allRooms.filter(
      (r) => r.availabilityStatus === 'BLOCKED' || r.maintenanceStatus === 'OUT_OF_ORDER' || r.maintenanceStatus === 'MAINTENANCE'
    ).length;
    const cleanRooms = allRooms.filter((r) => r.housekeepingStatus === 'CLEAN' || r.housekeepingStatus === 'INSPECTED').length;
    const dirtyRooms = allRooms.filter((r) => r.housekeepingStatus === 'DIRTY').length;
    const cleaningRooms = allRooms.filter((r) => r.housekeepingStatus === 'CLEANING').length;
    const vacantRooms = Math.max(0, totalRooms - occupiedRooms - blockedRooms);

    // 3. Operational Exceptions
    // A. Pending Arrivals (Arrival date <= selected business date and not yet checked in)
    const pendingArrivals = await db.reservation.findMany({
      where: {
        propertyId,
        arrivalDate: { lte: endOfDay },
        status: { in: ['CONFIRMED', 'RESERVED'] },
      },
      include: {
        guest: { select: { id: true, displayName: true, phone: true, email: true } },
        roomType: { select: { name: true, code: true } },
        assignedRoom: { select: { id: true, roomNumber: true } },
        bookingSource: { select: { name: true } },
      },
      orderBy: { arrivalDate: 'asc' },
    });

    // B. Pending Departures / Overstays (Departure date <= selected business date and still checked in)
    const pendingDepartures = await db.reservation.findMany({
      where: {
        propertyId,
        departureDate: { lte: endOfDay },
        status: 'CHECKED_IN',
      },
      include: {
        guest: { select: { id: true, displayName: true, phone: true } },
        roomType: { select: { name: true } },
        assignedRoom: { select: { id: true, roomNumber: true } },
        folios: {
          include: {
            transactions: true,
          },
        },
      },
      orderBy: { departureDate: 'asc' },
    });

    // 4. In-House Stays & Folios for this business date
    const inHouseReservations = await db.reservation.findMany({
      where: {
        propertyId,
        status: 'CHECKED_IN',
      },
      include: {
        guest: { select: { id: true, displayName: true, phone: true, gstin: true, company: true } },
        roomType: { select: { name: true, code: true } },
        assignedRoom: { select: { id: true, roomNumber: true, floor: true } },
        folios: {
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { assignedRoom: { roomNumber: 'asc' } },
    });

    let totalNightRoomBaseRevenue = 0;
    let totalNightSGST = 0;
    let totalNightCGST = 0;
    let totalNightServicesRevenue = 0;
    let totalInHouseOutstanding = 0;

    const inHouseGuestList = inHouseReservations.map((res) => {
      const isGSTBill = (res.taxAmount && res.taxAmount > 0) || Boolean(res.guest.gstin);
      const baseTariff = res.roomRate || 0;
      const cgst = isGSTBill ? Math.round(baseTariff * 0.025 * 100) / 100 : 0;
      const sgst = isGSTBill ? Math.round(baseTariff * 0.025 * 100) / 100 : 0;
      const totalNightTariff = baseTariff + cgst + sgst;

      totalNightRoomBaseRevenue += baseTariff;
      totalNightCGST += cgst;
      totalNightSGST += sgst;

      const folio = res.folios[0];
      const otherCharges = (folio?.transactions || [])
        .filter((t) => t.type === 'DEBIT' && t.category !== 'ROOM_CHARGE')
        .reduce((sum, t) => sum + t.amount, 0);

      totalNightServicesRevenue += otherCharges;

      const totalPayments = (res.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const folioTotalCharges = (folio?.totalCharges || (totalNightTariff * (res.nights || 1) + otherCharges));
      const outstandingBalance = Math.max(0, folioTotalCharges - totalPayments);
      totalInHouseOutstanding += outstandingBalance;

      return {
        id: res.id,
        reservationRef: res.reservationRef,
        guestName: res.guest.displayName,
        phone: res.guest.phone,
        gstin: res.guest.gstin,
        isGSTBill,
        roomNumber: res.assignedRoom?.roomNumber || 'Unassigned',
        roomTypeName: res.roomType?.name || 'Standard',
        arrivalDate: res.arrivalDate,
        arrivalTime: res.arrivalTime || '14:00',
        departureDate: res.departureDate,
        departureTime: res.departureTime || '11:00',
        nights: res.nights || 1,
        baseTariff,
        cgst,
        sgst,
        totalNightTariff,
        otherCharges,
        totalPayments,
        outstandingBalance,
      };
    });

    // 5. Daily Payments by Method
    const todayPayments = await db.payment.findMany({
      where: {
        propertyId,
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        guest: { select: { displayName: true } },
        reservation: {
          select: {
            reservationRef: true,
            assignedRoom: { select: { roomNumber: true } },
          },
        },
        receivedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const paymentMethodsSummary = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      NET_BANKING: 0,
      OTHER: 0,
      TOTAL: 0,
    };

    todayPayments.forEach((p) => {
      const method = (p.method || 'CASH').toUpperCase();
      const amt = p.amount || 0;
      paymentMethodsSummary.TOTAL += amt;
      if (method.includes('CASH')) paymentMethodsSummary.CASH += amt;
      else if (method.includes('UPI')) paymentMethodsSummary.UPI += amt;
      else if (method.includes('CARD')) paymentMethodsSummary.CARD += amt;
      else if (method.includes('NET') || method.includes('BANK')) paymentMethodsSummary.NET_BANKING += amt;
      else paymentMethodsSummary.OTHER += amt;
    });

    // 6. Cashier Shifts for reconciliation
    const activeShifts = await db.cashierShift.findMany({
      where: {
        propertyId,
        OR: [
          { status: 'OPEN' },
          { openedAt: { gte: startOfDay, lte: endOfDay } },
          { closedAt: { gte: startOfDay, lte: endOfDay } },
        ],
      },
      include: { user: { select: { fullName: true } } },
      orderBy: { openedAt: 'desc' },
    });

    const totalOpeningCash = activeShifts.reduce((sum, s) => sum + (s.openingCash || 0), 0);
    const expectedDrawerCash = totalOpeningCash + paymentMethodsSummary.CASH;

    // 7. KPIs & Financial Calculations
    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : '0';
    const grossRevenue = totalNightRoomBaseRevenue + totalNightSGST + totalNightCGST + totalNightServicesRevenue;
    const adr = occupiedRooms > 0 ? (totalNightRoomBaseRevenue / occupiedRooms).toFixed(2) : '0';
    const revPar = totalRooms > 0 ? (totalNightRoomBaseRevenue / totalRooms).toFixed(2) : '0';

    // 8. Recent Audit History
    const auditHistoryRecords = await db.savedReport.findMany({
      where: {
        propertyId,
        dataset: 'NIGHT_AUDIT',
      },
      include: {
        owner: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const auditHistory = auditHistoryRecords.map((item) => {
      let dim: any = {};
      let met: any = {};
      try {
        dim = JSON.parse(item.dimensions);
      } catch (e) {}
      try {
        met = JSON.parse(item.metrics);
      } catch (e) {}
      return {
        id: item.id,
        businessDate: dim.businessDate || item.reportName.replace('Night Audit - ', ''),
        closedAt: dim.closedAt || item.createdAt,
        performedBy: dim.performedByName || item.owner?.fullName || 'System',
        status: dim.status || 'COMPLETED',
        totalRooms: met.totalRooms || 0,
        occupiedRooms: met.occupiedRooms || 0,
        occupancyRate: met.occupancyRate || 0,
        grossRevenue: met.totalRevenue || 0,
        paymentsCollected: met.totalCollected || 0,
        cashPayments: met.cashPayments || 0,
        expectedCash: met.expectedCash || 0,
        actualCash: met.actualCash || 0,
        discrepancy: met.discrepancy || 0,
        createdAt: item.createdAt,
      };
    });

    let savedAuditDetails = null;
    if (existingAudit) {
      try {
        const dim = JSON.parse(existingAudit.dimensions);
        const met = JSON.parse(existingAudit.metrics);
        const fil = JSON.parse(existingAudit.filters || '{}');
        savedAuditDetails = {
          id: existingAudit.id,
          businessDate: dim.businessDate,
          closedAt: dim.closedAt,
          performedBy: dim.performedByName,
          metrics: met,
          snapshot: fil.snapshotData || null,
          notes: fil.notes || '',
        };
      } catch (e) {}
    }

    return NextResponse.json({
      businessDate,
      isClosed: Boolean(existingAudit),
      savedAuditDetails,
      property: {
        name: property?.name || 'Indira Lodge',
        code: property?.code || 'IL',
        address: property?.address || '',
        city: property?.city || '',
        phone: property?.phone || '',
        email: property?.email || '',
      },
      roomStats: {
        totalRooms,
        occupiedRooms,
        vacantRooms,
        blockedRooms,
        cleanRooms,
        dirtyRooms,
        cleaningRooms,
        occupancyRate: parseFloat(occupancyRate),
        adr: parseFloat(adr),
        revPar: parseFloat(revPar),
      },
      exceptions: {
        pendingArrivals,
        pendingDepartures,
        dirtyRoomsCount: dirtyRooms,
        cleaningRoomsCount: cleaningRooms,
        blockedRoomsCount: blockedRooms,
        totalExceptionsCount: pendingArrivals.length + pendingDepartures.length,
      },
      inHouseGuestList,
      revenueSummary: {
        roomBaseRevenue: totalNightRoomBaseRevenue,
        cgst: totalNightCGST,
        sgst: totalNightSGST,
        totalGST: totalNightCGST + totalNightSGST,
        servicesRevenue: totalNightServicesRevenue,
        grossRevenue,
        totalCollected: paymentMethodsSummary.TOTAL,
        inHouseOutstanding: totalInHouseOutstanding,
      },
      paymentBreakdown: paymentMethodsSummary,
      paymentTransactions: todayPayments.map((p) => ({
        id: p.id,
        ref: p.paymentRef,
        amount: p.amount,
        method: p.method,
        guestName: p.guest?.displayName || 'Walk-in Guest',
        roomNumber: p.reservation?.assignedRoom?.roomNumber || '-',
        date: p.date,
        receivedBy: p.receivedBy?.fullName || 'Staff',
      })),
      cashReconciliation: {
        activeShiftsCount: activeShifts.length,
        totalOpeningCash,
        cashCollectedToday: paymentMethodsSummary.CASH,
        expectedDrawerCash,
        shifts: activeShifts.map((s) => ({
          id: s.id,
          cashierName: s.user?.fullName || 'Staff',
          openedAt: s.openedAt,
          closedAt: s.closedAt,
          openingCash: s.openingCash,
          status: s.status,
        })),
      },
      auditHistory,
    });
  } catch (error: any) {
    console.error('Night Audit GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to load Night Audit data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess =
      hasPermission(session.permissions, 'finance.view') ||
      hasPermission(session.permissions, 'cash.view') ||
      session.roles?.includes('Super Admin') ||
      session.roles?.includes('Owner') ||
      session.roles?.includes('General Manager');

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden: Only authorized managers can execute Night Audit' }, { status: 403 });
    }

    let propertyId = session.propertyId;
    if (!propertyId) {
      const prop = await db.property.findFirst({
        where: { organizationId: session.organizationId },
        select: { id: true },
      });
      propertyId = prop?.id || null;
    }

    if (!propertyId) {
      return NextResponse.json({ error: 'No active property found' }, { status: 400 });
    }

    const body = await req.json();
    const {
      action,
      businessDate,
      autoNoShow = false,
      actualCashDrawer = 0,
      discrepancyReason = '',
      auditNotes = '',
      metrics,
      snapshotData,
    } = body;

    const [y, m, d] = (businessDate || new Date().toISOString().split('T')[0]).split('-').map(Number);
    const localStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    const localEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
    const utcStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    const utcEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
    const startOfDay = localStart < utcStart ? localStart : utcStart;
    const endOfDay = localEnd > utcEnd ? localEnd : utcEnd;

    // Action A: Auto-resolve pending arrivals as No-Show
    if (action === 'auto_no_show') {
      const pendingArrivals = await db.reservation.findMany({
        where: {
          propertyId,
          arrivalDate: { lte: endOfDay },
          status: { in: ['CONFIRMED', 'RESERVED'] },
        },
      });

      const updatedCount = pendingArrivals.length;
      for (const res of pendingArrivals) {
        await db.reservation.update({
          where: { id: res.id },
          data: {
            status: 'NO_SHOW',
            noShowAt: new Date(),
          },
        });

        if (res.assignedRoomId) {
          await db.room.update({
            where: { id: res.assignedRoomId },
            data: { availabilityStatus: 'AVAILABLE' },
          });
        }

        await logAuditEvent({
          organizationId: session.organizationId,
          propertyId,
          userId: session.userId,
          action: 'NIGHT_AUDIT_AUTO_NOSHOW',
          module: 'night_audit',
          entityId: res.id,
          afterData: { reservationRef: res.reservationRef, reason: 'Night Audit Auto No-Show' },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully marked ${updatedCount} unarrived reservations as No-Show.`,
        updatedCount,
      });
    }

    // Action B: Execute Night Audit & Close Business Day
    if (action === 'close_day') {
      // 1. Check pending arrivals if not auto-resolving
      const pendingArrivals = await db.reservation.findMany({
        where: {
          propertyId,
          arrivalDate: { lte: endOfDay },
          status: { in: ['CONFIRMED', 'RESERVED'] },
        },
      });

      if (pendingArrivals.length > 0) {
        if (autoNoShow) {
          for (const res of pendingArrivals) {
            await db.reservation.update({
              where: { id: res.id },
              data: {
                status: 'NO_SHOW',
                noShowAt: new Date(),
              },
            });
            if (res.assignedRoomId) {
              await db.room.update({
                where: { id: res.assignedRoomId },
                data: { availabilityStatus: 'AVAILABLE' },
              });
            }
          }
        } else {
          return NextResponse.json(
            {
              error: `Night audit blocked: There are ${pendingArrivals.length} pending arrivals that have not checked in. Please resolve them or enable Auto No-Show.`,
              pendingArrivalsCount: pendingArrivals.length,
            },
            { status: 400 }
          );
        }
      }

      // 2. Calculate discrepancy
      const expectedCash = Number(metrics?.expectedCash || 0);
      const countedCash = Number(actualCashDrawer || 0);
      const discrepancy = Math.round((countedCash - expectedCash) * 100) / 100;

      // 3. Check if audit record already exists for this date
      const reportName = `Night Audit - ${businessDate}`;
      const existing = await db.savedReport.findFirst({
        where: {
          propertyId,
          dataset: 'NIGHT_AUDIT',
          reportName,
        },
      });

      const dimensionsObj = {
        businessDate,
        closedAt: new Date().toISOString(),
        performedById: session.userId,
        performedByName: session.fullName || 'Auditor',
        status: 'COMPLETED',
      };

      const metricsObj = {
        ...metrics,
        expectedCash,
        actualCash: countedCash,
        discrepancy,
      };

      const filtersObj = {
        notes: auditNotes || discrepancyReason ? `${auditNotes || ''} | Discrepancy Note: ${discrepancyReason || 'None'}` : '',
        snapshotData,
      };

      let auditRecord;
      if (existing) {
        auditRecord = await db.savedReport.update({
          where: { id: existing.id },
          data: {
            dimensions: JSON.stringify(dimensionsObj),
            metrics: JSON.stringify(metricsObj),
            filters: JSON.stringify(filtersObj),
            ownerId: session.userId,
          },
        });
      } else {
        auditRecord = await db.savedReport.create({
          data: {
            propertyId,
            ownerId: session.userId,
            reportName,
            dataset: 'NIGHT_AUDIT',
            dimensions: JSON.stringify(dimensionsObj),
            metrics: JSON.stringify(metricsObj),
            filters: JSON.stringify(filtersObj),
            isFavorite: true,
          },
        });
      }

      // 4. Log Audit Event
      await logAuditEvent({
        organizationId: session.organizationId,
        propertyId,
        userId: session.userId,
        action: 'NIGHT_AUDIT_COMPLETED',
        module: 'night_audit',
        entityId: auditRecord.id,
        afterData: {
          businessDate,
          totalRevenue: metricsObj.totalRevenue,
          occupancyRate: metricsObj.occupancyRate,
          discrepancy,
          performedBy: session.fullName,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Night Audit for ${businessDate} completed successfully. Business day closed.`,
        auditId: auditRecord.id,
        businessDate,
        discrepancy,
      });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (error: any) {
    console.error('Night Audit POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute Night Audit' }, { status: 500 });
  }
}
