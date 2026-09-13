import webpush from 'web-push';
import { db } from './db';

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BHjtvlfs6QTKNu6FfOPs1PD75tAQvIH7czIlq8csbyPym4Nphr0a0IsHxGEqQ1GM-Qa-Fy4Xh2h_f5Fser6Hxbk';

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'l-_OrP2MjYOXiiuCVT25W0FeKr4MWmZbNfxsJETFFac';

// Initialize web-push with VAPID keys
try {
  webpush.setVapidDetails(
    'mailto:support@indiralodge.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (err) {
  console.error('Failed to configure web-push VAPID details:', err);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  data?: Record<string, any>;
}

/**
 * Sends a native Web Push notification to a single browser subscription.
 */
export async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushNotificationPayload
) {
  try {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    const pushData = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/favicon.ico',
      badge: payload.badge || '/favicon.ico',
      tag: payload.tag || `notif-${Date.now()}`,
      url: payload.url || '/dashboard',
      priority: payload.priority || 'NORMAL',
      data: {
        url: payload.url || '/dashboard',
        ...payload.data,
      },
    });

    await webpush.sendNotification(pushSubscription, pushData);
    return true;
  } catch (error: any) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      // Subscription expired or unsubscribed on client -> clean up
      db.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } }).catch(() => {});
    }
    return false;
  }
}

/**
 * Sends a native Web Push notification to all active devices of a specific user.
 */
export async function sendPushToUser(userId: string, payload: PushNotificationPayload) {
  try {
    const subs = await db.pushSubscription.findMany({
      where: { userId },
      select: { endpoint: true, p256dh: true, auth: true },
    });

    if (!subs || subs.length === 0) return;

    await Promise.allSettled(subs.map((sub) => sendWebPush(sub, payload)));
  } catch (err) {
    console.error(`Error sending push to user ${userId}:`, err);
  }
}

/**
 * Broadcasts a native Web Push notification to all staff members of a property.
 */
export async function broadcastPushToAll(
  propertyId: string,
  payload: PushNotificationPayload,
  excludeUserId?: string
) {
  try {
    const subs = await db.pushSubscription.findMany({
      where: {
        OR: [{ propertyId }, { propertyId: null }],
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { endpoint: true, p256dh: true, auth: true },
    });

    if (!subs || subs.length === 0) return;

    await Promise.allSettled(subs.map((sub) => sendWebPush(sub, payload)));
  } catch (err) {
    console.error('Error broadcasting push notification:', err);
  }
}
