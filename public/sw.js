// Indira Lodge PMFS - Service Worker for Native Web Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'Indira Lodge Alert';
    const options = {
      body: payload.body || 'You have a new hotel update.',
      icon: payload.icon || '/favicon.ico',
      badge: payload.badge || '/favicon.ico',
      tag: payload.tag || `indira-notif-${Date.now()}`,
      vibrate: [200, 100, 200],
      renotify: true,
      requireInteraction: payload.priority === 'URGENT' || payload.priority === 'HIGH',
      data: {
        url: payload.url || '/dashboard',
        ...payload.data,
      },
      actions: [
        { action: 'open', title: 'Open PMS' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    // Fallback for plain text push data
    const title = 'Indira Lodge Alert';
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification(title, {
        body: text,
        icon: '/favicon.ico',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
