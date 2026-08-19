import { db } from '@/lib/db';

export interface CreateNotificationParams {
  propertyId: string;
  userId: string;
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  module?: string;
  entityId?: string;
}

/**
 * Creates a persistent notification for a specific user/role.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    return await db.notification.create({
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
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}
