import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser, destroySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST() {
  try {
    const user = await getCurrentUser();
    const token = cookies().get(SESSION_COOKIE_NAME)?.value;

    if (user && token) {
      await logAuditEvent({
        organizationId: user.organizationId,
        propertyId: user.propertyId,
        userId: user.userId,
        action: 'USER_LOGOUT',
        module: 'auth',
      });
      await destroySession(token);
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
