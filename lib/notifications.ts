import { db } from '@/lib/db';
import { sendPushToUser, broadcastPushToAll, PushNotificationPayload } from '@/lib/webPush';

export interface CreateNotificationParams {
  propertyId: string;
  userId: string;
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  module?: string;
  entityId?: string;
  url?: string;
}

export interface BroadcastNotificationParams {
  propertyId: string;
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  module?: string;
  entityId?: string;
  url?: string;
  roleNames?: string[];
  excludeUserId?: string;
}

/**
 * Creates a persistent notification for a specific user and sends native Web Push.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notif = await db.notification.create({
      data: {
        propertyId: params.propertyId,
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'INFO',
        priority: params.priority || 'NORMAL',
        module: params.module || null,
        entityId: params.entityId || null,
      },
    });

    // Send native push to user's registered devices (non-blocking)
    const pushPayload: PushNotificationPayload = {
      title: params.title,
      body: params.message,
      priority: params.priority || 'NORMAL',
      url: params.url || (params.module ? `/${params.module}` : '/notifications'),
    };
    sendPushToUser(params.userId, pushPayload).catch(() => {});

    return notif;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

/**
 * Broadcasts an alert/notification to ALL active staff members of a property (or specific roles).
 * Automatically saves in database and triggers native mobile web push notifications.
 */
export async function notifyAllStaff(params: BroadcastNotificationParams) {
  try {
    // 1. Find target users
    const whereClause: any = {
      status: 'ACTIVE',
      ...(params.propertyId
        ? {
            userRoles: {
              some: {
                propertyId: params.propertyId,
                ...(params.roleNames && params.roleNames.length > 0
                  ? { role: { name: { in: params.roleNames } } }
                  : {}),
              },
            },
          }
        : {}),
    };

    const users = await db.user.findMany({
      where: whereClause,
      select: { id: true },
    });

    if (!users || users.length === 0) return [];

    // Filter out excluded user (e.g. the person who performed the check-in if desired)
    const targetUsers = params.excludeUserId
      ? users.filter((u) => u.id !== params.excludeUserId)
      : users;

    if (targetUsers.length === 0) return [];

    // 2. Batch create in database
    const notifData = targetUsers.map((u) => ({
      propertyId: params.propertyId,
      userId: u.id,
      title: params.title,
      message: params.message,
      type: params.type || 'INFO',
      priority: params.priority || 'NORMAL',
      module: params.module || null,
      entityId: params.entityId || null,
    }));

    await db.notification.createMany({
      data: notifData,
    });

    // 3. Dispatch native Web Push broadcast
    const pushPayload: PushNotificationPayload = {
      title: params.title,
      body: params.message,
      priority: params.priority || 'NORMAL',
      url: params.url || (params.module ? `/${params.module}` : '/notifications'),
    };

    broadcastPushToAll(params.propertyId, pushPayload, params.excludeUserId).catch(() => {});

    return targetUsers;
  } catch (error) {
    console.error('Failed to broadcast staff notification:', error);
    return [];
  }
}
