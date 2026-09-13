'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  ArrowRight,
  Download,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function DashboardPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Staff');
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

    const fetchDashboardData = async () => {
      try {
        const [resAuth, resStats] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/dashboard/stats'),
        ]);

        if (resAuth.ok) {
          const uData = await resAuth.json();
          if (uData.user?.fullName) {
            setUserName(uData.user.fullName);
          }
        }

        if (resStats.ok) {
          const result = await resStats.json();
          setData(result);
        }
      } catch (e) {
        showToast('Failed to load dashboard metrics', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [showToast]);

  const kpiCards = [
    {
      title: 'Occupancy Rate',
      value: data?.stats?.occupancyRate != null ? `${data.stats.occupancyRate}%` : '—',
      subtext: 'Live occupancy percentage',
      icon: BedDouble,
      gradient: 'from-blue-500/10 to-blue-600/5 border-blue-200/80',
      iconBg: 'bg-blue-600 text-white shadow-md shadow-blue-500/30',
    },
    {
      title: 'Available Rooms',
      value: data?.stats?.availableRooms != null ? data.stats.availableRooms : '—',
      subtext: 'Ready for check-in',
      icon: Sparkles,
      gradient: 'from-emerald-500/10 to-emerald-600/5 border-emerald-200/80',
      iconBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30',
    },
    {
      title: "Today's Arrivals",
      value: data?.stats?.todayArrivals != null ? data.stats.todayArrivals : '—',
      subtext: 'Scheduled check-ins',
      icon: CalendarCheck,
      gradient: 'from-purple-500/10 to-purple-600/5 border-purple-200/80',
      iconBg: 'bg-purple-600 text-white shadow-md shadow-purple-500/30',
    },
    {
      title: "Today's Departures",
      value: data?.stats?.todayDepartures != null ? data.stats.todayDepartures : '—',
      subtext: 'Scheduled check-outs',
      icon: LogOut,
      gradient: 'from-amber-500/10 to-amber-600/5 border-amber-200/80',
      iconBg: 'bg-amber-600 text-white shadow-md shadow-amber-500/30',
    },
    {
      title: "Today's Revenue",
      value: data?.stats?.todayRevenue != null ? `₹${data.stats.todayRevenue.toLocaleString('en-IN')}` : '₹0',
      subtext: 'Payments collected today',
      icon: TrendingUp,
      gradient: 'from-indigo-500/10 to-indigo-600/5 border-indigo-200/80',
      iconBg: 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30',
    },
    {
      title: 'Active Staff Members',
      value: data?.stats?.activeUsers ?? 0,
      subtext: `Out of ${data?.stats?.totalUsers ?? 0} total users`,
      icon: Users,
      gradient: 'from-teal-500/10 to-teal-600/5 border-teal-200/80',
      iconBg: 'bg-teal-600 text-white shadow-md shadow-teal-500/30',
    },
  ];

  const roomBreakdown = data?.stats?.roomBreakdown || {
    available: 0,
    occupied: 0,
    dirty: 0,
    cleaning: 0,
    maintenance: 0,
    outOfOrder: 0,
  };

  const roomStatuses = [
    { label: 'Available', count: roomBreakdown.available, color: 'bg-emerald-500', glow: 'shadow-emerald-500/30' },
    { label: 'Occupied', count: roomBreakdown.occupied, color: 'bg-blue-500', glow: 'shadow-blue-500/30' },
    { label: 'Dirty', count: roomBreakdown.dirty, color: 'bg-amber-500', glow: 'shadow-amber-500/30' },
    { label: 'Cleaning', count: roomBreakdown.cleaning, color: 'bg-purple-500', glow: 'shadow-purple-500/30' },
    { label: 'Maintenance', count: roomBreakdown.maintenance, color: 'bg-rose-500', glow: 'shadow-rose-500/30' },
    { label: 'Out of Order', count: roomBreakdown.outOfOrder, color: 'bg-slate-500', glow: 'shadow-slate-500/30' },
  ];

  const roomsList = data?.stats?.roomsList || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header Banner */}
      <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-zinc-950 via-zinc-900 to-red-950 text-white p-6 md:p-8 rounded-3xl shadow-2xl border border-red-900/30">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2 text-white">
            <span>{greeting}, {userName}</span>
            <Sparkles className="w-6 h-6 text-amber-400 animate-float-slow" />
          </h1>
          <p className="text-zinc-300 text-xs md:text-sm mt-1.5 font-medium">
            Indira Lodge Enterprise PMS & Financial Command Center
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <a
            href="/api/reports/export-all"
            download
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 hover:scale-105 transition-all duration-200"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Extract Full Audit Package (.ZIP)</span>
          </a>

          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-zinc-700/60 text-xs font-bold shadow-lg text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span>Core System Operational</span>
          </div>
        </div>
      </div>

      {/* KPI Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="pmfs-card p-4 flex flex-col justify-between rounded-3xl border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl shadow-xl hover:border-red-600/50 transition-all duration-200 hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-red-400 shadow-md">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white tracking-tight">{card.value}</div>
                <div className="text-[11px] font-medium text-zinc-400 mt-0.5">{card.subtext}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Operations & Room Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Operational Breakdown */}
        <div className="pmfs-card p-6 lg:col-span-2 space-y-5 rounded-3xl border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-red-600 rounded-full inline-block" />
                Room Inventory & Live House Matrix
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Real-time house status breakdown ({data?.stats?.totalRooms || 0} Total Rooms)
              </p>
            </div>
            <Link
              href="/rooms"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/70 hover:bg-red-900/80 border border-red-800/50 text-red-300 font-bold text-xs transition-all hover:scale-105"
            >
              <span>Manage Rooms</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Status Counter Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {roomStatuses.map((st, i) => (
              <div
                key={i}
                className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between hover:bg-zinc-850 hover:border-zinc-700 transition-all shadow-md"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${st.color} shadow-sm ${st.glow}`} />
                  <span className="text-xs font-bold text-zinc-300">{st.label}</span>
                </div>
                <span className="text-sm font-black text-white font-mono">{st.count}</span>
              </div>
            ))}
          </div>

          {/* Live Room Map Quick Matrix */}
          {roomsList.length > 0 ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                <span>Live Matrix View</span>
                <span className="text-zinc-500 font-normal">Click any room card for inventory control</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {roomsList.map((r: any) => {
                  const isOccupied = r.availabilityStatus === 'OCCUPIED';
                  const isReserved = r.availabilityStatus === 'RESERVED';
                  const isDirty = r.housekeepingStatus === 'DIRTY';
                  const isBlocked = r.availabilityStatus === 'BLOCKED' || r.maintenanceStatus !== 'OPERATIONAL';

                  let cardBorderBg = 'bg-zinc-900/80 backdrop-blur-md border border-emerald-500/40 hover:border-emerald-400 text-white shadow-md shadow-emerald-950/20';
                  let statusColor = 'text-emerald-400';

                  if (isBlocked) {
                    cardBorderBg = 'bg-zinc-900/60 backdrop-blur-md border border-zinc-700/50 hover:border-zinc-500 text-zinc-300';
                    statusColor = 'text-zinc-400';
                  } else if (isOccupied) {
                    cardBorderBg = 'bg-gradient-to-br from-red-950/60 via-zinc-950/90 to-zinc-900/90 backdrop-blur-md border border-red-500/70 hover:border-red-400 text-white shadow-lg shadow-red-950/50';
                    statusColor = 'text-red-400';
                  } else if (isReserved) {
                    cardBorderBg = 'bg-zinc-900/80 backdrop-blur-md border border-blue-500/50 hover:border-blue-400 text-white shadow-md shadow-blue-950/30';
                    statusColor = 'text-blue-400';
                  } else if (isDirty) {
                    cardBorderBg = 'bg-zinc-900/80 backdrop-blur-md border border-amber-500/50 hover:border-amber-400 text-white shadow-md shadow-amber-950/30';
                    statusColor = 'text-amber-400';
                  }

                  return (
                    <Link
                      key={r.id}
                      href="/rooms"
                      className={`p-3 rounded-2xl border transition-all duration-200 hover:scale-105 hover:shadow-lg block ${cardBorderBg}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-white text-xs">Room {r.roomNumber}</span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 shadow-2xs">
                          {r.roomType?.code}
                        </span>
                      </div>

                      <div className="mt-2 space-y-0.5 text-[10px]">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 font-medium">Status:</span>
                          <span className={`font-bold ${statusColor}`}>
                            {r.availabilityStatus}
                          </span>
                        </div>

                        {isOccupied && r.reservations?.[0]?.guest?.displayName && (
                          <div className="text-[10px] font-bold text-red-300 truncate pt-1 border-t border-zinc-800/80">
                            {r.reservations[0].guest.displayName}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-zinc-900/60 border border-dashed border-zinc-800 text-center">
              <BedDouble className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-zinc-400">No rooms added to inventory yet</p>
              <Link
                href="/rooms"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 mt-2"
              >
                <span>Add physical rooms in Rooms Management →</span>
              </Link>
            </div>
          )}
        </div>

        {/* Database Alerts & System Notices */}
        <div className="pmfs-card p-6 space-y-4 rounded-3xl border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-red-600 rounded-full inline-block" />
              System Alerts & Monitoring
            </h3>
            <Badge variant="info">{data?.systemAlerts?.length ?? 0} Active</Badge>
          </div>

          <div className="space-y-3">
            {data?.systemAlerts?.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-400">
                No active system alerts.
              </div>
            ) : (
              data?.systemAlerts?.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3 hover:shadow-md transition-all text-white"
                >
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">{alert.title}</h4>
                    <p className="text-[11px] text-zinc-300 mt-0.5">{alert.message}</p>
                  </div>
                </div>
              ))
            )}

            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>Session Security: Enforced via HTTP-Only JWT tokens</span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Stream Section */}
      <div className="pmfs-card p-6 space-y-4 rounded-3xl border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-red-600 rounded-full inline-block" />
              Live Audit & Security Stream
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Persistent log of user operations recorded in database
            </p>
          </div>
          <Activity className="w-4 h-4 text-red-400 animate-pulse" />
        </div>

        <div className="divide-y divide-zinc-900 overflow-x-auto">
          {data?.recentActivity?.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              No audit logs recorded yet.
            </div>
          ) : (
            data?.recentActivity?.map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between text-xs gap-4 hover:bg-zinc-900/60 px-2 rounded-xl transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 text-white font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
                    {act.user?.fullName ? act.user.fullName.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-white">
                      {act.user?.fullName || 'System'}
                    </span>{' '}
                    <span className="text-zinc-400">performed</span>{' '}
                    <span className="font-bold text-red-300 bg-red-950/80 border border-red-800/50 px-2 py-0.5 rounded-lg">
                      {act.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0 text-zinc-400">
                  <span className="text-[11px] px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono font-bold uppercase">
                    {act.module}
                  </span>
                  <span className="text-[11px] flex items-center gap-1 font-medium text-zinc-400">
                    <Clock className="w-3 h-3 text-red-400" />
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
