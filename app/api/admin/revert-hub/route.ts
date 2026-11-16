import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

const MODULE_PASSWORD = '7777A';

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const isSuperAdmin =
      session.roles.includes('Super Admin') ||
      session.roles.includes('Owner') ||
      session.permissions.includes('*');

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden. Access to Revert Hub is strictly reserved for Super Admin.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { password } = body;

    if (password !== MODULE_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid Super Admin Access Password. Access Denied.' },
        { status: 401 }
      );
    }

    // Fetch stays / reservations (active check-ins, billed stays, recently confirmed)
    const propertyId = session.propertyId;
    const propertyFilter = propertyId ? { propertyId } : {};

    const [reservations, staffUsers] = await Promise.all([
      db.reservation.findMany({
        where: {
          ...propertyFilter,
          status: { in: ['CHECKED_IN', 'CHECKED_OUT', 'CONFIRMED'] },
        },
        include: {
          assignedRoom: {
            include: {
              roomType: true,
            },
          },
          guest: true,
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              status: true,
              strikeCount: true,
            },
          },
          folios: {
            include: {
              payments: true,
              transactions: true,
            },
          },
          taxInvoices: {
            include: {
              issuedBy: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
          stayHistories: {
            include: {
              performedBy: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [{ actualCheckInAt: 'desc' }, { createdAt: 'desc' }],
        take: 100,
      }),

      db.user.findMany({
        where: {
          organizationId: session.organizationId,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
          strikeCount: true,
          blockedReason: true,
          blockedAt: true,
          lastLoginAt: true,
          createdAt: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: [{ strikeCount: 'desc' }, { fullName: 'asc' }],
      }),
    ]);

    return NextResponse.json({
      success: true,
      stays: reservations,
      staffUsers,
    });
  } catch (error: any) {
    console.error('Revert Hub fetch error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve Revert Hub data.' },
      { status: 500 }
    );
  }
}
