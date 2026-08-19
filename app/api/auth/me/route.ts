import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
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
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let property = null;
    if (session.propertyId) {
      property = await db.property.findUnique({
        where: { id: session.propertyId },
        include: { settings: true },
      });
    } else {
      property = await db.property.findFirst({
        include: { settings: true },
      });
    }

    const availableProperties = await db.property.findMany({
      where: { organizationId: session.organizationId },
      select: { id: true, name: true, city: true, code: true },
    });

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
