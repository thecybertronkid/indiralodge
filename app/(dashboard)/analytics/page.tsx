'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  BedDouble,
  Receipt,
  Scale,
  Sparkles,
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function AnalyticsExecutiveDashboard() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30DAYS');

  const [metrics, setMetrics] = useState<any>(null);
  const [prevMetrics, setPrevMetrics] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/executive?period=${period}`);
      if (res.ok) {
        const d = await res.json();
        setMetrics(d.metrics);
        setPrevMetrics(d.prevMetrics);
        setInsights(d.insights || []);
      }
    } catch (e) {
      showToast('Failed to load executive analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  return (
    <div className="space-y-6">
      {/* Executive Command Centre Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            Executive Command Centre
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time management intelligence derived from Front Office, Housekeeping, Maintenance, and General Ledger
          </p>
        </div>

        {/* Global Date Range Selector */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { key: 'TODAY', label: 'Today' },
            { key: '7DAYS', label: 'Last 7 Days' },
            { key: '30DAYS', label: 'Last 30 Days' },
            { key: 'THIS_MONTH', label: 'This Month' },
            { key: 'THIS_YEAR', label: 'This Year' },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                period === p.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button onClick={fetchAnalytics} className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary KPI Cards (Occupancy, ADR, RevPAR, Revenue, Expenses, Net Profit) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Occupancy % */}
        <Link href="/analytics/hotel-performance" className="pmfs-card p-3.5 flex flex-col justify-between border-l-4 border-l-brand-600 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Occupancy Rate</span>
            <BedDouble className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{metrics?.occupancyRate || 0}%</div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Sold: <strong>{metrics?.occupiedRoomNights || 0}</strong> / {metrics?.availableRoomNights || 0} nights</span>
          </div>
        </Link>

        {/* ADR */}
        <Link href="/analytics/hotel-performance" className="pmfs-card p-3.5 flex flex-col justify-between border-l-4 border-l-blue-600 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Average Daily Rate (ADR)</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">₹{metrics?.adr || 0}</div>
          <span className="text-[10px] text-slate-500 mt-1">Room Revenue ÷ Rooms Sold</span>
        </Link>

        {/* RevPAR */}
        <Link href="/analytics/hotel-performance" className="pmfs-card p-3.5 flex flex-col justify-between border-l-4 border-l-purple-600 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">RevPAR</span>
            <Scale className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 mt-1">₹{metrics?.revPar || 0}</div>
          <span className="text-[10px] text-slate-500 mt-1">Revenue ÷ Available Room Nights</span>
        </Link>

        {/* Net Profit */}
        <Link href="/finance/reports" className="pmfs-card p-3.5 flex flex-col justify-between border-l-4 border-l-emerald-600 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Net Operating Profit</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <div className={`text-2xl font-black mt-1 ${metrics?.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ₹{metrics?.netProfit?.toFixed(2) || 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Total Revenue - Total Expenses</span>
        </Link>
      </div>

      {/* Quick BI Sub-Module Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Link href="/analytics/hotel-performance" className="pmfs-card p-3 text-center hover:border-brand-500 transition-all">
          <BedDouble className="w-5 h-5 text-brand-600 mx-auto mb-1" />
          <span className="text-xs font-bold text-slate-800">Occupancy & ADR</span>
        </Link>

        <Link href="/analytics/revenue-sources" className="pmfs-card p-3 text-center hover:border-brand-500 transition-all">
          <TrendingUp className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <span className="text-xs font-bold text-slate-800">Booking Channels</span>
        </Link>

        <Link href="/analytics/operations" className="pmfs-card p-3 text-center hover:border-brand-500 transition-all">
          <Sparkles className="w-5 h-5 text-purple-600 mx-auto mb-1" />
          <span className="text-xs font-bold text-slate-800">Ops & Turnaround</span>
        </Link>

        <Link href="/analytics/forecast" className="pmfs-card p-3 text-center hover:border-brand-500 transition-all">
          <Zap className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <span className="text-xs font-bold text-slate-800">Forecasting</span>
        </Link>

        <Link href="/analytics/data-quality" className="pmfs-card p-3 text-center hover:border-brand-500 transition-all">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
          <span className="text-xs font-bold text-slate-800">Data Quality</span>
        </Link>

        <Link href="/analytics/management-report" className="pmfs-card p-3 text-center hover:border-brand-500 transition-all">
          <FileSpreadsheet className="w-5 h-5 text-slate-700 mx-auto mb-1" />
          <span className="text-xs font-bold text-slate-800">Monthly Report</span>
        </Link>
      </div>

      {/* Actionable Executive Insights Panel */}
      <div className="pmfs-card p-4 space-y-3">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" /> Actionable Executive Insights
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {insights.length === 0 ? (
            <div className="col-span-3 text-center py-6 text-xs text-slate-500">
              No anomalies detected. Performance is steady across baseline metrics.
            </div>
          ) : (
            insights.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-xs">{item.title}</span>
                  <Badge variant={item.type === 'POSITIVE' ? 'success' : item.type === 'ATTENTION' ? 'warning' : 'info'}>
                    {item.confidence} Confidence
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">{item.description}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
