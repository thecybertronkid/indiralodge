'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays,
  User,
  BedDouble,
  Receipt,
  CreditCard,
  Clock,
  Activity,
  ArrowLeft,
  XCircle,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const reservationId = (params?.id as string) || '';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'folio' | 'payments' | 'timeline'>('overview');

  // Cancel Modal State
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDetails = async () => {
    try {
      const res = await fetch(`/api/reservations/${reservationId}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        showToast('Failed to fetch reservation details', 'error');
      }
    } catch (e) {
      showToast('Network error fetching reservation', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reservationId) fetchDetails();
  }, [reservationId]);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', cancelledReason: cancelReason }),
      });

      if (res.ok) {
        showToast('Reservation cancelled successfully', 'success');
        setIsCancelOpen(false);
        fetchDetails();
      } else {
        showToast('Failed to cancel reservation', 'error');
      }
    } catch (e) {
      showToast('Error cancelling reservation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600 mr-2" />
        Loading booking details...
      </div>
    );
  }

  if (!data || !data.reservation) {
    return (
      <div className="py-12 text-center text-slate-600 text-xs">
        Reservation record not found.
      </div>
    );
  }

  const res = data.reservation;
  const folio = res.folios?.[0];
  const transactions = folio?.transactions || [];
  const payments = res.payments || [];
  const timeline = data.auditEvents || [];

  const getBadgeVariant = (status: string) => {
    if (status === 'CHECKED_IN') return 'success';
    if (status === 'CONFIRMED') return 'info';
    if (status === 'CANCELLED') return 'error';
    return 'neutral';
  };

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/reservations"
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-mono">
                {res.reservationRef}
              </h1>
              <Badge variant={getBadgeVariant(res.status)}>
                {res.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Guest: {res.guest?.displayName} • Source: {res.bookingSource?.name}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {res.status === 'CONFIRMED' && (
            <button
              onClick={() => setIsCancelOpen(true)}
              className="px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all"
            >
              Cancel Booking
            </button>
          )}

          <Link
            href="/front-office"
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md transition-all"
          >
            Front Desk Hub
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'overview' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Overview & Stay
        </button>

        <button
          onClick={() => setActiveTab('folio')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'folio' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Folio Ledger ({transactions.length})
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'payments' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payments ({payments.length})
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'timeline' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          Activity Timeline ({timeline.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stay & Room Info */}
          <div className="pmfs-card p-6 space-y-4 lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Stay Details
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500">Arrival Date:</span>
                <div className="font-bold text-slate-900 mt-0.5">{new Date(res.arrivalDate).toLocaleDateString()}</div>
              </div>

              <div>
                <span className="text-slate-500">Departure Date:</span>
                <div className="font-bold text-slate-900 mt-0.5">{new Date(res.departureDate).toLocaleDateString()}</div>
              </div>

              <div>
                <span className="text-slate-500">Duration:</span>
                <div className="font-bold text-slate-900 mt-0.5">{res.nights} Night{res.nights > 1 ? 's' : ''}</div>
              </div>

              <div>
                <span className="text-slate-500">Occupants:</span>
                <div className="font-bold text-slate-900 mt-0.5">{res.adults} Adults, {res.children} Children</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500">Room Category:</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{res.roomType?.name}</div>
                <div className="text-[11px] text-slate-500">Base Rate: ₹{res.roomRate}/night</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500">Assigned Physical Room:</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  {res.assignedRoom?.roomNumber ? `Room ${res.assignedRoom.roomNumber}` : 'Unassigned'}
                </div>
              </div>
            </div>

            {res.specialRequests && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <span className="font-bold">Special Requests:</span> {res.specialRequests}
              </div>
            )}
          </div>

          {/* Financial Summary */}
          <div className="pmfs-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Financial Summary
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Room Rate x {res.nights} Nights:</span>
                <span className="font-semibold text-slate-900">₹{(res.roomRate * res.nights).toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-600">Discount:</span>
                <span className="font-semibold text-rose-600">- ₹{res.discountAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-600">GST Tax:</span>
                <span className="font-semibold text-slate-900">₹{res.taxAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-sm">
                <span>Total Amount:</span>
                <span className="text-slate-900">₹{res.totalAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Paid Amount:</span>
                <span className="font-bold text-emerald-600">₹{res.paidAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-2 font-extrabold text-sm">
                <span>Net Balance:</span>
                <span className={res.balanceAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  ₹{res.balanceAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FOLIO LEDGER */}
      {activeTab === 'folio' && (
        <div className="pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Folio Itemized Ledger ({folio?.folioNumber || 'No Folio'})
              </h3>
              <span className="text-xs text-slate-500">Folio Status: {folio?.status || 'ACTIVE'}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Timestamp</th>
                  <th className="pmfs-table-th">Trx Ref</th>
                  <th className="pmfs-table-th">Category</th>
                  <th className="pmfs-table-th">Description</th>
                  <th className="pmfs-table-th">Debit (Charges)</th>
                  <th className="pmfs-table-th">Credit (Payments)</th>
                  <th className="pmfs-table-th">Posted By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-xs text-slate-500">
                      No transactions posted to folio yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="pmfs-table-td text-xs text-slate-500">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td className="pmfs-table-td font-mono font-bold text-slate-800">
                        {t.transactionRef}
                      </td>
                      <td className="pmfs-table-td">
                        <Badge variant="neutral">{t.category}</Badge>
                      </td>
                      <td className="pmfs-table-td font-medium text-slate-900">{t.description}</td>
                      <td className="pmfs-table-td font-bold text-rose-600">
                        {t.type === 'DEBIT' ? `₹${t.amount.toFixed(2)}` : '—'}
                      </td>
                      <td className="pmfs-table-td font-bold text-emerald-600">
                        {t.type === 'CREDIT' ? `₹${t.amount.toFixed(2)}` : '—'}
                      </td>
                      <td className="pmfs-table-td text-xs text-slate-600">{t.postedBy?.fullName || 'System'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Payments Register
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Payment Ref</th>
                  <th className="pmfs-table-th">Date</th>
                  <th className="pmfs-table-th">Method</th>
                  <th className="pmfs-table-th">Amount</th>
                  <th className="pmfs-table-th">Received By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-xs text-slate-500">
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="pmfs-table-td font-mono font-bold text-emerald-700">
                        {p.paymentRef}
                      </td>
                      <td className="pmfs-table-td text-xs text-slate-500">
                        {new Date(p.date).toLocaleString()}
                      </td>
                      <td className="pmfs-table-td font-semibold text-slate-800">{p.method}</td>
                      <td className="pmfs-table-td font-extrabold text-emerald-600">
                        ₹{p.amount.toFixed(2)}
                      </td>
                      <td className="pmfs-table-td text-xs text-slate-600">{p.receivedBy?.fullName || 'System'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="pmfs-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Chronological Audit & Action Timeline
          </h3>

          <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
            {timeline.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">No activity logged.</div>
            ) : (
              timeline.map((act: any) => (
                <div key={act.id} className="relative flex items-start gap-4 pl-8">
                  <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-brand-600 ring-4 ring-white" />
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex-1 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{act.action.replace(/_/g, ' ')}</span>
                      <span className="text-[11px] text-slate-400">{new Date(act.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-600">
                      Performed by: <span className="font-medium">{act.user?.fullName || 'System'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      <Modal isOpen={isCancelOpen} onClose={() => setIsCancelOpen(false)} title="Cancel Booking" maxWidth="md">
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Cancellation Reason *
            </label>
            <input
              type="text"
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Guest travel plans changed"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCancelOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
