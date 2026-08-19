'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Loader2,
  TrendingUp,
  BedDouble,
  Users,
  LogOut,
  CalendarCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function ReportsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeReportTab, setActiveReportTab] = useState<'occupancy' | 'arrivals' | 'departures' | 'inhouse'>('occupancy');
  const [reportData, setReportData] = useState<any>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/front-office?date=${encodeURIComponent(selectedDate)}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (e) {
      showToast('Failed to generate report dataset', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedDate]);

  const exportToCSV = () => {
    if (!reportData) return;

    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `indira-lodge-${activeReportTab}-${selectedDate}.csv`;

    if (activeReportTab === 'occupancy') {
      headers = ['Metric', 'Value'];
      rows = [
        ['Date', reportData.date],
        ['Total Physical Rooms', String(reportData.occupancy?.totalRooms)],
        ['Occupied Rooms', String(reportData.occupancy?.occupiedRooms)],
        ['Reserved Rooms', String(reportData.occupancy?.reservedRooms)],
        ['Out of Order Rooms', String(reportData.occupancy?.outOfOrderRooms)],
        ['Available Rooms', String(reportData.occupancy?.availableRooms)],
        ['Occupancy Rate %', `${reportData.occupancy?.occupancyRate}%`],
        ['Today Room Revenue (INR)', String(reportData.roomRevenue)],
      ];
    } else if (activeReportTab === 'arrivals') {
      headers = ['Booking Ref', 'Guest Name', 'Phone', 'Room Type', 'Assigned Room', 'Source', 'Total Amount', 'Status'];
      rows = (reportData.arrivals || []).map((r: any) => [
        r.reservationRef,
        r.guest?.displayName || '',
        r.guest?.phone || '',
        r.roomType?.name || '',
        r.assignedRoom?.roomNumber || 'Unassigned',
        r.bookingSource?.name || '',
        String(r.totalAmount),
        r.status,
      ]);
    } else if (activeReportTab === 'departures') {
      headers = ['Booking Ref', 'Guest Name', 'Phone', 'Room', 'Total Amount', 'Balance', 'Status'];
      rows = (reportData.departures || []).map((r: any) => [
        r.reservationRef,
        r.guest?.displayName || '',
        r.guest?.phone || '',
        r.assignedRoom?.roomNumber || '—',
        String(r.totalAmount),
        String(r.folios?.[0]?.balanceAmount ?? r.balanceAmount),
        r.status,
      ]);
    } else if (activeReportTab === 'inhouse') {
      headers = ['Room', 'Guest Name', 'Phone', 'Arrival Date', 'Expected Checkout', 'Folio #', 'Folio Balance'];
      rows = (reportData.inHouseGuests || []).map((r: any) => [
        r.assignedRoom?.roomNumber || '—',
        r.guest?.displayName || '',
        r.guest?.phone || '',
        new Date(r.arrivalDate).toLocaleDateString(),
        new Date(r.departureDate).toLocaleDateString(),
        r.folios?.[0]?.folioNumber || '—',
        String(r.folios?.[0]?.balanceAmount ?? r.balanceAmount),
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${filename} successfully!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-brand-600" />
            Front Office Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time occupancy summaries, daily arrival/departure registers, in-house guest ledgers, and revenue reports
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
          />

          <button
            onClick={exportToCSV}
            disabled={!reportData}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export to CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveReportTab('occupancy')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeReportTab === 'occupancy' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BedDouble className="w-4 h-4" />
          Occupancy & Revenue Summary
        </button>

        <button
          onClick={() => setActiveReportTab('arrivals')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeReportTab === 'arrivals' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          Arrivals Report ({reportData?.arrivals?.length || 0})
        </button>

        <button
          onClick={() => setActiveReportTab('departures')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeReportTab === 'departures' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <LogOut className="w-4 h-4" />
          Departures Report ({reportData?.departures?.length || 0})
        </button>

        <button
          onClick={() => setActiveReportTab('inhouse')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeReportTab === 'inhouse' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          In-House Guest Report ({reportData?.inHouseGuests?.length || 0})
        </button>
      </div>

      {/* REPORT CONTENT */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
          Generating report dataset...
        </div>
      ) : activeReportTab === 'occupancy' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="pmfs-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Occupancy Breakdown ({selectedDate})
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Physical Rooms:</span>
                <span className="font-bold text-slate-900">{reportData?.occupancy?.totalRooms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Occupied Rooms:</span>
                <span className="font-bold text-blue-600">{reportData?.occupancy?.occupiedRooms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Reserved Rooms:</span>
                <span className="font-bold text-brand-600">{reportData?.occupancy?.reservedRooms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Out of Order / Maintenance:</span>
                <span className="font-bold text-rose-600">{reportData?.occupancy?.outOfOrderRooms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Available Rooms:</span>
                <span className="font-bold text-emerald-600">{reportData?.occupancy?.availableRooms}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold">
                <span>Occupancy Rate:</span>
                <span className="text-brand-700">{reportData?.occupancy?.occupancyRate}%</span>
              </div>
            </div>
          </div>

          <div className="pmfs-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Daily Room Revenue Metrics
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Room Payments Collected Today:</span>
                <span className="font-extrabold text-emerald-600 text-sm">
                  ₹{reportData?.roomRevenue?.toFixed(2)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                Report calculated directly from authenticated database ledgers and real room statuses.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="pmfs-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Ref / Room</th>
                  <th className="pmfs-table-th">Guest Name</th>
                  <th className="pmfs-table-th">Phone</th>
                  <th className="pmfs-table-th">Dates</th>
                  <th className="pmfs-table-th">Amount / Balance</th>
                  <th className="pmfs-table-th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(activeReportTab === 'arrivals'
                  ? reportData?.arrivals
                  : activeReportTab === 'departures'
                  ? reportData?.departures
                  : reportData?.inHouseGuests
                )?.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="pmfs-table-td font-mono font-bold text-brand-700">
                      {r.reservationRef || `Room ${r.assignedRoom?.roomNumber}`}
                    </td>
                    <td className="pmfs-table-td font-semibold text-slate-900">{r.guest?.displayName}</td>
                    <td className="pmfs-table-td text-xs text-slate-600">{r.guest?.phone}</td>
                    <td className="pmfs-table-td text-xs text-slate-600">
                      {new Date(r.arrivalDate).toLocaleDateString()} → {new Date(r.departureDate).toLocaleDateString()}
                    </td>
                    <td className="pmfs-table-td font-bold text-slate-900">
                      ₹{r.totalAmount || r.folios?.[0]?.totalCharges}
                    </td>
                    <td className="pmfs-table-td">
                      <Badge variant={r.status === 'CHECKED_IN' ? 'success' : 'info'}>{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
