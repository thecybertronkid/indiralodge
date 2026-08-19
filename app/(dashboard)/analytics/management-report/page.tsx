'use client';

import React, { useState, useEffect } from 'react';
import { Printer, FileSpreadsheet, Building2, CheckCircle2, TrendingUp, Scale, BedDouble } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function MonthlyManagementReportPackPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [execData, setExecData] = useState<any>(null);
  const [opsData, setOpsData] = useState<any>(null);

  const fetchReportPack = async () => {
    setLoading(true);
    try {
      const [execRes, opsRes] = await Promise.all([
        fetch('/api/analytics/executive?period=30DAYS'),
        fetch('/api/analytics/operations'),
      ]);

      if (execRes.ok) setExecData((await execRes.json()).metrics);
      if (opsRes.ok) setOpsData((await opsRes.json()).operationalKPIs);
    } catch (e) {
      showToast('Failed to generate management report pack', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportPack();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-2">
      {/* Top Action Bar (Print / Export) */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-brand-600" />
            Monthly Management Report Pack
          </h1>
          <span className="text-xs text-slate-500">Official Monthly Operating & Financial Performance Report</span>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md"
        >
          <Printer className="w-4 h-4 text-emerald-400" /> Print Management Report
        </button>
      </div>

      {/* PRINTABLE REPORT BODY */}
      <div className="pmfs-card p-8 space-y-8 bg-white border border-slate-300 shadow-lg">
        {/* Cover / Header */}
        <div className="border-b pb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-wide">INDIRA LODGE</h2>
            <p className="text-xs font-bold text-slate-500 mt-1 uppercase">Monthly Executive Operational & Financial Summary</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>Reporting Period: <strong>Last 30 Days</strong></div>
            <div>Generated: {new Date().toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        {/* Section 1: Executive Key Metrics */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b pb-1">
            1. Executive Performance Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Occupancy Rate</span>
              <div className="text-xl font-black text-brand-600 mt-1">{execData?.occupancyRate || 0}%</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border">
              <span className="text-[10px] font-bold text-slate-500 uppercase">ADR</span>
              <div className="text-xl font-black text-slate-900 mt-1">₹{execData?.adr || 0}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border">
              <span className="text-[10px] font-bold text-slate-500 uppercase">RevPAR</span>
              <div className="text-xl font-black text-purple-700 mt-1">₹{execData?.revPar || 0}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Net Operating Profit</span>
              <div className="text-xl font-black text-emerald-600 mt-1">₹{execData?.netProfit?.toFixed(2) || 0}</div>
            </div>
          </div>
        </div>

        {/* Section 2: Financial Highlights */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b pb-1">
            2. Financial Performance
          </h3>
          <table className="w-full text-xs">
            <tbody className="divide-y">
              <tr>
                <td className="py-2 font-bold text-slate-700">Total Room Tariff Revenue</td>
                <td className="py-2 text-right font-mono font-bold">₹{execData?.roomRevenue?.toFixed(2) || 0}</td>
              </tr>
              <tr>
                <td className="py-2 font-bold text-slate-700">Other Operating Revenue</td>
                <td className="py-2 text-right font-mono font-bold">₹{execData?.otherRevenue?.toFixed(2) || 0}</td>
              </tr>
              <tr className="bg-slate-50 font-black">
                <td className="py-2 text-slate-900">GROSS REVENUE</td>
                <td className="py-2 text-right font-mono text-emerald-700">₹{execData?.totalRevenue?.toFixed(2) || 0}</td>
              </tr>
              <tr>
                <td className="py-2 font-bold text-slate-700">Operating Expenses</td>
                <td className="py-2 text-right font-mono font-bold text-rose-600">₹{execData?.totalExpenses?.toFixed(2) || 0}</td>
              </tr>
              <tr className="bg-slate-900 text-white font-black">
                <td className="py-2.5 px-2">NET OPERATING PROFIT</td>
                <td className="py-2.5 px-2 text-right font-mono text-emerald-400">₹{execData?.netProfit?.toFixed(2) || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3: Operations & Housekeeping */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b pb-1">
            3. Operational & Facilities Performance
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border space-y-1">
              <span className="font-bold text-slate-800">Housekeeping Metrics:</span>
              <div>Rooms Cleaned: <strong>{opsData?.totalCleaned || 0}</strong></div>
              <div>Average Cleaning Time: <strong>{opsData?.avgCleaningMins || 30} mins</strong></div>
              <div>Inspection Pass Rate: <strong>{opsData?.inspectionPassRate || 100}%</strong></div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border space-y-1">
              <span className="font-bold text-slate-800">Maintenance Metrics:</span>
              <div>Work Orders: <strong>{opsData?.totalTickets || 0}</strong></div>
              <div>Critical Tickets: <strong>{opsData?.criticalCount || 0}</strong></div>
              <div>Total Repair Cost: <strong>₹{opsData?.totalMaintCost?.toFixed(2) || 0}</strong></div>
            </div>
          </div>
        </div>

        {/* Report Footer */}
        <div className="pt-6 border-t text-center text-[10px] text-slate-400 uppercase">
          Confidential Management Report — Indira Lodge Property Management & Financial System
        </div>
      </div>
    </div>
  );
}
