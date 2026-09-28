import { NextResponse } from 'next/server';
import { getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAuditEvent } from '@/lib/audit';
import { getUserAvatar } from '@/lib/avatar';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await db.user.findUnique({
      where: { id: session.userId },
      include: {
        userRoles: {
          include: {
            role: { select: { name: true, description: true } },
            property: { select: { name: true, code: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isSuperAdmin =
      session.roles.includes('Super Admin') ||
      session.roles.includes('Owner') ||
      session.permissions.includes('*') ||
      session.permissions.includes('users.manage');

    const avatarUrl = getUserAvatar(user.email, user.fullName);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone || '',
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        roles: user.userRoles.map((ur) => ur.role.name),
        property: user.userRoles[0]?.property?.name || 'Primary Hotel',
      },
      avatarUrl,
      isSuperAdmin,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      fullName,
      phone,
      email,
      currentPassword,
      newPassword,
      avatarBase64,
      removeAvatar,
    } = body;

    const user = await db.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isSuperAdmin =
      session.roles.includes('Super Admin') ||
      session.roles.includes('Owner') ||
      session.permissions.includes('*');

    const updateData: any = {};
    const beforeData: any = {
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
    };

    // 1. Full Name
    if (fullName !== undefined) {
      const cleanName = fullName.trim();
      if (!cleanName) {
        return NextResponse.json({ error: 'Full name cannot be empty.' }, { status: 400 });
      }
      updateData.fullName = cleanName;
    }

    // 2. Phone Number
    if (phone !== undefined) {
      updateData.phone = phone ? phone.trim() : null;
    }

    // 3. Username / Email (Only Super Admins can alter account username/email)
    if (email !== undefined && email.trim() !== user.email) {
      if (!isSuperAdmin) {
        return NextResponse.json(
          { error: 'Username / Account ID is assigned by Super Admins and cannot be modified.' },
          { status: 403 }
        );
      }
      const cleanEmail = email.trim().toLowerCase();
      // Check duplicate
      const existing = await db.user.findFirst({
        where: { email: cleanEmail, NOT: { id: user.id } },
      });
      if (existing) {
        return NextResponse.json({ error: 'This username / email is already taken by another account.' }, { status: 400 });
      }
      updateData.email = cleanEmail;
    }

    // 4. Password Change
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to set a new password.' }, { status: 400 });
      }

      const isPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Current password entered is incorrect.' }, { status: 400 });
      }

      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 });
      }

      updateData.passwordHash = await hashPassword(newPassword);
    }

    // 5. Profile Picture Upload (Base64)
    const emailPrefix = (updateData.email || user.email).split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const avatarsDir = path.join(process.cwd(), 'public', 'avatars');

    if (avatarBase64) {
      try {
        if (!fs.existsSync(avatarsDir)) {
          fs.mkdirSync(avatarsDir, { recursive: true });
        }

        const base64Data = avatarBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = path.join(avatarsDir, `${emailPrefix}.png`);
        fs.writeFileSync(filePath, buffer);
      } catch (err) {
        console.error('Failed to save avatar:', err);
      }
    } else if (removeAvatar) {
      try {
        const filePath = path.join(avatarsDir, `${emailPrefix}.png`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Failed to remove avatar:', err);
      }
    }

    // Save user update to DB
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: updateData,
    });

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: session.propertyId,
      userId: session.userId,
      action: newPassword ? 'USER_PASSWORD_AND_PROFILE_UPDATED' : 'USER_PROFILE_UPDATED',
      module: 'users',
      entityId: user.id,
      beforeData,
      afterData: {
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        email: updatedUser.email,
        passwordChanged: !!newPassword,
      },
    });

    const newAvatarUrl = getUserAvatar(updatedUser.email, updatedUser.fullName);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone || '',
      },
      avatarUrl: newAvatarUrl ? `${newAvatarUrl}?t=${Date.now()}` : null,
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}
