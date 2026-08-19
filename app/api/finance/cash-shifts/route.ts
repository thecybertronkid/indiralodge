import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const activeShift = await db.cashierShift.findFirst({
      where: { propertyId, userId: session.userId, status: 'OPEN' },
    });

    const shiftHistory = await db.cashierShift.findMany({
      where: { propertyId },
      include: { user: { select: { fullName: true } } },
      orderBy: { openedAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ activeShift, shiftHistory });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch cashier shifts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const { action, openingCash, actualCash, discrepancyReason } = body; // action: 'open' | 'close'

    if (action === 'open') {
      const existing = await db.cashierShift.findFirst({
        where: { propertyId, userId: session.userId, status: 'OPEN' },
      });

      if (existing) {
        return NextResponse.json({ error: 'You already have an active open cashier shift.' }, { status: 400 });
      }

      const shift = await db.cashierShift.create({
        data: {
          propertyId,
          userId: session.userId,
          openedAt: new Date(),
          openingCash: parseFloat(openingCash || '0'),
          expectedCash: parseFloat(openingCash || '0'),
          status: 'OPEN',
        },
      });

      return NextResponse.json({ success: true, shift, message: 'Cashier shift opened!' });
    }

    if (action === 'close') {
      const activeShift = await db.cashierShift.findFirst({
        where: { propertyId, userId: session.userId, status: 'OPEN' },
      });

      if (!activeShift) {
        return NextResponse.json({ error: 'No open cashier shift found to close.' }, { status: 400 });
      }

      // Calculate cash payments received during shift
      const cashPayments = await db.payment.findMany({
        where: {
          propertyId,
          method: 'CASH',
          createdAt: { gte: activeShift.openedAt },
        },
      });

      const totalCashReceived = cashPayments.reduce((sum, p) => sum + p.amount, 0);
      const expectedCash = activeShift.openingCash + totalCashReceived;
      const actual = parseFloat(actualCash || '0');
      const discrepancy = actual - expectedCash;

      if (Math.abs(discrepancy) > 0.01 && !discrepancyReason) {
        return NextResponse.json({ error: `Cash discrepancy of ₹${discrepancy.toFixed(2)} detected. Please provide an explanation.` }, { status: 400 });
      }

      const closedShift = await db.cashierShift.update({
        where: { id: activeShift.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          expectedCash,
          actualCash: actual,
          discrepancy,
          discrepancyReason: discrepancyReason || null,
        },
      });

      return NextResponse.json({ success: true, shift: closedShift, message: 'Cashier shift closed successfully!' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update shift' }, { status: 500 });
  }
}
