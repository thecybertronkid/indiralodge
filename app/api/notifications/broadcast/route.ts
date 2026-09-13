import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifyAllStaff } from '@/lib/notifications';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAuthorized =
      session.roles.includes('Owner') ||
      session.roles.includes('Super Admin') ||
      session.roles.includes('General Manager') ||
      session.permissions.includes('*');

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Forbidden: Only Owner, Super Admin, and General Manager can send custom broadcast alerts.' },
        { status: 403 }
      );
    }

    const propertyId =
      session.propertyId ||
      (await db.property.findFirst({ where: { organizationId: session.organizationId }, select: { id: true } }))?.id;

    if (!propertyId) {
      return NextResponse.json({ error: 'No active property found.' }, { status: 400 });
    }

    const body = await req.json();
    const { title, message, priority, type, targetRoles, url } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required for broadcast alert.' }, { status: 400 });
    }

    // Dispatch broadcast to all selected staff
    const recipients = await notifyAllStaff({
      propertyId,
      title: title.trim(),
      message: message.trim(),
      priority: priority || 'HIGH',
      type: type || 'WARNING',
      roleNames: targetRoles && targetRoles.length > 0 ? targetRoles : undefined,
      url: url || '/notifications',
      module: 'broadcast',
    });

    // Log in audit trail
    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId,
      userId: session.userId,
      action: 'CUSTOM_BROADCAST_SENT',
      module: 'notifications',
      afterData: {
        title,
        priority,
        targetRoles: targetRoles || 'ALL_STAFF',
        recipientCount: recipients.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Broadcast alert sent to ${recipients.length} staff member${recipients.length === 1 ? '' : 's'}.`,
      recipientCount: recipients.length,
    });
  } catch (error: any) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send broadcast alert' }, { status: 500 });
  }
}
