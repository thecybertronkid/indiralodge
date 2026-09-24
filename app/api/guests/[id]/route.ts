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
    const validReservations = guest.reservations.filter(
      (r) => r.status !== 'CANCELLED' && r.status !== 'NO_SHOW'
    );
    const totalStays = validReservations.length;
    const totalNights = validReservations.reduce((sum, r) => sum + r.nights, 0);

    const totalSpend = validReservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
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
    const {
      firstName, lastName, middleName, phone, alternatePhone, email,
      gender, dateOfBirth, nationality, age, occupation, idType, idNumber,
      address, city, state, country, postalCode,
      company, gstin, guestType, notes, vipStatus, blacklistedStatus,
    } = body;

    const existingGuest = await db.guest.findUnique({ where: { id: guestId } });
    if (!existingGuest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });

    const updateData: any = {};

    // Name fields
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (middleName !== undefined) updateData.middleName = middleName ? middleName.trim() : null;
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    const fn = firstName !== undefined ? firstName.trim() : existingGuest.firstName;
    const ln = lastName !== undefined ? lastName.trim() : existingGuest.lastName;
    if (firstName !== undefined || lastName !== undefined) {
      updateData.displayName = `${fn} ${ln}`.trim();
    }

    // Contact fields
    if (phone !== undefined && phone) updateData.phone = phone.trim();
    if (alternatePhone !== undefined) updateData.alternatePhone = alternatePhone ? alternatePhone.trim() : null;
    if (email !== undefined) updateData.email = email ? email.toLowerCase().trim() : null;

    // Personal fields
    if (gender !== undefined) updateData.gender = gender || null;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (nationality !== undefined) updateData.nationality = nationality || 'Indian';
    if (age !== undefined) updateData.age = age ? Number(age) : null;
    if (occupation !== undefined) updateData.occupation = occupation || null;
    if (idType !== undefined) updateData.idType = idType || null;
    if (idNumber !== undefined) updateData.idNumber = idNumber || null;

    // Address fields
    if (address !== undefined) updateData.address = address || null;
    if (city !== undefined) updateData.city = city || null;
    if (state !== undefined) updateData.state = state || null;
    if (country !== undefined) updateData.country = country || 'India';
    if (postalCode !== undefined) updateData.postalCode = postalCode || null;

    // Business fields
    if (company !== undefined) updateData.company = company || null;
    if (gstin !== undefined) updateData.gstin = gstin || null;
    if (guestType !== undefined) updateData.guestType = guestType || 'INDIVIDUAL';
    if (notes !== undefined) updateData.notes = notes || null;

    // Status fields
    if (vipStatus !== undefined) updateData.vipStatus = vipStatus;
    if (blacklistedStatus !== undefined) updateData.blacklistedStatus = blacklistedStatus;

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

