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
  Clock,
  Sparkles,
  MapPin,
  Briefcase,
  IdCard,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';

export default function NewReservationPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 19 Reservation Form Fields State
  const [form, setForm] = useState({
    // Guest Fields (1, 2, 3, 4, 11, 12, 16, 18, 19)
    firstName: '',
    lastName: '',
    phone: '+91 ',
    email: '',
    address: '',
    city: '',
    state: '',
    age: '',
    gender: 'Male',
    occupation: 'Business',
    idType: 'Aadhaar Card',
    idNumber: '',

    // Stay Fields (5, 6, 9, 10, 7, 8, 13, 14, 15, 17)
    arrivalDate: new Date().toISOString().split('T')[0],
    arrivalTime: '14:00',
    departureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    departureTime: '11:00',
    roomTypeId: '',
    assignedRoomId: '', // Blank = Auto-allocated
    adults: '1',
    children: '0',
    comingFrom: '',
    purposeOfVisit: 'Leisure / Vacation',

    // Financial & Pricing
    discountAmount: '0',
    depositAmount: '0',
    specialRequests: '',
  });

  // Master Data
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [availablePhysicalRooms, setAvailablePhysicalRooms] = useState<any[]>([]);
  const [autoAllocatedRoom, setAutoAllocatedRoom] = useState<any>(null);
  const [guestSearch, setGuestSearch] = useState('');
  const [guestsList, setGuestsList] = useState<any[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);

  // Calculate Days Stayed
  const arrDate = new Date(form.arrivalDate);
  const depDate = new Date(form.departureDate);
  const diffTime = depDate.getTime() - arrDate.getTime();
  const daysStayed = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Selected Room Type Price
  const selectedRoomType = roomTypes.find((rt) => rt.id === form.roomTypeId) || roomTypes[0];
  const roomPricePerNight = selectedRoomType ? selectedRoomType.baseRate : 0;

  // Final Price Calculations
  const roomSubtotal = roomPricePerNight * daysStayed;
  const discountVal = parseFloat(form.discountAmount || '0');
  const taxableVal = Math.max(0, roomSubtotal - discountVal);
  const gstTaxVal = Math.round(taxableVal * 0.18 * 100) / 100;
  const totalPrice = taxableVal + gstTaxVal;

  // Fetch Room Types
  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        const res = await fetch('/api/room-types');
        if (res.ok) {
          const data = await res.json();
          const rts = data.roomTypes || [];
          setRoomTypes(rts);
          if (rts.length > 0) {
            setForm((prev) => ({ ...prev, roomTypeId: rts[0].id }));
          }
        }
      } catch (e) {}
    };
    fetchRoomTypes();
  }, []);

  // Auto-allocate Room Category (Single Bed, Double Bed, Triple Bed) based on Adults & Children
  useEffect(() => {
    if (!roomTypes || roomTypes.length === 0) return;

    const nAdults = parseInt(form.adults || '1', 10);
    const nChildren = parseInt(form.children || '0', 10);

    // Target Bed Type logic: Single Bed (1A+1C), Double Bed (2A+2C), Triple Bed (3A+3C)
    let preferredBedType = 'Single Bed';
    if (nAdults >= 3 || (nAdults === 2 && nChildren >= 3) || (nAdults + nChildren) > 4) {
      preferredBedType = 'Triple Bed';
    } else if (nAdults === 2 || (nAdults === 1 && nChildren >= 2) || (nAdults + nChildren) > 2) {
      preferredBedType = 'Double Bed';
    }

    const matchedType =
      roomTypes.find((rt) => rt.bedType === preferredBedType) ||
      roomTypes.find((rt) => (rt.adultsCapacity || 2) >= nAdults) ||
      roomTypes[0];

    if (matchedType && matchedType.id !== form.roomTypeId) {
      setForm((prev) => ({ ...prev, roomTypeId: matchedType.id, assignedRoomId: '' }));
    }
  }, [form.adults, form.children, roomTypes]);

  // Fetch Available Rooms & Auto-allocate Physical Room Number
  useEffect(() => {
    if (!form.roomTypeId || !form.arrivalDate || !form.departureDate) return;

    const fetchAvailability = async () => {
      try {
        const res = await fetch(
          `/api/availability?arrivalDate=${encodeURIComponent(form.arrivalDate)}&departureDate=${encodeURIComponent(form.departureDate)}&roomTypeId=${form.roomTypeId}`
        );
        if (res.ok) {
          const data = await res.json();
          const rooms = data.availablePhysicalRooms || [];
          setAvailablePhysicalRooms(rooms);
          if (rooms.length > 0) {
            setAutoAllocatedRoom(rooms[0]);
          } else {
            setAutoAllocatedRoom(null);
          }
        }
      } catch (e) {}
    };

    fetchAvailability();
  }, [form.roomTypeId, form.arrivalDate, form.departureDate]);

  // Debounced Guest Search for Auto-Fill
  useEffect(() => {
    if (guestSearch.trim().length < 2) {
      setGuestsList([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/guests?search=${encodeURIComponent(guestSearch.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setGuestsList(data.guests || []);
        }
      } catch (e) {}
    }, 250);
    return () => clearTimeout(timer);
  }, [guestSearch]);

  const handleSelectExistingGuest = (g: any) => {
    setSelectedGuest(g);
    const names = (g.displayName || '').split(' ');
    setForm((prev) => ({
      ...prev,
      firstName: g.firstName || names[0] || '',
      lastName: g.lastName || names.slice(1).join(' ') || '',
      phone: g.phone || '',
      email: g.email || '',
      address: g.address || '',
      city: g.city || '',
      state: g.state || '',
      age: g.age ? String(g.age) : '',
      gender: g.gender || 'Male',
      occupation: g.occupation || 'Business',
      idType: g.idType || 'Aadhaar Card',
      idNumber: g.idNumber || '',
    }));
    setGuestsList([]);
    showToast(`Returning guest details loaded for ${g.displayName}`, 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (new Date(form.departureDate) <= new Date(form.arrivalDate)) {
      setErrorMsg('Departure date must be after arrival date.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        guestId: selectedGuest?.id,
        ...form,
      };

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        setErrorMsg(resData.error || 'Failed to create reservation.');
        setLoading(false);
        return;
      }

      showToast(`Reservation ${resData.reservation.reservationRef} created successfully!`, 'success');
      router.push(`/reservations/${resData.reservation.id}`);
    } catch (e) {
      setErrorMsg('Network error submitting reservation form');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <CalendarDays className="w-6 h-6 text-brand-600" />
          Guest Booking & Reservation Form
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Complete registration entry with auto room allocation, price calculations, and guest verification
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Reservation Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: GUEST INFORMATION */}
        <div className="pmfs-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              1. Guest Profile & Identification Details
            </h2>

            {/* Returning Guest Quick Search */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                placeholder="Search returning guest..."
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {guestsList.length > 0 && (
                <div className="absolute right-0 top-9 z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {guestsList.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => handleSelectExistingGuest(g)}
                      className="p-2.5 hover:bg-brand-50 cursor-pointer text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{g.displayName}</div>
                        <div className="text-[11px] text-slate-500">{g.phone}</div>
                      </div>
                      <Badge variant="info" className="text-[10px]">Auto-Fill</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* 1. Name */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">First Name *</label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="e.g. Rahul"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="e.g. Baruah"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* 2. Phone Number */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* 3. Email ID */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="rahul@example.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* 11. Age */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Age (Years)</label>
              <input
                type="number"
                min="18"
                max="100"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                placeholder="e.g. 32"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* 12. Gender */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Gender *</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* 4. Address */}
            <div className="sm:col-span-3">
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="House / Street, Area, City, State"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* 16. Occupation */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Occupation</label>
              <select
                value={form.occupation}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Business">Business</option>
                <option value="Private Service">Private Service</option>
                <option value="Government Service">Government Service</option>
                <option value="Self Employed">Self Employed</option>
                <option value="Student">Student</option>
                <option value="Professional / Doctor / Engineer">Professional</option>
                <option value="Retired">Retired</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* 18. ID Type */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">ID Document Type *</label>
              <select
                value={form.idType}
                onChange={(e) => setForm({ ...form, idType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Aadhaar Card">Aadhaar Card</option>
                <option value="Passport">Passport</option>
                <option value="Driving License">Driving License</option>
                <option value="Voter ID">Voter ID</option>
                <option value="PAN Card">PAN Card</option>
              </select>
            </div>

            {/* 19. ID Number */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">ID Document Number</label>
              <input
                type="text"
                value={form.idNumber}
                onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                placeholder="e.g. 1234-5678-9012"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: STAY & ROOM ALLOCATION */}
        <div className="pmfs-card p-6 space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-brand-600" />
            2. Stay Schedule & Room Allocation
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            {/* 5. Arrival Date */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Arrival Date *</label>
              <input
                type="date"
                required
                value={form.arrivalDate}
                onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            {/* 6. Arrival Time */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Arrival Time *</label>
              <input
                type="time"
                required
                value={form.arrivalTime}
                onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>

            {/* 9. Departure Date */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Departure Date *</label>
              <input
                type="date"
                required
                value={form.departureDate}
                onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            {/* 10. Departure Time + Days Stayed */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block font-semibold text-slate-700 uppercase text-[11px]">Departure Time</label>
                <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                  {daysStayed} Day{daysStayed > 1 ? 's' : ''} Stayed
                </span>
              </div>
              <input
                type="time"
                required
                value={form.departureTime}
                onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
            {/* 7. Room Type (Room Price shown on side) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700 uppercase text-[11px]">Room Type *</label>
                <span className="font-mono font-bold text-brand-700 text-xs">
                  Rate: ₹{roomPricePerNight} / night
                </span>
              </div>
              <select
                required
                value={form.roomTypeId}
                onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} ({rt.code}) — ₹{rt.baseRate}/night
                  </option>
                ))}
              </select>
            </div>

            {/* 8. Room No. (Auto Allocated based on availability) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700 uppercase text-[11px]">Room Number *</label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {autoAllocatedRoom ? `Auto-Allocated: Room ${autoAllocatedRoom.roomNumber}` : 'No Room Available'}
                </span>
              </div>
              <select
                value={form.assignedRoomId}
                onChange={(e) => setForm({ ...form, assignedRoomId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">
                  {autoAllocatedRoom
                    ? `Auto Allocated: Room ${autoAllocatedRoom.roomNumber} (${autoAllocatedRoom.floor})`
                    : 'Auto allocation active'}
                </option>
                {availablePhysicalRooms.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    Room {pr.roomNumber} ({pr.floor})
                  </option>
                ))}
              </select>
            </div>

            {/* 13. Adults */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Number of Adults *</label>
              <input
                type="number"
                min="1"
                required
                value={form.adults}
                onChange={(e) => setForm({ ...form, adults: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            {/* 14. Children */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Number of Children</label>
              <input
                type="number"
                min="0"
                value={form.children}
                onChange={(e) => setForm({ ...form, children: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            {/* 15. Coming From */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Coming From (Origin)</label>
              <input
                type="text"
                value={form.comingFrom}
                onChange={(e) => setForm({ ...form, comingFrom: e.target.value })}
                placeholder="e.g. Guwahati, Delhi, Kolkata"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            {/* 17. Purpose of Visit */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Purpose of Visit</label>
              <select
                value={form.purposeOfVisit}
                onChange={(e) => setForm({ ...form, purposeOfVisit: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              >
                <option value="Leisure / Vacation">Leisure / Vacation</option>
                <option value="Business / Corporate">Business / Corporate</option>
                <option value="Personal / Family">Personal / Family</option>
                <option value="Official / Government">Official / Government</option>
                <option value="Medical / Health">Medical / Health</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: TOTAL PRICE & SUMMARY */}
        <div className="pmfs-card p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white space-y-4 rounded-2xl shadow-xl border border-slate-700">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-700 pb-2 flex items-center justify-between">
            <span>3. Final Booking Price & Calculation</span>
            <Receipt className="w-4 h-4 text-emerald-400" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Room Rate ({selectedRoomType?.name}):</span>
                <span className="font-mono font-bold">₹{roomPricePerNight} / night</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Stay Duration:</span>
                <span className="font-mono font-bold">{daysStayed} Night(s)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Room Subtotal:</span>
                <span className="font-mono font-bold">₹{roomSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-300">
                <span>Discount Applied:</span>
                <span className="font-mono font-bold">- ₹{discountVal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Estimated GST Tax (18%):</span>
                <span className="font-mono font-bold">₹{gstTaxVal.toFixed(2)}</span>
              </div>
            </div>

            {/* Total Price Display Card */}
            <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-col justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">GRAND TOTAL PAYABLE PRICE</span>
              <div className="mt-2">
                <span className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                  ₹{totalPrice.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  (Includes Room Type Rate × {daysStayed} Days + Tax)
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push('/reservations')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Reservation...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Save Booking (₹{totalPrice.toLocaleString('en-IN')})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
