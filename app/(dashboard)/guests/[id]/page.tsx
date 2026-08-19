'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  CalendarDays,
  CreditCard,
  FileText,
  Star,
  ShieldAlert,
  ArrowLeft,
  Loader2,
  Plus,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export default function GuestProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const guestId = (params?.id as string) || '';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'reservations' | 'documents' | 'payments'>('overview');

  // Document Upload Modal
  const [isDocOpen, setIsDocOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    documentType: 'AADHAAR',
    documentNumber: '',
    issuingCountry: 'India',
  });
  const [savingDoc, setSavingDoc] = useState(false);

  const fetchGuest = async () => {
    try {
      const res = await fetch(`/api/guests/${guestId}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        showToast('Guest profile not found', 'error');
      }
    } catch (e) {
      showToast('Error loading guest profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (guestId) fetchGuest();
  }, [guestId]);

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDoc(true);
    try {
      const res = await fetch(`/api/guests/${guestId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docForm),
      });

      if (res.ok) {
        showToast('Guest ID Document saved and verified!', 'success');
        setIsDocOpen(false);
        fetchGuest();
      } else {
        showToast('Failed to save document', 'error');
      }
    } catch (e) {
      showToast('Error saving document', 'error');
    } finally {
      setSavingDoc(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600 mr-2" />
        Loading guest profile...
      </div>
    );
  }

  if (!data || !data.guest) {
    return <div className="py-12 text-center text-slate-500 text-xs">Guest profile not found.</div>;
  }

  const g = data.guest;
  const stats = data.stats || {};
  const reservations = g.reservations || [];
  const documents = g.documents || [];
  const payments = g.payments || [];

  return (
    <div className="space-y-6">
      {/* Back Button & Guest Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/guests"
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {g.displayName}
              </h1>
              {g.vipStatus && (
                <span className="p-1 bg-amber-100 text-amber-800 text-xs font-bold rounded flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-500" /> VIP
                </span>
              )}
              <Badge variant="neutral">{g.guestRef}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {g.phone} • {g.email || 'No email'} • {g.city || '—'}, {g.country}
            </p>
          </div>
        </div>

        <Link
          href={`/reservations/new?guestId=${g.id}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md"
        >
          <Plus className="w-4 h-4" />
          New Reservation for Guest
        </Link>
      </div>

      {/* Real Calculated Guest Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="pmfs-card p-3.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Stays</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{stats.totalStays}</div>
        </div>
        <div className="pmfs-card p-3.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Nights</span>
          <div className="text-xl font-extrabold text-brand-600 mt-1">{stats.totalNights}</div>
        </div>
        <div className="pmfs-card p-3.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Spend</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">₹{stats.totalSpend}</div>
        </div>
        <div className="pmfs-card p-3.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Avg Stay</span>
          <div className="text-xl font-extrabold text-purple-600 mt-1">{stats.avgStayNights} Nights</div>
        </div>
        <div className="pmfs-card p-3.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Cancellations</span>
          <div className="text-xl font-extrabold text-rose-600 mt-1">{stats.cancellationCount}</div>
        </div>
        <div className="pmfs-card p-3.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">No-Shows</span>
          <div className="text-xl font-extrabold text-amber-600 mt-1">{stats.noShowCount}</div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'overview' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" />
          Overview & Profile
        </button>

        <button
          onClick={() => setActiveTab('reservations')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'reservations' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Stay History ({reservations.length})
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'documents' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          KYC Documents ({documents.length})
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
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="pmfs-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Guest Master Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500">Gender:</span>
              <div className="font-semibold text-slate-900 mt-0.5">{g.gender || 'Not specified'}</div>
            </div>
            <div>
              <span className="text-slate-500">Nationality:</span>
              <div className="font-semibold text-slate-900 mt-0.5">{g.nationality}</div>
            </div>
            <div>
              <span className="text-slate-500">Company:</span>
              <div className="font-semibold text-slate-900 mt-0.5">{g.company || '—'}</div>
            </div>
            <div>
              <span className="text-slate-500">GSTIN:</span>
              <div className="font-semibold text-slate-900 mt-0.5">{g.gstin || '—'}</div>
            </div>
            <div>
              <span className="text-slate-500">Address:</span>
              <div className="font-semibold text-slate-900 mt-0.5">{g.address || '—'}</div>
            </div>
            <div>
              <span className="text-slate-500">Guest Type:</span>
              <div className="font-semibold text-slate-900 mt-0.5">{g.guestType}</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RESERVATIONS */}
      {activeTab === 'reservations' && (
        <div className="pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase">Guest Reservation History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Booking Ref</th>
                  <th className="pmfs-table-th">Room Type</th>
                  <th className="pmfs-table-th">Room</th>
                  <th className="pmfs-table-th">Arrival → Departure</th>
                  <th className="pmfs-table-th">Total Amount</th>
                  <th className="pmfs-table-th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-slate-500">
                      No reservations recorded for this guest.
                    </td>
                  </tr>
                ) : (
                  reservations.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="pmfs-table-td font-mono font-bold text-brand-700">
                        <Link href={`/reservations/${r.id}`} className="hover:underline">
                          {r.reservationRef}
                        </Link>
                      </td>
                      <td className="pmfs-table-td">{r.roomType?.name}</td>
                      <td className="pmfs-table-td">Room {r.assignedRoom?.roomNumber || 'Unassigned'}</td>
                      <td className="pmfs-table-td text-xs text-slate-600">
                        {new Date(r.arrivalDate).toLocaleDateString()} → {new Date(r.departureDate).toLocaleDateString()}
                      </td>
                      <td className="pmfs-table-td font-semibold text-slate-900">₹{r.totalAmount}</td>
                      <td className="pmfs-table-td">
                        <Badge variant={r.status === 'CHECKED_IN' ? 'success' : 'info'}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="pmfs-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase">Verified Government ID Documents</h3>
            <button
              onClick={() => setIsDocOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white font-bold text-xs rounded-lg shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Document
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {documents.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-xs text-slate-500">
                No KYC government documents recorded.
              </div>
            ) : (
              documents.map((doc: any) => (
                <div key={doc.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{doc.documentType}</div>
                    <div className="font-mono text-xs text-slate-600 mt-0.5">Doc #: {doc.documentNumber}</div>
                    <div className="text-[11px] text-slate-400">Issuing: {doc.issuingCountry}</div>
                  </div>
                  <Badge variant="success">
                    <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Verified
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase">Payment Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Payment Ref</th>
                  <th className="pmfs-table-th">Date</th>
                  <th className="pmfs-table-th">Method</th>
                  <th className="pmfs-table-th">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-xs text-slate-500">
                      No payments recorded for this guest.
                    </td>
                  </tr>
                ) : (
                  payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="pmfs-table-td font-mono font-bold text-emerald-700">{p.paymentRef}</td>
                      <td className="pmfs-table-td text-xs text-slate-500">{new Date(p.date).toLocaleString()}</td>
                      <td className="pmfs-table-td font-semibold text-slate-800">{p.method}</td>
                      <td className="pmfs-table-td font-extrabold text-emerald-600">₹{p.amount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Document */}
      <Modal isOpen={isDocOpen} onClose={() => setIsDocOpen(false)} title="Record Guest Government ID Document" maxWidth="md">
        <form onSubmit={handleDocSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Document Type *
            </label>
            <select
              value={docForm.documentType}
              onChange={(e) => setDocForm({ ...docForm, documentType: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              <option value="AADHAAR">Aadhaar Card</option>
              <option value="PASSPORT">Passport</option>
              <option value="DRIVING_LICENCE">Driving Licence</option>
              <option value="VOTER_ID">Voter ID</option>
              <option value="OTHER">Other ID</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Document Number *
            </label>
            <input
              type="text"
              required
              value={docForm.documentNumber}
              onChange={(e) => setDocForm({ ...docForm, documentNumber: e.target.value })}
              placeholder="e.g. 1234-5678-9012"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDocOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingDoc}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {savingDoc ? 'Saving Document...' : 'Save & Verify Document'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
