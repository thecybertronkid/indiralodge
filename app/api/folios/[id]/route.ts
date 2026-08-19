import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'folio.view')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const folioId = params.id;
    const folio = await db.folio.findUnique({
      where: { id: folioId },
      include: {
        guest: { select: { displayName: true, phone: true, email: true, guestRef: true, address: true, gstin: true } },
        reservation: {
          include: {
            assignedRoom: { select: { roomNumber: true } },
            roomType: { select: { name: true } },
          },
        },
        transactions: {
          include: { postedBy: { select: { fullName: true } } },
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          include: { receivedBy: { select: { fullName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!folio) {
      return NextResponse.json({ error: 'Folio not found' }, { status: 404 });
    }

    return NextResponse.json({ folio });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch folio' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'folio.charge')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const folioId = params.id;
    const body = await req.json();
    const { category, description, quantity, unitPrice, discount, tax } = body;

    if (!description || !unitPrice) {
      return NextResponse.json({ error: 'Description and unit price are required.' }, { status: 400 });
    }

    const folio = await db.folio.findUnique({
      where: { id: folioId },
      include: { reservation: true },
    });

    if (!folio) return NextResponse.json({ error: 'Folio not found' }, { status: 404 });

    const qty = parseInt(quantity || '1', 10);
    const price = parseFloat(unitPrice);
    const disc = discount ? parseFloat(discount) : 0;
    const tx = tax ? parseFloat(tax) : 0;
    const totalTrxAmount = qty * price - disc + tx;

    const trxRef = await generateReferenceNumber(folio.propertyId, 'TRX');
    const transaction = await db.folioTransaction.create({
      data: {
        folioId,
        transactionRef: trxRef,
        type: 'DEBIT',
        category: category || 'OTHER',
        description: description.trim(),
        quantity: qty,
        unitPrice: price,
        discount: disc,
        tax: tx,
        amount: totalTrxAmount,
        status: 'POSTED',
        postedById: session.userId,
      },
    });

    // Update Folio totals
    const newTotalCharges = folio.totalCharges + totalTrxAmount;
    const newBalance = folio.balanceAmount + totalTrxAmount;

    await db.folio.update({
      where: { id: folioId },
      data: {
        totalCharges: newTotalCharges,
        balanceAmount: newBalance,
      },
    });

    await db.reservation.update({
      where: { id: folio.reservationId },
      data: {
        totalAmount: newTotalCharges,
        balanceAmount: newBalance,
      },
    });

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: folio.propertyId,
      userId: session.userId,
      action: 'FOLIO_TRANSACTION_POSTED',
      module: 'finance',
      entityId: folioId,
      afterData: { transactionRef: trxRef, description, amount: totalTrxAmount },
    });

    return NextResponse.json({ success: true, transaction });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to post folio charge' }, { status: 500 });
  }
}
