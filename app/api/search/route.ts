import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const cleanQ = query.trim();
    const digitsOnly = cleanQ.replace(/\D/g, '');

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;

    // 1. Search Guests
    const guestOrConditions: any[] = [
      { displayName: { contains: cleanQ, mode: 'insensitive' } },
      { firstName: { contains: cleanQ, mode: 'insensitive' } },
      { lastName: { contains: cleanQ, mode: 'insensitive' } },
      { email: { contains: cleanQ, mode: 'insensitive' } },
      { guestRef: { contains: cleanQ, mode: 'insensitive' } },
      { company: { contains: cleanQ, mode: 'insensitive' } },
      { gstin: { contains: cleanQ, mode: 'insensitive' } },
      { phone: { contains: cleanQ, mode: 'insensitive' } },
    ];
    if (digitsOnly.length >= 3) {
      guestOrConditions.push({ phone: { contains: digitsOnly } });
      guestOrConditions.push({ alternatePhone: { contains: digitsOnly } });
    }

    const guests = await db.guest.findMany({
      where: {
        organizationId: session.organizationId,
        OR: guestOrConditions,
      },
      select: { id: true, displayName: true, phone: true, email: true, company: true, guestRef: true },
      take: 6,
    });

    // 2. Search Reservations
    const resOrConditions: any[] = [
      { reservationRef: { contains: cleanQ, mode: 'insensitive' } },
      { guest: { displayName: { contains: cleanQ, mode: 'insensitive' } } },
      { guest: { phone: { contains: cleanQ, mode: 'insensitive' } } },
      { assignedRoom: { roomNumber: { contains: cleanQ, mode: 'insensitive' } } },
    ];
    if (digitsOnly.length >= 3) {
      resOrConditions.push({ guest: { phone: { contains: digitsOnly } } });
    }

    const reservations = await db.reservation.findMany({
      where: {
        propertyId: propertyId || undefined,
        OR: resOrConditions,
      },
      select: {
        id: true,
        reservationRef: true,
        status: true,
        guest: { select: { displayName: true, phone: true } },
        assignedRoom: { select: { roomNumber: true } },
      },
      take: 6,
    });

    // 3. Search Rooms
    const rooms = propertyId
      ? await db.room.findMany({
          where: {
            propertyId,
            OR: [
              { roomNumber: { contains: cleanQ, mode: 'insensitive' } },
              { floor: { contains: cleanQ, mode: 'insensitive' } },
              { roomType: { name: { contains: cleanQ, mode: 'insensitive' } } },
            ],
          },
          select: { id: true, roomNumber: true, floor: true, availabilityStatus: true, roomType: { select: { name: true } } },
          take: 5,
        })
      : [];

    // 4. Search Invoices
    const invoices = propertyId
      ? await db.taxInvoice.findMany({
          where: {
            propertyId,
            OR: [
              { invoiceRef: { contains: cleanQ, mode: 'insensitive' } },
              { customerGstin: { contains: cleanQ, mode: 'insensitive' } },
              { guest: { company: { contains: cleanQ, mode: 'insensitive' } } },
              { guest: { displayName: { contains: cleanQ, mode: 'insensitive' } } },
            ],
          },
          include: { guest: { select: { displayName: true } } },
          take: 5,
        })
      : [];

    // 5. Search Users / Staff
    const users = await db.user.findMany({
      where: {
        organizationId: session.organizationId,
        OR: [
          { fullName: { contains: cleanQ, mode: 'insensitive' } },
          { email: { contains: cleanQ, mode: 'insensitive' } },
          { phone: { contains: cleanQ, mode: 'insensitive' } },
        ],
      },
      select: { id: true, fullName: true, email: true, status: true },
      take: 4,
    });

    // 6. Search Audit Logs
    const auditLogs = await db.auditLog.findMany({
      where: {
        organizationId: session.organizationId,
        OR: [
          { action: { contains: cleanQ, mode: 'insensitive' } },
          { module: { contains: cleanQ, mode: 'insensitive' } },
          { entityId: { contains: cleanQ, mode: 'insensitive' } },
        ],
      },
      select: { id: true, action: true, module: true, createdAt: true },
      take: 4,
    });

    const results = [
      ...guests.map((g) => ({
        id: g.id,
        title: g.displayName,
        subtitle: `Guest (${g.phone}${g.company ? ` • ${g.company}` : ''})`,
        category: 'Guests',
        url: `/guests/${g.id}`,
      })),
      ...reservations.map((r) => ({
        id: r.id,
        title: `${r.reservationRef} - ${r.guest?.displayName || 'Guest'}`,
        subtitle: `Booking (${r.status}${r.assignedRoom?.roomNumber ? ` • Room ${r.assignedRoom.roomNumber}` : ''})`,
        category: 'Reservations',
        url: `/reservations/${r.id}`,
      })),
      ...rooms.map((rm) => ({
        id: rm.id,
        title: `Room ${rm.roomNumber} (${rm.roomType?.name || 'Room'})`,
        subtitle: `Floor ${rm.floor} • Status: ${rm.availabilityStatus}`,
        category: 'Rooms',
        url: `/rooms`,
      })),
      ...invoices.map((inv) => ({
        id: inv.id,
        title: `${inv.invoiceRef} (₹${inv.totalAmount.toFixed(2)})`,
        subtitle: `${inv.invoiceType} Bill • ${inv.guest?.displayName || 'Guest'}`,
        category: 'Invoices',
        url: `/finance/invoices`,
      })),
      ...users.map((u) => ({
        id: u.id,
        title: u.fullName,
        subtitle: `Staff User (${u.email})`,
        category: 'Staff Users',
        url: `/users?search=${encodeURIComponent(u.email)}`,
      })),
      ...auditLogs.map((a) => ({
        id: a.id,
        title: a.action.replace(/_/g, ' '),
        subtitle: `Audit Log (${a.module}) • ${new Date(a.createdAt).toLocaleDateString()}`,
        category: 'Audit Logs',
        url: `/audit-logs?search=${encodeURIComponent(a.action)}`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
