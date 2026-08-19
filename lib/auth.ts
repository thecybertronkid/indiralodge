import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'indira-lodge-super-secret-jwt-key-2026-production-ready'
);

export const SESSION_COOKIE_NAME = 'indira_lodge_session';

export interface UserPayload {
  userId: string;
  email: string;
  fullName: string;
  organizationId: string;
  propertyId: string | null;
  roles: string[];
  permissions: string[];
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  // Store in user_sessions table
  await db.userSession.create({
    data: {
      userId,
      token,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      expiresAt,
    },
  });

  return token;
}

export async function verifySession(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;

    if (!userId) return null;

    // Verify session active in database
    const session = await db.userSession.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePerms: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await db.userSession.delete({ where: { token } }).catch(() => {});
      }
      return null;
    }

    const user = session.user;
    if (user.status !== 'ACTIVE') return null;

    const propertyId = user.userRoles.length > 0 ? user.userRoles[0].propertyId : null;
    const roles = Array.from(new Set(user.userRoles.map((ur) => ur.role.name)));

    const permissionSet = new Set<string>();
    user.userRoles.forEach((ur) => {
      ur.role.rolePerms.forEach((rp) => {
        permissionSet.add(rp.permission.code);
      });
    });

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      organizationId: user.organizationId,
      propertyId,
      roles,
      permissions: Array.from(permissionSet),
    };
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function destroySession(token: string): Promise<void> {
  try {
    await db.userSession.delete({ where: { token } }).catch(() => {});
  } catch (e) {}
}
