'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellRing, Check, Shield, Smartphone, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager() {
  const { showToast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [showPromptBanner, setShowPromptBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Register Service Worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          return reg.pushManager.getSubscription();
        })
        .then((sub) => {
          if (sub) {
            setIsSubscribed(true);
          } else if (Notification.permission === 'default') {
            // Show subtle prompt banner after 3 seconds if not prompted yet
            const dismissed = localStorage.getItem('indira_push_dismissed');
            if (!dismissed) {
              setTimeout(() => setShowPromptBanner(true), 3000);
            }
          }
        })
        .catch((err) => {
          console.warn('Service worker registration notice:', err);
        });
    }
  }, []);

  const handleSubscribe = async () => {
    if (!isSupported) {
      showToast('Push notifications are not supported by this browser.', 'error');
      return;
    }

    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        showToast('Notification permission denied in browser settings.', 'error');
        setLoading(false);
        setShowPromptBanner(false);
        return;
      }

      // 1. Fetch public VAPID key
      const keyRes = await fetch('/api/notifications/subscribe');
      const { publicKey } = await keyRes.json();

      if (!publicKey) {
        throw new Error('VAPID public key unavailable');
      }

      // 2. Register service worker and subscribe
      const registration = await navigator.serviceWorker.ready;
      const convertedKey = urlBase64ToUint8Array(publicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      // 3. Send subscription to server
      const saveRes = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
        }),
      });

      if (saveRes.ok) {
        setIsSubscribed(true);
        setShowPromptBanner(false);
        showToast('Push notifications activated! You will receive alerts on this device.', 'success');
      } else {
        const errData = await saveRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Server failed to save subscription');
      }
    } catch (err: any) {
      console.error('Push activation error:', err);
      showToast('Failed to enable push notifications: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPromptBanner(false);
    localStorage.setItem('indira_push_dismissed', 'true');
  };

  if (isSubscribed || !isSupported) return null;

  if (!showPromptBanner) {
    return (
      <button
        onClick={() => setShowPromptBanner(true)}
        className="fixed bottom-4 right-4 z-50 px-3.5 py-2 bg-slate-900/95 hover:bg-slate-800 text-white rounded-full shadow-2xl border border-brand-500/50 text-xs font-bold flex items-center gap-2 backdrop-blur-md transition-all hover:scale-105 animate-in fade-in duration-200"
        title="Enable Push Alerts for Check-Ins and Broadcasts"
      >
        <div className="relative flex items-center justify-center">
          <BellRing className="w-4 h-4 text-brand-400 animate-pulse" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-brand-500 rounded-full animate-ping" />
        </div>
        <span>🔔 Enable Phone Alerts</span>
      </button>
    );
  }

  return (
    <aside aria-label="Push notifications" className="fixed bottom-4 right-4 z-50 max-w-sm w-full p-4 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0 mt-0.5">
          <Smartphone className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-300 flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5" /> Mobile Alerts
            </h4>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Enable instant phone & desktop alerts for Check-Ins, Check-Outs, and Manager broadcasts.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <Bell className="w-3.5 h-3.5" />
              {loading ? 'Activating...' : 'Enable Phone Alerts'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-2.5 py-1.5 text-slate-400 hover:text-slate-200 text-xs font-medium"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
