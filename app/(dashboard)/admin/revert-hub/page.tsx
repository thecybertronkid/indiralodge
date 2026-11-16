'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  RotateCcw,
  Trash2,
  AlertTriangle,
  UserCheck,
  UserX,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Clock,
  Receipt,
  BedDouble,
  Users,
  Eye,
  EyeOff,
  ChevronRight,
  ShieldCheck,
  AlertOctagon,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function RevertHubPage() {
  const { showToast } = useToast();

  // Authentication State for 7777A Password Gate
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Hub Data State
  const [activeTab, setActiveTab] = useState<'stays' | 'staff'>('stays');
  const [loadingData, setLoadingData] = useState(false);
  const [stays, setStays] = useState<any[]>([]);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CHECKED_IN' | 'BILLED' | 'CONFIRMED'>('ALL');

  // Revert Action Modal State
  const [selectedStay, setSelectedStay] = useState<any | null>(null);
  const [actionType, setActionType] = useState<
    'REVERT_BILL_TO_CHECKIN' | 'REVERT_CHECKIN_TO_CONFIRMED' | 'DELETE_CHECKIN' | null
  >(null);
  const [responsibleStaffId, setResponsibleStaffId] = useState<string>('');
  const [revertReason, setRevertReason] = useState<string>('');
  const [executingAction, setExecutingAction] = useState(false);

  // Staff Management State
  const [staffActionUser, setStaffActionUser] = useState<any | null>(null);
  const [staffActionLoading, setStaffActionLoading] = useState(false);

  // Check if session already holds the key
  useEffect(() => {
    const savedKey = sessionStorage.getItem('il_revert_hub_key');
    if (savedKey === '7777A') {
      fetchHubData(savedKey);
    }
  }, []);

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError('Please enter the Super Admin authorization key.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/revert-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Access denied. Incorrect authorization key.');
        return;
      }

      sessionStorage.setItem('il_revert_hub_key', passwordInput.trim());
      setIsUnlocked(true);
      setStays(data.stays || []);
      setStaffUsers(data.staffUsers || []);
      showToast('Super Admin Revert Hub unlocked.', 'success');
    } catch (err: any) {
      setAuthError('Network error while validating key.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLock = () => {
    sessionStorage.removeItem('il_revert_hub_key');
    setIsUnlocked(false);
    setPasswordInput('');
    setStays([]);
    setStaffUsers([]);
    showToast('Revert Hub has been locked.', 'info');
  };

  const fetchHubData = async (key: string) => {
    setLoadingData(true);
    try {
      const res = await fetch('/api/admin/revert-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: key }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsUnlocked(true);
        setStays(data.stays || []);
        setStaffUsers(data.staffUsers || []);
      } else {
        sessionStorage.removeItem('il_revert_hub_key');
        setIsUnlocked(false);
      }
    } catch (err) {
      sessionStorage.removeItem('il_revert_hub_key');
      setIsUnlocked(false);
    } finally {
      setLoadingData(false);
    }
  };

  const openRevertModal = (
    stay: any,
    type: 'REVERT_BILL_TO_CHECKIN' | 'REVERT_CHECKIN_TO_CONFIRMED' | 'DELETE_CHECKIN'
  ) => {
    setSelectedStay(stay);
    setActionType(type);
    setRevertReason('');

    // Preselect responsible staff
    let defaultStaff = '';
    if (type === 'REVERT_BILL_TO_CHECKIN' && stay.taxInvoices?.length > 0 && stay.taxInvoices[0].issuedById) {
      defaultStaff = stay.taxInvoices[0].issuedById;
    } else if (stay.createdById) {
      defaultStaff = stay.createdById;
    }
    setResponsibleStaffId(defaultStaff);
  };

  const handleExecuteRevert = async () => {
    if (!selectedStay || !actionType) return;
    const currentKey = sessionStorage.getItem('il_revert_hub_key') || '7777A';

    setExecutingAction(true);
    try {
      const res = await fetch('/api/admin/revert-hub/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: currentKey,
          action: actionType,
          reservationId: selectedStay.id,
          targetUserId: responsibleStaffId || undefined,
          reason: revertReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to execute revert.', 'error');
        return;
      }

      showToast(
        data.staffUpdated?.isBlocked
          ? 'Revert executed. Staff member reached 3 strikes and is now BLOCKED.'
          : 'Revert executed. +1 Strike assigned to staff.',
        'success'
      );

      setSelectedStay(null);
      setActionType(null);
      // Refresh stays and staff
      fetchHubData(currentKey);
    } catch (err: any) {
      showToast('Network error executing revert.', 'error');
    } finally {
      setExecutingAction(false);
    }
  };

  const handleStaffAction = async (userId: string, action: 'UNBLOCK_USER' | 'RESET_STRIKES' | 'ADJUST_STRIKES', strikeCount?: number) => {
    const currentKey = sessionStorage.getItem('il_revert_hub_key') || '7777A';
    setStaffActionLoading(true);

    try {
      const res = await fetch('/api/admin/revert-hub/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: currentKey,
          action,
          userId,
          strikeCount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Staff update failed.', 'error');
        return;
      }

      showToast(
        action === 'UNBLOCK_USER' ? 'Account unblocked & strikes reset to 0.' : 'Strikes updated.',
        'success'
      );

      fetchHubData(currentKey);
    } catch (err: any) {
      showToast('Network error updating staff.', 'error');
    } finally {
      setStaffActionLoading(false);
    }
  };

  // Filter Stays
  const filteredStays = stays.filter((stay) => {
    const q = searchQuery.toLowerCase().trim();
    const roomNum = stay.assignedRoom?.roomNumber?.toLowerCase() || '';
    const guestName = (stay.guest?.displayName || stay.guest?.firstName || '').toLowerCase();
    const guestPhone = stay.guest?.phone?.toLowerCase() || '';
    const staffName = stay.createdBy?.fullName?.toLowerCase() || '';
    const billStaff = stay.taxInvoices?.[0]?.issuedBy?.fullName?.toLowerCase() || '';

    const matchesQuery =
      !q ||
      roomNum.includes(q) ||
      guestName.includes(q) ||
      guestPhone.includes(q) ||
      staffName.includes(q) ||
      billStaff.includes(q);

    if (!matchesQuery) return false;

    if (statusFilter === 'CHECKED_IN') return stay.status === 'CHECKED_IN' && !stay.isBilled;
    if (statusFilter === 'BILLED') return stay.isBilled || stay.taxInvoices?.length > 0;
    if (statusFilter === 'CONFIRMED') return stay.status === 'CONFIRMED';

    return true;
  });

  // Calculate quick metrics
  const activeCheckInsCount = stays.filter((s) => s.status === 'CHECKED_IN' && !s.isBilled).length;
  const billedStaysCount = stays.filter((s) => s.isBilled || s.taxInvoices?.length > 0).length;
  const blockedStaffCount = staffUsers.filter((u) => u.status === 'BLOCKED' || u.strikeCount >= 3).length;

  // ----------------------------------------------------
  // SCREEN 1: PASSWORD GATE
  // ----------------------------------------------------
  if (!isUnlocked) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-black border-2 border-red-600/60 rounded-2xl p-8 shadow-[0_0_60px_rgba(220,38,38,0.25)] relative overflow-hidden">
          {/* Subtle background red glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center space-y-4 mb-6">
            <div className="inline-flex p-3.5 bg-red-500/15 border border-red-500/40 rounded-2xl shadow-inner text-red-500">
              <ShieldAlert className="w-10 h-10 animate-pulse" />
            </div>

            <div>
              <div className="inline-block px-3 py-1 bg-red-500/20 text-red-400 text-[10px] font-black tracking-widest uppercase rounded-full border border-red-500/40 mb-2">
                Restricted Super Admin Area
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Revert & Strike Hub
              </h1>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Authorized module to rectify room errors, undo premature check-outs/bills, and enforce hotel operational strike penalties.
              </p>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Super Admin Access Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4 text-red-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter module password"
                  autoFocus
                  className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-white pl-10 pr-10 py-3 rounded-xl text-sm placeholder-slate-600 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] transition-all shadow-lg shadow-red-600/30 disabled:opacity-50"
            >
              {authLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Authorization...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Unlock Super Admin Revert Hub</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-[11px] text-slate-500 font-mono">
              Protected by Indira Lodge Super Admin Key Protection
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SCREEN 2: UNLOCKED SUPER ADMIN REVERT HUB
  // ----------------------------------------------------
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner / Navigation */}
      <div className="bg-gradient-to-r from-slate-900 via-black to-slate-900 border border-red-950/60 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-600/20 border border-red-500/40 rounded-xl text-red-400 shadow-inner">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Super Admin Revert Hub
                </h1>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Unlocked (7777A)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Rectify mistaken inputs, unbill premature invoices, delete erroneous check-ins, and oversee the 3-strike staff block system.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchHubData(sessionStorage.getItem('il_revert_hub_key') || '7777A')}
              disabled={loadingData}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>

            <button
              onClick={handleLock}
              className="flex items-center gap-2 px-3.5 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-xs font-bold text-red-300 rounded-xl transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Hub</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Active Check-Ins</div>
              <div className="text-lg font-black text-white">{activeCheckInsCount} Rooms</div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Billed Stays / Invoices</div>
              <div className="text-lg font-black text-white">{billedStaysCount} Stays</div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Staff Blocked (3 Strikes)</div>
              <div className="text-lg font-black text-red-400">{blockedStaffCount} Staff Users</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('stays')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'stays'
              ? 'border-red-500 text-white bg-red-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Room Stays & Error Reverts ({stays.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'staff'
              ? 'border-red-500 text-white bg-red-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Strikes & Block Management ({staffUsers.length})</span>
          {blockedStaffCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.2 rounded-full font-black animate-pulse">
              {blockedStaffCount}
            </span>
          )}
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: ROOM STAYS & REVERTS */}
      {/* ==================================================== */}
      {activeTab === 'stays' && (
        <div className="space-y-4">
          {/* Search & Filter Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search Room, Guest, or Staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 focus:border-red-500 text-white text-xs pl-9 pr-3 py-2 rounded-lg outline-none placeholder-slate-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400 font-medium">Filter:</span>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('CHECKED_IN')}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  statusFilter === 'CHECKED_IN'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Active Check-Ins
              </button>
              <button
                onClick={() => setStatusFilter('BILLED')}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  statusFilter === 'BILLED'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Billed Stays
              </button>
              <button
                onClick={() => setStatusFilter('CONFIRMED')}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  statusFilter === 'CONFIRMED'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Confirmed
              </button>
            </div>
          </div>

          {/* Stays Table */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Room & Guest</th>
                    <th className="py-3 px-4">Check-in / Timeline</th>
                    <th className="py-3 px-4">Checked-In / Billed By</th>
                    <th className="py-3 px-4">Billing & Folio</th>
                    <th className="py-3 px-4 text-right">Super Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredStays.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500">
                        No matching stays found in record.
                      </td>
                    </tr>
                  ) : (
                    filteredStays.map((stay) => {
                      const room = stay.assignedRoom;
                      const guest = stay.guest;
                      const checkInStaff = stay.createdBy;
                      const invoice = stay.taxInvoices?.[0];
                      const billStaff = invoice?.issuedBy;
                      const isBilled = stay.isBilled || Boolean(invoice);

                      return (
                        <tr
                          key={stay.id}
                          className="hover:bg-slate-900/40 transition-colors group"
                        >
                          {/* Room & Guest */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <span className="px-2.5 py-1 bg-red-500/15 border border-red-500/30 text-red-400 font-black rounded-lg text-xs">
                                Room {room?.roomNumber || 'N/A'}
                              </span>
                              <div>
                                <div className="font-bold text-white text-sm">
                                  {guest?.displayName || guest?.firstName || 'Walk-in Guest'}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                  <span>{guest?.phone || 'No Phone'}</span>
                                  <span>•</span>
                                  <span className="text-slate-500">{stay.reservationRef}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Check-in / Timeline */}
                          <td className="py-3.5 px-4">
                            <div className="text-slate-200 font-medium">
                              {stay.actualCheckInAt
                                ? new Date(stay.actualCheckInAt).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : new Date(stay.arrivalDate).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                  })}
                              {' → '}
                              {new Date(stay.departureDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Status:{' '}
                              <span
                                className={`font-semibold ${
                                  stay.status === 'CHECKED_IN'
                                    ? 'text-blue-400'
                                    : stay.status === 'CHECKED_OUT'
                                    ? 'text-purple-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {stay.status}
                              </span>
                            </div>
                          </td>

                          {/* Checked In / Billed By (Audit Attribution) */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                                  Check-in:
                                </span>
                                <span className="text-slate-200 font-bold">
                                  {checkInStaff?.fullName || 'System / Direct'}
                                </span>
                                {checkInStaff?.strikeCount !== undefined && checkInStaff.strikeCount > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                    {checkInStaff.strikeCount} strikes
                                  </span>
                                )}
                              </div>

                              {isBilled && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-amber-500 uppercase font-semibold">
                                    Billed By:
                                  </span>
                                  <span className="text-amber-300 font-semibold">
                                    {billStaff?.fullName || checkInStaff?.fullName || 'Staff'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Billing & Folio */}
                          <td className="py-3.5 px-4">
                            <div>
                              {isBilled ? (
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold text-[10px]">
                                    BILLED ({invoice?.invoiceRef || stay.billedInvoiceId || 'Bill Generated'})
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/40 text-blue-400 font-bold text-[10px]">
                                    UNBILLED / ACTIVE
                                  </span>
                                </div>
                              )}
                              <div className="text-[11px] text-slate-400">
                                Total: ₹{stay.totalAmount?.toFixed(2)} • Bal: ₹{stay.balanceAmount?.toFixed(2)}
                              </div>
                            </div>
                          </td>

                          {/* Revert Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Revert Bill Option */}
                              {isBilled && (
                                <button
                                  onClick={() => openRevertModal(stay, 'REVERT_BILL_TO_CHECKIN')}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 text-amber-300 hover:text-white rounded-lg text-xs font-bold transition-all"
                                  title="Unbill stay and revert back to active check-in"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Revert Bill</span>
                                </button>
                              )}

                              {/* Revert to Confirmed Option */}
                              {stay.status === 'CHECKED_IN' && !isBilled && (
                                <button
                                  onClick={() => openRevertModal(stay, 'REVERT_CHECKIN_TO_CONFIRMED')}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-300 hover:text-white rounded-lg text-xs font-bold transition-all"
                                  title="Revert check-in back to confirmed booking & free room"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Undo Check-in</span>
                                </button>
                              )}

                              {/* Delete Check-in Option */}
                              <button
                                onClick={() => openRevertModal(stay, 'DELETE_CHECKIN')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-300 hover:text-white rounded-lg text-xs font-bold transition-all"
                                title="Completely void & delete check-in to re-enter fresh"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Check-in</span>
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
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: STAFF STRIKES & BLOCKS */}
      {/* ==================================================== */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Staff Strike Registry</h3>
                <p className="text-xs text-slate-400">
                  Every Super Admin revert assigns +1 strike to the staff who entered the error. 3 strikes immediately blocks the staff account.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Auto-Block Threshold: 3 Strikes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Roles</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Strike Count (Max 3)</th>
                    <th className="py-3 px-4 text-right">Super Admin Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {staffUsers.map((user) => {
                    const isBlocked = user.status === 'BLOCKED' || user.strikeCount >= 3;
                    const strikeCount = user.strikeCount || 0;

                    return (
                      <tr key={user.id} className="hover:bg-slate-900/40 transition-colors">
                        {/* Staff Member */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{user.fullName}</div>
                          <div className="text-[11px] text-slate-400">{user.email}</div>
                          {user.phone && <div className="text-[10px] text-slate-500">{user.phone}</div>}
                        </td>

                        {/* Roles */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {user.userRoles?.map((ur: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-medium text-[10px]"
                              >
                                {ur.role?.name || 'Staff'}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Account Status */}
                        <td className="py-3.5 px-4">
                          {isBlocked ? (
                            <div>
                              <span className="px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-300 font-black text-xs flex items-center gap-1.5 w-fit animate-pulse">
                                <AlertOctagon className="w-3.5 h-3.5" />
                                BLOCKED (3 Strikes)
                              </span>
                              {user.blockedReason && (
                                <div className="text-[10px] text-red-400/80 mt-1 max-w-xs truncate">
                                  {user.blockedReason}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center gap-1.5 w-fit">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              ACTIVE
                            </span>
                          )}
                        </td>

                        {/* Strike Meter */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5 w-44">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span
                                className={
                                  strikeCount >= 3
                                    ? 'text-red-400'
                                    : strikeCount > 0
                                    ? 'text-amber-400'
                                    : 'text-slate-400'
                                }
                              >
                                {strikeCount} of 3 Strikes
                              </span>
                              {strikeCount >= 3 && (
                                <span className="text-[10px] text-red-400 font-black">LOCKED</span>
                              )}
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                              <div
                                className={`h-full rounded-sm flex-1 ${
                                  strikeCount >= 1 ? 'bg-amber-400' : 'bg-slate-700'
                                }`}
                              />
                              <div
                                className={`h-full rounded-sm flex-1 ${
                                  strikeCount >= 2 ? 'bg-orange-500' : 'bg-slate-700'
                                }`}
                              />
                              <div
                                className={`h-full rounded-sm flex-1 ${
                                  strikeCount >= 3 ? 'bg-red-600 animate-pulse' : 'bg-slate-700'
                                }`}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Super Admin Control */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isBlocked ? (
                              <button
                                onClick={() => handleStaffAction(user.id, 'UNBLOCK_USER')}
                                disabled={staffActionLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-900/30"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Unblock & Reset Strikes</span>
                              </button>
                            ) : strikeCount > 0 ? (
                              <button
                                onClick={() => handleStaffAction(user.id, 'RESET_STRIKES')}
                                disabled={staffActionLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Clear Strikes</span>
                              </button>
                            ) : (
                              <span className="text-slate-600 text-xs italic">Clean Record</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* REVERT ACTION CONFIRMATION MODAL */}
      {/* ==================================================== */}
      {selectedStay && actionType && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border-2 border-red-500/70 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.3)] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-rose-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white">
                <AlertTriangle className="w-5 h-5 text-amber-200" />
                <h3 className="font-black text-base tracking-wide">
                  {actionType === 'REVERT_BILL_TO_CHECKIN'
                    ? 'Confirm Revert Bill to Active Check-In'
                    : actionType === 'REVERT_CHECKIN_TO_CONFIRMED'
                    ? 'Confirm Revert Check-In to Confirmed'
                    : 'Confirm Void / Delete Check-In'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedStay(null);
                  setActionType(null);
                }}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Room:</span>
                  <span className="font-bold text-white">
                    Room {selectedStay.assignedRoom?.roomNumber || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Guest Name:</span>
                  <span className="font-bold text-white">{selectedStay.guest?.displayName || selectedStay.guest?.firstName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reservation Ref:</span>
                  <span className="font-mono text-slate-400">{selectedStay.reservationRef}</span>
                </div>
                {selectedStay.taxInvoices?.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Generated Invoice:</span>
                    <span className="font-bold text-amber-400">
                      {selectedStay.taxInvoices[0].invoiceRef} (Will be VOIDED & DELETED)
                    </span>
                  </div>
                )}
              </div>

              {/* What this does */}
              <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-3.5 text-xs text-slate-300 space-y-1">
                <div className="font-bold text-red-300">What will happen:</div>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  {actionType === 'REVERT_BILL_TO_CHECKIN' && (
                    <>
                      <li>Premature invoice is completely removed.</li>
                      <li>Stay is marked unbilled and restored to active check-in.</li>
                      <li>Front Desk can collect missing payments & regenerate the bill correctly.</li>
                    </>
                  )}
                  {actionType === 'REVERT_CHECKIN_TO_CONFIRMED' && (
                    <>
                      <li>Reservation status is reset back to CONFIRMED.</li>
                      <li>Room is marked VACANT & CLEAN.</li>
                    </>
                  )}
                  {actionType === 'DELETE_CHECKIN' && (
                    <>
                      <li>Reservation, folios, and mistaken records are completely purged.</li>
                      <li>Room is freed up so front desk can re-enter check-in from scratch.</li>
                    </>
                  )}
                  <li className="font-bold text-amber-400">
                    A Pop-Up Warning Notification will be pushed to the responsible staff member.
                  </li>
                  <li className="font-bold text-red-400">
                    +1 Strike will be added. (If they reach 3 strikes, their account will be BLOCKED automatically).
                  </li>
                </ul>
              </div>

              {/* Select Responsible Staff User */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Responsible Staff Member (+1 Strike & Pop-up Warning)
                </label>
                <select
                  value={responsibleStaffId}
                  onChange={(e) => setResponsibleStaffId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-2.5 rounded-lg outline-none focus:border-red-500"
                >
                  <option value="">Select staff member...</option>
                  {staffUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email}) - {u.strikeCount || 0} / 3 Strikes
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Reason / Warning Note */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Optional Note for Staff Warning Pop-up
                </label>
                <input
                  type="text"
                  placeholder="e.g. Forgot to collect payment before generating bill..."
                  value={revertReason}
                  onChange={(e) => setRevertReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-2 rounded-lg outline-none focus:border-red-500 placeholder-slate-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStay(null);
                    setActionType(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRevert}
                  disabled={executingAction || !responsibleStaffId}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all disabled:opacity-50"
                >
                  {executingAction ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Reverting & Applying Strike...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Execute Revert & Issue Strike</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
