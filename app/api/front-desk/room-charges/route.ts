import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { postRoomChargeJournal } from '@/lib/accountingPosting';
import { logAuditEvent } from '@/lib/audit';

/**
 * GET /api/front-desk/room-charges?roomId=<roomId>&reservationId=<reservationId>
 * Returns all extra (non-ROOM_CHARGE) folio transactions for the currently occupied reservation in a room.
 */
export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const reservationId = searchParams.get('reservationId');

    if (!roomId && !reservationId) {
      return NextResponse.json({ error: 'roomId or reservationId is required' }, { status: 400 });
    }

    // Find the active (CHECKED_IN or by ID) reservation
    const reservation = await db.reservation.findFirst({
      where: reservationId
        ? { id: reservationId }
        : {
            assignedRoomId: roomId,
            status: 'CHECKED_IN',
          },
      include: {
        folios: {
          include: {
            transactions: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!reservation || !reservation.folios.length) {
      return NextResponse.json({ extraCharges: [] });
    }

    const folio = reservation.folios[0];

    // Return only the extra items (not the base ROOM_CHARGE or PAYMENT)
    const extraCharges = folio.transactions.filter(
      (t) => t.category !== 'ROOM_CHARGE' && t.category !== 'PAYMENT'
    );

    return NextResponse.json({ extraCharges, folioId: folio.id, folioNumber: folio.folioNumber });
  } catch (error: any) {
    console.error('GET room-charges error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch room charges' }, { status: 500 });
  }
}

/**
 * POST /api/front-desk/room-charges
 * Posts a new extra item/service charge to the active folio of the specified room.
 * Body: { roomId, reservationId, description, category, quantity, unitPrice, notes? }
 */
export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (
      !hasPermission(session.permissions, 'room_order.create') &&
      !hasPermission(session.permissions, 'folio.charge') &&
      !hasPermission(session.permissions, 'billing.create') &&
      !hasPermission(session.permissions, 'frontdesk.view')
    ) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const body = await req.json();
    const { roomId, reservationId, description, category, quantity, unitPrice, notes } = body;

    if ((!roomId && !reservationId) || !description || !unitPrice) {
      return NextResponse.json(
        { error: 'roomId or reservationId, description, and unitPrice are required' },
        { status: 400 }
      );
    }

    const qty = parseInt(String(quantity || 1), 10);
    const price = parseFloat(String(unitPrice));
    const totalAmount = Math.round(qty * price * 100) / 100;

    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: 'Invalid unit price' }, { status: 400 });
    }

    // Find the active reservation by reservationId or assignedRoomId
    const reservation = await db.reservation.findFirst({
      where: reservationId
        ? { id: reservationId }
        : {
            assignedRoomId: roomId,
            status: 'CHECKED_IN',
          },
      include: {
        guest: true,
        folios: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: 'No active reservation found' },
        { status: 404 }
      );
    }

    // Check if the bill has already been generated and locked
    if (reservation.isBilled) {
      return NextResponse.json(
        { error: 'Cannot post room charges: Final bill has already been generated and locked for this stay.' },
        { status: 400 }
      );
    }

    // Get or create a folio for this reservation
    let folio = reservation.folios[0];
    if (!folio) {
      const folioNumber = await generateReferenceNumber(reservation.propertyId, 'FOL');
      folio = await db.folio.create({
        data: {
          propertyId: reservation.propertyId,
          reservationId: reservation.id,
          guestId: reservation.guestId,
          folioNumber,
          status: 'ACTIVE',
          totalCharges: 0,
          totalPayments: 0,
          balanceAmount: 0,
        },
      });
    }

    // Create the transaction reference
    const trxRef = await generateReferenceNumber(reservation.propertyId, 'TRX');

    // Post the extra charge transaction
    const transaction = await db.folioTransaction.create({
      data: {
        folioId: folio.id,
        transactionRef: trxRef,
        type: 'DEBIT',
        category: category || 'MISCELLANEOUS',
        description: notes ? `${description} — ${notes}` : description,
        quantity: qty,
        unitPrice: price,
        discount: 0,
        tax: 0,
        amount: totalAmount,
        status: 'POSTED',
        postedById: session.userId,
      },
    });

    // Update folio totals
    await db.folio.update({
      where: { id: folio.id },
      data: {
        totalCharges: { increment: totalAmount },
        balanceAmount: { increment: totalAmount },
      },
    });

    // Update the reservation total as well
    await db.reservation.update({
      where: { id: reservation.id },
      data: {
        totalAmount: { increment: totalAmount },
        balanceAmount: { increment: totalAmount },
      },
    });

    // Log audit event
    logAuditEvent({
      organizationId: session.organizationId,
      propertyId: reservation.propertyId,
      userId: session.userId,
      action: 'ROOM_ORDER_POSTED',
      module: 'billing',
      entityId: transaction.id,
      afterData: {
        reservationId: reservation.id,
        description,
        amount: totalAmount,
        quantity: qty,
        unitPrice: price,
      },
    });

    // Post accounting journal entry (non-blocking)
    try {
      await postRoomChargeJournal({
        propertyId: reservation.propertyId,
        amount: totalAmount,
        description: `Extra Charge: ${description} for ${reservation.guest.displayName} (${folio.folioNumber})`,
        sourceReference: trxRef,
        userId: session.userId,
      });
    } catch (accountingErr) {
      console.error('Accounting journal posting warning (non-fatal):', accountingErr);
    }

    return NextResponse.json({
      success: true,
      message: `₹${totalAmount.toFixed(2)} posted to folio for ${reservation.guest.displayName}`,
      transaction,
      folioId: folio.id,
    });
  } catch (error: any) {
    console.error('POST room-charges error:', error);
    return NextResponse.json({ error: error.message || 'Failed to post room charge' }, { status: 500 });
  }
}

/**
 * DELETE /api/front-desk/room-charges?transactionId=<id>
 * Deletes a room order / extra charge if added by mistake and recalculates folio balance.
 */
export async function DELETE(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId is required' }, { status: 400 });
    }

    // Find the transaction
    const transaction = await db.folioTransaction.findUnique({
      where: { id: transactionId },
      include: {
        folio: {
          include: {
            reservation: {
              include: { guest: true },
            },
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Room charge transaction not found' }, { status: 404 });
    }

    // Prevent deleting base ROOM_CHARGE or PAYMENT through this endpoint
    if (transaction.category === 'ROOM_CHARGE' || transaction.category === 'PAYMENT') {
      return NextResponse.json({ error: 'Base room charges and payments cannot be deleted through extra orders.' }, { status: 400 });
    }

    const folio = transaction.folio;
    const reservation = folio?.reservation;

    // Check if the bill has already been generated and locked
    if (reservation?.isBilled) {
      return NextResponse.json(
        { error: 'Cannot delete room order: Final bill has already been generated and locked for this stay.' },
        { status: 400 }
      );
    }

    const amountToDeduct = transaction.amount;

    // Run delete and balance updates in a transaction
    await db.$transaction(async (tx) => {
      // Delete the transaction record
      await tx.folioTransaction.delete({
        where: { id: transactionId },
      });

      // Update folio totals
      if (folio) {
        await tx.folio.update({
          where: { id: folio.id },
          data: {
            totalCharges: { decrement: amountToDeduct },
            balanceAmount: { decrement: amountToDeduct },
          },
        });
      }

      // Update reservation totals
      if (reservation) {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            totalAmount: { decrement: amountToDeduct },
            balanceAmount: { decrement: amountToDeduct },
          },
        });
      }
    });

    // Log audit event
    logAuditEvent({
      organizationId: session.organizationId,
      propertyId: reservation?.propertyId || session.propertyId,
      userId: session.userId,
      action: 'ROOM_ORDER_DELETED',
      module: 'billing',
      entityId: transactionId,
      afterData: {
        description: transaction.description,
        amountDeducted: amountToDeduct,
        reservationRef: reservation?.reservationRef,
        guest: reservation?.guest?.displayName,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Room order "${transaction.description}" (₹${amountToDeduct.toFixed(2)}) deleted successfully.`,
      deductedAmount: amountToDeduct,
    });
  } catch (error: any) {
    console.error('DELETE room-charges error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete room charge' }, { status: 500 });
  }
}
