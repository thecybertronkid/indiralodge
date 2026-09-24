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
  Lock,
  Printer,
  Edit3,
  FileText,
  Building,
  UtensilsCrossed,
  Plus,
  Trash2,
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

  // Edit Guest & Charges Modal State (Pre-billing edit)
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    phone: '',
    email: '',
    company: '',
    gstin: '',
    address: '',
    city: '',
    state: '',
    roomRate: '0',
    discountAmount: '0',
    specialRequests: '',
  });

  // Bill Generation & Print State
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<any>(null);
  const [billingType, setBillingType] = useState<'GST' | 'NON_GST'>('GST');
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [customerGstinInput, setCustomerGstinInput] = useState('');
  const [generatingBill, setGeneratingBill] = useState(false);

  // Room Service / Extra Item Charges State
  const [isRoomServiceOpen, setIsRoomServiceOpen] = useState(false);
  const [postingCharge, setPostingCharge] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    description: 'Packaged Drinking Water Bottle (1L)',
    category: 'FOOD_BEVERAGE',
    quantity: '1',
    unitPrice: '20',
    notes: '',
  });

  const fetchDetails = async () => {
    try {
      const res = await fetch(`/api/reservations/${reservationId}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
        if (result.reservation?.guest) {
          const g = result.reservation.guest;
          const names = (g.displayName || '').split(' ');
          setEditForm({
            firstName: g.firstName || names[0] || '',
            lastName: g.lastName || names.slice(1).join(' ') || '',
            displayName: g.displayName || '',
            phone: g.phone || '',
            email: g.email || '',
            company: g.company || '',
            gstin: g.gstin || '',
            address: g.address || '',
            city: g.city || '',
            state: g.state || '',
            roomRate: String(result.reservation.roomRate || 0),
            discountAmount: String(result.reservation.discountAmount || 0),
            specialRequests: result.reservation.specialRequests || '',
          });
          setCompanyNameInput(g.company || '');
          setCustomerGstinInput(g.gstin || '');
        }
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

  const handleDeleteRoomCharge = async (transactionId: string, description: string) => {
    if (!confirm(`Are you sure you want to delete "${description}"?\n\nThis will remove the charge from the guest folio ledger and recalculate balances.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/front-desk/room-charges?transactionId=${transactionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Room order / charge deleted successfully!', 'success');
        fetchDetails();
      } else {
        showToast(data.error || 'Failed to delete room charge', 'error');
      }
    } catch {
      showToast('Network error deleting room charge', 'error');
    }
  };

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
        const err = await res.json();
        showToast(err.error || 'Failed to cancel reservation', 'error');
      }
    } catch (e) {
      showToast('Error cancelling reservation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateGuestAndBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 1. Update Guest Info
      const resGuest = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_guest',
          ...editForm,
        }),
      });

      if (!resGuest.ok) {
        const err = await resGuest.json();
        showToast(err.error || 'Failed to update guest info', 'error');
        setSubmitting(false);
        return;
      }

      // 2. Update Booking Info (Rate, Discount, Special Requests)
      const resBooking = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_booking',
          roomRate: editForm.roomRate,
          discountAmount: editForm.discountAmount,
          specialRequests: editForm.specialRequests,
        }),
      });

      if (!resBooking.ok) {
        const err = await resBooking.json();
        showToast(err.error || 'Failed to update booking info', 'error');
        setSubmitting(false);
        return;
      }

      showToast('Guest and reservation details updated successfully!', 'success');
      setIsEditOpen(false);
      fetchDetails();
    } catch (e) {
      showToast('Error saving updates', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateBill = async (type: 'GST' | 'NON_GST') => {
    setGeneratingBill(true);
    setBillingType(type);

    try {
      const res = await fetch('/api/finance/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId,
          invoiceType: type,
          customerGstin: customerGstinInput,
          companyName: companyNameInput,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        showToast(resData.error || 'Failed to generate bill', 'error');
        setGeneratingBill(false);
        return;
      }

      setActiveInvoice(resData.invoice);
      setIsBillModalOpen(true);
      if (resData.alreadyBilled) {
        showToast(`Loaded existing ${type} bill for re-printing`, 'info');
      } else {
        showToast(`${type} Bill generated successfully! Reservation is now locked.`, 'success');
        fetchDetails();
      }
    } catch (e) {
      showToast('Error processing bill generation', 'error');
    } finally {
      setGeneratingBill(false);
    }
  };

  const handlePostRoomCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservationId) return;
    setPostingCharge(true);
    try {
      const qty = parseInt(serviceForm.quantity || '1', 10);
      const price = parseFloat(serviceForm.unitPrice || '0');
      const res = await fetch('/api/front-desk/room-charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId,
          description: serviceForm.description,
          category: serviceForm.category,
          quantity: qty,
          unitPrice: price,
          notes: serviceForm.notes,
        }),
      });
      const resData = await res.json();
      if (!res.ok) {
        showToast(resData.error || 'Failed to post room charge', 'error');
        setPostingCharge(false);
        return;
      }
      showToast(resData.message || 'Room charge posted successfully!', 'success');
      setIsRoomServiceOpen(false);
      setServiceForm({
        description: 'Packaged Drinking Water Bottle (1L)',
        category: 'FOOD_BEVERAGE',
        quantity: '1',
        unitPrice: '20',
        notes: '',
      });
      fetchDetails();
    } catch {
      showToast('Error posting room charge', 'error');
    } finally {
      setPostingCharge(false);
    }
  };

  const handlePrintWindow = () => {
    window.print();
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
  const isBilled = res.isBilled;

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
              {isBilled && (
                <Badge variant="success" className="flex items-center gap-1 bg-emerald-600 text-white">
                  <Lock className="w-3 h-3" />
                  Billed ({res.billType})
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Guest: <strong>{res.guest?.displayName}</strong> ({res.guest?.phone}) • Source: {res.bookingSource?.name}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {!isBilled && (
            <button
              onClick={() => setIsEditOpen(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Details
            </button>
          )}

          {!isBilled && res.status === 'CONFIRMED' && (
            <button
              onClick={() => setIsCancelOpen(true)}
              className="px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all"
            >
              Cancel Booking
            </button>
          )}

          {/* Bill Generation Actions */}
          {!isBilled ? (
            <>
              <button
                onClick={() => handleGenerateBill('GST')}
                disabled={generatingBill}
                className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                Generate GST Bill
              </button>

              <button
                onClick={() => handleGenerateBill('NON_GST')}
                disabled={generatingBill}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5" />
                Generate Non-GST Bill
              </button>
            </>
          ) : (
            <button
              onClick={() => handleGenerateBill(res.billType === 'NON_GST' ? 'NON_GST' : 'GST')}
              disabled={generatingBill}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print Billed Invoice ({res.billType})
            </button>
          )}

          <Link
            href="/front-office"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all"
          >
            Front Desk Hub
          </Link>
        </div>
      </div>

      {/* Strict Billing Lock Banner */}
      {isBilled && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3 shadow-xs">
          <Lock className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-extrabold text-emerald-950 text-sm">
              BOOKING BILLED & LOCKED ({res.billType === 'GST' ? 'GST Tax Invoice' : 'Non-GST Bill'})
            </h4>
            <p className="text-emerald-800">
              This reservation was officially billed on {res.billedAt ? new Date(res.billedAt).toLocaleString() : 'N/A'}. All guest information, room charges, and rates are strictly locked to prevent unauthorized alterations.
            </p>
          </div>
        </div>
      )}

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
          {/* Stay & Guest Info */}
          <div className="pmfs-card p-6 space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Guest & Stay Details
              </h3>
              {!isBilled && (
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="text-xs text-brand-600 hover:underline font-bold flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Guest/Charges
                </button>
              )}
            </div>

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
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Guest Information</span>
                <div className="font-bold text-slate-900 text-sm">{res.guest?.displayName}</div>
                {res.guest?.company && (
                  <div className="font-bold text-indigo-700 text-xs">🏢 {res.guest.company}</div>
                )}
                <div className="text-slate-600">Phone: {res.guest?.phone}</div>
                <div className="text-slate-600">Email: {res.guest?.email || 'N/A'}</div>
                <div className="text-slate-600 font-mono">GSTIN: {res.guest?.gstin || 'Unregistered / General Guest'}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Room & Rate Category</span>
                  {!isBilled && (
                    <button
                      onClick={() => setIsEditOpen(true)}
                      className="text-[10px] text-brand-600 hover:text-brand-700 font-bold underline flex items-center gap-0.5"
                    >
                      <Edit3 className="w-3 h-3" />
                      Change Tariff
                    </button>
                  )}
                </div>
                <div className="font-bold text-slate-900 text-sm">{res.roomType?.name}</div>
                <div className="text-slate-600">Assigned Room: {res.assignedRoom?.roomNumber ? `Room ${res.assignedRoom.roomNumber}` : 'Unassigned'}</div>
                <div className="text-slate-700 font-semibold">Room Tariff: <span className="font-bold text-brand-700">₹{res.roomRate}</span>/night</div>
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
              Financial & Billing Summary
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Room Rate x {res.nights} Nights:</span>
                <span className="font-semibold text-slate-900">₹{(res.roomRate * res.nights).toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-600">Discount Applied:</span>
                <span className="font-semibold text-rose-600">- ₹{res.discountAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-600">GST Tax (5%):</span>
                <span className="font-semibold text-slate-900">
                  {res.taxAmount > 0 ? `₹${res.taxAmount.toFixed(2)} (Included in Tariff)` : 'Included in Tariff'}
                </span>
              </div>

              <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-sm">
                <span>Total Payable:</span>
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

            {/* Quick Bill Trigger Buttons */}
            {!isBilled && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    GST Billing Details (Optional)
                  </span>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-0.5">Company Name</label>
                      <input
                        type="text"
                        value={companyNameInput}
                        onChange={(e) => setCompanyNameInput(e.target.value)}
                        placeholder="e.g. Acme Corp / Tata Sons"
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-0.5">Guest GSTIN</label>
                      <input
                        type="text"
                        value={customerGstinInput}
                        onChange={(e) => setCustomerGstinInput(e.target.value.toUpperCase())}
                        placeholder="e.g. 18AOIPB2857A1ZB"
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleGenerateBill('GST')}
                  className="w-full py-2.5 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Generate & Print GST Bill
                </button>

                <button
                  onClick={() => handleGenerateBill('NON_GST')}
                  className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generate & Print Non-GST Bill
                </button>
              </div>
            )}
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

            {!isBilled && res.status === 'CHECKED_IN' && (
              <button
                onClick={() => setIsRoomServiceOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>+ Add Room Order / Food Item</span>
              </button>
            )}
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
                  <th className="pmfs-table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-xs text-slate-500">
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
                      <td className="pmfs-table-td text-right">
                        {t.category !== 'ROOM_CHARGE' && t.category !== 'PAYMENT' && !isBilled ? (
                          <button
                            onClick={() => handleDeleteRoomCharge(t.id, t.description)}
                            title="Delete item / charge added by mistake"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors inline-flex items-center gap-1 text-[11px] font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
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

      {/* Pre-Billing Edit Guest & Charges Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Guest & Booking Information (Pre-Billing)" maxWidth="lg">
        <form onSubmit={handleUpdateGuestAndBooking} className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-xs">
            Notice: All information can be edited now. Once a GST or Non-GST Bill is generated, this booking will be permanently locked.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">First Name *</label>
              <input
                type="text"
                required
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email Address</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Company / Organization</label>
              <input
                type="text"
                value={editForm.company}
                onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                placeholder="e.g. Acme Corp / Tata Sons"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Guest GSTIN (If corporate / tax billing)</label>
              <input
                type="text"
                value={editForm.gstin}
                onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value })}
                placeholder="e.g. 18AABCU9603R1ZM"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Room Tariff / Rate per Night (₹) *</label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={editForm.roomRate}
                onChange={(e) => setEditForm({ ...editForm, roomRate: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Discount Amount (₹)</label>
              <input
                type="number"
                value={editForm.discountAmount}
                onChange={(e) => setEditForm({ ...editForm, discountAmount: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Special Requests / Notes</label>
              <input
                type="text"
                value={editForm.specialRequests}
                onChange={(e) => setEditForm({ ...editForm, specialRequests: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Saving Changes...' : 'Save Updates'}
            </button>
          </div>
        </form>
      </Modal>

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

      {/* Printable Invoice / Bill Preview Modal */}
      <Modal isOpen={isBillModalOpen} onClose={() => setIsBillModalOpen(false)} title={`Invoice Preview: ${activeInvoice?.invoiceRef || ''}`} maxWidth="xl">
        <div className="space-y-6">
          <div className="flex justify-end gap-2 print:hidden">
            <button
              onClick={handlePrintWindow}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
          </div>

          {/* Printable Invoice Container */}
          {activeInvoice && (
            <div id="printable-bill" className="p-8 bg-white border border-slate-300 rounded-xl space-y-6 text-slate-900 font-sans text-xs">
              {/* Invoice Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase">INDIRA LODGE</h2>
                  <p className="text-xs text-slate-500">Solicitor Lodge, Near ASTC, Malow Ali, Jorhat, Assam - 781005</p>
                  <p className="text-[11px] text-slate-500">Contact: +91 70028 90165 • indiralodge@gmail.com</p>
                  <p className="text-[11px] font-mono text-slate-700 font-bold mt-1">Property GSTIN: 18AOIPB2857A1ZB</p>
                </div>
                <div className="text-right space-y-1">
                  <div className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-xs uppercase rounded">
                    {activeInvoice.invoiceType === 'GST' ? 'TAX INVOICE (GST)' : 'HOTEL RECEIPT (NON-GST)'}
                  </div>
                  <div className="font-mono font-bold text-sm text-slate-900 mt-1">{activeInvoice.invoiceRef}</div>
                  <div className="text-[11px] text-slate-500">
                    Date: {new Date(activeInvoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Guest & Stay Info Table */}
              <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[10px] text-slate-500">Billed To (Guest / Company)</h4>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{activeInvoice.guest?.displayName}</div>
                  {(activeInvoice.guest?.company || companyNameInput) && (
                    <div className="font-bold text-indigo-700 text-xs mt-0.5">🏢 {activeInvoice.guest?.company || companyNameInput}</div>
                  )}
                  <div>Phone: {activeInvoice.guest?.phone}</div>
                  <div>Email: {activeInvoice.guest?.email || 'N/A'}</div>
                  {activeInvoice.customerGstin && (
                    <div className="font-mono font-bold text-slate-900 mt-0.5">Guest GSTIN: {activeInvoice.customerGstin}</div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[10px] text-slate-500">Stay Particulars</h4>
                  <div>Booking Ref: <strong>{res.reservationRef}</strong></div>
                  <div>Room Category: <strong>{res.roomType?.name}</strong></div>
                  <div>Assigned Room: <strong>Room {res.assignedRoom?.roomNumber || 'N/A'}</strong></div>
                  <div>Stay Period: {new Date(res.arrivalDate).toLocaleDateString()} to {new Date(res.departureDate).toLocaleDateString()} ({res.nights} Nights)</div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                    <th className="p-2 border border-slate-200">Description</th>
                    <th className="p-2 border border-slate-200 text-center">HSN/SAC</th>
                    <th className="p-2 border border-slate-200 text-center">Qty</th>
                    <th className="p-2 border border-slate-200 text-right">Rate</th>
                    <th className="p-2 border border-slate-200 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInvoice.lines?.map((line: any) => (
                    <tr key={line.id}>
                      <td className="p-2 border border-slate-200 font-medium">{line.description}</td>
                      <td className="p-2 border border-slate-200 text-center font-mono">{line.hsnSacCode}</td>
                      <td className="p-2 border border-slate-200 text-center">{line.quantity}</td>
                      <td className="p-2 border border-slate-200 text-right">₹{line.unitPrice.toFixed(2)}</td>
                      <td className="p-2 border border-slate-200 text-right font-semibold">₹{(line.quantity * line.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>{activeInvoice.isGstBill ? 'Room Charges (Incl. Tax):' : 'Room Charges:'}</span>
                    <span>₹{activeInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  {activeInvoice.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>- ₹{activeInvoice.discount.toFixed(2)}</span>
                    </div>
                  )}

                  {activeInvoice.isGstBill ? (
                    <>
                      <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200">
                        <span>Taxable Value (Base):</span>
                        <span>₹{(activeInvoice.totalAmount - activeInvoice.cgstAmount - activeInvoice.sgstAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST (2.5%):</span>
                        <span>₹{activeInvoice.cgstAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST (2.5%):</span>
                        <span>₹{activeInvoice.sgstAmount.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic text-right py-1 border-t border-slate-200">
                      (Non-GST Bill / Tax Exempt Hotel Receipt)
                    </div>
                  )}

                  <div className="flex justify-between border-t border-slate-900 pt-2 font-extrabold text-sm text-slate-900">
                    <span>Grand Total:</span>
                    <span>₹{activeInvoice.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures & Footer */}
              <div className="pt-8 border-t border-slate-200 flex items-end justify-between text-[11px] text-slate-500">
                <div>
                  <p>Thank you for staying at Indira Lodge!</p>
                  <p className="text-[10px] italic">Computer generated invoice. System lock active.</p>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-slate-400 mb-1"></div>
                  <p className="font-semibold text-slate-700">Authorized Signatory</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Room Service & Extra Orders */}
      <Modal
        isOpen={isRoomServiceOpen}
        onClose={() => setIsRoomServiceOpen(false)}
        title={`Add Room Order / Charge — Room ${res.assignedRoom?.roomNumber || 'Stay'}`}
        maxWidth="lg"
      >
        <form onSubmit={handlePostRoomCharge} className="space-y-4">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block">
                Guest: {res.guest?.displayName || 'In-House Guest'}
              </span>
              <span className="text-[11px] text-blue-700">
                Booking Ref: {res.reservationRef} • Room {res.assignedRoom?.roomNumber || 'N/A'}
              </span>
            </div>
            <Badge variant="info">{res.status}</Badge>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Quick Item Presets (Click to Select)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { name: 'Water Bottle (1L)', cat: 'FOOD_BEVERAGE', price: '20', icon: '💧' },
                { name: 'Breakfast / Morning Meal', cat: 'FOOD_BEVERAGE', price: '100', icon: '🍳' },
                { name: 'Tea / Coffee', cat: 'FOOD_BEVERAGE', price: '20', icon: '☕' },
                { name: 'Meal / Dinner Thali', cat: 'FOOD_BEVERAGE', price: '150', icon: '🍲' },
                { name: 'Extra Mattress / Bed', cat: 'EXTRA_BED', price: '500', icon: '🛏️' },
                { name: 'Laundry Service', cat: 'LAUNDRY', price: '100', icon: '🧺' },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() =>
                    setServiceForm((prev) => ({
                      ...prev,
                      description: preset.name,
                      category: preset.cat,
                      unitPrice: preset.price,
                    }))
                  }
                  className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 text-xs ${
                    serviceForm.description === preset.name
                      ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="text-base">{preset.icon}</span>
                  <div className="truncate">
                    <div className="truncate font-semibold">{preset.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">₹{preset.price}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Description & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Item Description *
              </label>
              <input
                type="text"
                required
                value={serviceForm.description}
                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                placeholder="e.g. Packaged Drinking Water Bottle (1L)"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Category *
              </label>
              <select
                value={serviceForm.category}
                onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="FOOD_BEVERAGE">Food & Beverage</option>
                <option value="ROOM_SERVICE">Room Service</option>
                <option value="LAUNDRY">Laundry Service</option>
                <option value="EXTRA_BED">Extra Mattress / Bed</option>
                <option value="OTHER">Other / Miscellaneous</option>
              </select>
            </div>
          </div>

          {/* Quantity, Unit Price & Total Calculation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-900 text-white rounded-xl">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Quantity
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setServiceForm((prev) => ({
                      ...prev,
                      quantity: String(Math.max(1, (parseInt(prev.quantity || '1', 10) || 1) - 1)),
                    }))
                  }
                  className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 flex items-center justify-center text-sm"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  required
                  value={serviceForm.quantity}
                  onChange={(e) => setServiceForm({ ...serviceForm, quantity: e.target.value })}
                  className="w-16 text-center py-1 bg-slate-800 border border-slate-700 rounded font-mono font-bold text-white text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    setServiceForm((prev) => ({
                      ...prev,
                      quantity: String((parseInt(prev.quantity || '1', 10) || 1) + 1),
                    }))
                  }
                  className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 flex items-center justify-center text-sm"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Unit Price (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={serviceForm.unitPrice}
                onChange={(e) => setServiceForm({ ...serviceForm, unitPrice: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded font-mono font-bold text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>

            <div className="flex flex-col justify-between text-right border-l border-slate-800 pl-3">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Charge</span>
              <span className="text-xl font-black text-emerald-400 font-mono tracking-tight">
                ₹{((parseInt(serviceForm.quantity || '1', 10) || 1) * (parseFloat(serviceForm.unitPrice || '0') || 0)).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Remarks / Room Note (Optional)
            </label>
            <input
              type="text"
              value={serviceForm.notes}
              onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
              placeholder="e.g. Delivered at 8:30 AM by Staff"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRoomServiceOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={postingCharge}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              {postingCharge ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Posting Charge...</span>
                </>
              ) : (
                <>
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>
                    Post ₹{((parseInt(serviceForm.quantity || '1', 10) || 1) * (parseFloat(serviceForm.unitPrice || '0') || 0)).toFixed(2)} Charge
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
