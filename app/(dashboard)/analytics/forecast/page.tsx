'use client';

import React, { useState, useEffect } from 'react';
import { Zap, RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function ForecastAnalyticsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<any>(null);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/forecast');
      if (res.ok) {
        setForecast(await res.json());
      }
    } catch (e) {
      showToast('Failed to load forecast model', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-amber-500" />
            7-Day & 30-Day Occupancy & Revenue Forecasting
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Predictive modeling based on historical day-of-week weights, historical 30-day baseline ADR, and pickup velocity
          </p>
        </div>

        <button onClick={fetchForecast} className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Forecast Banner */}
      <div className="pmfs-card p-4 border-l-4 border-l-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">30-Day Projected Horizon</span>
          <div className="text-2xl font-black text-slate-900 mt-0.5">
            ₹{forecast?.next30Days?.expectedRevenue?.toLocaleString() || 0}
          </div>
          <span className="text-xs text-slate-500">
            Expected Occupancy: <strong>{forecast?.next30Days?.expectedOccupancy}%</strong> • Baseline ADR: <strong>₹{forecast?.baseAdr}</strong>
          </span>
        </div>

        <div>
          <Badge variant="info">
            Forecast Confidence: {forecast?.next30Days?.confidence || 'MEDIUM'}
          </Badge>
        </div>
      </div>

      {/* Next 7 Days Forecast Table */}
      <div className="pmfs-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Next 7 Days Projected Daily Occupancy & Revenue
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pmfs-table-th">Forecast Date</th>
                <th className="pmfs-table-th">Day</th>
                <th className="pmfs-table-th text-right">Projected Occupancy %</th>
                <th className="pmfs-table-th text-right">Projected Daily Revenue (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forecast?.next7Days?.map((d: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="pmfs-table-td font-mono font-bold text-slate-900">{d.date}</td>
                  <td className="pmfs-table-td font-bold text-brand-700">{d.dayName}</td>
                  <td className="pmfs-table-td text-right font-bold text-amber-600">{d.expectedOccupancy}%</td>
                  <td className="pmfs-table-td text-right font-mono font-bold text-emerald-700">₹{d.expectedRevenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
