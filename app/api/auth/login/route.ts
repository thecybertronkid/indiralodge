import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await db.user.findUnique({
      where: { email: cleanEmail },
      include: {
        organization: true,
        userRoles: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Your account is deactivated. Please contact your property administrator.' },
        { status: 403 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Update last login timestamp
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const propertyId = user.userRoles.length > 0 ? user.userRoles[0].propertyId : null;

    // Create session
    const token = await createSession(user.id);

    // Audit log
    await logAuditEvent({
      organizationId: user.organizationId,
      propertyId,
      userId: user.id,
      action: 'USER_LOGIN',
      module: 'auth',
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 });
  }
}
