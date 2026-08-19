'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Wrench, RefreshCw, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function OperationsAnalyticsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState<any>(null);
  const [staffWorkload, setStaffWorkload] = useState<any[]>([]);
  const [assetCosts, setAssetCosts] = useState<any[]>([]);

  const fetchOps = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/operations');
      if (res.ok) {
        const d = await res.json();
        setKpis(d.operationalKPIs);
        setStaffWorkload(d.staffWorkload || []);
        setAssetCosts(d.assetCostMatrix || []);
      }
    } catch (e) {
      showToast('Failed to load operational analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOps();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Housekeeping & Maintenance Operational Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Turnaround times, inspection pass rates, housekeeper workload, and maintenance repair costs
          </p>
        </div>

        <button onClick={fetchOps} className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Operational KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="pmfs-card p-3.5 flex flex-col justify-between border-l-4 border-l-purple-500">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Rooms Cleaned</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{kpis?.totalCleaned || 0}</div>
          <span className="text-[10px] text-slate-400 mt-1">Avg Cleaning: {kpis?.avgCleaningMins || 30} mins</span>
        </div>

        <div className="pmfs-card p-3.5 flex flex-col justify-between border-l-4 border-l-emerald-500">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Inspection Pass Rate</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{kpis?.inspectionPassRate || 100}%</div>
          <span className="text-[10px] text-slate-400 mt-1">{kpis?.totalInspections || 0} Total Inspections</span>
        </div>

        <div className="pmfs-card p-3.5 flex flex-col justify-between border-l-4 border-l-amber-500">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Maintenance Tickets</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{kpis?.totalTickets || 0}</div>
          <span className="text-[10px] text-slate-400 mt-1">Critical Issues: {kpis?.criticalCount || 0}</span>
        </div>

        <div className="pmfs-card p-3.5 flex flex-col justify-between border-l-4 border-l-rose-500">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Repair Cost</span>
          <div className="text-2xl font-black text-rose-600 mt-1">₹{kpis?.totalMaintCost?.toFixed(2) || 0}</div>
          <span className="text-[10px] text-slate-400 mt-1">Avg Resolution: {kpis?.avgResolutionHours || 0} hrs</span>
        </div>
      </div>

      {/* Grid: Staff Workload & Asset Costs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Housekeeper Workload Table */}
        <div className="pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Housekeeping Staff Cleaning Workload
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Staff Member</th>
                  <th className="pmfs-table-th">Assigned Tasks</th>
                  <th className="pmfs-table-th">Completed</th>
                  <th className="pmfs-table-th text-right">Completion %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffWorkload.map((s, idx) => {
                  const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 100;
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="pmfs-table-td font-bold text-slate-900">{s.name}</td>
                      <td className="pmfs-table-td text-xs font-semibold text-slate-800">{s.total}</td>
                      <td className="pmfs-table-td text-xs font-semibold text-emerald-700">{s.completed}</td>
                      <td className="pmfs-table-td text-right font-bold text-brand-700">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Equipment Asset Repair Cost Breakdown */}
        <div className="pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              High-Maintenance Equipment Asset Repair Costs
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Asset Ref</th>
                  <th className="pmfs-table-th">Asset Name</th>
                  <th className="pmfs-table-th">Category</th>
                  <th className="pmfs-table-th text-right">Repair Tickets</th>
                  <th className="pmfs-table-th text-right">Total Cost (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assetCosts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="pmfs-table-td font-mono font-bold text-purple-700">{a.assetRef}</td>
                    <td className="pmfs-table-td font-bold text-slate-900">{a.name}</td>
                    <td className="pmfs-table-td"><Badge variant="neutral">{a.category}</Badge></td>
                    <td className="pmfs-table-td text-right font-semibold text-slate-800">{a.ticketCount}</td>
                    <td className="pmfs-table-td text-right font-mono font-bold text-rose-600">₹{a.totalCost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
