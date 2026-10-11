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
  MapPin,
  Briefcase,
  IdCard,
  Compass,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  formatStayDateTime,
  openPrintBillWindow,
  segregateBillLines,
  buildTemporaryInvoice,
  getStayDayInfo,
  parseExtraOrderLine,
  getStayDates,
} from '@/lib/billPrinter';

const toDateInputStr = (d: any) => {
  if (!d) return '';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateNights = (arrival: string, departure: string) => {
  if (!arrival || !departure) return 1;
  const a = new Date(arrival + 'T00:00:00');
  const d = new Date(departure + 'T00:00:00');
  const diff = d.getTime() - a.getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 1;
};

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
    arrivalDate: '',
    departureDate: '',
    nights: 1,
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
    orderDate: new Date().toISOString().split('T')[0],
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
          const stayDates = getStayDates(result.reservation);
          const arrStr = toDateInputStr(stayDates.checkInDate);
          const depStr = toDateInputStr(stayDates.checkOutDate);
          const nNights = result.reservation.nights || calculateNights(arrStr, depStr);
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
            arrivalDate: arrStr,
            departureDate: depStr,
            nights: nNights,
            roomRate: String(result.reservation.roomRate || 0),
            discountAmount: '0',
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

  const handleEditArrivalChange = (val: string) => {
    const newNights = calculateNights(val, editForm.departureDate);
    setEditForm((prev) => ({
      ...prev,
      arrivalDate: val,
      nights: newNights,
    }));
  };

  const handleEditDepartureChange = (val: string) => {
    const newNights = calculateNights(editForm.arrivalDate, val);
    setEditForm((prev) => ({
      ...prev,
      departureDate: val,
      nights: newNights,
    }));
  };

  const handleEditRoomRateChange = (rateVal: string) => {
    setEditForm((prev) => ({
      ...prev,
      roomRate: rateVal,
    }));
  };

  const handleEditTotalStayPriceChange = (totalVal: string) => {
    const tot = parseFloat(totalVal) || 0;
    const n = editForm.nights > 0 ? editForm.nights : 1;
    const computedRate = Math.round((tot / n) * 100) / 100;
    setEditForm((prev) => ({
      ...prev,
      roomRate: String(computedRate),
    }));
  };

  const handleUpdateGuestAndBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editForm.arrivalDate && editForm.departureDate) {
      if (new Date(editForm.departureDate) <= new Date(editForm.arrivalDate)) {
        showToast('Check-out date must be after check-in date', 'error');
        return;
      }
    }

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

      // 2. Update Booking Info (Dates, Nights, Rate, Special Requests)
      const resBooking = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_booking',
          arrivalDate: editForm.arrivalDate,
          departureDate: editForm.departureDate,
          nights: editForm.nights,
          roomRate: editForm.roomRate,
          discountAmount: 0,
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

  const handleViewTemporaryBill = (type: 'GST' | 'NON_GST' = 'GST') => {
    if (!res) return;
    const tempInv = buildTemporaryInvoice(res, type, customerGstinInput, companyNameInput);
    setActiveInvoice(tempInv);
    setBillingType(type);
    setIsBillModalOpen(true);
  };

  const handleGenerateBill = async (type: 'GST' | 'NON_GST') => {
    if (!isBilled) {
      const guestName = res?.guest?.displayName || 'this guest';
      const billTitle = type === 'GST' ? 'GST Tax Invoice' : 'Non-GST Bill';
      const confirmed = window.confirm(
        `Are you sure you want to generate a ${billTitle} for ${guestName}?\n\n⚠️ IMPORTANT: Generating the bill will officially finalize and lock this reservation and all billing details against further modifications.\n\nClick OK to proceed or Cancel to return.`
      );
      if (!confirmed) return;
    }

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
          orderDate: serviceForm.orderDate,
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
        orderDate: new Date().toISOString().split('T')[0],
      });
      fetchDetails();
    } catch {
      showToast('Error posting room charge', 'error');
    } finally {
      setPostingCharge(false);
    }
  };

  const handlePrintWindow = () => {
    if (!activeInvoice) return;
    openPrintBillWindow({
      invoice: activeInvoice,
      reservation: res,
      guest: activeInvoice.guest || res.guest,
    });
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
  const extraOrdersTotal = transactions
    .filter((t: any) => t.type === 'DEBIT' && t.category !== 'ROOM_CHARGE')
    .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
  const roomTariffTotal = res.roomRate * res.nights;

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
            <>
              <button
                onClick={() => setIsEditOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Details
              </button>

              <button
                type="button"
                onClick={() => handleViewTemporaryBill('GST')}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                title="View temporary draft bill for customer verification before locking"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                View Temporary Bill
              </button>
            </>
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

            {/* 1. Stay Schedule Key Metrics */}
            {(() => {
              const stay = getStayDates(res);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Arrival / Check-In</span>
                    <div className="font-extrabold text-slate-900 mt-1">
                      {stay.checkInDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-brand-600" />
                      {res.actualCheckInAt
                        ? `Checked in: ${stay.checkInDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}`
                        : `Time: ${res.arrivalTime || '14:00'}`}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Departure / Check-Out</span>
                    <div className="font-extrabold text-slate-900 mt-1">
                      {stay.checkOutDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      {res.actualCheckOutAt
                        ? `Checked out: ${stay.checkOutDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}`
                        : `Time: ${res.departureTime || '11:00'}`}
                    </div>
                  </div>

              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stay Duration</span>
                <div className="font-extrabold text-brand-700 mt-1">
                  {res.nights} Night{res.nights > 1 ? 's' : ''}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  ₹{res.roomRate}/night
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Occupancy</span>
                <div className="font-extrabold text-slate-900 mt-1">
                  {res.adults} Adult{res.adults > 1 ? 's' : ''}, {res.children} Child{res.children !== 1 ? 'ren' : ''}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {res.roomType?.bedType || 'Bed'} Category
                </div>
              </div>
            </div>
          );
        })()}

            {/* 2. Stay Logistics Bar (Coming From, Purpose of Visit, Booking Source, Created By) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-100/70 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">Booking Source</span>
                <div className="font-bold text-slate-800 text-xs mt-0.5 truncate">
                  {res.bookingSource?.name || 'Walk-in Guest'}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">Coming From (Origin)</span>
                <div className="font-bold text-slate-800 text-xs mt-0.5 flex items-center gap-1 truncate">
                  <Compass className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span>{res.comingFrom || 'Not Specified'}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">Purpose of Visit</span>
                <div className="font-bold text-slate-800 text-xs mt-0.5 flex items-center gap-1 truncate">
                  <Briefcase className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span>{res.purposeOfVisit || 'Tourism / Leisure'}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">Booked By / On</span>
                <div className="font-medium text-slate-700 text-xs mt-0.5 truncate">
                  {new Date(res.createdAt).toLocaleDateString('en-IN')} {res.createdBy?.fullName ? `• ${res.createdBy.fullName}` : ''}
                </div>
              </div>
            </div>

            {/* 3. Detailed Guest Info & Room Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
              {/* Guest Information Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-brand-600" />
                    Guest Profile & KYC Details
                  </span>
                  {res.guest?.vipStatus && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                      VIP Guest
                    </span>
                  )}
                </div>

                <div>
                  <div className="font-extrabold text-slate-900 text-sm">{res.guest?.displayName}</div>
                  <div className="text-slate-500 text-[11px] font-mono">{res.guest?.guestRef || ''}</div>
                </div>

                <div className="space-y-1 text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium min-w-[70px]">Phone:</span>
                    <span className="font-semibold text-slate-900">{res.guest?.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium min-w-[70px]">Email:</span>
                    <span>{res.guest?.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-slate-400 font-medium min-w-[70px]">Address:</span>
                    <span className="text-slate-700">
                      {[res.guest?.address, res.guest?.city, res.guest?.state].filter(Boolean).join(', ') || 'Not Recorded'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-slate-400 font-medium min-w-[70px]">Profile:</span>
                    <span>
                      {res.guest?.gender || 'N/A'} • {res.guest?.age ? `${res.guest.age} yrs` : 'Age N/A'} • {res.guest?.occupation || 'Business'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium min-w-[70px]">ID Proof:</span>
                    <span className="font-medium text-slate-800">
                      {res.guest?.idType || 'Aadhaar Card'}{res.guest?.idNumber ? `: ${res.guest.idNumber}` : ''}
                    </span>
                  </div>
                  {(res.guest?.company || res.guest?.gstin) && (
                    <div className="pt-1.5 border-t border-slate-200 mt-1">
                      {res.guest?.company && (
                        <div className="font-bold text-indigo-700 text-xs">🏢 {res.guest.company}</div>
                      )}
                      <div className="text-slate-600 font-mono text-[11px]">
                        GSTIN: <span className="font-semibold text-slate-800">{res.guest?.gstin || 'Unregistered / B2C'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Room & Rate Category Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5 text-brand-600" />
                      Room & Tariff Allocation
                    </span>
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

                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">{res.roomType?.name}</div>
                    <div className="text-slate-500 text-[11px]">{res.roomType?.code}</div>
                  </div>

                  <div className="space-y-1 text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium min-w-[90px]">Assigned Room:</span>
                      {res.assignedRoom?.roomNumber ? (
                        <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          Room {res.assignedRoom.roomNumber} (Floor {res.assignedRoom.floor || '1'})
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded">Unassigned</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium min-w-[90px]">Bed Type:</span>
                      <span className="font-medium text-slate-800">{res.roomType?.bedType || 'Single / Double'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium min-w-[90px]">Max Occupancy:</span>
                      <span>{res.roomType?.maxOccupancy || (res.roomType?.adultsCapacity || 2)} Guests</span>
                    </div>
                    {res.assignedRoom && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-medium min-w-[90px]">Room Status:</span>
                        <span className="text-[11px]">
                          Housekeeping: <span className="font-bold text-emerald-700">{res.assignedRoom.housekeepingStatus}</span> • Status: <span className="font-bold text-blue-700">{res.assignedRoom.availabilityStatus}</span>
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium min-w-[90px]">Rate Plan:</span>
                      <span>{res.ratePlan || 'Standard Tariff'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div className="text-slate-500 text-[11px]">
                    Tariff: <span className="font-bold text-slate-800">₹{res.roomRate}</span>/night
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Stay Charge ({res.nights}n): </span>
                    <span className="font-mono font-black text-brand-700 text-sm">
                      ₹{(res.roomRate * res.nights).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Special Requests & Notes */}
            {res.specialRequests && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <span className="font-bold flex-shrink-0">Special Requests:</span>
                <span>{res.specialRequests}</span>
              </div>
            )}
            {(res.internalNotes || res.guestNotes) && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                <span className="font-bold flex-shrink-0">Front Desk Notes:</span>
                <span>{res.internalNotes || res.guestNotes}</span>
              </div>
            )}
          </div>

          {/* Financial Summary */}
          <div className="pmfs-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Financial & Billing Summary
              </h3>
              {isBilled && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {res.billType === 'GST' ? 'GST Billed' : 'Non-GST Billed'}
                </span>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Room Tariff ({res.nights} Night{res.nights > 1 ? 's' : ''}):</span>
                <span className="font-semibold text-slate-900">₹{roomTariffTotal.toFixed(2)}</span>
              </div>

              {extraOrdersTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Extra Orders & Services:</span>
                  <span className="font-semibold text-slate-900">₹{extraOrdersTotal.toFixed(2)}</span>
                </div>
              )}

              <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-0.5">
                <div className="flex justify-between">
                  <span>GST Breakdown (5% Incl.):</span>
                  <span className="font-semibold text-slate-700">
                    Base ₹{(Math.round((roomTariffTotal / 1.05) * 100) / 100).toFixed(2)} + GST ₹{(Math.round((roomTariffTotal - Math.round((roomTariffTotal / 1.05) * 100) / 100) * 100) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {isBilled
                    ? (res.billType === 'GST' ? '• Finalized as GST Tax Invoice' : '• Finalized as Non-GST Bill (Zero Tax)')
                    : '• Room tariff includes 5% GST; same payable on Non-GST'}
                </div>
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
                  type="button"
                  onClick={() => handleViewTemporaryBill('GST')}
                  className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-2 transition-all hover:border-indigo-300"
                >
                  <Eye className="w-4 h-4 text-indigo-600" />
                  View Temporary Bill (Customer Review)
                </button>

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
                        {(() => {
                          const dateObj = new Date(t.date || t.createdAt);
                          const dayInfo = getStayDayInfo(dateObj, res.arrivalDate);
                          return (
                            <div>
                              <span className="font-bold text-slate-800 block text-xs">{dayInfo.dayLabel} • {dayInfo.dateFormatted}</span>
                              <span className="text-[10px] text-slate-400">{dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            </div>
                          );
                        })()}
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

          {/* Section 1: Guest Personal & Contact Details */}
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
          </div>

          {/* Section 2: Stay Schedule Dates & Duration */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Stay Schedule & Duration
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Check-In Date *
                </label>
                <input
                  type="date"
                  required
                  value={editForm.arrivalDate}
                  onChange={(e) => handleEditArrivalChange(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Check-Out Date *
                </label>
                <input
                  type="date"
                  required
                  value={editForm.departureDate}
                  min={editForm.arrivalDate}
                  onChange={(e) => handleEditDepartureChange(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Stay Duration
                </label>
                <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>{editForm.nights} Night{editForm.nights > 1 ? 's' : ''}</span>
                  <span className="text-[10px] text-slate-500 font-normal">Calculated</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Room Tariff & Pricing Recalculation */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Room Tariff & Price Calculation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Room Tariff / Rate per Night (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={editForm.roomRate}
                  onChange={(e) => handleEditRoomRateChange(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Total Room Stay Price (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={Math.round((parseFloat(editForm.roomRate || '0') || 0) * (editForm.nights || 1) * 100) / 100}
                  onChange={(e) => handleEditTotalStayPriceChange(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Live Pricing Breakdown Card */}
            <div className="mt-2.5 p-3 rounded-xl bg-brand-50/60 border border-brand-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
              <div className="text-slate-700">
                <span className="font-semibold text-brand-900">Calculated Tariff Breakdown: </span>
                <span className="font-mono">
                  {editForm.nights} night{editForm.nights > 1 ? 's' : ''} × ₹{parseFloat(editForm.roomRate || '0') || 0}/night
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 font-medium">Total Stay Charge: </span>
                <span className="text-base font-black text-brand-700 font-mono">
                  ₹{((parseFloat(editForm.roomRate || '0') || 0) * (editForm.nights || 1)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Special Requests / Notes */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Special Requests / Notes</label>
            <input
              type="text"
              value={editForm.specialRequests}
              onChange={(e) => setEditForm({ ...editForm, specialRequests: e.target.value })}
              placeholder="e.g. Ground floor preference, extra pillows"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900"
            />
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
      <Modal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        title={activeInvoice?.isDraft ? 'Temporary Bill Preview (Pre-Billing Review)' : `Invoice Preview: ${activeInvoice?.invoiceRef || ''}`}
        maxWidth="xl"
      >
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            {activeInvoice?.isDraft ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Preview Format:</span>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => handleViewTemporaryBill('GST')}
                    className={`px-3 py-1 rounded-md font-bold transition-all ${
                      activeInvoice.invoiceType === 'GST'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    GST Proforma
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewTemporaryBill('NON_GST')}
                    className={`px-3 py-1 rounded-md font-bold transition-all ${
                      activeInvoice.invoiceType === 'NON_GST'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Non-GST Estimate
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Finalized Tax Invoice</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {activeInvoice?.isDraft && (
                <button
                  type="button"
                  onClick={() => {
                    setIsBillModalOpen(false);
                    setIsEditOpen(true);
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Booking Info
                </button>
              )}
              <button
                onClick={handlePrintWindow}
                className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                {activeInvoice?.isDraft ? 'Print Draft Preview' : 'Print / Save PDF'}
              </button>
            </div>
          </div>

          {/* Draft Notice Banner */}
          {activeInvoice?.isDraft && (
            <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 print:hidden">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <span className="font-bold block">Temporary Proforma Bill (Customer Review Mode)</span>
                <span className="text-[11px] text-amber-800">
                  This draft bill is generated for customer review before final billing lock. Room rate, stay dates, guest details, and GSTIN can still be freely modified.
                </span>
              </div>
            </div>
          )}

          {/* Printable Invoice Container */}
          {activeInvoice && (
            <div id="printable-bill" className="p-6 bg-white border border-slate-200 rounded-2xl space-y-5 text-slate-900 font-sans text-xs shadow-sm">
              {/* Invoice Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white p-1 flex-shrink-0 shadow-xs">
                    <img src="/logo.png" alt="Indira Lodge" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">INDIRA LODGE</h2>
                    <p className="text-[11px] text-slate-500 font-medium">Solicitor Lodge, Near ASTC, Malow Ali, Jorhat, Assam - 781005</p>
                    <p className="text-[11px] text-slate-500 font-medium">Contact: +91 70028 90165 • indiralodge@gmail.com</p>
                    <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                      GSTIN: <span className="font-mono">18AOIPB2857A1ZB</span> • State Code: 18
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div
                    className={`inline-block px-3 py-1 rounded text-xs font-extrabold uppercase tracking-wider ${
                      activeInvoice.isDraft
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : activeInvoice.isGstBill || activeInvoice.invoiceType === 'GST'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-900 text-white'
                    }`}
                  >
                    {activeInvoice.isDraft
                      ? activeInvoice.invoiceType === 'GST'
                        ? 'PROFORMA TAX INVOICE (DRAFT)'
                        : 'HOTEL ESTIMATE (DRAFT)'
                      : activeInvoice.isGstBill || activeInvoice.invoiceType === 'GST'
                      ? 'TAX INVOICE (GST)'
                      : 'HOTEL RECEIPT (NON-GST)'}
                  </div>
                  <div className="font-mono font-bold text-sm text-slate-900 mt-1">{activeInvoice.invoiceRef}</div>
                  <div className="text-[11px] text-slate-500">
                    Date: {new Date(activeInvoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Guest & Stay Info Table */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
                <div>
                  <h4 className="font-bold text-slate-500 uppercase text-[10px]">Guest / Billed To</h4>
                  <div className="font-extrabold text-slate-900 text-xs mt-0.5">{activeInvoice.guest?.displayName}</div>
                  {(activeInvoice.guest?.company || companyNameInput) && (
                    <div className="font-bold text-indigo-700 text-[11px] mt-0.5">🏢 {activeInvoice.guest?.company || companyNameInput}</div>
                  )}
                  <div className="text-slate-500 text-[10px] mt-0.5">Phone: {activeInvoice.guest?.phone || '—'}</div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-500 uppercase text-[10px]">Customer GSTIN</h4>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">
                    {activeInvoice.customerGstin || (activeInvoice.isGstBill ? 'Unregistered / B2C' : 'N/A')}
                  </div>
                  <div className="text-slate-400 text-[10px]">Place of Supply: Assam (18)</div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-500 uppercase text-[10px]">Room & Category</h4>
                  <div className="font-extrabold text-slate-900 mt-0.5">Room {res.assignedRoom?.roomNumber || 'N/A'}</div>
                  <div className="text-slate-500 text-[10px]">{res.roomType?.name}</div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-500 uppercase text-[10px]">Booking Reference</h4>
                  <div className="font-mono font-bold text-brand-700 mt-0.5">{res.reservationRef}</div>
                  <div className="text-slate-500 text-[10px]">Stay: {res.nights} Night(s)</div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-500 uppercase text-[10px]">Check-In Date & Time</h4>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {getStayDates(res).checkInFormatted}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-500 uppercase text-[10px]">Check-Out Date & Time</h4>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {getStayDates(res).checkOutFormatted}
                  </div>
                </div>
              </div>

              {/* Multi-Section Charges & Totals */}
              {(() => {
                const { roomLines, extraOrderLines } = segregateBillLines(activeInvoice.lines || []);
                const roomBaseSub = roomLines.reduce((s: number, l: any) => s + (Number(l.taxableAmount || (l.unitPrice * l.quantity)) || 0), 0);
                const roomTariffTotal = roomLines.reduce((s: number, l: any) => s + (Number(l.totalAmount || (l.unitPrice * l.quantity)) || 0), 0);
                const extraSub = extraOrderLines.reduce((s: number, l: any) => s + (Number(l.totalAmount || (l.unitPrice * l.quantity)) || 0), 0);
                const isGst = activeInvoice.isGstBill || activeInvoice.invoiceType === 'GST';
                const cgst = isGst ? (Number(activeInvoice.cgstAmount) || roomLines.reduce((s: number, l: any) => s + (Number(l.cgstAmount) || 0), 0) || Math.round((roomBaseSub * 0.025) * 100) / 100) : 0;
                const sgst = isGst ? (Number(activeInvoice.sgstAmount) || roomLines.reduce((s: number, l: any) => s + (Number(l.sgstAmount) || 0), 0) || Math.round((roomBaseSub * 0.025) * 100) / 100) : 0;
                const totalGst = cgst + sgst;
                const discount = Number(activeInvoice.discount || 0);
                const roomSub = isGst ? roomBaseSub : roomTariffTotal;
                const grossSub = roomSub + extraSub;
                const grandTotal = roomTariffTotal + extraSub - discount;

                return (
                  <div className="space-y-4">
                    {/* SECTION 1: Room Accommodation Tariff */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-900 text-white px-3.5 py-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                        <span>Section 1: Base Room Tariff & Accommodation</span>
                        <span className="text-[11px] text-slate-300 font-normal">Tariff Particulars</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                              <th className="p-2 text-center w-8">#</th>
                              <th className="p-2 text-left">Particulars / Description</th>
                              {isGst && <th className="p-2 text-center w-20">HSN/SAC</th>}
                              <th className="p-2 text-center w-12">Qty</th>
                              <th className="p-2 text-right w-20">Rate (₹)</th>
                              {isGst && (
                                <>
                                  <th className="p-2 text-right w-20">Taxable (₹)</th>
                                  <th className="p-2 text-right w-16">CGST (2.5%)</th>
                                  <th className="p-2 text-right w-16">SGST (2.5%)</th>
                                </>
                              )}
                              <th className="p-2 text-right w-24">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {roomLines.map((line: any, idx: number) => {
                              const unitPrice = Number(line.unitPrice || 0).toFixed(2);
                              const taxable = Number(line.taxableAmount || (line.quantity * line.unitPrice) || 0).toFixed(2);
                              const lCgst = isGst ? Number(line.cgstAmount || (Number(taxable) * 0.025) || 0).toFixed(2) : '0.00';
                              const lSgst = isGst ? Number(line.sgstAmount || (Number(taxable) * 0.025) || 0).toFixed(2) : '0.00';
                              const lTotal = Number(line.totalAmount || (Number(taxable) + Number(lCgst) + Number(lSgst)) || 0).toFixed(2);
                              return (
                                <tr key={line.id || idx} className="hover:bg-slate-50/50">
                                  <td className="p-2 text-center font-mono text-[11px] text-slate-400">{idx + 1}</td>
                                  <td className="p-2 font-semibold text-slate-900">{line.description}</td>
                                  {isGst && <td className="p-2 text-center font-mono text-[11px] text-slate-600">{line.hsnSacCode || '996311'}</td>}
                                  <td className="p-2 text-center font-mono">{line.quantity || 1}</td>
                                  <td className="p-2 text-right font-mono">₹{unitPrice}</td>
                                  {isGst && (
                                    <>
                                      <td className="p-2 text-right font-mono text-slate-700">₹{taxable}</td>
                                      <td className="p-2 text-right font-mono text-slate-600">₹{lCgst}</td>
                                      <td className="p-2 text-right font-mono text-slate-600">₹{lSgst}</td>
                                    </>
                                  )}
                                  <td className="p-2 text-right font-mono font-bold text-slate-900">₹{lTotal}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="bg-slate-50 px-3.5 py-2 border-t border-slate-200 flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-600">Base Room Tariff Subtotal:</span>
                        <span className="font-mono text-slate-900">₹{roomSub.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* SECTION 2: Room Orders & Extra Charges (if any) */}
                    {extraOrderLines.length > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-800 text-white px-3.5 py-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                          <span>Section 2: Extra Room Orders & Incidentals</span>
                          <span className="text-[11px] text-amber-300 font-normal">{extraOrderLines.length} Items (Date-Wise)</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                                <th className="p-2 text-center w-8">#</th>
                                <th className="p-2 text-left w-28">Stay Day & Date</th>
                                <th className="p-2 text-left">Particulars / Description</th>
                                <th className="p-2 text-center w-14">Qty</th>
                                <th className="p-2 text-right w-20">Rate (₹)</th>
                                <th className="p-2 text-right w-24">Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {(() => {
                                let lastDay = '';
                                const sortedExtras = [...extraOrderLines].sort((a: any, b: any) => {
                                  const timeA = new Date(a.date || a.createdAt).getTime();
                                  const timeB = new Date(b.date || b.createdAt).getTime();
                                  return timeA - timeB;
                                });

                                return sortedExtras.map((line: any, idx: number) => {
                                  const parsed = parseExtraOrderLine(line, res.arrivalDate);
                                  const unitPrice = Number(line.unitPrice || 0).toFixed(2);
                                  const lTotal = Number(line.totalAmount || (line.quantity * line.unitPrice) || 0).toFixed(2);
                                  const showGroup = parsed.fullDayTag && parsed.fullDayTag !== lastDay;
                                  if (showGroup) lastDay = parsed.fullDayTag;

                                  return (
                                    <React.Fragment key={line.id || idx}>
                                      {showGroup && (
                                        <tr className="bg-slate-100/90 font-bold text-slate-800 text-[10.5px] uppercase tracking-wider border-y border-slate-200">
                                          <td colSpan={6} className="px-3 py-1.5 text-slate-700">
                                            📅 {parsed.fullDayTag}
                                          </td>
                                        </tr>
                                      )}
                                      <tr className="hover:bg-slate-50/50">
                                        <td className="p-2 text-center font-mono text-[11px] text-slate-400">{idx + 1}</td>
                                        <td className="p-2 text-left">
                                          <span className="font-bold text-indigo-700 block">{parsed.dayLabel}</span>
                                          {parsed.dateFormatted && (
                                            <span className="text-[10px] text-slate-500 font-mono">{parsed.dateFormatted}</span>
                                          )}
                                        </td>
                                        <td className="p-2 font-semibold text-slate-900">{parsed.cleanDescription}</td>
                                        <td className="p-2 text-center font-mono">{line.quantity || 1}</td>
                                        <td className="p-2 text-right font-mono">₹{unitPrice}</td>
                                        <td className="p-2 text-right font-mono font-bold text-slate-900">₹{lTotal}</td>
                                      </tr>
                                    </React.Fragment>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                        <div className="bg-slate-50 px-3.5 py-2 border-t border-slate-200 flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-600">Extra Room Orders Subtotal (Non-Taxable):</span>
                          <span className="font-mono text-slate-900">₹{extraSub.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* Financial Totals Calculation Box */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end pt-2 gap-4">
                      <div className="text-[11px] text-slate-500 max-w-xs space-y-1">
                        <div className="font-semibold text-slate-700">Terms & Conditions:</div>
                        <p>1. Check-out time is 11:00 AM.</p>
                        <p>2. GST is charged strictly on room accommodation tariff only.</p>
                        <p>3. This computer generated bill is final and acknowledged.</p>
                      </div>

                      <div className="w-full sm:w-80 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Section 1: Base Room Tariff:</span>
                          <span className="font-mono font-semibold">₹{roomSub.toFixed(2)}</span>
                        </div>
                        {extraOrderLines.length > 0 && (
                          <div className="flex justify-between text-slate-600">
                            <span>Section 2: Room Orders & Extras:</span>
                            <span className="font-mono font-semibold">₹{extraSub.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-500 text-[11px] border-t border-slate-200/50 pt-1">
                          <span>Gross Subtotal (Before Taxes):</span>
                          <span className="font-mono">₹{(roomSub + extraSub).toFixed(2)}</span>
                        </div>

                        {discount > 0 && (
                          <div className="flex justify-between text-rose-600">
                            <span>Discount:</span>
                            <span className="font-mono font-semibold">-₹{discount.toFixed(2)}</span>
                          </div>
                        )}

                        {isGst && (
                          <>
                            <div className="flex justify-between text-slate-600 text-[11px]">
                              <span>CGST (2.5% on Room Tariff only):</span>
                              <span className="font-mono">₹{cgst.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600 text-[11px]">
                              <span>SGST (2.5% on Room Tariff only):</span>
                              <span className="font-mono">₹{sgst.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-700 font-bold text-[11px] border-t border-slate-200/60 pt-1">
                              <span>Total GST (5%):</span>
                              <span className="font-mono">₹{totalGst.toFixed(2)}</span>
                            </div>
                          </>
                        )}

                        <div className="flex justify-between border-t-2 border-slate-300 pt-2 font-black text-sm text-slate-900">
                          <span>Grand Total:</span>
                          <span className="font-mono text-emerald-700">₹{grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Signatures & Footer */}
              <div className="pt-8 border-t border-slate-200 flex items-end justify-between text-[11px] text-slate-500">
                <div>
                  <p>Thank you for staying at Indira Lodge!</p>
                  <p className="text-[10px] italic">
                    {activeInvoice.isDraft
                      ? '⚠️ Temporary estimate for guest review. Booking remains unlocked & editable.'
                      : 'Computer generated invoice. System lock active.'}
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-slate-400 mb-1"></div>
                  <p className="font-semibold text-slate-700">Authorized Signatory</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer if Temporary Bill */}
          {activeInvoice?.isDraft && !isBilled && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-800 block">Customer verified the bill details?</span>
                <span className="text-[11px]">Lock the billing to generate the official tax invoice and proceed with check-out.</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsBillModalOpen(false);
                    setIsEditOpen(true);
                  }}
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs"
                >
                  Modify Stay Info
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsBillModalOpen(false);
                    handleGenerateBill(activeInvoice.invoiceType || 'GST');
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Lock {activeInvoice.invoiceType === 'GST' ? 'GST Bill' : 'Non-GST Bill'}
                </button>
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

          {/* Order Date (Date-Wise Billing) */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  Order Date (For Date-Wise Billing) *
                </label>
                <p className="text-[11px] text-indigo-700">
                  Select the date when this order was placed. In the final bill, orders will appear grouped day-by-day.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  required
                  value={serviceForm.orderDate}
                  onChange={(e) => setServiceForm({ ...serviceForm, orderDate: e.target.value })}
                  className="px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
                {(() => {
                  const dayInfo = getStayDayInfo(serviceForm.orderDate, res.arrivalDate);
                  return (
                    <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-extrabold shadow-2xs whitespace-nowrap">
                      {dayInfo.dayLabel}
                    </span>
                  );
                })()}
              </div>
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
