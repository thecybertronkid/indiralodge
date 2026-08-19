'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  User,
  BedDouble,
  Receipt,
  CheckCircle2,
  Search,
  Plus,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function NewReservationPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1: Guest State
  const [guestSearch, setGuestSearch] = useState('');
  const [guestsList, setGuestsList] = useState<any[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [showQuickAddGuest, setShowQuickAddGuest] = useState(false);
  const [newGuestForm, setNewGuestForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });

  // Step 2: Dates & Booking Source State
  const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().split('T')[0]);
  const [departureDate, setDepartureDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [adults, setAdults] = useState('1');
  const [children, setChildren] = useState('0');
  const [sources, setSources] = useState<any[]>([]);
  const [bookingSourceId, setBookingSourceId] = useState('');

  // Step 3: Room Type & Availability State
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('');
  const [physicalRooms, setPhysicalRooms] = useState<any[]>([]);
  const [assignedRoomId, setAssignedRoomId] = useState('');

  // Step 4: Pricing & Deposit State
  const [discountAmount, setDiscountAmount] = useState('0');
  const [discountReason, setDiscountReason] = useState('');
  const [depositAmount, setDepositAmount] = useState('0');
  const [specialRequests, setSpecialRequests] = useState('');
  const [pricingPreview, setPricingPreview] = useState<any>(null);

  // Fetch Booking Sources & Initial Guest Search
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await fetch('/api/booking-sources');
        if (res.ok) {
          const data = await res.json();
          setSources(data.sources || []);
          if (data.sources?.length > 0) {
            setBookingSourceId(data.sources[0].id);
          }
        }
      } catch (e) {}
    };
    fetchSources();
  }, []);

  // Debounced Guest Search
  useEffect(() => {
    if (guestSearch.trim().length < 2) {
      setGuestsList([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/guests?search=${encodeURIComponent(guestSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setGuestsList(data.guests || []);
        }
      } catch (e) {}
    }, 250);
    return () => clearTimeout(timer);
  }, [guestSearch]);

  const handleQuickAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGuestForm),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create guest', 'error');
        setLoading(false);
        return;
      }

      showToast(`Guest profile created for ${data.guest.displayName}`, 'success');
      setSelectedGuest(data.guest);
      setShowQuickAddGuest(false);
    } catch (e) {
      showToast('Error creating guest', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAvailability = async () => {
    setErrorMsg('');
    if (new Date(departureDate) <= new Date(arrivalDate)) {
      setErrorMsg('Departure date must be after arrival date.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/availability?arrivalDate=${encodeURIComponent(arrivalDate)}&departureDate=${encodeURIComponent(departureDate)}`
      );
      if (res.ok) {
        const data = await res.json();
        setAvailabilities(data.roomTypesAvailability || []);
        if (data.roomTypesAvailability?.length > 0) {
          const availOne = data.roomTypesAvailability.find((r: any) => r.availableRooms > 0);
          if (availOne) {
            setSelectedRoomTypeId(availOne.roomTypeId);
            fetchPhysicalRooms(availOne.roomTypeId);
          }
        }
        setStep(3);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to check availability');
      }
    } catch (e) {
      setErrorMsg('Network error checking availability');
    } finally {
      setLoading(false);
    }
  };

  const fetchPhysicalRooms = async (rtId: string) => {
    try {
      const res = await fetch(
        `/api/availability?arrivalDate=${encodeURIComponent(arrivalDate)}&departureDate=${encodeURIComponent(departureDate)}&roomTypeId=${rtId}`
      );
      if (res.ok) {
        const data = await res.json();
        setPhysicalRooms(data.availablePhysicalRooms || []);
      }
    } catch (e) {}
  };

  const handleCalculatePricing = () => {
    const selectedRt = availabilities.find((r) => r.roomTypeId === selectedRoomTypeId);
    if (!selectedRt) return;

    const arr = new Date(arrivalDate);
    const dep = new Date(departureDate);
    const nights = Math.max(1, Math.ceil((dep.getTime() - arr.getTime()) / (1000 * 60 * 60 * 24)));

    const baseRate = selectedRt.baseRate;
    const roomSubtotal = baseRate * nights;
    const disc = parseFloat(discountAmount || '0');
    const taxable = Math.max(0, roomSubtotal - disc);
    const tax = Math.round(taxable * 0.18 * 100) / 100;
    const total = taxable + tax;

    setPricingPreview({
      nights,
      baseRate,
      roomSubtotal,
      discountAmount: disc,
      taxableAmount: taxable,
      taxAmount: tax,
      totalAmount: total,
    });

    setStep(4);
  };

  const handleSubmitReservation = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        guestId: selectedGuest.id,
        bookingSourceId,
        roomTypeId: selectedRoomTypeId,
        assignedRoomId: assignedRoomId || null,
        arrivalDate,
        departureDate,
        adults: parseInt(adults, 10),
        children: parseInt(children, 10),
        discountAmount: parseFloat(discountAmount || '0'),
        discountReason: discountReason || null,
        depositAmount: parseFloat(depositAmount || '0'),
        specialRequests: specialRequests || null,
      };

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to create reservation.');
        setLoading(false);
        return;
      }

      showToast(`Reservation ${data.reservation.reservationRef} created successfully!`, 'success');
      router.push(`/reservations/${data.reservation.id}`);
    } catch (e) {
      setErrorMsg('Network error submitting reservation');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <CalendarDays className="w-6 h-6 text-brand-600" />
          Create New Reservation
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Guided 4-step wizard for guest selection, date availability, rate calculations, and advance deposits
        </p>
      </div>

      {/* Wizard Progress Bar */}
      <div className="pmfs-card p-4 flex items-center justify-between">
        {[
          { num: 1, label: 'Guest' },
          { num: 2, label: 'Dates & Source' },
          { num: 3, label: 'Room Selection' },
          { num: 4, label: 'Pricing & Deposit' },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center transition-all ${
                step === s.num
                  ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                  : step > s.num
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
            </div>
            <span
              className={`text-xs font-medium hidden sm:inline ${
                step === s.num ? 'text-brand-900 font-bold' : 'text-slate-500'
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: GUEST SELECTION */}
      {step === 1 && (
        <div className="pmfs-card p-6 space-y-6">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Step 1: Select Primary Guest
          </h2>

          {selectedGuest ? (
            <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-brand-900">{selectedGuest.displayName}</div>
                <div className="text-xs text-brand-700">{selectedGuest.phone} • {selectedGuest.email || 'No email'}</div>
                <div className="text-[11px] text-brand-600 mt-1">Ref: {selectedGuest.guestRef}</div>
              </div>
              <button
                onClick={() => setSelectedGuest(null)}
                className="px-3 py-1.5 bg-white text-brand-700 border border-brand-200 rounded-lg text-xs font-semibold hover:bg-brand-100"
              >
                Change Guest
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    placeholder="Search existing guest by name, phone, or ref code..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowQuickAddGuest(!showQuickAddGuest)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  Quick Add Guest
                </button>
              </div>

              {/* Guest Search Results */}
              {guestsList.length > 0 && (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {guestsList.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGuest(g)}
                      className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{g.displayName}</div>
                        <div className="text-slate-500">{g.phone} • {g.email || 'No email'}</div>
                      </div>
                      <span className="font-mono text-[11px] text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                        {g.guestRef}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Add Guest Form */}
              {showQuickAddGuest && (
                <form onSubmit={handleQuickAddGuest} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase">Add New Guest Profile</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="First Name *"
                      value={newGuestForm.firstName}
                      onChange={(e) => setNewGuestForm({ ...newGuestForm, firstName: e.target.value })}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Last Name *"
                      value={newGuestForm.lastName}
                      onChange={(e) => setNewGuestForm({ ...newGuestForm, lastName: e.target.value })}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Phone Number *"
                      value={newGuestForm.phone}
                      onChange={(e) => setNewGuestForm({ ...newGuestForm, phone: e.target.value })}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={newGuestForm.email}
                      onChange={(e) => setNewGuestForm({ ...newGuestForm, email: e.target.value })}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold"
                  >
                    Save & Select Guest
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => {
                if (!selectedGuest) {
                  showToast('Please select or create a guest profile first.', 'error');
                  return;
                }
                setStep(2);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md"
            >
              <span>Next: Dates & Source</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DATES & SOURCE */}
      {step === 2 && (
        <div className="pmfs-card p-6 space-y-6">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Step 2: Dates, Occupancy & Booking Source
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Arrival Date *
              </label>
              <input
                type="date"
                required
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Departure Date *
              </label>
              <input
                type="date"
                required
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Adults *
              </label>
              <input
                type="number"
                min="1"
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Children
              </label>
              <input
                type="number"
                min="0"
                value={children}
                onChange={(e) => setChildren(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Booking Source *
              </label>
              <select
                value={bookingSourceId}
                onChange={(e) => setBookingSourceId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleFetchAvailability}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking Availability...</span>
                </>
              ) : (
                <>
                  <span>Check Availability</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ROOM TYPE & SELECTION */}
      {step === 3 && (
        <div className="pmfs-card p-6 space-y-6">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Step 3: Select Available Room Type & Room Number
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availabilities.map((rt) => {
              const isSelected = selectedRoomTypeId === rt.roomTypeId;
              const isAvail = rt.availableRooms > 0;

              return (
                <div
                  key={rt.roomTypeId}
                  onClick={() => {
                    if (isAvail) {
                      setSelectedRoomTypeId(rt.roomTypeId);
                      fetchPhysicalRooms(rt.roomTypeId);
                    }
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500'
                      : isAvail
                      ? 'border-slate-200 hover:border-slate-300 bg-white'
                      : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{rt.name}</span>
                    <span className="font-mono text-xs font-bold text-brand-700">₹{rt.baseRate}/night</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Available:</span>
                    <span className={`font-bold ${isAvail ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {rt.availableRooms} Room{rt.availableRooms > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Optional Physical Room Assignment */}
          {selectedRoomTypeId && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Assign Specific Physical Room Number (Optional)
              </label>
              <select
                value={assignedRoomId}
                onChange={(e) => setAssignedRoomId(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Unassigned (Assign later at check-in)</option>
                {physicalRooms.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    Room {pr.roomNumber} ({pr.floor})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleCalculatePricing}
              disabled={!selectedRoomTypeId}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
            >
              <span>Next: Rates & Deposit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PRICING & DEPOSIT */}
      {step === 4 && pricingPreview && (
        <div className="pmfs-card p-6 space-y-6">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Step 4: Rate Calculation & Advance Deposit
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Financial Summary Card */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">
                Booking Financial Summary
              </h3>

              <div className="flex justify-between">
                <span className="text-slate-600">Room Rate ({pricingPreview.nights} Nights):</span>
                <span className="font-semibold text-slate-900">₹{pricingPreview.roomSubtotal}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-600">Applied Discount:</span>
                <span className="font-semibold text-rose-600">- ₹{pricingPreview.discountAmount}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-600">GST Tax (18%):</span>
                <span className="font-semibold text-slate-900">₹{pricingPreview.taxAmount}</span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900">
                <span>Total Amount Payable:</span>
                <span className="text-brand-700">₹{pricingPreview.totalAmount}</span>
              </div>
            </div>

            {/* Inputs: Discount & Deposit */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Discount Amount (₹)
                </label>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  onBlur={handleCalculatePricing}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Advance Deposit Received (₹)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Special Requests / Guest Notes
                </label>
                <input
                  type="text"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. High floor room, late check-in"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleSubmitReservation}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-600/30 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Booking...</span>
                </>
              ) : (
                <span>Confirm & Create Reservation</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
