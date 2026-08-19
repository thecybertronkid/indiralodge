'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, Scale, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function DataQualityPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [quality, setQuality] = useState<any>(null);

  const fetchQuality = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/data-quality');
      if (res.ok) {
        setQuality(await res.json());
      }
    } catch (e) {
      showToast('Failed to run data quality audit', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuality();
  }, []);

  const recon = quality?.revenueRecon;
  const audits = quality?.audits;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            Data Quality & Revenue Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Detects unposted transactions, unassigned bookings, and reconciles Front Office Folio Charges with General Ledger Revenue
          </p>
        </div>

        <button onClick={fetchQuality} className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Health Score Banner */}
      <div className="pmfs-card p-4 border-l-4 border-l-emerald-500 flex items-center justify-between">
        <div>
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Overall System Data Health Score</span>
          <div className="text-3xl font-black text-emerald-600 mt-0.5">{quality?.healthScore || 100}%</div>
          <span className="text-xs text-slate-500">Audit checks run across operational & accounting modules</span>
        </div>
        <Badge variant={quality?.healthScore >= 90 ? 'success' : 'warning'}>
          {quality?.healthScore >= 90 ? 'HEALTHY DATA' : 'ATTENTION REQUIRED'}
        </Badge>
      </div>

      {/* Operational vs Accounting Revenue Reconciliation Table */}
      <div className="pmfs-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Scale className="w-4 h-4 text-purple-600" /> Front Office Folio vs General Ledger Revenue Reconciliation
          </h3>
          <Badge variant={recon?.isReconciled ? 'success' : 'error'}>
            {recon?.isReconciled ? '100% RECONCILED' : 'DISCREPANCY DETECTED'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase">Operational Folio Tariff</span>
            <div className="text-xl font-black text-slate-900 mt-1">₹{recon?.operationalRoomRevenue?.toFixed(2) || 0}</div>
            <span className="text-[10px] text-slate-400">Sum of Folio Room Charges</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase">General Ledger Room Revenue</span>
            <div className="text-xl font-black text-slate-900 mt-1">₹{recon?.accountingRoomRevenue?.toFixed(2) || 0}</div>
            <span className="text-[10px] text-slate-400">Chart of Accounts Code 4100</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase">Reconciliation Variance</span>
            <div className={`text-xl font-black mt-1 ${recon?.discrepancy === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ₹{recon?.discrepancy?.toFixed(2) || 0}
            </div>
            <span className="text-[10px] text-slate-400">Difference (Must be ₹0.00)</span>
          </div>
        </div>
      </div>

      {/* Operational Anomaly Audit Panel */}
      <div className="pmfs-card p-4 space-y-3">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
          Operational Anomaly Audit Checks
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500">Unposted Draft Journals</span>
            <div className="text-xl font-black text-slate-900 mt-1">{audits?.unpostedJournals || 0}</div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500">Unassigned Bookings</span>
            <div className="text-xl font-black text-slate-900 mt-1">{audits?.unassignedBookings || 0}</div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500">Unassigned Housekeeping</span>
            <div className="text-xl font-black text-slate-900 mt-1">{audits?.unassignedHkTasks || 0}</div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500">Unassigned Tickets</span>
            <div className="text-xl font-black text-slate-900 mt-1">{audits?.unassignedMaintTickets || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
