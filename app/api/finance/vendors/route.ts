import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateReferenceNumber } from '@/lib/refGenerator';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const vendors = await db.vendor.findMany({
      where: { propertyId },
      include: {
        _count: { select: { expenses: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ vendors });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const body = await req.json();
    const { name, contactPerson, email, phone, gstin, pan, address, paymentTerms, bankName, bankAccountNo, ifscCode } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Vendor name and phone are required.' }, { status: 400 });
    }

    const vendorRef = await generateReferenceNumber(propertyId, 'VND');

    const vendor = await db.vendor.create({
      data: {
        vendorRef,
        propertyId,
        name: name.trim(),
        contactPerson: contactPerson || null,
        email: email || null,
        phone: phone.trim(),
        gstin: gstin || null,
        pan: pan || null,
        address: address || null,
        paymentTerms: paymentTerms || 'NET_30',
        bankName: bankName || null,
        bankAccountNo: bankAccountNo || null,
        ifscCode: ifscCode || null,
      },
    });

    return NextResponse.json({ success: true, vendor });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
}
