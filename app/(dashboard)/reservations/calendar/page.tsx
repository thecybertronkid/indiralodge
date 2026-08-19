'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarDays, ArrowLeft, Loader2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function AvailabilityCalendarPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dates, setDates] = useState<string[]>([]);
  const [matrixData, setMatrixData] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    // Generate 7-day date range starting from startDate
    const dateArray: string[] = [];
    const base = new Date(startDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      dateArray.push(d.toISOString().split('T')[0]);
    }
    setDates(dateArray);

    const loadMatrix = async () => {
      setLoading(true);
      try {
        const rtRes = await fetch('/api/room-types');
        if (!rtRes.ok) return;
        const rtData = await rtRes.json();
        const rtypes = rtData.roomTypes || [];
        setRoomTypes(rtypes);

        const newMatrix: Record<string, Record<string, number>> = {};

        for (const rt of rtypes) {
          newMatrix[rt.id] = {};
          for (const d of dateArray) {
            const arr = d;
            const dep = new Date(new Date(d).getTime() + 86400000).toISOString().split('T')[0];
            const availRes = await fetch(
              `/api/availability?arrivalDate=${encodeURIComponent(arr)}&departureDate=${encodeURIComponent(dep)}`
            );
            if (availRes.ok) {
              const availData = await availRes.json();
              const rtMatch = availData.roomTypesAvailability?.find((r: any) => r.roomTypeId === rt.id);
              newMatrix[rt.id][d] = rtMatch ? rtMatch.availableRooms : 0;
            }
          }
        }
        setMatrixData(newMatrix);
      } catch (e) {
        showToast('Failed to load availability grid', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadMatrix();
  }, [startDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/reservations"
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <CalendarDays className="w-6 h-6 text-brand-600" />
              Room Availability Calendar Matrix
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time available room capacity per room category across date ranges
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
          />
          <Link
            href="/reservations/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" />
            New Booking
          </Link>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="pmfs-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pmfs-table-th">Room Category</th>
                {dates.map((d) => (
                  <th key={d} className="pmfs-table-th text-center whitespace-nowrap">
                    <div>{new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-xs text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                    Calculating date availability matrix...
                  </td>
                </tr>
              ) : (
                roomTypes.map((rt) => (
                  <tr key={rt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="pmfs-table-td font-bold text-slate-900">
                      <div>{rt.name}</div>
                      <div className="text-[11px] text-slate-500 font-normal">Base: ₹{rt.baseRate}/night</div>
                    </td>
                    {dates.map((d) => {
                      const avail = matrixData[rt.id]?.[d] ?? 0;
                      return (
                        <td key={d} className="pmfs-table-td text-center">
                          <Link
                            href={`/reservations/new?roomTypeId=${rt.id}&arrivalDate=${d}`}
                            className={`inline-block px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all hover:scale-105 ${
                              avail > 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {avail > 0 ? `${avail} Avail` : 'Sold Out'}
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
