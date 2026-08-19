import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'guest.view')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const guestId = params.id;
    const guest = await db.guest.findUnique({
      where: { id: guestId },
      include: {
        documents: true,
        reservations: {
          include: {
            roomType: { select: { name: true, code: true } },
            assignedRoom: { select: { roomNumber: true } },
            bookingSource: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        folios: {
          include: {
            transactions: true,
          },
        },
        payments: true,
      },
    });

    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    // Calculate Real Guest Statistics
    const totalStays = guest.reservations.filter((r) => r.status === 'CHECKED_OUT' || r.status === 'CHECKED_IN').length;
    const totalNights = guest.reservations
      .filter((r) => r.status === 'CHECKED_OUT' || r.status === 'CHECKED_IN')
      .reduce((sum, r) => sum + r.nights, 0);

    const totalSpend = guest.payments.reduce((sum, p) => sum + p.amount, 0);
    const avgStayNights = totalStays > 0 ? (totalNights / totalStays).toFixed(1) : '0';

    const completedStays = guest.reservations.filter((r) => r.status === 'CHECKED_OUT');
    const lastStay = completedStays.length > 0 ? completedStays[0].departureDate : null;

    const upcomingRes = guest.reservations.find(
      (r) => r.status === 'CONFIRMED' && new Date(r.arrivalDate) >= new Date()
    );

    const cancellationCount = guest.reservations.filter((r) => r.status === 'CANCELLED').length;
    const noShowCount = guest.reservations.filter((r) => r.status === 'NO_SHOW').length;

    const stats = {
      totalStays,
      totalNights,
      totalSpend,
      avgStayNights,
      lastStay,
      upcomingReservation: upcomingRes ? upcomingRes.reservationRef : null,
      cancellationCount,
      noShowCount,
    };

    return NextResponse.json({ guest, stats });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch guest details' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'guest.edit')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const guestId = params.id;
    const body = await req.json();
    const { firstName, lastName, phone, email, company, gstin, vipStatus, blacklistedStatus, notes } = body;

    const existingGuest = await db.guest.findUnique({ where: { id: guestId } });
    if (!existingGuest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });

    const updateData: any = {};
    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (firstName || lastName) {
      const fn = firstName ? firstName.trim() : existingGuest.firstName;
      const ln = lastName ? lastName.trim() : existingGuest.lastName;
      updateData.displayName = `${fn} ${ln}`;
    }
    if (phone) updateData.phone = phone.trim();
    if (email !== undefined) updateData.email = email ? email.toLowerCase().trim() : null;
    if (company !== undefined) updateData.company = company;
    if (gstin !== undefined) updateData.gstin = gstin;
    if (vipStatus !== undefined) updateData.vipStatus = vipStatus;
    if (blacklistedStatus !== undefined) updateData.blacklistedStatus = blacklistedStatus;
    if (notes !== undefined) updateData.notes = notes;

    const updatedGuest = await db.guest.update({
      where: { id: guestId },
      data: updateData,
    });

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: session.propertyId,
      userId: session.userId,
      action: 'GUEST_UPDATED',
      module: 'guests',
      entityId: guestId,
      beforeData: { vipStatus: existingGuest.vipStatus, blacklistedStatus: existingGuest.blacklistedStatus },
      afterData: updateData,
    });

    return NextResponse.json({ success: true, guest: updatedGuest });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 });
  }
}
