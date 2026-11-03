import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const invoiceId = params.id;
    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const invoice = await db.taxInvoice.findFirst({
      where: {
        OR: [
          { id: invoiceId },
          { invoiceRef: invoiceId },
        ],
      },
      include: {
        guest: true,
        reservation: {
          include: {
            roomType: true,
            assignedRoom: true,
          },
        },
        lines: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Failed to fetch invoice:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}
