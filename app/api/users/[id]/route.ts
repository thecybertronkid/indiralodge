import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { hashPassword } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'users.edit') && !hasPermission(session.permissions, 'users.delete')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const userId = params.id;
    const body = await req.json();
    const { fullName, phone, status, roleId, newPassword } = body;

    const existingUser = await db.user.findUnique({
      where: { id: userId },
      include: { userRoles: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName.trim();
    if (phone !== undefined) updateData.phone = phone;
    if (status) updateData.status = status;
    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
      }
      updateData.passwordHash = await hashPassword(newPassword);
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Update role if provided
    if (roleId && existingUser.userRoles.length > 0) {
      const currentUR = existingUser.userRoles[0];
      await db.userRole.deleteMany({ where: { userId } });
      await db.userRole.create({
        data: {
          userId,
          roleId,
          propertyId: currentUR.propertyId,
        },
      });
    }

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: session.propertyId,
      userId: session.userId,
      action: status ? 'USER_STATUS_UPDATED' : 'USER_UPDATED',
      module: 'users',
      entityId: userId,
      beforeData: { status: existingUser.status, fullName: existingUser.fullName },
      afterData: { status: updatedUser.status, fullName: updatedUser.fullName },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}
