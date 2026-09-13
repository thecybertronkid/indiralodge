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

// In-memory token cache to avoid redundant database trips on warm serverless lambdas
const tokenCache = new Map<string, { data: UserPayload; exp: number }>();

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Fetch full user details, roles, and permissions to embed into the cryptographically signed JWT
  const user = await db.user.findUnique({
    where: { id: userId },
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
  });

  if (!user) {
    throw new Error('User not found during session creation');
  }

  const propertyId = user.userRoles.length > 0 ? user.userRoles[0].propertyId : null;
  const roles = Array.from(new Set(user.userRoles.map((ur) => ur.role.name)));

  const permissionSet = new Set<string>();
  user.userRoles.forEach((ur) => {
    if (ur.role.name === 'Super Admin' || ur.role.name === 'Owner') {
      permissionSet.add('*');
    }
    ur.role.rolePerms.forEach((rp) => {
      permissionSet.add(rp.permission.code);
    });
  });

  const permissions = Array.from(permissionSet);

  const jwtClaims = {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    organizationId: user.organizationId,
    propertyId,
    roles,
    permissions,
  };

  const token = await new SignJWT(jwtClaims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  // Store in user_sessions table asynchronously (non-blocking for speed)
  db.userSession.create({
    data: {
      userId,
      token,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      expiresAt,
    },
  }).catch((err) => console.error('Failed to log session in DB:', err));

  // Populate memory cache
  tokenCache.set(token, {
    data: jwtClaims,
    exp: Date.now() + 60 * 1000 * 5, // 5 min cache
  });

  return token;
}

export async function verifySession(token: string): Promise<UserPayload | null> {
  try {
    // 1. Check in-memory cache first (< 0.001ms)
    const cached = tokenCache.get(token);
    if (cached && cached.exp > Date.now()) {
      return cached.data;
    }

    // 2. Fast cryptographic verification (< 0.05ms)
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;
    if (!userId) return null;

    // If token has embedded claims (new format), return immediately with zero database roundtrips!
    if (
      payload.email &&
      payload.organizationId &&
      Array.isArray(payload.roles) &&
      Array.isArray(payload.permissions)
    ) {
      const userPayload: UserPayload = {
        userId,
        email: payload.email as string,
        fullName: (payload.fullName as string) || '',
        organizationId: payload.organizationId as string,
        propertyId: (payload.propertyId as string) || null,
        roles: payload.roles as string[],
        permissions: payload.permissions as string[],
      };

      // Cache in memory for subsequent requests
      tokenCache.set(token, {
        data: userPayload,
        exp: Date.now() + 60 * 1000 * 5,
      });

      return userPayload;
    }

    // 3. Fallback for legacy tokens without embedded claims
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
        db.userSession.delete({ where: { token } }).catch(() => {});
      }
      return null;
    }

    const user = session.user;
    if (user.status !== 'ACTIVE') return null;

    const propertyId = user.userRoles.length > 0 ? user.userRoles[0].propertyId : null;
    const roles = Array.from(new Set(user.userRoles.map((ur) => ur.role.name)));

    const permissionSet = new Set<string>();
    user.userRoles.forEach((ur) => {
      if (ur.role.name === 'Super Admin' || ur.role.name === 'Owner') {
        permissionSet.add('*');
      }
      ur.role.rolePerms.forEach((rp) => {
        permissionSet.add(rp.permission.code);
      });
    });

    const userPayload: UserPayload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      organizationId: user.organizationId,
      propertyId,
      roles,
      permissions: Array.from(permissionSet),
    };

    tokenCache.set(token, {
      data: userPayload,
      exp: Date.now() + 60 * 1000 * 5,
    });

    return userPayload;
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
    tokenCache.delete(token);
    await db.userSession.delete({ where: { token } }).catch(() => {});
  } catch (e) {}
}
