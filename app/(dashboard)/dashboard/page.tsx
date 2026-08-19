'use client';

import React, { useState, useEffect } from 'react';
import {
  BedDouble,
  Users,
  Building,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Activity,
  CalendarCheck,
  LogOut,
  Sparkles,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function DashboardPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    stats: any;
    recentActivity: any[];
    systemAlerts: any[];
  } | null>(null);

  const [greeting, setGreeting] = useState('Good day');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (e) {
        showToast('Failed to load dashboard metrics', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [showToast]);

  const kpiCards = [
    {
      title: 'Occupancy Rate',
      value: data?.stats?.occupancyRate != null ? `${data.stats.occupancyRate}%` : '—',
      subtext: 'No reservation data',
      icon: BedDouble,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Available Rooms',
      value: data?.stats?.availableRooms != null ? data.stats.availableRooms : '—',
      subtext: 'No inventory configured',
      icon: Sparkles,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: "Today's Arrivals",
      value: data?.stats?.todayArrivals != null ? data.stats.todayArrivals : '—',
      subtext: 'No pending check-ins',
      icon: CalendarCheck,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: "Today's Departures",
      value: data?.stats?.todayDepartures != null ? data.stats.todayDepartures : '—',
      subtext: 'No pending check-outs',
      icon: LogOut,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      title: "Today's Revenue",
      value: data?.stats?.todayRevenue != null ? `₹${data.stats.todayRevenue}` : '—',
      subtext: 'No transactions today',
      icon: TrendingUp,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Active Staff Members',
      value: data?.stats?.activeUsers ?? 0,
      subtext: `Out of ${data?.stats?.totalUsers ?? 0} total users`,
      icon: Users,
      color: 'bg-teal-50 text-teal-600',
    },
  ];

  const roomStatuses = [
    { label: 'Available', count: '—', color: 'bg-emerald-500' },
    { label: 'Occupied', count: '—', color: 'bg-blue-500' },
    { label: 'Dirty', count: '—', color: 'bg-amber-500' },
    { label: 'Cleaning', count: '—', color: 'bg-purple-500' },
    { label: 'Maintenance', count: '—', color: 'bg-rose-500' },
    { label: 'Out of Order', count: '—', color: 'bg-slate-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-lg border border-slate-700">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            {greeting}, Administrator
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Indira Lodge Property Management & Financial System Core Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info" className="bg-brand-900/60 text-brand-200 border-brand-700 px-3 py-1 text-xs">
            System Status: Operational
          </Badge>
        </div>
      </div>

      {/* KPI Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="pmfs-card p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-900">{card.value}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{card.subtext}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Operations & Room Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Operational Breakdown */}
        <div className="pmfs-card p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Room Inventory & Live Status
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Current house status breakdown across property rooms
              </p>
            </div>
            <Badge variant="coming-soon">Rooms Module Coming Soon</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {roomStatuses.map((st, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${st.color}`} />
                  <span className="text-xs font-semibold text-slate-700">{st.label}</span>
                </div>
                <span className="text-sm font-extrabold text-slate-900">{st.count}</span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-dashed border-slate-300 text-center py-6">
            <BedDouble className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">No rooms added to inventory yet</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
              Room management and house status tracking will be configured when the Rooms module is enabled in Stage 2.
            </p>
          </div>
        </div>

        {/* Database Alerts & System Notices */}
        <div className="pmfs-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Database Alerts
            </h3>
            <Badge variant="neutral">{data?.systemAlerts?.length ?? 0} active</Badge>
          </div>

          <div className="space-y-3">
            {data?.systemAlerts?.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No system alerts present.
              </div>
            ) : (
              data?.systemAlerts?.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-3"
                >
                  <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-blue-900">{alert.title}</h4>
                    <p className="text-[11px] text-blue-800 mt-0.5">{alert.message}</p>
                  </div>
                </div>
              ))
            )}

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span>Session Security: Enforced via HTTP-Only cookies</span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Stream Section */}
      <div className="pmfs-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Recent System & Audit Activity
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit trail of user actions recorded in the database
            </p>
          </div>
          <Activity className="w-4 h-4 text-slate-400" />
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          {data?.recentActivity?.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No audit logs recorded yet.
            </div>
          ) : (
            data?.recentActivity?.map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between text-xs gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-bold flex items-center justify-center flex-shrink-0">
                    {act.user?.fullName ? act.user.fullName.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-slate-900">
                      {act.user?.fullName || 'System'}
                    </span>{' '}
                    <span className="text-slate-600">performed</span>{' '}
                    <span className="font-medium text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                      {act.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0 text-slate-400">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                    {act.module}
                  </span>
                  <span className="text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(act.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
