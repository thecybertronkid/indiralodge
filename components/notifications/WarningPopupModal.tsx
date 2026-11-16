'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';

interface WarningNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  createdAt: string;
}

export function WarningPopupModal() {
  const [activeWarning, setActiveWarning] = useState<WarningNotification | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);

  const fetchUrgentWarnings = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      const list = data.notifications || [];
      // Find latest unread POPUP_WARNING
      const popup = list.find((n: any) => n.type === 'POPUP_WARNING' && !n.isRead);
      if (popup) {
        setActiveWarning(popup);
      } else {
        setActiveWarning(null);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchUrgentWarnings();
    const interval = setInterval(fetchUrgentWarnings, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async () => {
    if (!activeWarning) return;
    setAcknowledging(true);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeWarning.id }),
      });
      setActiveWarning(null);
    } catch (e) {
      console.error('Failed to dismiss warning:', e);
    } finally {
      setAcknowledging(false);
    }
  };

  if (!activeWarning) return null;

  const isBlocked =
    activeWarning.title.includes('BLOCKED') ||
    activeWarning.message.includes('ACCOUNT BLOCKED') ||
    activeWarning.message.includes('Strike 3');

  // Parse strike count if present
  let strikeMatch = activeWarning.message.match(/Strike (\d) of 3/i) || activeWarning.title.match(/Strike (\d) of 3/i);
  const strikeNum = strikeMatch ? parseInt(strikeMatch[1], 10) : (isBlocked ? 3 : 1);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-red-500/70 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.35)] overflow-hidden">
        {/* Top Warning Banner */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full animate-bounce">
              {isBlocked ? (
                <Lock className="w-6 h-6 text-white" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="text-[11px] font-black tracking-widest text-red-200 uppercase">
                Super Admin Alert System
              </div>
              <h2 className="text-lg font-black text-white tracking-wide">
                {isBlocked ? 'ACCOUNT ACCESS BLOCKED' : 'ACTION REVERTED BY SUPER ADMIN'}
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Strikes Counter Meter */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Staff Strike Meter
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                strikeNum >= 3 ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}>
                {strikeNum} / 3 Strikes
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className={`py-2 text-center rounded-lg border text-xs font-bold transition-all ${
                strikeNum >= 1
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-600'
              }`}>
                Strike 1
              </div>
              <div className={`py-2 text-center rounded-lg border text-xs font-bold transition-all ${
                strikeNum >= 2
                  ? 'bg-orange-500/25 border-orange-500/70 text-orange-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-600'
              }`}>
                Strike 2
              </div>
              <div className={`py-2 text-center rounded-lg border text-xs font-bold transition-all ${
                strikeNum >= 3
                  ? 'bg-red-600/30 border-red-500 text-red-300 animate-pulse'
                  : 'bg-slate-900 border-slate-800 text-slate-600'
              }`}>
                Strike 3 (BLOCKED)
              </div>
            </div>
          </div>

          {/* Details message box */}
          <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-4 text-sm text-slate-200 whitespace-pre-line leading-relaxed">
            <div className="flex items-start gap-2.5 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="font-bold text-red-300">{activeWarning.title}</div>
            </div>
            <p className="text-slate-300 text-xs pl-7">
              {activeWarning.message}
            </p>
          </div>

          {/* Stern Warning Note */}
          <div className="text-[11px] text-amber-300/90 bg-amber-950/25 border border-amber-800/40 rounded-lg p-3">
            <strong>Important Policy Notice:</strong> All hotel check-in corrections and bill reversions are logged. When 3 strikes are accumulated, your account is immediately locked until reported to and cleared by the Super Admin.
          </div>

          {/* Action button */}
          <div className="pt-2">
            <button
              onClick={handleAcknowledge}
              disabled={acknowledging}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] transition-all shadow-lg shadow-red-600/30 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {acknowledging ? 'Acknowledging...' : 'I Acknowledge & Understand This Warning'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
