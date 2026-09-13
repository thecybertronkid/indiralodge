'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Loader2,
  Send,
  Smartphone,
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle2,
  Radio,
  Users,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
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

export default function NotificationsPage() {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'broadcast' | 'front_office'>('all');

  // Current user role
  const [userRole, setUserRole] = useState('');
  const [canBroadcast, setCanBroadcast] = useState(false);

  // Push Subscription State
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [subscribingPush, setSubscribingPush] = useState(false);

  // Broadcast Modal State
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    priority: 'HIGH' as 'NORMAL' | 'HIGH' | 'URGENT',
    type: 'WARNING' as 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR',
    targetGroup: 'ALL_STAFF',
  });

  const fetchNotifs = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();

    // Check user role
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        const roles = data.roles || [];
        setUserRole(roles[0] || 'Staff');
        const allowed =
          roles.includes('Owner') ||
          roles.includes('Super Admin') ||
          roles.includes('General Manager') ||
          (data.permissions && data.permissions.includes('*'));
        setCanBroadcast(allowed);
      })
      .catch(() => {});

    // Check Push status
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsPushSupported(true);
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsPushSubscribed(!!sub);
        });
      });
    }
  }, []);

  const handleEnablePush = async () => {
    setSubscribingPush(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        showToast('Notification permission denied in browser settings.', 'error');
        setSubscribingPush(false);
        return;
      }

      // 1. Ensure service worker is active
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }
      await navigator.serviceWorker.ready;

      // 2. Clean previous subscription state
      try {
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
        }
      } catch (cleanErr) {
        console.warn('Notice: Cleaned previous subscription state:', cleanErr);
      }

      const keyRes = await fetch('/api/notifications/subscribe');
      const { publicKey } = await keyRes.json();

      if (publicKey) {
        try {
          const convertedKey = urlBase64ToUint8Array(publicKey);
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey,
          });

          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscription,
              userAgent: navigator.userAgent,
            }),
          });
        } catch (pushErr) {
          console.warn('WebPush FCM subscription notice:', pushErr);
        }
      }

      // 3. Show instant confirmation notification
      try {
        await registration.showNotification('🔔 Indira Lodge Alerts Active', {
          body: 'Mobile & desktop alerts are now active on this device!',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'indira-welcome-alert',
        });
      } catch (e) {}

      setIsPushSubscribed(true);
      showToast('Mobile & Desktop Notifications are now ACTIVE!', 'success');
    } catch (err: any) {
      showToast('Failed to activate notifications: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSubscribingPush(false);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({}) });
      showToast('All notifications marked as read', 'success');
      fetchNotifs();
    } catch (e) {
      showToast('Failed to update notifications', 'error');
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) {
      showToast('Title and message are required.', 'error');
      return;
    }

    setBroadcasting(true);
    try {
      let targetRoles: string[] | undefined = undefined;
      if (broadcastForm.targetGroup === 'FRONT_DESK') {
        targetRoles = ['Front Office Manager', 'Receptionist', 'Duty Manager'];
      } else if (broadcastForm.targetGroup === 'HOUSEKEEPING') {
        targetRoles = ['Housekeeping Manager', 'Housekeeping Supervisor', 'Room Attendant'];
      } else if (broadcastForm.targetGroup === 'MAINTENANCE') {
        targetRoles = ['Maintenance Manager', 'Maintenance Technician'];
      } else if (broadcastForm.targetGroup === 'MANAGEMENT') {
        targetRoles = ['Owner', 'Super Admin', 'General Manager', 'Finance Manager'];
      }

      const res = await fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastForm.title,
          message: broadcastForm.message,
          priority: broadcastForm.priority,
          type: broadcastForm.type,
          targetRoles,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to send broadcast', 'error');
        return;
      }

      showToast(`📢 Alert broadcasted to ${data.recipientCount} staff members!`, 'success');
      setIsBroadcastOpen(false);
      setBroadcastForm({
        title: '',
        message: '',
        priority: 'HIGH',
        type: 'WARNING',
        targetGroup: 'ALL_STAFF',
      });
      fetchNotifs();
    } catch (err) {
      showToast('Error sending broadcast alert', 'error');
    } finally {
      setBroadcasting(false);
    }
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'broadcast') return n.module === 'broadcast';
    if (filter === 'front_office') return n.module === 'front_office' || n.module === 'reservations';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-brand-600" />
            Live Alerts & Notifications Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time staff alerts, check-in/check-out logs, and owner broadcasts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canBroadcast && (
            <button
              onClick={() => setIsBroadcastOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all transform active:scale-95"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              Broadcast Alert (Owner/Admin)
            </button>
          )}

          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              <CheckCheck className="w-4 h-4 text-brand-600" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Push Notification Status Banner */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl border border-slate-700 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-brand-300">
                Mobile Web Push Notifications
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isPushSubscribed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {isPushSubscribed ? '● Active on This Device' : '○ Not Enabled'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Receive check-in alerts, check-out updates, and manager broadcasts directly in your mobile phone notification bar.
            </p>
          </div>
        </div>

        {!isPushSubscribed && isPushSupported && (
          <button
            onClick={handleEnablePush}
            disabled={subscribingPush}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md transition-all whitespace-nowrap self-start sm:self-auto disabled:opacity-50"
          >
            {subscribingPush ? 'Activating...' : 'Enable Mobile Phone Alerts'}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
            filter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Alerts ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
            filter === 'unread' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Unread ({notifications.filter((n) => !n.isRead).length})
        </button>
        <button
          onClick={() => setFilter('front_office')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
            filter === 'front_office' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🛎️ Check-Ins & Check-Outs
        </button>
        <button
          onClick={() => setFilter('broadcast')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
            filter === 'broadcast' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📢 Manager Broadcasts
        </button>
      </div>

      {/* Notifications Feed */}
      <div className="pmfs-card divide-y divide-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
            Loading real-time alert logs...
          </div>
        ) : filteredNotifs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-1">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No notifications found in this category.</p>
            <p className="text-[11px]">Real-time check-in and operational alerts will appear here as they occur.</p>
          </div>
        ) : (
          filteredNotifs.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition-colors ${
                n.isRead ? 'bg-white' : 'bg-blue-50/40 border-l-4 border-l-brand-600'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="text-xs font-black text-slate-900">{n.title}</h4>
                  <Badge
                    variant={
                      n.priority === 'URGENT' || n.priority === 'HIGH'
                        ? 'error'
                        : n.type === 'SUCCESS'
                        ? 'success'
                        : 'info'
                    }
                  >
                    {n.priority === 'URGENT' ? 'URGENT' : n.type}
                  </Badge>
                  {n.module && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-semibold">
                      {n.module}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{n.message}</p>
                <div className="text-[11px] text-slate-400">
                  {new Date(n.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {n.entityId && (n.module === 'front_office' || n.module === 'reservations') && (
                <Link
                  href={`/reservations/${n.entityId}`}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 self-start sm:self-center shrink-0"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          ))
        )}
      </div>

      {/* Broadcast Alert Modal for Owner & Super Admin */}
      <Modal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        title="📢 Broadcast Custom Staff Alert & Notification"
        maxWidth="lg"
      >
        <form onSubmit={handleBroadcastSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
            <span className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Owner & Admin Authority Broadcast
            </span>
            <p className="text-[11px] text-amber-800">
              This message will be dispatched immediately to staff notification feeds and sent as an OS-level push notification to their registered mobile devices.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">
              Alert Title *
            </label>
            <input
              type="text"
              required
              value={broadcastForm.title}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
              placeholder="e.g. VIP Guest Arriving at 3 PM / Urgent Staff Briefing"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">
              Alert Message *
            </label>
            <textarea
              required
              rows={3}
              value={broadcastForm.message}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
              placeholder="Write the detailed operational instructions or announcement..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">
                Target Audience
              </label>
              <select
                value={broadcastForm.targetGroup}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, targetGroup: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              >
                <option value="ALL_STAFF">All Staff Members</option>
                <option value="FRONT_DESK">Front Desk & Reception</option>
                <option value="HOUSEKEEPING">Housekeeping Team</option>
                <option value="MAINTENANCE">Maintenance Team</option>
                <option value="MANAGEMENT">Management & Admins</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">
                Priority Level
              </label>
              <select
                value={broadcastForm.priority}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, priority: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              >
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent (Vibrate/Alert)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">
                Alert Type
              </label>
              <select
                value={broadcastForm.type}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              >
                <option value="WARNING">Warning / Notice</option>
                <option value="INFO">Informational</option>
                <option value="SUCCESS">Success / Achievement</option>
                <option value="ERROR">Critical Incident</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBroadcastOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={broadcasting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {broadcasting ? 'Sending Broadcast...' : 'Send Broadcast Alert'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
