import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { createNotification, notifyAllStaff } from '@/lib/notifications';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'checkout.create')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const body = await req.json();
    const { reservationId, overrideBalance, overrideReason } = body;

    if (!reservationId) {
      return NextResponse.json({ error: 'Reservation ID is required for check-out.' }, { status: 400 });
    }

    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: {
        guest: true,
        assignedRoom: true,
        folios: true,
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found.' }, { status: 404 });
    }

    if (reservation.status !== 'CHECKED_IN') {
      return NextResponse.json(
        { error: `Cannot check out reservation with status '${reservation.status}'. Only CHECKED_IN stays can be checked out.` },
        { status: 400 }
      );
    }

    // Check Folio Balance
    const folio = reservation.folios[0];
    const outstanding = folio ? folio.balanceAmount : reservation.balanceAmount;

    if (outstanding > 0.01) {
      if (!overrideBalance) {
        return NextResponse.json({
          error: `Check-out blocked: Outstanding folio balance of ₹${outstanding.toFixed(2)} must be settled before checkout.`,
          outstandingBalance: outstanding,
          requiresOverride: true,
        }, { status: 400 });
      }

      if (!hasPermission(session.permissions, 'checkout.override_balance')) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to override unpaid guest checkouts.' },
          { status: 403 }
        );
      }
    }

    // 1. Update Reservation Status
    const updatedRes = await db.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'CHECKED_OUT',
        actualCheckOutAt: new Date(),
      },
    });

    // 2. Automatically update Physical Room status -> AVAILABLE & DIRTY
    if (reservation.assignedRoomId) {
      await db.room.update({
        where: { id: reservation.assignedRoomId },
        data: {
          availabilityStatus: 'AVAILABLE',
          housekeepingStatus: 'DIRTY', // Queued automatically for Housekeeping
        },
      });

      // 3. PHASE 3 AUTOMATION: Create Housekeeping Task -> Checkout Cleaning
      const hkRef = await generateReferenceNumber(reservation.propertyId, 'HK');
      const hkTask = await db.housekeepingTask.create({
        data: {
          taskRef: hkRef,
          propertyId: reservation.propertyId,
          roomId: reservation.assignedRoomId,
          taskType: 'CHECKOUT_CLEANING',
          priority: reservation.guest.vipStatus ? 'URGENT' : 'HIGH',
          status: 'PENDING',
          createdById: session.userId,
          reservationId: reservation.id,
          guestId: reservation.guestId,
          isVip: reservation.guest.vipStatus,
          estimatedDuration: 45,
          notes: `Automatic Checkout Cleaning generated for Room ${reservation.assignedRoom?.roomNumber || ''} (Guest: ${reservation.guest.displayName})`,
        },
      });

      // Notify Housekeeping Staff / Managers
      await createNotification({
        propertyId: reservation.propertyId,
        userId: session.userId,
        title: `Room ${reservation.assignedRoom?.roomNumber} Dirty - Checkout Cleaning Required`,
        message: `Guest ${reservation.guest.displayName} checked out. Room ${reservation.assignedRoom?.roomNumber} queued for cleaning (${hkRef}).`,
        type: 'WARNING',
        priority: reservation.guest.vipStatus ? 'URGENT' : 'HIGH',
        module: 'housekeeping',
        entityId: hkTask.id,
      });
    }

    // 4. Close Folio
    if (folio) {
      await db.folio.update({
        where: { id: folio.id },
        data: { status: 'CLOSED' },
      });
    }

    // 5. Log Audit Event & Broadcast Real-time Alert to All Staff
    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: reservation.propertyId,
      userId: session.userId,
      action: 'GUEST_CHECKED_OUT',
      module: 'front_office',
      entityId: reservationId,
      afterData: {
        guestName: reservation.guest.displayName,
        roomId: reservation.assignedRoomId,
        outstandingSettled: outstanding <= 0.01,
        overrideBalance: !!overrideBalance,
        overrideReason: overrideReason || null,
      },
    });

    const roomNumber = reservation.assignedRoom?.roomNumber ? `Room ${reservation.assignedRoom.roomNumber}` : 'assigned room';

    await notifyAllStaff({
      propertyId: reservation.propertyId,
      title: '🚪 Guest Checked Out',
      message: `${reservation.guest.displayName} checked out from ${roomNumber}. Room marked dirty for cleaning.`,
      type: 'INFO',
      priority: 'HIGH',
      module: 'front_office',
      entityId: reservationId,
      url: `/reservations/${reservationId}`,
    });

    return NextResponse.json({ success: true, reservation: updatedRes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Check-out failed' }, { status: 500 });
  }
}
