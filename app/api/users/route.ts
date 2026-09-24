import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { hashPassword } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'users.view')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const cleanSearch = search.trim();
    const digitsOnly = cleanSearch.replace(/\D/g, '');

    const searchConditions: any[] = [
      { fullName: { contains: cleanSearch, mode: 'insensitive' } },
      { email: { contains: cleanSearch, mode: 'insensitive' } },
      { phone: { contains: cleanSearch, mode: 'insensitive' } },
    ];

    if (digitsOnly.length >= 3) {
      searchConditions.push({ phone: { contains: digitsOnly } });
    }

    const users = await db.user.findMany({
      where: {
        organizationId: session.organizationId,
        ...(status ? { status } : {}),
        ...(cleanSearch ? { OR: searchConditions } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          include: {
            role: { select: { name: true, description: true } },
            property: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const roles = await db.role.findMany({
      where: { organizationId: session.organizationId },
      select: { id: true, name: true, description: true },
    });

    return NextResponse.json({ users, roles });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'users.create')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const body = await req.json();
    const { fullName, email, password, phone, roleId, propertyId } = body;

    if (!fullName || !email || !password || !roleId) {
      return NextResponse.json({ error: 'Full name, email, password, and role are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: 'A staff member with this email address already exists.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const targetPropertyId = propertyId || session.propertyId;
    if (!targetPropertyId) {
      const defaultProp = await db.property.findFirst({ where: { organizationId: session.organizationId } });
      if (!defaultProp) return NextResponse.json({ error: 'No active property found' }, { status: 400 });
    }

    const newUser = await db.user.create({
      data: {
        organizationId: session.organizationId,
        email: email.toLowerCase().trim(),
        fullName: fullName.trim(),
        passwordHash,
        phone: phone || null,
        status: 'ACTIVE',
      },
    });

    const targetPropId = propertyId || session.propertyId!;
    await db.userRole.create({
      data: {
        userId: newUser.id,
        roleId,
        propertyId: targetPropId,
      },
    });

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: targetPropId,
      userId: session.userId,
      action: 'USER_CREATED',
      module: 'users',
      entityId: newUser.id,
      afterData: { fullName, email, roleId },
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}
