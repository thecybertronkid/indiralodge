'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MoonStar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Calendar,
  DollarSign,
  BedDouble,
  Users,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  FileText,
  BadgeAlert,
  Sparkles,
  Banknote,
  CreditCard,
  QrCode,
  Building,
  History,
  Lock,
  Unlock,
  Info,
  Check,
  X,
  FileCheck2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface RoomStats {
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  blockedRooms: number;
  cleanRooms: number;
  dirtyRooms: number;
  cleaningRooms: number;
  occupancyRate: number;
  adr: number;
  revPar: number;
}

interface OperationalExceptions {
  pendingArrivals: any[];
  pendingDepartures: any[];
  dirtyRoomsCount: number;
  cleaningRoomsCount: number;
  blockedRoomsCount: number;
  totalExceptionsCount: number;
}

interface InHouseStay {
  id: string;
  reservationRef: string;
  guestName: string;
  phone: string;
  gstin?: string;
  isGSTBill: boolean;
  roomNumber: string;
  roomTypeName: string;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
  nights: number;
  baseTariff: number;
  cgst: number;
  sgst: number;
  totalNightTariff: number;
  otherCharges: number;
  totalPayments: number;
  outstandingBalance: number;
}

interface PaymentTransaction {
  id: string;
  ref: string;
  amount: number;
  method: string;
  guestName: string;
  roomNumber: string;
  date: string;
  receivedBy: string;
}

export default function NightAuditPage() {
  const { showToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [businessDate, setBusinessDate] = useState<string>(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const [activeTab, setActiveTab] = useState<'checklist' | 'stays' | 'payments' | 'report' | 'history'>('checklist');

  const [data, setData] = useState<{
    businessDate: string;
    isClosed: boolean;
    savedAuditDetails: any;
    property: any;
    roomStats: RoomStats;
    exceptions: OperationalExceptions;
    inHouseGuestList: InHouseStay[];
    revenueSummary: any;
    paymentBreakdown: any;
    paymentTransactions: PaymentTransaction[];
    cashReconciliation: any;
    auditHistory: any[];
  } | null>(null);

  // Reconciliation form states
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [discrepancyReason, setDiscrepancyReason] = useState<string>('');
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [autoNoShowOnClose, setAutoNoShowOnClose] = useState<boolean>(false);

  // Modals
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [executingAudit, setExecutingAudit] = useState<boolean>(false);
  const [resolvingNoShows, setResolvingNoShows] = useState<boolean>(false);
  const [selectedHistoricalReport, setSelectedHistoricalReport] = useState<any>(null);

  const fetchNightAuditData = async (dateToFetch?: string) => {
    setLoading(true);
    try {
      const targetDate = dateToFetch || businessDate;
      const res = await fetch(`/api/night-audit?date=${targetDate}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch night audit data');
      }
      const json = await res.json();
      setData(json);

      // Initialize actual cash input with expected cash default if empty
      if (json.cashReconciliation) {
        setActualCashInput(
          json.savedAuditDetails?.metrics?.actualCash !== undefined
            ? String(json.savedAuditDetails.metrics.actualCash)
            : String(json.cashReconciliation.expectedDrawerCash || '0')
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading night audit', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNightAuditData(businessDate);
  }, [businessDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusinessDate(e.target.value);
  };

  const handleAutoNoShow = async () => {
    if (!confirm('Are you sure you want to mark all unarrived reservations as NO-SHOW? Any allocated rooms will be freed.')) {
      return;
    }
    setResolvingNoShows(true);
    try {
      const res = await fetch('/api/night-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_no_show',
          businessDate,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to auto-resolve no-shows');
      showToast(result.message, 'success');
      await fetchNightAuditData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setResolvingNoShows(false);
    }
  };

  const handleExecuteNightAudit = async () => {
    if (!data) return;
    setExecutingAudit(true);
    try {
      const actualCashNumber = parseFloat(actualCashInput) || 0;
      const expectedCashNumber = data.cashReconciliation.expectedDrawerCash || 0;

      const payload = {
        action: 'close_day',
        businessDate,
        autoNoShow: autoNoShowOnClose,
        actualCashDrawer: actualCashNumber,
        discrepancyReason,
        auditNotes,
        metrics: {
          totalRooms: data.roomStats.totalRooms,
          occupiedRooms: data.roomStats.occupiedRooms,
          vacantRooms: data.roomStats.vacantRooms,
          blockedRooms: data.roomStats.blockedRooms,
          occupancyRate: data.roomStats.occupancyRate,
          adr: data.roomStats.adr,
          revPar: data.roomStats.revPar,
          roomRevenue: data.revenueSummary.roomBaseRevenue,
          servicesRevenue: data.revenueSummary.servicesRevenue,
          cgst: data.revenueSummary.cgst,
          sgst: data.revenueSummary.sgst,
          totalRevenue: data.revenueSummary.grossRevenue,
          totalCollected: data.revenueSummary.totalCollected,
          cashPayments: data.paymentBreakdown.CASH,
          upiPayments: data.paymentBreakdown.UPI,
          cardPayments: data.paymentBreakdown.CARD,
          netBankingPayments: data.paymentBreakdown.NET_BANKING,
          expectedCash: expectedCashNumber,
          outstandingBalance: data.revenueSummary.inHouseOutstanding,
        },
        snapshotData: {
          guestLedger: data.inHouseGuestList,
          paymentBreakdown: data.paymentBreakdown,
          roomStats: data.roomStats,
          exceptions: data.exceptions,
        },
      };

      const res = await fetch('/api/night-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to complete Night Audit');

      showToast(result.message || 'Night Audit executed successfully!', 'success');
      setIsCloseModalOpen(false);
      await fetchNightAuditData();
      setActiveTab('report');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setExecutingAudit(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const expectedCash = data?.cashReconciliation?.expectedDrawerCash || 0;
  const countedCash = parseFloat(actualCashInput) || 0;
  const cashDiscrepancy = Math.round((countedCash - expectedCash) * 100) / 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Print-Only Style Injection */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-night-audit-report,
          #printable-night-audit-report * {
            visibility: visible;
          }
          #printable-night-audit-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <MoonStar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Night Audit & Day Close</h1>
                {data?.isClosed ? (
                  <Badge variant="success" className="px-3 py-1 flex items-center gap-1.5 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    DAY CLOSED / AUDITED
                  </Badge>
                ) : (
                  <Badge variant="warning" className="px-3 py-1 flex items-center gap-1.5 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    AUDIT PENDING
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Reconcile front desk operations, room tariffs, GST compliance, cashier drawers, and finalize business day.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">Business Date:</span>
            <input
              type="date"
              value={businessDate}
              onChange={handleDateChange}
              className="text-xs font-bold text-slate-900 bg-transparent border-none focus:outline-hidden cursor-pointer"
            />
          </div>

          <button
            onClick={() => fetchNightAuditData()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handlePrintReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Flash Report
          </button>

          {!data?.isClosed ? (
            <button
              onClick={() => setIsCloseModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all transform active:scale-95"
            >
              <FileCheck2 className="w-4 h-4" />
              Run Night Audit
            </button>
          ) : (
            <button
              onClick={() => setIsCloseModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-sm font-semibold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Re-run / Update Audit
            </button>
          )}
        </div>
      </div>

      {/* Top Level Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">Gross Revenue (Today)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              ₹{data ? data.revenueSummary.grossRevenue.toLocaleString('en-IN') : '0'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <span>Room: ₹{data ? data.revenueSummary.roomBaseRevenue.toLocaleString('en-IN') : '0'}</span>
              <span>•</span>
              <span className="text-blue-600 font-medium">GST: ₹{data ? data.revenueSummary.totalGST.toLocaleString('en-IN') : '0'}</span>
            </div>
          </div>
        </div>

        {/* Occupancy & Rooms */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">Occupancy & ADR</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <BedDouble className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {data ? data.roomStats.occupancyRate : 0}%
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <span>{data ? data.roomStats.occupiedRooms : 0} / {data ? data.roomStats.totalRooms : 0} Rooms</span>
              <span>•</span>
              <span>ADR: ₹{data ? data.roomStats.adr : '0'}</span>
            </div>
          </div>
        </div>

        {/* Collections & Cash Drawer */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">Total Collected</span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              ₹{data ? data.revenueSummary.totalCollected.toLocaleString('en-IN') : '0'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <span>Cash: ₹{data ? data.paymentBreakdown.CASH.toLocaleString('en-IN') : '0'}</span>
              <span>•</span>
              <span>UPI: ₹{data ? data.paymentBreakdown.UPI.toLocaleString('en-IN') : '0'}</span>
            </div>
          </div>
        </div>

        {/* Pending Exceptions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">Exceptions / Blockers</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              (data?.exceptions?.totalExceptionsCount || 0) > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black ${
              (data?.exceptions?.totalExceptionsCount || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {data ? data.exceptions.totalExceptionsCount : 0} Unresolved
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <span>{data ? data.exceptions.pendingArrivals.length : 0} Arrivals</span>
              <span>•</span>
              <span>{data ? data.exceptions.pendingDepartures.length : 0} Overstays</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center border-b border-slate-200 bg-white px-4 rounded-xl shadow-2xs">
        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex items-center gap-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'checklist'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BadgeAlert className="w-4 h-4" />
          Pre-Audit Exceptions
          {(data?.exceptions?.totalExceptionsCount || 0) > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-black">
              {data?.exceptions?.totalExceptionsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('stays')}
          className={`flex items-center gap-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'stays'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BedDouble className="w-4 h-4" />
          Room Tariff & GST Audit
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-bold">
            {data?.inHouseGuestList?.length || 0} In-House
          </span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'payments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Banknote className="w-4 h-4" />
          Cashier Balancing & Payments
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'report'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Daily Flash Report
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          Audit History
        </button>
      </div>

      {/* TAB 1: PRE-AUDIT EXCEPTIONS & CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          {/* Warning banner if unresolved exceptions exist */}
          {(data?.exceptions?.totalExceptionsCount || 0) > 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Action Required Before Day Close</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    There are {data?.exceptions?.pendingArrivals.length} unarrived reservations and{' '}
                    {data?.exceptions?.pendingDepartures.length} pending overstay check-outs. Please resolve them below or
                    use Auto-Resolve.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoNoShow}
                  disabled={resolvingNoShows || data?.exceptions?.pendingArrivals.length === 0}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {resolvingNoShows ? 'Resolving...' : 'Auto-Mark All Pending Arrivals as No-Show'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs font-bold">
                Operational Checklist Clear! All expected arrivals and departures have been processed for this business date.
              </div>
            </div>
          )}

          {/* Section A: Pending Arrivals */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Expected Arrivals Not Checked In ({data?.exceptions?.pendingArrivals.length || 0})
                </h3>
                <p className="text-xs text-slate-500">Reservations scheduled for arrival on or before {businessDate}</p>
              </div>
              {data?.exceptions?.pendingArrivals && data.exceptions.pendingArrivals.length > 0 && (
                <button
                  onClick={handleAutoNoShow}
                  disabled={resolvingNoShows}
                  className="text-xs font-bold text-amber-600 hover:text-amber-800"
                >
                  Mark All as No-Show
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Guest Details</th>
                    <th className="py-3 px-4">Room & Type</th>
                    <th className="py-3 px-4">Arrival Date / Time</th>
                    <th className="py-3 px-4">Tariff</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data?.exceptions?.pendingArrivals && data.exceptions.pendingArrivals.length > 0 ? (
                    data.exceptions.pendingArrivals.map((res: any) => (
                      <tr key={res.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{res.reservationRef}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{res.guest.displayName}</div>
                          <div className="text-[11px] text-slate-500">{res.guest.phone || 'No phone'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{res.roomType?.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {res.assignedRoom ? `Room ${res.assignedRoom.roomNumber}` : 'Room Not Assigned'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>{new Date(res.arrivalDate).toLocaleDateString('en-GB')}</div>
                          <div className="text-[11px] text-slate-500">{res.arrivalTime || '14:00'}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">₹{res.roomRate || 0}</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <a
                            href={`/front-office`}
                            className="inline-block px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg text-xs"
                          >
                            Go to Check In
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <Check className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
                        No pending arrivals remaining.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section B: Overstays / Pending Departures */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Expected Departures / Overstays ({data?.exceptions?.pendingDepartures.length || 0})
                </h3>
                <p className="text-xs text-slate-500">Guests scheduled for check-out on or before {businessDate}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Room #</th>
                    <th className="py-3 px-4">Guest Details</th>
                    <th className="py-3 px-4">Departure Date / Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data?.exceptions?.pendingDepartures && data.exceptions.pendingDepartures.length > 0 ? (
                    data.exceptions.pendingDepartures.map((res: any) => (
                      <tr key={res.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-black text-slate-900 text-sm">
                          {res.assignedRoom?.roomNumber || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{res.guest.displayName}</div>
                          <div className="text-[11px] text-slate-500">{res.guest.phone || 'No phone'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">
                            {new Date(res.departureDate).toLocaleDateString('en-GB')}
                          </div>
                          <div className="text-[11px] text-slate-500">{res.departureTime || '11:00'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="warning">OVERSTAY / PENDING CHECKOUT</Badge>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <a
                            href={`/front-office`}
                            className="inline-block px-3 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold rounded-lg text-xs"
                          >
                            Checkout or Extend
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        <Check className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
                        No pending overstays. All departures have been settled.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section C: Room Housekeeping Readiness */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Housekeeping Status Overview
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Direct check-ins are restricted on Dirty, Cleaning, or Blocked rooms. Verify readiness before opening next business date.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="text-xs font-bold text-emerald-800">Clean & Ready</div>
                <div className="text-2xl font-black text-emerald-900 mt-1">{data?.roomStats?.cleanRooms || 0}</div>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="text-xs font-bold text-amber-800">Dirty</div>
                <div className="text-2xl font-black text-amber-900 mt-1">{data?.roomStats?.dirtyRooms || 0}</div>
              </div>
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
                <div className="text-xs font-bold text-blue-800">Cleaning in Progress</div>
                <div className="text-2xl font-black text-blue-900 mt-1">{data?.roomStats?.cleaningRooms || 0}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
                <div className="text-xs font-bold text-slate-700">Blocked / Maintenance</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{data?.roomStats?.blockedRooms || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROOM TARIFF & GST AUDIT */}
      {activeTab === 'stays' && (
        <div className="space-y-6">
          {/* GST Calculation Notice Card */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <span className="font-bold">Indira Lodge GST Calculation Rule:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-blue-800">
                <li>
                  <span className="font-semibold">Non-GST Bill:</span> Base room tariff only (0% GST). E.g. Base ₹1,000 = Final ₹1,000.
                </li>
                <li>
                  <span className="font-semibold">GST Bill:</span> SGST (2.5%) + CGST (2.5%) charged above base tariff. E.g. Base ₹1,000 + SGST ₹25 + CGST ₹25 = Final ₹1,050.
                </li>
                <li>
                  <span className="font-semibold">Same-Day Stays:</span> Charged for 1 full night room tariff.
                </li>
              </ul>
            </div>
          </div>

          {/* Revenue Ledger Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-4">Daily Room Revenue & Tax Accrual</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Base Room Revenue</div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  ₹{data?.revenueSummary?.roomBaseRevenue?.toLocaleString('en-IN') || 0}
                </div>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                <div className="text-[11px] font-bold text-blue-700 uppercase">CGST (2.5%)</div>
                <div className="text-lg font-black text-blue-900 mt-1">
                  ₹{data?.revenueSummary?.cgst?.toLocaleString('en-IN') || 0}
                </div>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                <div className="text-[11px] font-bold text-blue-700 uppercase">SGST (2.5%)</div>
                <div className="text-lg font-black text-blue-900 mt-1">
                  ₹{data?.revenueSummary?.sgst?.toLocaleString('en-IN') || 0}
                </div>
              </div>
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200">
                <div className="text-[11px] font-bold text-purple-700 uppercase">F&B / Extra Services</div>
                <div className="text-lg font-black text-purple-900 mt-1">
                  ₹{data?.revenueSummary?.servicesRevenue?.toLocaleString('en-IN') || 0}
                </div>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <div className="text-[11px] font-bold text-emerald-700 uppercase">Total Night Billed</div>
                <div className="text-lg font-black text-emerald-900 mt-1">
                  ₹{data?.revenueSummary?.grossRevenue?.toLocaleString('en-IN') || 0}
                </div>
              </div>
            </div>
          </div>

          {/* In-House Guests Audit Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">In-House Folios & Night Room Charge Ledger</h3>
                <p className="text-xs text-slate-500">Active stays verified for overnight posting on {businessDate}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Room #</th>
                    <th className="py-3 px-4">Guest Name & Ref</th>
                    <th className="py-3 px-4">Bill Type</th>
                    <th className="py-3 px-4">Base Tariff</th>
                    <th className="py-3 px-4">CGST (2.5%)</th>
                    <th className="py-3 px-4">SGST (2.5%)</th>
                    <th className="py-3 px-4">Night Total</th>
                    <th className="py-3 px-4">Extras / F&B</th>
                    <th className="py-3 px-4 text-right">Folio Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data?.inHouseGuestList && data.inHouseGuestList.length > 0 ? (
                    data.inHouseGuestList.map((stay: InHouseStay) => (
                      <tr key={stay.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-black text-slate-900 text-sm">{stay.roomNumber}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{stay.guestName}</div>
                          <div className="text-[11px] font-mono text-slate-400">{stay.reservationRef}</div>
                        </td>
                        <td className="py-3 px-4">
                          {stay.isGSTBill ? (
                            <Badge variant="info">GST BILL</Badge>
                          ) : (
                            <Badge variant="neutral">NON-GST</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">₹{stay.baseTariff}</td>
                        <td className="py-3 px-4 text-slate-600">₹{stay.cgst}</td>
                        <td className="py-3 px-4 text-slate-600">₹{stay.sgst}</td>
                        <td className="py-3 px-4 font-bold text-blue-600">₹{stay.totalNightTariff}</td>
                        <td className="py-3 px-4 text-purple-700 font-medium">₹{stay.otherCharges}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          {stay.outstandingBalance > 0 ? (
                            <span className="text-amber-600">₹{stay.outstandingBalance}</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">Settled</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No in-house guests currently checked in.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CASHIER SHIFTS & PAYMENT RECONCILIATION */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Payment Method Distribution */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase">Cash</span>
                <Banknote className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                ₹{data?.paymentBreakdown?.CASH?.toLocaleString('en-IN') || 0}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase">UPI</span>
                <QrCode className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                ₹{data?.paymentBreakdown?.UPI?.toLocaleString('en-IN') || 0}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase">Card</span>
                <CreditCard className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                ₹{data?.paymentBreakdown?.CARD?.toLocaleString('en-IN') || 0}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase">Net Banking</span>
                <Building className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                ₹{data?.paymentBreakdown?.NET_BANKING?.toLocaleString('en-IN') || 0}
              </div>
            </div>

            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-xs">
              <div className="flex items-center justify-between text-emerald-700 mb-2">
                <span className="text-xs font-bold uppercase">Total Collections</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-950">
                ₹{data?.paymentBreakdown?.TOTAL?.toLocaleString('en-IN') || 0}
              </div>
            </div>
          </div>

          {/* Cash Drawer Reconciliation Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" />
              Cash Drawer Balancing & Shift Audit
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Compare actual cash drawer physical count against system expected cash.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Formula display */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Opening Cash (Shift Floats):</span>
                  <span className="font-bold">₹{data?.cashReconciliation?.totalOpeningCash || 0}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>+ Cash Payments Collected:</span>
                  <span className="font-bold text-emerald-600">
                    +₹{data?.cashReconciliation?.cashCollectedToday || 0}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                  <span>System Expected Cash:</span>
                  <span className="text-blue-600">₹{expectedCash}</span>
                </div>
              </div>

              {/* Physical Count Input */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Actual Physical Cash Counted (₹):
                </label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={actualCashInput}
                    onChange={(e) => setActualCashInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-lg font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Count total currency notes & coins in drawer</span>
              </div>

              {/* Discrepancy Status */}
              <div
                className={`p-4 rounded-xl border flex flex-col justify-center ${
                  cashDiscrepancy === 0
                    ? 'bg-emerald-50 border-emerald-200'
                    : cashDiscrepancy > 0
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-rose-50 border-rose-200'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">Cash Discrepancy</div>
                <div
                  className={`text-2xl font-black mt-1 ${
                    cashDiscrepancy === 0
                      ? 'text-emerald-700'
                      : cashDiscrepancy > 0
                      ? 'text-blue-700'
                      : 'text-rose-700'
                  }`}
                >
                  {cashDiscrepancy === 0
                    ? '₹0.00 (Balanced)'
                    : cashDiscrepancy > 0
                    ? `+₹${cashDiscrepancy} (Overage)`
                    : `-₹${Math.abs(cashDiscrepancy)} (Shortage)`}
                </div>
                {cashDiscrepancy !== 0 && (
                  <p className="text-[11px] text-slate-600 mt-1">
                    Auditor note required explaining discrepancy before closing.
                  </p>
                )}
              </div>
            </div>

            {cashDiscrepancy !== 0 && (
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Discrepancy Explanation / Audit Note:
                </label>
                <input
                  type="text"
                  value={discrepancyReason}
                  onChange={(e) => setDiscrepancyReason(e.target.value)}
                  placeholder="e.g. Petty cash refund of ₹50 paid for milk not entered in system"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            )}
          </div>

          {/* Individual Payment Transactions */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Collections Ledger for {businessDate}</h3>
              <span className="text-xs text-slate-500 font-semibold">
                {data?.paymentTransactions?.length || 0} Transactions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Receipt Ref</th>
                    <th className="py-3 px-4">Guest & Room</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Collected By</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data?.paymentTransactions && data.paymentTransactions.length > 0 ? (
                    data.paymentTransactions.map((tx: PaymentTransaction) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{tx.ref}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{tx.guestName}</div>
                          <div className="text-[11px] text-slate-500">Room {tx.roomNumber}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="neutral">{tx.method}</Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(tx.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{tx.receivedBy}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">₹{tx.amount}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No payments recorded for this business date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DAILY NIGHT AUDIT FLASH REPORT (Printable) */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          <div className="flex justify-end gap-3 no-print">
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print Official Flash Report
            </button>
          </div>

          {/* Printable Report Canvas */}
          <div
            id="printable-night-audit-report"
            ref={printRef}
            className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-slate-900 max-w-4xl mx-auto"
          >
            {/* Report Header */}
            <div className="border-b-2 border-slate-900 pb-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                    {data?.property?.name || 'INDIRA LODGE'}
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">{data?.property?.address || 'Hotel PMS'}</p>
                  <p className="text-xs text-slate-600">
                    Phone: {data?.property?.phone || 'Front Desk'} | Property Code: {data?.property?.code || 'IL'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded text-xs font-black uppercase tracking-wider mb-2">
                    Daily Flash Report
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    Business Date: <span className="font-mono text-sm">{businessDate}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Generated: {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Status Overview */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-center">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Audit Status</div>
                <div className="text-xs font-black text-slate-900 mt-1">
                  {data?.isClosed ? 'COMPLETED / LOCKED' : 'PENDING CLOSE'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Auditor</div>
                <div className="text-xs font-bold text-slate-900 mt-1">
                  {data?.savedAuditDetails?.performedBy || 'System Auditor'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Occupancy %</div>
                <div className="text-xs font-black text-blue-700 mt-1">{data?.roomStats?.occupancyRate || 0}%</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Gross Revenue</div>
                <div className="text-xs font-black text-emerald-700 mt-1">
                  ₹{data?.revenueSummary?.grossRevenue?.toLocaleString('en-IN') || 0}
                </div>
              </div>
            </div>

            {/* Room Statistics Matrix */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2 mb-3">
                1. Room Inventory & Occupancy Statistics
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="border border-slate-200 p-2.5 rounded-lg">
                  <span className="text-slate-500">Total Rooms:</span>
                  <div className="font-black text-slate-900 text-sm mt-0.5">{data?.roomStats?.totalRooms || 0}</div>
                </div>
                <div className="border border-slate-200 p-2.5 rounded-lg">
                  <span className="text-slate-500">Occupied Rooms:</span>
                  <div className="font-black text-slate-900 text-sm mt-0.5">{data?.roomStats?.occupiedRooms || 0}</div>
                </div>
                <div className="border border-slate-200 p-2.5 rounded-lg">
                  <span className="text-slate-500">Vacant / Available:</span>
                  <div className="font-black text-slate-900 text-sm mt-0.5">{data?.roomStats?.vacantRooms || 0}</div>
                </div>
                <div className="border border-slate-200 p-2.5 rounded-lg">
                  <span className="text-slate-500">Blocked / Out of Order:</span>
                  <div className="font-black text-slate-900 text-sm mt-0.5">{data?.roomStats?.blockedRooms || 0}</div>
                </div>
                <div className="border border-slate-200 p-2.5 rounded-lg">
                  <span className="text-slate-500">Clean Rooms:</span>
                  <div className="font-black text-emerald-700 text-sm mt-0.5">{data?.roomStats?.cleanRooms || 0}</div>
                </div>
                <div className="border border-slate-200 p-2.5 rounded-lg">
                  <span className="text-slate-500">Dirty Rooms:</span>
                  <div className="font-black text-amber-700 text-sm mt-0.5">{data?.roomStats?.dirtyRooms || 0}</div>
                </div>
                <div className="border border-slate-200 p-2.5 rounded-lg">
                  <span className="text-slate-500">ADR (Average Daily Rate):</span>
                  <div className="font-black text-slate-900 text-sm mt-0.5">₹{data?.roomStats?.adr || 0}</div>
                </div>
                <div className="border border-slate-200 p-2.5 rounded-lg">
                  <span className="text-slate-500">RevPAR:</span>
                  <div className="font-black text-slate-900 text-sm mt-0.5">₹{data?.roomStats?.revPar || 0}</div>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2 mb-3">
                2. Revenue & Tax Breakdown (GST Compliance)
              </h4>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 text-slate-600">Base Room Revenue (Non-GST & GST Net Base):</td>
                    <td className="py-2 text-right font-mono font-bold text-slate-900">
                      ₹{data?.revenueSummary?.roomBaseRevenue?.toLocaleString('en-IN') || 0}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 text-slate-600">CGST Accrued (2.5% on GST Bills):</td>
                    <td className="py-2 text-right font-mono font-bold text-slate-900">
                      ₹{data?.revenueSummary?.cgst?.toLocaleString('en-IN') || 0}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 text-slate-600">SGST Accrued (2.5% on GST Bills):</td>
                    <td className="py-2 text-right font-mono font-bold text-slate-900">
                      ₹{data?.revenueSummary?.sgst?.toLocaleString('en-IN') || 0}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 text-slate-600">Food, Beverages & Extra Services:</td>
                    <td className="py-2 text-right font-mono font-bold text-slate-900">
                      ₹{data?.revenueSummary?.servicesRevenue?.toLocaleString('en-IN') || 0}
                    </td>
                  </tr>
                  <tr className="border-b-2 border-slate-900 font-bold bg-slate-50">
                    <td className="py-2.5 text-slate-900">GROSS BUSINESS DAY REVENUE:</td>
                    <td className="py-2.5 text-right font-mono text-sm text-slate-900">
                      ₹{data?.revenueSummary?.grossRevenue?.toLocaleString('en-IN') || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Collections & Cash Balancing */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2 mb-3">
                3. Settlement Collections & Cashier Audit
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-600">Cash Collections:</td>
                      <td className="py-1.5 text-right font-mono font-bold">
                        ₹{data?.paymentBreakdown?.CASH?.toLocaleString('en-IN') || 0}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-600">UPI Collections:</td>
                      <td className="py-1.5 text-right font-mono font-bold">
                        ₹{data?.paymentBreakdown?.UPI?.toLocaleString('en-IN') || 0}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-600">Card Collections:</td>
                      <td className="py-1.5 text-right font-mono font-bold">
                        ₹{data?.paymentBreakdown?.CARD?.toLocaleString('en-IN') || 0}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-600">Net Banking / Transfer:</td>
                      <td className="py-1.5 text-right font-mono font-bold">
                        ₹{data?.paymentBreakdown?.NET_BANKING?.toLocaleString('en-IN') || 0}
                      </td>
                    </tr>
                    <tr className="font-bold border-t border-slate-300">
                      <td className="py-2 text-slate-900">Total Collections Today:</td>
                      <td className="py-2 text-right font-mono text-emerald-700">
                        ₹{data?.paymentBreakdown?.TOTAL?.toLocaleString('en-IN') || 0}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-slate-700">Cash Drawer Reconciliation:</div>
                  <div className="flex justify-between">
                    <span>Opening Drawer Float:</span>
                    <span className="font-mono">₹{data?.cashReconciliation?.totalOpeningCash || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>System Expected Drawer Cash:</span>
                    <span className="font-mono font-bold">₹{expectedCash}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Actual Physical Drawer Cash:</span>
                    <span className="font-mono font-bold">₹{countedCash}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                    <span>Variance / Discrepancy:</span>
                    <span
                      className={`font-mono ${
                        cashDiscrepancy === 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {cashDiscrepancy === 0 ? '₹0.00 (Balanced)' : `₹${cashDiscrepancy}`}
                    </span>
                  </div>
                  {data?.savedAuditDetails?.notes && (
                    <div className="text-[10px] text-slate-500 italic mt-2">
                      Note: {data.savedAuditDetails.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Auditor Signature Block */}
            <div className="pt-8 border-t border-slate-200 mt-8 grid grid-cols-2 gap-8 text-xs">
              <div>
                <div className="border-b border-slate-400 pb-8 mb-2"></div>
                <div className="font-bold text-slate-800">Night Auditor Signature</div>
                <div className="text-slate-500 text-[11px]">
                  {data?.savedAuditDetails?.performedBy || 'Duty Auditor / Front Office'}
                </div>
              </div>
              <div className="text-right">
                <div className="border-b border-slate-400 pb-8 mb-2"></div>
                <div className="font-bold text-slate-800">General Manager / Owner</div>
                <div className="text-slate-500 text-[11px]">Indira Lodge Hotel Management</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT HISTORY ARCHIVE */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Historical Night Audit Archive</h3>
              <p className="text-xs text-slate-500">
                Complete historical record of all closed business days from day one of the platform ({data?.auditHistory?.length || 0} audits)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Business Date</th>
                  <th className="py-3 px-4">Closed Timestamp</th>
                  <th className="py-3 px-4">Auditor</th>
                  <th className="py-3 px-4">Occupancy %</th>
                  <th className="py-3 px-4">Gross Revenue</th>
                  <th className="py-3 px-4">Total Collected</th>
                  <th className="py-3 px-4">Cash Discrepancy</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data?.auditHistory && data.auditHistory.length > 0 ? (
                  data.auditHistory.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-black text-slate-900">{item.businessDate}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(item.closedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{item.performedBy}</td>
                      <td className="py-3 px-4 font-bold text-blue-600">{item.occupancyRate}%</td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        ₹{item.grossRevenue ? item.grossRevenue.toLocaleString('en-IN') : 0}
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-bold">
                        ₹{item.paymentsCollected ? item.paymentsCollected.toLocaleString('en-IN') : 0}
                      </td>
                      <td className="py-3 px-4">
                        {item.discrepancy === 0 ? (
                          <span className="text-emerald-600 font-bold">Balanced</span>
                        ) : (
                          <span className="text-rose-600 font-bold">₹{item.discrepancy}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setBusinessDate(item.businessDate);
                            setActiveTab('report');
                          }}
                          className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg text-xs"
                        >
                          View Flash Report
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No previous night audit records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL TO EXECUTE NIGHT AUDIT */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title={`Execute Night Audit & Close Business Day: ${businessDate}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
            <p className="font-bold">What happens during Night Audit Execution:</p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-blue-800">
              <li>Locks operational and folio records for the business date.</li>
              <li>Reconciles cashier shift balances and records any drawer variance.</li>
              <li>Audits room charges and GST (CGST 2.5% + SGST 2.5% on GST bills).</li>
              <li>Generates an immutable Daily Flash Report and logs the official audit record.</li>
            </ul>
          </div>

          {/* Pending arrivals notice */}
          {data?.exceptions?.pendingArrivals && data.exceptions.pendingArrivals.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 text-amber-800 text-xs font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                There are {data.exceptions.pendingArrivals.length} Pending Arrivals
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={autoNoShowOnClose}
                  onChange={(e) => setAutoNoShowOnClose(e.target.checked)}
                  className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold">Automatically mark unresolved arrivals as No-Show & free rooms</span>
              </label>
            </div>
          )}

          {/* Drawer summary in modal */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-600">Expected Cash:</span>
              <span className="font-bold">₹{expectedCash}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Actual Counted Cash:</span>
              <span className="font-bold">₹{countedCash}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
              <span>Variance:</span>
              <span className={cashDiscrepancy === 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {cashDiscrepancy === 0 ? 'Balanced (₹0.00)' : `₹${cashDiscrepancy}`}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Auditor Remarks / Closing Notes (Optional):</label>
            <textarea
              rows={2}
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              placeholder="e.g. Smooth shift operations, all guests checked in on time."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsCloseModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteNightAudit}
              disabled={executingAudit}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {executingAudit ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Executing Audit...
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Confirm & Close Business Day
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
