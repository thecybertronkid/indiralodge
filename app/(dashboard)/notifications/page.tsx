'use client';

import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function NotificationsPage() {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({}) });
      showToast('All notifications marked as read', 'success');
      fetchNotifs();
    } catch (e) {
      showToast('Failed to update notifications', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-brand-600" />
            System Notifications Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time in-app notifications and operational alerts for staff
          </p>
        </div>

        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <CheckCheck className="w-4 h-4 text-brand-600" />
            Mark All as Read
          </button>
        )}
      </div>

      <div className="pmfs-card divide-y divide-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No system notifications present.
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`p-4 flex items-start justify-between gap-4 ${n.isRead ? 'bg-white' : 'bg-blue-50/40'}`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                  <Badge variant={n.type === 'SUCCESS' ? 'success' : n.type === 'ERROR' ? 'error' : 'info'}>
                    {n.type}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">{n.message}</p>
                <p className="text-[11px] text-slate-400">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
