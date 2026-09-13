import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [user, property, availableProperties] = await Promise.all([
      db.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      session.propertyId
        ? db.property.findUnique({
            where: { id: session.propertyId },
            include: { settings: true },
          })
        : db.property.findFirst({
            where: { organizationId: session.organizationId },
            include: { settings: true },
          }),
      db.property.findMany({
        where: { organizationId: session.organizationId },
        select: { id: true, name: true, city: true, code: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user,
      property,
      availableProperties,
      roles: session.roles,
      permissions: session.permissions,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
  }
}
