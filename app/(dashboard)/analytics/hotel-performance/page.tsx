'use client';

import React, { useState, useEffect } from 'react';
import {
  BedDouble,
  RefreshCw,
  TrendingUp,
  Scale,
  Building,
  Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function HotelPerformanceAnalyticsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<any>(null);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/occupancy');
      if (res.ok) {
        const d = await res.json();
        setSummary(d.summary);
        setRoomTypes(d.roomTypePerformance || []);
        setRooms(d.roomMatrix || []);
      }
    } catch (e) {
      showToast('Failed to load occupancy performance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BedDouble className="w-6 h-6 text-brand-600" />
            Occupancy, ADR & RevPAR Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Performance analytics by Room Type and individual Room Night metrics derived from actual reservations
          </p>
        </div>

        <button onClick={fetchPerformance} className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Room Type Performance Breakdown Table */}
      <div className="pmfs-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Room Type Performance Matrix (Last 30 Days)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pmfs-table-th">Room Type Code</th>
                <th className="pmfs-table-th">Room Type Name</th>
                <th className="pmfs-table-th">Total Inventory</th>
                <th className="pmfs-table-th">Sold Nights</th>
                <th className="pmfs-table-th text-right">Occupancy %</th>
                <th className="pmfs-table-th text-right">ADR (₹)</th>
                <th className="pmfs-table-th text-right">RevPAR (₹)</th>
                <th className="pmfs-table-th text-right">Total Revenue (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roomTypes.map((rt) => (
                <tr key={rt.id} className="hover:bg-slate-50">
                  <td className="pmfs-table-td font-mono font-bold text-brand-700">{rt.code}</td>
                  <td className="pmfs-table-td font-bold text-slate-900">{rt.name}</td>
                  <td className="pmfs-table-td text-xs text-slate-600">{rt.totalRooms} Rooms</td>
                  <td className="pmfs-table-td text-xs font-semibold text-slate-800">{rt.soldNights} Nights</td>
                  <td className="pmfs-table-td text-right font-bold text-brand-700">{rt.occupancyRate}%</td>
                  <td className="pmfs-table-td text-right font-mono font-bold text-slate-900">₹{rt.adr.toFixed(2)}</td>
                  <td className="pmfs-table-td text-right font-mono font-bold text-purple-700">₹{rt.revPar.toFixed(2)}</td>
                  <td className="pmfs-table-td text-right font-mono font-bold text-emerald-700">₹{rt.totalRevenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Room Matrix */}
      <div className="pmfs-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Individual Room Revenue & Downtime Matrix
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pmfs-table-th">Room Number</th>
                <th className="pmfs-table-th">Room Type</th>
                <th className="pmfs-table-th">Floor</th>
                <th className="pmfs-table-th">Sold Nights</th>
                <th className="pmfs-table-th text-right">Occupancy %</th>
                <th className="pmfs-table-th text-right">ADR (₹)</th>
                <th className="pmfs-table-th text-right">Revenue (₹)</th>
                <th className="pmfs-table-th text-right">Open Issues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="pmfs-table-td font-black text-slate-900">Room {r.roomNumber}</td>
                  <td className="pmfs-table-td text-xs text-slate-700">{r.roomType}</td>
                  <td className="pmfs-table-td text-xs text-slate-500">{r.floor}</td>
                  <td className="pmfs-table-td font-semibold text-slate-800">{r.soldNights}</td>
                  <td className="pmfs-table-td text-right font-bold text-brand-700">{r.occupancyRate}%</td>
                  <td className="pmfs-table-td text-right font-mono font-bold text-slate-900">₹{r.adr.toFixed(2)}</td>
                  <td className="pmfs-table-td text-right font-mono font-bold text-emerald-700">₹{r.roomRev.toFixed(2)}</td>
                  <td className="pmfs-table-td text-right">
                    {r.openMaintIssues > 0 ? (
                      <Badge variant="error">{r.openMaintIssues} Open</Badge>
                    ) : (
                      <Badge variant="success">0</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
