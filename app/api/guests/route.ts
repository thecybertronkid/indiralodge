import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { generateReferenceNumber } from '@/lib/refGenerator';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'guest.view')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: session.organizationId,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { displayName: { contains: search } },
              { phone: { contains: search } },
              { email: { contains: search } },
              { guestRef: { contains: search } },
              { company: { contains: search } },
            ],
          }
        : {}),
    };

    const guests = await db.guest.findMany({
      where,
      include: {
        documents: true,
        _count: { select: { reservations: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await db.guest.count({ where });

    return NextResponse.json({ guests, total, page, limit });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'guest.create')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const body = await req.json();
    const {
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth,
      nationality,
      phone,
      alternatePhone,
      email,
      address,
      city,
      state,
      country,
      postalCode,
      company,
      gstin,
      guestType,
      notes,
      duplicateCheckOnly,
    } = body;

    if (!firstName || !lastName || !phone) {
      return NextResponse.json({ error: 'First name, last name, and phone are required.' }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const cleanEmail = email ? email.toLowerCase().trim() : null;

    // 1. Duplicate Guest Detection
    const possibleDuplicates = await db.guest.findMany({
      where: {
        organizationId: session.organizationId,
        OR: [
          { phone: cleanPhone },
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
          { AND: [{ firstName: { contains: firstName } }, { lastName: { contains: lastName } }] },
        ],
      },
      select: {
        id: true,
        guestRef: true,
        displayName: true,
        phone: true,
        email: true,
        city: true,
      },
      take: 5,
    });

    if (duplicateCheckOnly) {
      return NextResponse.json({ hasDuplicates: possibleDuplicates.length > 0, possibleDuplicates });
    }

    // Generate unique Guest Reference Number
    const targetPropertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!targetPropertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const guestRef = await generateReferenceNumber(targetPropertyId, 'GST');
    const displayName = `${firstName} ${lastName}`.trim();

    const newGuest = await db.guest.create({
      data: {
        organizationId: session.organizationId,
        guestRef,
        firstName: firstName.trim(),
        middleName: middleName ? middleName.trim() : null,
        lastName: lastName.trim(),
        displayName,
        gender: gender || 'Other',
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        nationality: nationality || 'Indian',
        phone: cleanPhone,
        alternatePhone: alternatePhone || null,
        email: cleanEmail,
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || 'India',
        postalCode: postalCode || null,
        company: company || null,
        gstin: gstin || null,
        guestType: guestType || 'INDIVIDUAL',
        notes: notes || null,
      },
    });

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: targetPropertyId,
      userId: session.userId,
      action: 'GUEST_CREATED',
      module: 'guests',
      entityId: newGuest.id,
      afterData: { guestRef, displayName, phone: cleanPhone },
    });

    return NextResponse.json({ success: true, guest: newGuest });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create guest profile' }, { status: 500 });
  }
}
