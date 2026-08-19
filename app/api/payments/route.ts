import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { postPaymentJournal } from '@/lib/accountingPosting';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'folio.payment')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const body = await req.json();
    const { reservationId, folioId, amount, method, notes, transactionRef } = body;

    if (!reservationId || !amount) {
      return NextResponse.json({ error: 'Reservation ID and payment amount are required.' }, { status: 400 });
    }

    const payAmount = parseFloat(amount);
    if (payAmount <= 0) {
      return NextResponse.json({ error: 'Payment amount must be greater than zero.' }, { status: 400 });
    }

    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: { folios: true, guest: true },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found.' }, { status: 404 });
    }

    const targetFolio = folioId
      ? await db.folio.findUnique({ where: { id: folioId } })
      : reservation.folios[0];

    const propertyId = reservation.propertyId;
    const paymentRef = await generateReferenceNumber(propertyId, 'PAY');

    // 1. Create Payment record
    const payment = await db.payment.create({
      data: {
        propertyId,
        folioId: targetFolio ? targetFolio.id : null,
        reservationId,
        guestId: reservation.guestId,
        paymentRef,
        amount: payAmount,
        method: method || 'CASH',
        transactionRef: transactionRef || null,
        notes: notes || null,
        receivedById: session.userId,
      },
    });

    // 2. Post CREDIT transaction to Folio
    if (targetFolio) {
      const trxRef = await generateReferenceNumber(propertyId, 'TRX');
      await db.folioTransaction.create({
        data: {
          folioId: targetFolio.id,
          transactionRef: trxRef,
          type: 'CREDIT',
          category: 'PAYMENT',
          description: `Payment Received (${method || 'CASH'}) - ${paymentRef}`,
          quantity: 1,
          unitPrice: payAmount,
          amount: payAmount,
          status: 'POSTED',
          postedById: session.userId,
          reference: paymentRef,
        },
      });

      const newTotalPayments = targetFolio.totalPayments + payAmount;
      const newFolioBalance = Math.max(0, targetFolio.totalCharges - newTotalPayments);

      await db.folio.update({
        where: { id: targetFolio.id },
        data: {
          totalPayments: newTotalPayments,
          balanceAmount: newFolioBalance,
        },
      });
    }

    // 3. Update Reservation Paid & Balance Amounts
    const newResPaid = reservation.paidAmount + payAmount;
    const newResBalance = Math.max(0, reservation.totalAmount - newResPaid);

    await db.reservation.update({
      where: { id: reservationId },
      data: {
        paidAmount: newResPaid,
        balanceAmount: newResBalance,
      },
    });

    // PHASE 4 AUTOMATIC DOUBLE-ENTRY ACCOUNTING POSTING
    try {
      await postPaymentJournal({
        propertyId,
        amount: payAmount,
        method: method || 'CASH',
        description: `Payment ${paymentRef} from ${reservation.guest.displayName}`,
        sourceReference: paymentRef,
        userId: session.userId,
      });
    } catch (err) {
      console.error('Payment accounting posting warning:', err);
    }

    // 4. Log Audit Event
    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId,
      userId: session.userId,
      action: 'PAYMENT_RECORDED',
      module: 'finance',
      entityId: payment.id,
      afterData: { paymentRef, amount: payAmount, method, guestName: reservation.guest.displayName },
    });

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to record payment' }, { status: 500 });
  }
}
