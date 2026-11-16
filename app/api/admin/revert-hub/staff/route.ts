import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAuditEvent } from '@/lib/audit';

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
        { error: 'Forbidden. Access strictly reserved for Super Admin.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { password, action, userId, strikeCount: newStrikeCount } = body;

    if (password !== MODULE_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid Super Admin Access Password. Access Denied.' },
        { status: 401 }
      );
    }

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action.' }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Staff user not found.' }, { status: 404 });
    }

    let updatedUser: any = null;

    if (action === 'UNBLOCK_USER') {
      updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          status: 'ACTIVE',
          blockedReason: null,
          blockedAt: null,
          strikeCount: 0,
        },
      });

      // Send positive notification
      await db.notification.create({
        data: {
          propertyId: session.propertyId || targetUser.organizationId,
          userId: targetUser.id,
          title: '✅ Account Restored by Super Admin',
          message: 'Your account has been unblocked and your strikes have been reset to 0 by the Super Admin. You can now resume duties. Please exercise caution when entering guest data.',
          type: 'INFO',
          priority: 'HIGH',
          module: 'super_admin_revert',
          isRead: false,
        },
      });
    } else if (action === 'RESET_STRIKES') {
      updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          strikeCount: 0,
          status: targetUser.status === 'BLOCKED' ? 'ACTIVE' : targetUser.status,
          blockedReason: targetUser.status === 'BLOCKED' ? null : targetUser.blockedReason,
          blockedAt: targetUser.status === 'BLOCKED' ? null : targetUser.blockedAt,
        },
      });
    } else if (action === 'ADJUST_STRIKES') {
      const validCount = Math.max(0, parseInt(newStrikeCount ?? 0, 10));
      const shouldBlock = validCount >= 3;

      updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          strikeCount: validCount,
          status: shouldBlock ? 'BLOCKED' : 'ACTIVE',
          blockedReason: shouldBlock ? 'Account blocked: 3 strikes assigned by Super Admin.' : null,
          blockedAt: shouldBlock ? new Date() : null,
        },
      });

      if (shouldBlock) {
        await db.userSession.deleteMany({
          where: { userId: targetUser.id },
        }).catch(() => {});
      }
    } else {
      return NextResponse.json({ error: 'Unsupported staff action.' }, { status: 400 });
    }

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: session.propertyId,
      userId: session.userId,
      action: `SUPER_ADMIN_${action}`,
      module: 'revert_hub',
      entityId: targetUser.id,
      afterData: {
        staffName: targetUser.fullName,
        staffEmail: targetUser.email,
        updatedStatus: updatedUser.status,
        updatedStrikes: updatedUser.strikeCount,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        status: updatedUser.status,
        strikeCount: updatedUser.strikeCount,
        blockedReason: updatedUser.blockedReason,
      },
    });
  } catch (error: any) {
    console.error('Staff action error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update staff user.' },
      { status: 500 }
    );
  }
}
