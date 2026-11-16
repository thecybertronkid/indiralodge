import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAuditEvent } from '@/lib/audit';

const MODULE_PASSWORD = '7777A';

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const isSuperAdmin =
      session.roles.includes('Super Admin') ||
      session.roles.includes('Owner') ||
      session.permissions.includes('*');

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden. Access to Revert Hub is strictly reserved for Super Admin.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { password, action, reservationId, targetUserId, reason } = body;

    if (password !== MODULE_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid Super Admin Access Password. Access Denied.' },
        { status: 401 }
      );
    }

    if (!reservationId || !action) {
      return NextResponse.json({ error: 'Missing reservationId or action.' }, { status: 400 });
    }

    // Load reservation with all dependencies
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: {
        assignedRoom: true,
        guest: true,
        createdBy: true,
        folios: {
          include: {
            transactions: true,
            payments: true,
            taxInvoices: true,
          },
        },
        taxInvoices: {
          include: {
            issuedBy: true,
            lines: true,
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found.' }, { status: 404 });
    }

    const roomNumber = reservation.assignedRoom?.roomNumber || 'Unknown Room';
    const guestName = reservation.guest?.displayName || reservation.guest?.firstName || 'Guest';

    // Determine responsible staff member
    let responsibleUserId = targetUserId;
    if (!responsibleUserId) {
      // If bill was issued, check issuedBy
      const invoice = reservation.taxInvoices[0];
      if (invoice?.issuedById) {
        responsibleUserId = invoice.issuedById;
      } else if (reservation.createdById) {
        responsibleUserId = reservation.createdById;
      }
    }

    // Execute requested revert action
    if (action === 'REVERT_BILL_TO_CHECKIN') {
      // Revert premature/wrong bill back to active check-in
      const invoiceIds = reservation.taxInvoices.map((inv) => inv.id);
      const invoiceRefs = reservation.taxInvoices.map((inv) => inv.invoiceRef);

      // Delete invoice lines & invoices
      if (invoiceIds.length > 0) {
        await db.taxInvoiceLine.deleteMany({
          where: { invoiceId: { in: invoiceIds } },
        });

        // Remove linked journal entries
        if (invoiceRefs.length > 0) {
          // Get journal entries referencing these invoices
          const journals = await db.journalEntry.findMany({
            where: { sourceReference: { in: invoiceRefs } },
            select: { id: true },
          });
          const journalIds = journals.map((j) => j.id);

          if (journalIds.length > 0) {
            await db.journalLine.deleteMany({
              where: { journalEntryId: { in: journalIds } },
            }).catch(() => {});

            await db.journalEntry.deleteMany({
              where: { id: { in: journalIds } },
            }).catch(() => {});
          }
        }

        await db.taxInvoice.deleteMany({
          where: { id: { in: invoiceIds } },
        });
      }

      // Revert reservation status to CHECKED_IN & unbilled
      await db.reservation.update({
        where: { id: reservation.id },
        data: {
          isBilled: false,
          billType: null,
          billedAt: null,
          billedInvoiceId: null,
          status: 'CHECKED_IN',
          actualCheckOutAt: null,
        },
      });

      // Ensure room is OCCUPIED
      if (reservation.assignedRoomId) {
        await db.room.update({
          where: { id: reservation.assignedRoomId },
          data: { availabilityStatus: 'OCCUPIED' },
        });
      }

      // Ensure folios are ACTIVE
      await db.folio.updateMany({
        where: { reservationId: reservation.id },
        data: { status: 'ACTIVE' },
      });
    } else if (action === 'REVERT_CHECKIN_TO_CONFIRMED') {
      // Revert check-in back to confirmed booking
      const invoiceIds = reservation.taxInvoices.map((inv) => inv.id);
      if (invoiceIds.length > 0) {
        await db.taxInvoiceLine.deleteMany({
          where: { invoiceId: { in: invoiceIds } },
        });
        await db.taxInvoice.deleteMany({
          where: { id: { in: invoiceIds } },
        });
      }

      await db.reservation.update({
        where: { id: reservation.id },
        data: {
          status: 'CONFIRMED',
          actualCheckInAt: null,
          actualCheckOutAt: null,
          isBilled: false,
          billType: null,
          billedAt: null,
          billedInvoiceId: null,
        },
      });

      // Free room back to VACANT_CLEAN
      if (reservation.assignedRoomId) {
        await db.room.update({
          where: { id: reservation.assignedRoomId },
          data: { availabilityStatus: 'VACANT_CLEAN' },
        });
      }

      await db.folio.updateMany({
        where: { reservationId: reservation.id },
        data: { status: 'ACTIVE' },
      });
    } else if (action === 'DELETE_CHECKIN') {
      // Completely void & delete this check-in / reservation
      const invoiceIds = reservation.taxInvoices.map((inv) => inv.id);
      if (invoiceIds.length > 0) {
        await db.taxInvoiceLine.deleteMany({
          where: { invoiceId: { in: invoiceIds } },
        });
        await db.taxInvoice.deleteMany({
          where: { id: { in: invoiceIds } },
        });
      }

      const folioIds = reservation.folios.map((f) => f.id);
      if (folioIds.length > 0) {
        await db.folioTransaction.deleteMany({
          where: { folioId: { in: folioIds } },
        });
        await db.payment.deleteMany({
          where: { folioId: { in: folioIds } },
        });
        await db.folio.deleteMany({
          where: { id: { in: folioIds } },
        });
      }

      await db.stayHistory.deleteMany({
        where: { reservationId: reservation.id },
      });
      await db.housekeepingTask.deleteMany({
        where: { reservationId: reservation.id },
      });
      await db.reservationGuest.deleteMany({
        where: { reservationId: reservation.id },
      });

      // Free room
      if (reservation.assignedRoomId) {
        await db.room.update({
          where: { id: reservation.assignedRoomId },
          data: {
            availabilityStatus: 'VACANT_CLEAN',
            housekeepingStatus: 'CLEAN',
          },
        });
      }

      // Delete reservation
      await db.reservation.delete({
        where: { id: reservation.id },
      });
    } else {
      return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
    }

    // Strike & Account Blocking System
    let staffUpdated: any = null;
    let newStrikeCount = 0;
    let isBlocked = false;

    if (responsibleUserId) {
      const responsibleUser = await db.user.findUnique({
        where: { id: responsibleUserId },
      });

      if (responsibleUser) {
        newStrikeCount = (responsibleUser.strikeCount || 0) + 1;
        isBlocked = newStrikeCount >= 3;

        const updateData: any = {
          strikeCount: newStrikeCount,
        };

        if (isBlocked) {
          updateData.status = 'BLOCKED';
          updateData.blockedAt = new Date();
          updateData.blockedReason = `Account automatically blocked: Exceeded 3 strikes from Super Admin reverts (Latest: Room ${roomNumber} - ${guestName}).`;
          
          // Terminate all live sessions for this user immediately
          await db.userSession.deleteMany({
            where: { userId: responsibleUser.id },
          }).catch(() => {});
        }

        staffUpdated = await db.user.update({
          where: { id: responsibleUser.id },
          data: updateData,
        });

        // Create POPUP_WARNING notification
        const actionLabel =
          action === 'REVERT_BILL_TO_CHECKIN'
            ? 'Premature/Wrong Bill Reverted back to Active Check-In'
            : action === 'REVERT_CHECKIN_TO_CONFIRMED'
            ? 'Check-In Reverted back to Confirmed Booking'
            : 'Check-In Voided & Deleted';

        const warningTitle = isBlocked
          ? '🚫 ACCOUNT BLOCKED: 3 STRIKES EXCEEDED'
          : `⚠️ REVERSION NOTICE & STRIKE WARNING (Strike ${newStrikeCount} of 3)`;

        const warningMessage = isBlocked
          ? `An error check-in/bill for Room ${roomNumber} (${guestName}) was rectified and reverted by the Super Admin (${actionLabel}).\n\n⛔ ACCOUNT BLOCKED: You have accumulated 3 strikes. Your account has been blocked from accessing or operating the hotel portal.\n\nPlease report immediately in person to the Super Admin to review and reopen your account.`
          : `An error check-in/bill for Room ${roomNumber} (${guestName}) was rectified and reverted by the Super Admin (${actionLabel}).\n\n⚠️ STRIKE NOTICE: You have accumulated Strike ${newStrikeCount} of 3.\n\nPlease note: If errors are committed repeatedly (3 strikes), your account will be immediately blocked and cannot be reopened until reported to the Super Admin.${reason ? `\n\nAdmin Note: ${reason}` : ''}`;

        await db.notification.create({
          data: {
            propertyId: reservation.propertyId,
            userId: responsibleUser.id,
            title: warningTitle,
            message: warningMessage,
            type: 'POPUP_WARNING',
            priority: 'URGENT',
            module: 'super_admin_revert',
            entityId: reservation.id,
            isRead: false,
          },
        });
      }
    }

    // Log Super Admin Audit event
    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: session.propertyId,
      userId: session.userId,
      action: `SUPER_ADMIN_${action}`,
      module: 'revert_hub',
      entityId: reservation.id,
      afterData: {
        roomNumber,
        guestName,
        responsibleUserId,
        newStrikeCount,
        isBlocked,
        reason: reason || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully executed ${action} for Room ${roomNumber}.`,
      staffUpdated: staffUpdated
        ? {
            id: staffUpdated.id,
            fullName: staffUpdated.fullName,
            strikeCount: staffUpdated.strikeCount,
            status: staffUpdated.status,
            isBlocked,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Revert Hub execute error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to execute revert.' },
      { status: 500 }
    );
  }
}
