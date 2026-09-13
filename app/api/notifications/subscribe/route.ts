import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { VAPID_PUBLIC_KEY, sendWebPush } from '@/lib/webPush';

export async function GET() {
  // Returns public VAPID key to client
  return NextResponse.json({ publicKey: VAPID_PUBLIC_KEY });
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { subscription, userAgent } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid push subscription payload' }, { status: 400 });
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    if (!p256dh || !auth) {
      return NextResponse.json({ error: 'Missing p256dh or auth keys' }, { status: 400 });
    }

    // Upsert subscription in database
    await db.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: session.userId,
        propertyId: session.propertyId || null,
        endpoint,
        p256dh,
        auth,
        userAgent: userAgent || null,
      },
      update: {
        userId: session.userId,
        propertyId: session.propertyId || null,
        p256dh,
        auth,
        userAgent: userAgent || null,
      },
    });

    // Send a welcome test push notification to verify device connection
    sendWebPush(
      { endpoint, p256dh, auth },
      {
        title: '🔔 Notifications Active',
        body: 'You are now connected to Indira Lodge real-time alerts!',
        url: '/notifications',
        priority: 'NORMAL',
      }
    ).catch(() => {});

    return NextResponse.json({ success: true, message: 'Push subscription registered successfully.' });
  } catch (error: any) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to register push subscription' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { endpoint } = body;

    if (endpoint) {
      await db.pushSubscription.deleteMany({
        where: { endpoint, userId: session.userId },
      });
    }

    return NextResponse.json({ success: true, message: 'Push subscription removed.' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove push subscription' }, { status: 500 });
  }
}
