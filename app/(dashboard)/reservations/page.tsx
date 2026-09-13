'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Calendar as CalendarIcon,
  Eye,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function ReservationsPage() {
  const { showToast } = useToast();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [sourceFilter, setSourceFilter] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const url = `/api/reservations?search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}&sourceId=${encodeURIComponent(sourceFilter)}&roomTypeId=${encodeURIComponent(roomTypeFilter)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations || []);
      } else {
        showToast('Failed to fetch reservations', 'error');
      }
    } catch (e) {
      showToast('Network error fetching reservations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [srcRes, rtRes] = await Promise.all([
          fetch('/api/booking-sources'),
          fetch('/api/room-types'),
        ]);
        if (srcRes.ok) {
          const d = await srcRes.json();
          setSources(d.sources || []);
        }
        if (rtRes.ok) {
          const d = await rtRes.json();
          setRoomTypes(d.roomTypes || []);
        }
      } catch (e) {}
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [search, statusFilter, sourceFilter, roomTypeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-red-500" />
            Reservation Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Master booking register, rate calculations, room assignment, and availability
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/reservations/calendar"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700/80 font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105"
          >
            <CalendarIcon className="w-4 h-4 text-zinc-400" />
            Availability Grid
          </Link>
          <Link
            href="/reservations/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            New Reservation
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="pmfs-card p-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl shadow-xl flex flex-col lg:flex-row gap-3 items-center justify-between">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ref #, guest name, phone..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked-in</option>
            <option value="CHECKED_OUT">Checked-out</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No-show</option>
          </select>

          <select
            value={roomTypeFilter}
            onChange={(e) => setRoomTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Room Types</option>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Booking Sources</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchReservations}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Reservation Data Table */}
      <div className="pmfs-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pmfs-table-th">Booking Ref</th>
                <th className="pmfs-table-th">Guest</th>
                <th className="pmfs-table-th">Dates & Nights</th>
                <th className="pmfs-table-th">Room Type / Assigned</th>
                <th className="pmfs-table-th">Source</th>
                <th className="pmfs-table-th">Total Amount</th>
                <th className="pmfs-table-th">Balance</th>
                <th className="pmfs-table-th">Status</th>
                <th className="pmfs-table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-xs text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                    Loading reservations register...
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-xs text-slate-500">
                    No reservations match the specified search parameters.
                  </td>
                </tr>
              ) : (
                reservations.map((r) => {
                  const bal = r.folios?.[0]?.balanceAmount ?? r.balanceAmount;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="pmfs-table-td font-mono font-bold text-brand-700">
                        <Link href={`/reservations/${r.id}`} className="hover:underline">
                          {r.reservationRef}
                        </Link>
                      </td>
                      <td className="pmfs-table-td">
                        <div className="font-semibold text-slate-900">{r.guest?.displayName}</div>
                        <div className="text-xs text-slate-500">{r.guest?.phone}</div>
                      </td>
                      <td className="pmfs-table-td text-xs text-slate-600">
                        <div>
                          {new Date(r.arrivalDate).toLocaleDateString()} → {new Date(r.departureDate).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-400">{r.nights} Night{r.nights > 1 ? 's' : ''} • {r.adults} Adult{r.adults > 1 ? 's' : ''}</div>
                      </td>
                      <td className="pmfs-table-td">
                        <div className="font-medium text-slate-800">{r.roomType?.name}</div>
                        {r.assignedRoom?.roomNumber ? (
                          <span className="text-[11px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                            Room {r.assignedRoom.roomNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="pmfs-table-td">{r.bookingSource?.name}</td>
                      <td className="pmfs-table-td font-semibold text-slate-900">
                        ₹{r.totalAmount}
                      </td>
                      <td className="pmfs-table-td">
                        <span className={`font-bold ${bal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          ₹{bal.toFixed(2)}
                        </span>
                      </td>
                      <td className="pmfs-table-td">
                        <Badge
                          variant={
                            r.status === 'CHECKED_IN'
                              ? 'success'
                              : r.status === 'CONFIRMED'
                              ? 'info'
                              : r.status === 'CANCELLED'
                              ? 'error'
                              : 'neutral'
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="pmfs-table-td text-right">
                        <Link
                          href={`/reservations/${r.id}`}
                          className="inline-flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors text-xs font-semibold"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
