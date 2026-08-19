'use client';

import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Plus, Save, Download, RefreshCw, Star, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function CustomReportBuilderPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savedReports, setSavedReports] = useState<any[]>([]);

  // Builder Form State
  const [reportName, setReportName] = useState('');
  const [dataset, setDataset] = useState('RESERVATIONS');
  const [dimensions, setDimensions] = useState(['date', 'roomType']);
  const [metrics, setMetrics] = useState(['count', 'sum_totalAmount']);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/report-builder');
      if (res.ok) {
        const d = await res.json();
        setSavedReports(d.savedReports || []);
      }
    } catch (e) {
      showToast('Failed to load saved reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportName.trim()) return showToast('Please enter a report name', 'error');

    try {
      const res = await fetch('/api/analytics/report-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportName,
          dataset,
          dimensions,
          metrics,
        }),
      });

      if (res.ok) {
        showToast('Report configuration saved successfully!', 'success');
        setReportName('');
        fetchReports();
      }
    } catch (e) {
      showToast('Failed to save report', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-brand-600" />
            Custom Report Builder & Saved Queries
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build custom datasets, configure metrics and dimensions, and save report configurations for automated execution
          </p>
        </div>

        <button onClick={fetchReports} className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Grid: Form & Saved Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Report Configuration Form */}
        <div className="pmfs-card p-4 space-y-4">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-600" /> Create Custom Report
          </h3>

          <form onSubmit={handleSaveReport} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Report Title</label>
              <input
                type="text"
                placeholder="e.g. Monthly Room Revenue by Channel"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Select Dataset</label>
              <select
                value={dataset}
                onChange={(e) => setDataset(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
              >
                <option value="RESERVATIONS">Reservations & Bookings</option>
                <option value="ROOMS">Rooms & Occupancy</option>
                <option value="HOUSEKEEPING">Housekeeping Tasks</option>
                <option value="MAINTENANCE">Maintenance Tickets</option>
                <option value="EXPENSES">Operating Expenses</option>
                <option value="ACCOUNTING">General Ledger Accounting</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Dimensions</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {['date', 'roomType', 'bookingSource', 'status', 'department'].map((dim) => (
                  <button
                    type="button"
                    key={dim}
                    onClick={() => {
                      if (dimensions.includes(dim)) setDimensions(dimensions.filter((d) => d !== dim));
                      else setDimensions([...dimensions, dim]);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                      dimensions.includes(dim)
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {dim}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Report Configuration
            </button>
          </form>
        </div>

        {/* Right: Saved Reports Register */}
        <div className="lg:col-span-2 pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Saved Management Reports
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {savedReports.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No saved reports created yet. Build and save custom reports on the left.
              </div>
            ) : (
              savedReports.map((r) => (
                <div key={r.id} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{r.reportName}</span>
                      <Badge variant="neutral">{r.dataset}</Badge>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Created by {r.owner?.fullName} • {new Date(r.updatedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => showToast('Exporting dataset...', 'info')}
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-slate-800"
                    >
                      <Download className="w-3.5 h-3.5" /> CSV
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
