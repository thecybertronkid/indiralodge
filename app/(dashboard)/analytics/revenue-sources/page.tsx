'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function RevenueSourcesAnalyticsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<any[]>([]);
  const [leadDist, setLeadDist] = useState<any>(null);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/revenue-sources');
      if (res.ok) {
        const d = await res.json();
        setSources(d.sources || []);
        setLeadDist(d.leadTimeDistribution);
      }
    } catch (e) {
      showToast('Failed to load revenue source analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Booking Source & Channel Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Revenue contribution, average booking value, stay length, and lead-time distribution by channel
          </p>
        </div>

        <button onClick={fetchSources} className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Booking Lead Time Distribution */}
      <div className="pmfs-card p-4 space-y-3">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
          Booking Lead Time Distribution (Arrival Date − Booking Creation Date)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500">Same Day / 0-1 Days</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{leadDist?.sameDay0to1 || 0} Bookings</div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500">Short Lead (2-7 Days)</span>
            <div className="text-2xl font-black text-brand-600 mt-1">{leadDist?.short2to7 || 0} Bookings</div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500">Medium Lead (8-30 Days)</span>
            <div className="text-2xl font-black text-purple-600 mt-1">{leadDist?.medium8to30 || 0} Bookings</div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500">Advance (31+ Days)</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{leadDist?.advance31Plus || 0} Bookings</div>
          </div>
        </div>
      </div>

      {/* Source Breakdown Table */}
      <div className="pmfs-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Booking Source Performance Breakdown
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pmfs-table-th">Source Code</th>
                <th className="pmfs-table-th">Channel Name</th>
                <th className="pmfs-table-th">Total Bookings</th>
                <th className="pmfs-table-th">Share %</th>
                <th className="pmfs-table-th text-right">Avg Stay (Nights)</th>
                <th className="pmfs-table-th text-right">Avg Booking Value (₹)</th>
                <th className="pmfs-table-th text-right">Cancellation Rate</th>
                <th className="pmfs-table-th text-right">Total Revenue (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sources.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="pmfs-table-td font-mono font-bold text-blue-700">{s.code}</td>
                  <td className="pmfs-table-td font-bold text-slate-900">{s.name}</td>
                  <td className="pmfs-table-td font-semibold text-slate-800">{s.totalBookings}</td>
                  <td className="pmfs-table-td font-bold text-slate-700">{s.pctOfTotal}%</td>
                  <td className="pmfs-table-td text-right font-semibold text-slate-800">{s.avgStayLength}</td>
                  <td className="pmfs-table-td text-right font-mono font-bold text-slate-900">₹{s.avgBookingValue.toFixed(2)}</td>
                  <td className="pmfs-table-td text-right font-bold text-rose-600">{s.cancellationRate}%</td>
                  <td className="pmfs-table-td text-right font-mono font-bold text-emerald-700">₹{s.totalRevenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
