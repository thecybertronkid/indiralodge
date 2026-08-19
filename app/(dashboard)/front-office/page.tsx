'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ConciergeBell,
  CalendarCheck,
  LogOut,
  UserCheck,
  UserPlus,
  BedDouble,
  CreditCard,
  ArrowRightLeft,
  Calendar,
  Search,
  Plus,
  Loader2,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function FrontOfficePage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'arrivals' | 'departures' | 'inhouse'>('arrivals');

  // Datasets
  const [reportData, setReportData] = useState<any>(null);

  // Modals state
  const [isWalkinOpen, setIsWalkinOpen] = useState(false);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const [selectedRes, setSelectedRes] = useState<any>(null);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [assignRoomId, setAssignRoomId] = useState('');

  // Walk-in form state
  const [walkinForm, setWalkinForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    roomId: '',
    arrivalDate: new Date().toISOString().split('T')[0],
    departureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    adults: '1',
    depositAmount: '0',
    paymentMethod: 'CASH',
  });

  // Transfer & Extension Form States
  const [transferRoomId, setTransferRoomId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  const [extendDate, setExtendDate] = useState('');
  const [extendReason, setExtendReason] = useState('');

  // Payment Form State
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');

  // Checkout Override State
  const [overrideBalance, setOverrideBalance] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchFrontDeskData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/front-office');
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (e) {
      showToast('Failed to load front desk records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrontDeskData();
  }, []);

  const openCheckinModal = async (resItem: any) => {
    setSelectedRes(resItem);
    setAssignRoomId(resItem.assignedRoomId || '');

    // Fetch physical rooms available for this room type & dates
    try {
      const res = await fetch(
        `/api/availability?arrivalDate=${encodeURIComponent(resItem.arrivalDate)}&departureDate=${encodeURIComponent(resItem.departureDate)}&roomTypeId=${resItem.roomTypeId}`
      );
      if (res.ok) {
        const data = await res.json();
        setAvailableRooms(data.availablePhysicalRooms || []);
      }
    } catch (e) {}

    setIsCheckinOpen(true);
  };

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRes) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/front-desk/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: selectedRes.id,
          roomId: assignRoomId || selectedRes.assignedRoomId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Check-in failed', 'error');
        setSubmitting(false);
        return;
      }

      showToast(`Guest ${selectedRes.guest?.displayName} checked in successfully!`, 'success');
      setIsCheckinOpen(false);
      fetchFrontDeskData();
    } catch (e) {
      showToast('Error executing check-in', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openCheckoutModal = (resItem: any) => {
    setSelectedRes(resItem);
    setOverrideBalance(false);
    setOverrideReason('');
    setIsCheckoutOpen(true);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRes) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/front-desk/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: selectedRes.id,
          overrideBalance,
          overrideReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Check-out failed', 'error');
        setSubmitting(false);
        return;
      }

      showToast(`Guest checked out successfully. Room queued for cleaning.`, 'success');
      setIsCheckoutOpen(false);
      fetchFrontDeskData();
    } catch (e) {
      showToast('Error executing check-out', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openWalkinModal = async () => {
    // Fetch available rooms for today
    const arr = new Date().toISOString().split('T')[0];
    const dep = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    try {
      const res = await fetch(`/api/rooms?availability=AVAILABLE`);
      if (res.ok) {
        const data = await res.json();
        setAvailableRooms(data.rooms || []);
        if (data.rooms?.length > 0) {
          setWalkinForm((prev) => ({ ...prev, roomId: data.rooms[0].id }));
        }
      }
    } catch (e) {}
    setIsWalkinOpen(true);
  };

  const handleWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/front-desk/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(walkinForm),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Walk-in check-in failed', 'error');
        setSubmitting(false);
        return;
      }

      showToast('Walk-in guest checked in successfully!', 'success');
      setIsWalkinOpen(false);
      fetchFrontDeskData();
    } catch (e) {
      showToast('Error completing walk-in', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openTransferModal = async (resItem: any) => {
    setSelectedRes(resItem);
    setTransferReason('');
    try {
      const res = await fetch('/api/rooms?availability=AVAILABLE');
      if (res.ok) {
        const data = await res.json();
        setAvailableRooms(data.rooms || []);
        if (data.rooms?.length > 0) setTransferRoomId(data.rooms[0].id);
      }
    } catch (e) {}
    setIsTransferOpen(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRes || !transferRoomId) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/front-desk/transfer-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: selectedRes.id,
          newRoomId: transferRoomId,
          reason: transferReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Room transfer failed', 'error');
        setSubmitting(false);
        return;
      }

      showToast('Room transfer completed successfully!', 'success');
      setIsTransferOpen(false);
      fetchFrontDeskData();
    } catch (e) {
      showToast('Error transferring room', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openExtendModal = (resItem: any) => {
    setSelectedRes(resItem);
    const currDep = new Date(resItem.departureDate);
    const nextDay = new Date(currDep.getTime() + 86400000).toISOString().split('T')[0];
    setExtendDate(nextDay);
    setExtendReason('');
    setIsExtendOpen(true);
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRes || !extendDate) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/front-desk/extend-stay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: selectedRes.id,
          newDepartureDate: extendDate,
          reason: extendReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Stay extension failed', 'error');
        setSubmitting(false);
        return;
      }

      showToast('Stay extension processed and folio updated!', 'success');
      setIsExtendOpen(false);
      fetchFrontDeskData();
    } catch (e) {
      showToast('Error extending stay', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openPaymentModal = (resItem: any) => {
    setSelectedRes(resItem);
    const folio = resItem.folios?.[0];
    const bal = folio ? folio.balanceAmount : resItem.balanceAmount;
    setPayAmount(bal > 0 ? String(bal) : '0');
    setPayMethod('CASH');
    setIsPaymentOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRes || !payAmount) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: selectedRes.id,
          amount: payAmount,
          method: payMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Payment recording failed', 'error');
        setSubmitting(false);
        return;
      }

      showToast(`Payment of ₹${payAmount} recorded successfully!`, 'success');
      setIsPaymentOpen(false);
      fetchFrontDeskData();
    } catch (e) {
      showToast('Error recording payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Front Desk Operational Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ConciergeBell className="w-6 h-6 text-brand-600" />
            Front Desk Operations Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Live check-in, check-out, walk-in management, room transfers, stay extensions, and folio billing
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openWalkinModal}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Walk-in Check-in
          </button>
          <Link
            href="/reservations/new"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            New Booking
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="pmfs-card p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Today's Arrivals</span>
          <div className="text-2xl font-extrabold text-brand-600 mt-1">
            {reportData?.arrivals?.length ?? '—'}
          </div>
        </div>
        <div className="pmfs-card p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Today's Departures</span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {reportData?.departures?.length ?? '—'}
          </div>
        </div>
        <div className="pmfs-card p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">In-House Guests</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">
            {reportData?.inHouseGuests?.length ?? '—'}
          </div>
        </div>
        <div className="pmfs-card p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Occupancy %</span>
          <div className="text-2xl font-extrabold text-purple-600 mt-1">
            {reportData?.occupancy?.occupancyRate ? `${reportData.occupancy.occupancyRate}%` : '—'}
          </div>
        </div>
        <div className="pmfs-card p-3.5 flex flex-col justify-between col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Available Rooms</span>
          <div className="text-2xl font-extrabold text-teal-600 mt-1">
            {reportData?.occupancy?.availableRooms ?? '—'}
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('arrivals')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'arrivals' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          Today's Arrivals ({reportData?.arrivals?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('departures')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'departures' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <LogOut className="w-4 h-4" />
          Today's Departures ({reportData?.departures?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('inhouse')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'inhouse' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          In-House Guests ({reportData?.inHouseGuests?.length || 0})
        </button>

        <button
          onClick={fetchFrontDeskData}
          className="ml-auto p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          title="Refresh feeds"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tab 1: Today's Arrivals */}
      {activeTab === 'arrivals' && (
        <div className="pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pending & Checked-in Arrivals
            </h3>
            <span className="text-xs text-slate-500">Date: {reportData?.date}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Booking Ref</th>
                  <th className="pmfs-table-th">Guest Name</th>
                  <th className="pmfs-table-th">Room Type</th>
                  <th className="pmfs-table-th">Assigned Room</th>
                  <th className="pmfs-table-th">Source</th>
                  <th className="pmfs-table-th">Deposit Paid</th>
                  <th className="pmfs-table-th">Status</th>
                  <th className="pmfs-table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-xs text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-brand-600" />
                      Loading arrivals...
                    </td>
                  </tr>
                ) : reportData?.arrivals?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-xs text-slate-500">
                      No arrivals scheduled for today.
                    </td>
                  </tr>
                ) : (
                  reportData?.arrivals?.map((arr: any) => (
                    <tr key={arr.id} className="hover:bg-slate-50 transition-colors">
                      <td className="pmfs-table-td font-mono font-semibold text-brand-700">
                        <Link href={`/reservations/${arr.id}`} className="hover:underline">
                          {arr.reservationRef}
                        </Link>
                      </td>
                      <td className="pmfs-table-td">
                        <div className="font-semibold text-slate-900">{arr.guest?.displayName}</div>
                        <div className="text-xs text-slate-500">{arr.guest?.phone}</div>
                      </td>
                      <td className="pmfs-table-td">{arr.roomType?.name}</td>
                      <td className="pmfs-table-td">
                        {arr.assignedRoom?.roomNumber ? (
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            Room {arr.assignedRoom.roomNumber}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded text-xs">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="pmfs-table-td">{arr.bookingSource?.name}</td>
                      <td className="pmfs-table-td font-semibold text-slate-900">
                        ₹{arr.paidAmount}
                      </td>
                      <td className="pmfs-table-td">
                        <Badge variant={arr.status === 'CHECKED_IN' ? 'success' : 'info'}>
                          {arr.status}
                        </Badge>
                      </td>
                      <td className="pmfs-table-td text-right">
                        {arr.status === 'CONFIRMED' ? (
                          <button
                            onClick={() => openCheckinModal(arr)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                          >
                            Check In
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Checked In
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Today's Departures */}
      {activeTab === 'departures' && (
        <div className="pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Scheduled Checkout Departures
            </h3>
            <span className="text-xs text-slate-500">Date: {reportData?.date}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Booking Ref</th>
                  <th className="pmfs-table-th">Guest Name</th>
                  <th className="pmfs-table-th">Room</th>
                  <th className="pmfs-table-th">Total Charges</th>
                  <th className="pmfs-table-th">Outstanding Balance</th>
                  <th className="pmfs-table-th">Status</th>
                  <th className="pmfs-table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-xs text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-brand-600" />
                      Loading departures...
                    </td>
                  </tr>
                ) : reportData?.departures?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-xs text-slate-500">
                      No departures scheduled for today.
                    </td>
                  </tr>
                ) : (
                  reportData?.departures?.map((dep: any) => {
                    const bal = dep.folios?.[0]?.balanceAmount ?? dep.balanceAmount;

                    return (
                      <tr key={dep.id} className="hover:bg-slate-50 transition-colors">
                        <td className="pmfs-table-td font-mono font-semibold text-brand-700">
                          <Link href={`/reservations/${dep.id}`} className="hover:underline">
                            {dep.reservationRef}
                          </Link>
                        </td>
                        <td className="pmfs-table-td font-semibold text-slate-900">
                          {dep.guest?.displayName}
                        </td>
                        <td className="pmfs-table-td">
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            Room {dep.assignedRoom?.roomNumber || '—'}
                          </span>
                        </td>
                        <td className="pmfs-table-td font-semibold text-slate-900">
                          ₹{dep.totalAmount}
                        </td>
                        <td className="pmfs-table-td">
                          <span className={`font-bold ${bal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ₹{bal.toFixed(2)}
                          </span>
                        </td>
                        <td className="pmfs-table-td">
                          <Badge variant={dep.status === 'CHECKED_OUT' ? 'neutral' : 'warning'}>
                            {dep.status}
                          </Badge>
                        </td>
                        <td className="pmfs-table-td text-right">
                          {dep.status === 'CHECKED_IN' ? (
                            <button
                              onClick={() => openCheckoutModal(dep)}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                            >
                              Check Out
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold">Completed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: In-House Guests */}
      {activeTab === 'inhouse' && (
        <div className="pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Currently Staying Guests
            </h3>
            <span className="text-xs text-slate-500">
              Total In-House: {reportData?.inHouseGuests?.length || 0}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Room</th>
                  <th className="pmfs-table-th">Guest Name</th>
                  <th className="pmfs-table-th">Check-in Date</th>
                  <th className="pmfs-table-th">Expected Checkout</th>
                  <th className="pmfs-table-th">Folio Number</th>
                  <th className="pmfs-table-th">Balance</th>
                  <th className="pmfs-table-th text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-xs text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-brand-600" />
                      Loading in-house stays...
                    </td>
                  </tr>
                ) : reportData?.inHouseGuests?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-xs text-slate-500">
                      No guests currently in-house.
                    </td>
                  </tr>
                ) : (
                  reportData?.inHouseGuests?.map((inh: any) => {
                    const folio = inh.folios?.[0];
                    const bal = folio ? folio.balanceAmount : inh.balanceAmount;

                    return (
                      <tr key={inh.id} className="hover:bg-slate-50 transition-colors">
                        <td className="pmfs-table-td">
                          <span className="font-bold text-slate-900 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-lg text-sm">
                            Room {inh.assignedRoom?.roomNumber || '—'}
                          </span>
                        </td>
                        <td className="pmfs-table-td">
                          <div className="font-semibold text-slate-900">{inh.guest?.displayName}</div>
                          <div className="text-xs text-slate-500">{inh.guest?.phone}</div>
                        </td>
                        <td className="pmfs-table-td text-xs text-slate-600">
                          {new Date(inh.arrivalDate).toLocaleDateString()}
                        </td>
                        <td className="pmfs-table-td text-xs text-slate-600 font-medium">
                          {new Date(inh.departureDate).toLocaleDateString()}
                        </td>
                        <td className="pmfs-table-td font-mono text-xs text-slate-600">
                          {folio?.folioNumber || '—'}
                        </td>
                        <td className="pmfs-table-td">
                          <span className={`font-bold ${bal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ₹{bal.toFixed(2)}
                          </span>
                        </td>
                        <td className="pmfs-table-td text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openPaymentModal(inh)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-xs font-semibold border border-emerald-200"
                              title="Record Payment"
                            >
                              Payment
                            </button>
                            <button
                              onClick={() => openTransferModal(inh)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-semibold border border-blue-200"
                              title="Transfer Room"
                            >
                              Transfer
                            </button>
                            <button
                              onClick={() => openExtendModal(inh)}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md text-xs font-semibold border border-purple-200"
                              title="Extend Stay"
                            >
                              Extend
                            </button>
                            <button
                              onClick={() => openCheckoutModal(inh)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-md text-xs font-semibold border border-amber-200"
                              title="Check Out"
                            >
                              Check Out
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Check-In Execution */}
      <Modal isOpen={isCheckinOpen} onClose={() => setIsCheckinOpen(false)} title={`Execute Check-in: ${selectedRes?.guest?.displayName}`} maxWidth="md">
        <form onSubmit={handleCheckinSubmit} className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-700">
            <div className="font-bold text-slate-900">Booking Ref: {selectedRes?.reservationRef}</div>
            <div>Room Type: {selectedRes?.roomType?.name}</div>
            <div>Stay: {selectedRes?.nights} Nights ({selectedRes?.arrivalDate ? new Date(selectedRes.arrivalDate).toLocaleDateString() : ''} to {selectedRes?.departureDate ? new Date(selectedRes.departureDate).toLocaleDateString() : ''})</div>
            <div>Total Amount: ₹{selectedRes?.totalAmount} (Paid: ₹{selectedRes?.paidAmount})</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Physical Room Assignment *
            </label>
            <select
              required
              value={assignRoomId}
              onChange={(e) => setAssignRoomId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select Physical Room</option>
              {availableRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.roomNumber} ({r.floor})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCheckinOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Processing Check-in...' : 'Confirm Guest Check-in'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Check-Out Settlement */}
      <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title={`Execute Check-out: ${selectedRes?.guest?.displayName}`} maxWidth="md">
        <form onSubmit={handleCheckoutSubmit} className="space-y-4">
          {(() => {
            const folio = selectedRes?.folios?.[0];
            const bal = folio ? folio.balanceAmount : selectedRes?.balanceAmount || 0;

            return (
              <>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Assigned Room:</span>
                    <span className="font-bold text-slate-900">Room {selectedRes?.assignedRoom?.roomNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Folio Number:</span>
                    <span className="font-mono text-slate-800">{folio?.folioNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold">
                    <span>Outstanding Balance:</span>
                    <span className={bal > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                      ₹{bal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {bal > 0.01 && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-xs text-rose-900">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>Pending Balance Detected</span>
                    </div>
                    <p>
                      Guest has an outstanding balance of ₹{bal.toFixed(2)}. Please record payment or request manager override authorization.
                    </p>
                    <label className="flex items-center gap-2 pt-1 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overrideBalance}
                        onChange={(e) => setOverrideBalance(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded"
                      />
                      <span>Override balance restriction & allow credit check-out</span>
                    </label>
                    {overrideBalance && (
                      <input
                        type="text"
                        required
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Enter manager override rationale..."
                        className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded text-xs text-slate-900"
                      />
                    )}
                  </div>
                )}

                <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-[11px]">
                  Note: Completing checkout will automatically switch Room {selectedRes?.assignedRoom?.roomNumber} to <strong>DIRTY</strong> housekeeping status for immediate cleaning.
                </div>
              </>
            );
          })()}

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Processing Check-out...' : 'Confirm Check-out'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Walk-In Check-In */}
      <Modal isOpen={isWalkinOpen} onClose={() => setIsWalkinOpen(false)} title="New Walk-in Check-in" maxWidth="lg">
        <form onSubmit={handleWalkinSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Guest First Name *
              </label>
              <input
                type="text"
                required
                value={walkinForm.firstName}
                onChange={(e) => setWalkinForm({ ...walkinForm, firstName: e.target.value })}
                placeholder="e.g. Aniket"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Guest Last Name *
              </label>
              <input
                type="text"
                required
                value={walkinForm.lastName}
                onChange={(e) => setWalkinForm({ ...walkinForm, lastName: e.target.value })}
                placeholder="e.g. Das"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                value={walkinForm.phone}
                onChange={(e) => setWalkinForm({ ...walkinForm, phone: e.target.value })}
                placeholder="+91 98765 11111"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={walkinForm.email}
                onChange={(e) => setWalkinForm({ ...walkinForm, email: e.target.value })}
                placeholder="aniket@email.com"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Select Physical Room *
              </label>
              <select
                required
                value={walkinForm.roomId}
                onChange={(e) => setWalkinForm({ ...walkinForm, roomId: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.roomNumber} ({r.roomType?.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Expected Checkout *
              </label>
              <input
                type="date"
                required
                value={walkinForm.departureDate}
                onChange={(e) => setWalkinForm({ ...walkinForm, departureDate: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Deposit Received (₹)
              </label>
              <input
                type="number"
                value={walkinForm.depositAmount}
                onChange={(e) => setWalkinForm({ ...walkinForm, depositAmount: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsWalkinOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Processing Walk-in...' : 'Complete Walk-in Check-in'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: Room Transfer */}
      <Modal isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} title={`Transfer Room for ${selectedRes?.guest?.displayName}`} maxWidth="md">
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            Current Room: <strong className="text-slate-900">Room {selectedRes?.assignedRoom?.roomNumber}</strong>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Destination Room *
            </label>
            <select
              required
              value={transferRoomId}
              onChange={(e) => setTransferRoomId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {availableRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.roomNumber} ({r.floor} - {r.roomType?.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reason for Room Transfer *
            </label>
            <input
              type="text"
              required
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="e.g. AC malfunction / Guest upgrade request"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTransferOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Transferring...' : 'Execute Room Transfer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 5: Extend Stay */}
      <Modal isOpen={isExtendOpen} onClose={() => setIsExtendOpen(false)} title={`Extend Stay for ${selectedRes?.guest?.displayName}`} maxWidth="md">
        <form onSubmit={handleExtendSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            Current Checkout Date: <strong className="text-slate-900">{selectedRes?.departureDate ? new Date(selectedRes.departureDate).toLocaleDateString() : ''}</strong>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              New Extended Departure Date *
            </label>
            <input
              type="date"
              required
              value={extendDate}
              onChange={(e) => setExtendDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Extension Reason / Notes
            </label>
            <input
              type="text"
              value={extendReason}
              onChange={(e) => setExtendReason(e.target.value)}
              placeholder="e.g. Flight postponed by 2 days"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsExtendOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Extending...' : 'Confirm Stay Extension'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 6: Record Payment */}
      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title={`Record Payment for ${selectedRes?.guest?.displayName}`} maxWidth="md">
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Payment Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Payment Method *
            </label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="UPI">UPI / QR Payment</option>
              <option value="BANK_TRANSFER">Bank Wire Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPaymentOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Recording Payment...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
