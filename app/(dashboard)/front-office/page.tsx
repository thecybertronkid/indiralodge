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
  Receipt,
  User,
  Sparkles,
  MapPin,
  Briefcase,
  IdCard,
  UtensilsCrossed,
  Lock,
  Printer,
  FileText,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { calculateIndiraLodgeRoomRate } from '@/lib/roomRates';

const getCurrentTimeString = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

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
  const [isRoomServiceOpen, setIsRoomServiceOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    description: 'Packaged Drinking Water Bottle (1L)',
    category: 'FOOD_BEVERAGE',
    quantity: '1',
    unitPrice: '20',
    notes: '',
  });

  // Bill Generation & Finalized Bill Viewer State
  const [isBillViewerOpen, setIsBillViewerOpen] = useState(false);
  const [billType, setBillType] = useState<'GST' | 'NON_GST'>('GST');
  const [customerGstin, setCustomerGstin] = useState('');
  const [generatingBill, setGeneratingBill] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<any>(null);
  const [fetchingInvoice, setFetchingInvoice] = useState(false);
  const [recordPaymentWithBill, setRecordPaymentWithBill] = useState(false);

  const [selectedRes, setSelectedRes] = useState<any>(null);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [assignRoomId, setAssignRoomId] = useState('');

  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [walkinAutoAllocatedRoom, setWalkinAutoAllocatedRoom] = useState<any>(null);

  // Walk-in form state - all 19 fields matching New Reservation form
  const [walkinForm, setWalkinForm] = useState({
    guestId: undefined as string | undefined,
    // 1. Name
    firstName: '',
    lastName: '',
    // 2. Phone
    phone: '+91 ',
    // 3. Email
    email: '',
    // 4. Address
    address: '',
    city: '',
    state: '',
    // 5. Arrival Date
    arrivalDate: new Date().toISOString().split('T')[0],
    // 6. Arrival Time
    arrivalTime: getCurrentTimeString(),
    // AC Preference: 'NON_AC' | 'AC'
    acPreference: 'NON_AC' as 'NON_AC' | 'AC',
    // 7. Room Type
    roomTypeId: '',
    // 8. Room No (Physical Room ID)
    roomId: '',
    // 9. Departure Date
    departureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    // 10. Departure Time
    departureTime: '11:00',
    // 11. Age
    age: '',
    // 12. Gender
    gender: 'Male',
    // 13. Adults
    adults: '1',
    // 14. Children
    children: '0',
    // 15. Coming From
    comingFrom: '',
    // 16. Occupation
    occupation: 'Business',
    // 17. Purpose of Visit
    purposeOfVisit: 'Tourism / Leisure',
    // 18. ID Type
    idType: 'Aadhaar Card',
    // 19. ID Number
    idNumber: '',
    // Financial & Payment
    discountAmount: '0',
    depositAmount: '0',
    paymentMethod: 'CASH',
    specialRequests: '',
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

  // Guest Auto-Lookup State
  const [guestSearchQuery, setGuestSearchQuery] = useState('');
  const [matchedGuests, setMatchedGuests] = useState<any[]>([]);
  const [selectedGuestProfile, setSelectedGuestProfile] = useState<any>(null);

  // Helper to detect if a room type is AC or Non-AC
  const isAcRoomType = (rt: any) => {
    const code = (rt?.code || '').toUpperCase().trim();
    const name = (rt?.name || '').toUpperCase().trim();
    if (
      code.includes('-NAC') ||
      code.includes('NON') ||
      name.includes('NON-AC') ||
      name.includes('NON AC') ||
      name.includes('NON-AIR') ||
      name.includes('NON AIR')
    ) {
      return false;
    }
    if (
      code.includes('-AC') ||
      code.endsWith('AC') ||
      name.includes(' AC') ||
      name.includes('(AC)') ||
      name.includes('AIR CONDITION')
    ) {
      return true;
    }
    return false;
  };

  // Helper to toggle AC / Non-AC and instantly auto-select the best matching room type
  const handleAcPreferenceToggle = (pref: 'NON_AC' | 'AC') => {
    const wantAc = pref === 'AC';
    const candidateTypes = roomTypes.filter((rt) => (wantAc ? isAcRoomType(rt) : !isAcRoomType(rt)));
    const pool = candidateTypes.length > 0 ? candidateTypes : roomTypes;

    const nAdults = parseInt(walkinForm.adults || '1', 10);
    const nChildren = parseInt(walkinForm.children || '0', 10);
    let preferredBedType = 'Single Bed';
    if (nAdults >= 3 || (nAdults === 2 && nChildren >= 3) || nAdults + nChildren > 4) {
      preferredBedType = 'Triple Bed';
    } else if (nAdults === 2 || (nAdults === 1 && nChildren >= 2) || nAdults + nChildren > 2) {
      preferredBedType = 'Double Bed';
    }

    const matchedType =
      pool.find((rt) => rt.bedType === preferredBedType) ||
      pool.find((rt) => (rt.adultsCapacity || 2) >= nAdults) ||
      pool[0];

    setWalkinForm((prev) => ({
      ...prev,
      acPreference: pref,
      roomTypeId: matchedType?.id || prev.roomTypeId,
      roomId: '',
    }));
  };

  // Phone number formatter (+91 XXXXX XXXXX)
  const handleWalkinPhoneChange = (val: string) => {
    let clean = val;
    if (!clean.startsWith('+91')) {
      clean = '+91 ' + clean.replace(/^\+?91\s*/, '');
    }
    const digits = clean.replace(/\D/g, '').slice(2);
    let formatted = '+91 ';
    if (digits.length > 0) {
      formatted += digits.slice(0, 5);
      if (digits.length > 5) {
        formatted += ' ' + digits.slice(5, 10);
      }
    }
    setWalkinForm((prev) => ({ ...prev, phone: formatted }));
  };

  // Fetch Room Types on Mount
  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        const res = await fetch('/api/room-types');
        if (res.ok) {
          const data = await res.json();
          setRoomTypes(data.roomTypes || []);
          if (data.roomTypes?.length > 0) {
            setWalkinForm((prev) => ({
              ...prev,
              roomTypeId: prev.roomTypeId || data.roomTypes[0].id,
            }));
          }
        }
      } catch (e) {}
    };
    fetchRoomTypes();
  }, []);

  // Smart Bed Category & AC Preference Auto-Selection based on Adults, Children, and AC Toggle
  useEffect(() => {
    if (!roomTypes || roomTypes.length === 0 || !isWalkinOpen) return;

    const nAdults = parseInt(walkinForm.adults || '1', 10);
    const nChildren = parseInt(walkinForm.children || '0', 10);

    let preferredBedType = 'Single Bed';
    if (nAdults >= 3 || (nAdults === 2 && nChildren >= 3) || nAdults + nChildren > 4) {
      preferredBedType = 'Triple Bed';
    } else if (nAdults === 2 || (nAdults === 1 && nChildren >= 2) || nAdults + nChildren > 2) {
      preferredBedType = 'Double Bed';
    }

    const wantAc = walkinForm.acPreference === 'AC';
    const candidateTypes = roomTypes.filter((rt) => (wantAc ? isAcRoomType(rt) : !isAcRoomType(rt)));
    const pool = candidateTypes.length > 0 ? candidateTypes : roomTypes;

    const matchedType =
      pool.find((rt) => rt.bedType === preferredBedType) ||
      pool.find((rt) => (rt.adultsCapacity || 2) >= nAdults) ||
      pool[0];

    if (matchedType && matchedType.id !== walkinForm.roomTypeId) {
      setWalkinForm((prev) => ({ ...prev, roomTypeId: matchedType.id, roomId: '' }));
    }
  }, [walkinForm.adults, walkinForm.children, walkinForm.acPreference, roomTypes, isWalkinOpen]);

  // Fetch Available Rooms & Auto-allocate Physical Room Number for Walk-in
  useEffect(() => {
    if (!walkinForm.roomTypeId || !walkinForm.arrivalDate || !walkinForm.departureDate || !isWalkinOpen) return;

    const fetchAvailability = async () => {
      try {
        const res = await fetch(
          `/api/availability?arrivalDate=${encodeURIComponent(walkinForm.arrivalDate)}&departureDate=${encodeURIComponent(walkinForm.departureDate)}&roomTypeId=${walkinForm.roomTypeId}&requireClean=true`
        );
        if (res.ok) {
          const data = await res.json();
          const rooms = data.availablePhysicalRooms || [];
          setAvailableRooms(rooms);
          if (rooms.length > 0) {
            setWalkinAutoAllocatedRoom(rooms[0]);
            setWalkinForm((prev) => ({
              ...prev,
              roomId: prev.roomId && rooms.some((r: any) => r.id === prev.roomId)
                ? prev.roomId
                : rooms[0].id,
            }));
          } else {
            setWalkinAutoAllocatedRoom(null);
            setWalkinForm((prev) => ({ ...prev, roomId: '' }));
          }
        }
      } catch (e) {}
    };

    fetchAvailability();
  }, [walkinForm.roomTypeId, walkinForm.arrivalDate, walkinForm.departureDate, isWalkinOpen]);

  // Pricing Calculations
  const walkinArrDate = new Date(walkinForm.arrivalDate);
  const walkinDepDate = new Date(walkinForm.departureDate);
  const walkinDiffTime = walkinDepDate.getTime() - walkinArrDate.getTime();
  const walkinDaysStayed = Math.max(1, Math.ceil(walkinDiffTime / (1000 * 60 * 60 * 24)));

  const walkinAdults = parseInt(walkinForm.adults || '1', 10);
  const walkinChildren = parseInt(walkinForm.children || '0', 10);

  const selectedWalkinRoomType = roomTypes.find((rt) => rt.id === walkinForm.roomTypeId) || roomTypes[0];
  const walkinPricePerNight = selectedWalkinRoomType
    ? calculateIndiraLodgeRoomRate(selectedWalkinRoomType.code, walkinAdults, walkinChildren, selectedWalkinRoomType.baseRate)
    : 0;

  const walkinRoomSubtotal = walkinPricePerNight * walkinDaysStayed;
  const walkinDiscountVal = parseFloat(walkinForm.discountAmount || '0');
  const walkinTotalPrice = Math.max(0, walkinRoomSubtotal - walkinDiscountVal);
  const walkinTaxableVal = Math.round((walkinTotalPrice / 1.05) * 100) / 100;
  const walkinGstTaxVal = Math.round((walkinTotalPrice - walkinTaxableVal) * 100) / 100;
  const walkinDepositVal = parseFloat(walkinForm.depositAmount || '0');
  const walkinBalance = Math.max(0, walkinTotalPrice - walkinDepositVal);

  // Debounced Returning Guest Search
  useEffect(() => {
    const term = guestSearchQuery || (walkinForm.phone && walkinForm.phone.length > 5 ? walkinForm.phone : '');
    if (!term || term.trim().length < 3) {
      setMatchedGuests([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/guests?search=${encodeURIComponent(term.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setMatchedGuests(data.guests || []);
        }
      } catch (e) {}
    }, 250);

    return () => clearTimeout(timer);
  }, [guestSearchQuery, walkinForm.phone]);

  const handleSelectGuestForWalkin = (guest: any) => {
    setSelectedGuestProfile(guest);
    const names = (guest.displayName || '').split(' ');
    const fName = guest.firstName || names[0] || '';
    const lName = guest.lastName || names.slice(1).join(' ') || 'Guest';

    setWalkinForm((prev) => ({
      ...prev,
      guestId: guest.id,
      firstName: fName,
      lastName: lName,
      phone: guest.phone || '+91 ',
      email: guest.email || '',
      address: guest.address || '',
      city: guest.city || '',
      state: guest.state || '',
      age: guest.age ? String(guest.age) : '',
      gender: guest.gender || 'Male',
      occupation: guest.occupation || 'Business',
      idType: guest.idType || 'Aadhaar Card',
      idNumber: guest.idNumber || '',
    }));
    setMatchedGuests([]);
    showToast(`Loaded returning guest profile: ${guest.displayName}`, 'success');
  };

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

  const handleCheckinClick = async (resItem: any) => {
    const targetRoomId = resItem.assignedRoomId || resItem.assignedRoom?.id;
    if (targetRoomId) {
      setSubmitting(true);
      try {
        const res = await fetch('/api/front-desk/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservationId: resItem.id,
            roomId: targetRoomId,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Check-in failed', 'error');
          setSubmitting(false);
          return;
        }

        const roomNo = resItem.assignedRoom?.roomNumber ? `Room ${resItem.assignedRoom.roomNumber}` : 'assigned room';
        showToast(`Guest ${resItem.guest?.displayName} checked in directly to ${roomNo}!`, 'success');
        fetchFrontDeskData();
      } catch (e) {
        showToast('Error executing check-in', 'error');
      } finally {
        setSubmitting(false);
      }
    } else {
      openCheckinModal(resItem);
    }
  };

  const openCheckinModal = async (resItem: any) => {
    setSelectedRes(resItem);
    setAssignRoomId(resItem.assignedRoomId || '');

    // Fetch physical rooms available & suitable (CLEAN/INSPECTED) for check-in
    try {
      const res = await fetch(
        `/api/availability?arrivalDate=${encodeURIComponent(resItem.arrivalDate)}&departureDate=${encodeURIComponent(resItem.departureDate)}&roomTypeId=${resItem.roomTypeId}&requireClean=true`
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

  const handleViewGeneratedBill = async (resItem: any) => {
    if (!resItem) return;
    setFetchingInvoice(true);
    try {
      const res = await fetch(`/api/finance/invoices/generate?reservationId=${resItem.id}`);
      if (res.ok) {
        const data = await res.json();
        setGeneratedInvoice(data.invoice);
        setIsBillViewerOpen(true);
      } else {
        const fbRes = await fetch('/api/finance/invoices/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservationId: resItem.id,
            invoiceType: resItem.billType || 'GST',
          }),
        });
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          setGeneratedInvoice(fbData.invoice);
          setIsBillViewerOpen(true);
        } else {
          showToast('Could not retrieve final invoice', 'error');
        }
      }
    } catch {
      showToast('Error loading final bill', 'error');
    } finally {
      setFetchingInvoice(false);
    }
  };

  const handleGenerateBill = async (reservationId: string, type: 'GST' | 'NON_GST', gstin?: string) => {
    setGeneratingBill(true);
    try {
      const res = await fetch('/api/finance/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId,
          invoiceType: type,
          customerGstin: gstin ? gstin.trim().toUpperCase() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to generate bill', 'error');
        return;
      }

      setGeneratedInvoice(data.invoice);
      setIsBillViewerOpen(true);

      setSelectedRes((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          isBilled: true,
          billType: type,
          billedInvoiceId: data.invoice.id,
          billedAt: new Date().toISOString(),
        };
      });

      showToast(
        data.alreadyBilled
          ? 'Displaying finalized bill'
          : `${type === 'GST' ? 'GST Tax Invoice' : 'Non-GST Bill'} generated and locked!`,
        'success'
      );
      fetchFrontDeskData();
    } catch {
      showToast('Error generating bill', 'error');
    } finally {
      setGeneratingBill(false);
    }
  };

  const openCheckoutModal = (resItem: any) => {
    setSelectedRes(resItem);
    setOverrideBalance(false);
    setOverrideReason('');
    setBillType(resItem.billType === 'NON_GST' ? 'NON_GST' : 'GST');
    setCustomerGstin(resItem.guest?.gstin || '');
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
    setSelectedGuestProfile(null);
    setGuestSearchQuery('');
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const initialRoomTypeId = roomTypes[0]?.id || '';

    setWalkinForm({
      guestId: undefined,
      firstName: '',
      lastName: '',
      phone: '+91 ',
      email: '',
      address: '',
      city: '',
      state: '',
      arrivalDate: todayStr,
      arrivalTime: getCurrentTimeString(),
      acPreference: 'NON_AC',
      roomTypeId: initialRoomTypeId,
      roomId: '',
      departureDate: tomorrowStr,
      departureTime: '11:00',
      age: '',
      gender: 'Male',
      adults: '1',
      children: '0',
      comingFrom: '',
      occupation: 'Business',
      purposeOfVisit: 'Tourism / Leisure',
      idType: 'Aadhaar Card',
      idNumber: '',
      discountAmount: '0',
      depositAmount: '0',
      paymentMethod: 'CASH',
      specialRequests: '',
    });

    try {
      const res = await fetch(
        `/api/availability?arrivalDate=${encodeURIComponent(todayStr)}&departureDate=${encodeURIComponent(tomorrowStr)}${initialRoomTypeId ? `&roomTypeId=${initialRoomTypeId}` : ''}&requireClean=true`
      );
      if (res.ok) {
        const data = await res.json();
        const rooms = data.availablePhysicalRooms || [];
        setAvailableRooms(rooms);
        if (rooms.length > 0) {
          setWalkinAutoAllocatedRoom(rooms[0]);
          setWalkinForm((prev) => ({ ...prev, roomId: rooms[0].id }));
        }
      }
    } catch (e) {}

    setIsWalkinOpen(true);
  };

  const handleWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (new Date(walkinForm.departureDate) <= new Date(walkinForm.arrivalDate)) {
      showToast('Departure date must be after arrival date.', 'error');
      setSubmitting(false);
      return;
    }

    try {
      const targetRoomId = walkinForm.roomId || walkinAutoAllocatedRoom?.id || (availableRooms.length > 0 ? availableRooms[0].id : '');
      if (!targetRoomId) {
        showToast('No clean physical room available for selected dates.', 'error');
        setSubmitting(false);
        return;
      }

      const payload = {
        ...walkinForm,
        roomId: targetRoomId,
      };

      const res = await fetch('/api/front-desk/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Walk-in check-in failed', 'error');
        setSubmitting(false);
        return;
      }

      showToast(`Walk-in guest ${walkinForm.firstName} ${walkinForm.lastName} checked in successfully!`, 'success');
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
    setBillType(resItem.billType === 'NON_GST' ? 'NON_GST' : 'GST');
    setCustomerGstin(resItem.guest?.gstin || '');
    setRecordPaymentWithBill(false);
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

      if (recordPaymentWithBill && !selectedRes.isBilled) {
        await handleGenerateBill(selectedRes.id, billType, customerGstin);
      } else {
        fetchFrontDeskData();
      }
    } catch (e) {
      showToast('Error recording payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openRoomServiceModal = (resItem: any) => {
    setSelectedRes(resItem);
    setServiceForm({
      description: 'Packaged Drinking Water Bottle (1L)',
      category: 'FOOD_BEVERAGE',
      quantity: '1',
      unitPrice: '20',
      notes: '',
    });
    setIsRoomServiceOpen(true);
  };

  const handlePostRoomCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRes?.id) return;
    setSubmitting(true);
    try {
      const qty = parseInt(serviceForm.quantity || '1', 10);
      const price = parseFloat(serviceForm.unitPrice || '0');
      const res = await fetch('/api/front-desk/room-charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: selectedRes.id,
          description: serviceForm.description,
          category: serviceForm.category,
          quantity: qty,
          unitPrice: price,
          notes: serviceForm.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to post room charge', 'error');
        setSubmitting(false);
        return;
      }
      showToast(data.message || 'Room charge posted successfully!', 'success');
      setIsRoomServiceOpen(false);
      fetchFrontDeskData();
    } catch {
      showToast('Error posting room charge', 'error');
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
                            onClick={() => handleCheckinClick(arr)}
                            disabled={submitting}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50"
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
                          <div className="flex items-center justify-end gap-1.5">
                            {dep.isBilled && (
                              <button
                                onClick={() => handleViewGeneratedBill(dep)}
                                className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                                title="View Final Bill"
                              >
                                <FileText className="w-3.5 h-3.5 text-purple-600" />
                                <span>Bill</span>
                              </button>
                            )}
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
                            {inh.isBilled && (
                              <button
                                onClick={() => handleViewGeneratedBill(inh)}
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md text-xs font-bold border border-purple-200 flex items-center gap-1 shadow-xs"
                                title="View Final Generated Bill"
                              >
                                <FileText className="w-3 h-3 text-purple-600" />
                                <span>Bill</span>
                              </button>
                            )}
                            <button
                              onClick={() => openRoomServiceModal(inh)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold border border-indigo-200 flex items-center gap-1"
                              title="Add Room Service / Order Item"
                            >
                              <UtensilsCrossed className="w-3 h-3" />
                              <span>Order</span>
                            </button>
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

                {/* Bill Generation / Finalized Bill Status */}
                {selectedRes?.isBilled ? (
                  <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-purple-700" />
                        <span className="text-xs font-bold text-purple-900">
                          Final {selectedRes.billType === 'NON_GST' ? 'Non-GST' : 'GST'} Bill Generated & Locked
                        </span>
                      </div>
                      <Badge variant="success">LOCKED</Badge>
                    </div>
                    <p className="text-[11px] text-purple-800">
                      This stay has been finalized. In accordance with system policy, no further charge modifications or edits can be made to this bill.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleViewGeneratedBill(selectedRes)}
                      disabled={fetchingInvoice}
                      className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
                    >
                      <FileText className="w-4 h-4" />
                      <span>{fetchingInvoice ? 'Loading Final Bill...' : 'View Final Generated Bill'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-indigo-950 uppercase flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-indigo-600" />
                        Generate Bill Option
                      </label>
                      <span className="text-[10px] text-indigo-700 font-semibold">Choose GST or Non-GST</span>
                    </div>

                    {/* Toggle GST vs Non-GST */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBillType('GST')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                          billType === 'GST'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-700 border-indigo-200 hover:bg-indigo-50'
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>GST Bill (5%)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillType('NON_GST')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                          billType === 'NON_GST'
                            ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                            : 'bg-white text-slate-700 border-indigo-200 hover:bg-indigo-50'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Non-GST Bill</span>
                      </button>
                    </div>

                    {billType === 'GST' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Customer GSTIN (Optional)
                        </label>
                        <input
                          type="text"
                          value={customerGstin}
                          onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                          placeholder="e.g. 27AAAAA0000A1Z5"
                          className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleGenerateBill(selectedRes.id, billType, customerGstin)}
                      disabled={generatingBill}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>
                        {generatingBill
                          ? 'Generating Bill...'
                          : `Generate & View ${billType === 'GST' ? 'GST' : 'Non-GST'} Bill`}
                      </span>
                    </button>
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

      {/* Modal 3: Walk-In Check-In (Identical 19 Fields & Mechanism to New Booking Form) */}
      <Modal isOpen={isWalkinOpen} onClose={() => setIsWalkinOpen(false)} title="Walk-in Direct Check-In (Immediate Stay)" maxWidth="4xl">
        <form onSubmit={handleWalkinSubmit} className="space-y-5">
          {/* Returning Guest Auto-Fill Search */}
          <div className="p-3.5 bg-brand-50/80 border border-brand-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-brand-900 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-brand-600" />
                Returning Guest Auto-Fill Search
              </span>
              {selectedGuestProfile && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGuestProfile(null);
                    setWalkinForm((prev) => ({
                      ...prev,
                      guestId: undefined,
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
                    }));
                  }}
                  className="text-[11px] text-brand-700 font-semibold hover:underline"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <input
              type="text"
              value={guestSearchQuery}
              onChange={(e) => setGuestSearchQuery(e.target.value)}
              placeholder="Search existing guest directory by name, phone (+91...), or guest ref..."
              className="w-full px-3.5 py-2 bg-white border border-brand-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
            />

            {matchedGuests.length > 0 && !selectedGuestProfile && (
              <div className="bg-white border border-brand-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto shadow-md">
                {matchedGuests.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => handleSelectGuestForWalkin(g)}
                    className="p-2.5 hover:bg-brand-50/80 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{g.displayName}</span>
                      <span className="text-[11px] text-slate-500">{g.phone} {g.email ? `• ${g.email}` : ''}</span>
                    </div>
                    <button
                      type="button"
                      className="px-2.5 py-1 bg-brand-600 text-white font-bold text-[10px] rounded hover:bg-brand-700 transition-colors shadow-xs"
                    >
                      Auto-Fill
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedGuestProfile && (
              <div className="text-xs text-brand-900 font-medium flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-brand-200">
                <span>Selected: <strong>{selectedGuestProfile.displayName}</strong> ({selectedGuestProfile.phone})</span>
                <Badge variant="success">Auto-Filled</Badge>
              </div>
            )}
          </div>

          {/* SECTION 1: GUEST IDENTIFICATION & DEMOGRAPHICS */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
              <User className="w-4 h-4 text-brand-600" />
              1. Guest Identification & Demographics
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              {/* 1. Name */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={walkinForm.firstName}
                  onChange={(e) => setWalkinForm({ ...walkinForm, firstName: e.target.value })}
                  placeholder="e.g. Ramesh"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={walkinForm.lastName}
                  onChange={(e) => setWalkinForm({ ...walkinForm, lastName: e.target.value })}
                  placeholder="e.g. Sharma"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* 2. Phone Number */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={walkinForm.phone}
                  onChange={(e) => handleWalkinPhoneChange(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* 3. Email ID (Optional) */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Email ID (Optional)</label>
                <input
                  type="email"
                  value={walkinForm.email}
                  onChange={(e) => setWalkinForm({ ...walkinForm, email: e.target.value })}
                  placeholder="guest@example.com (Optional)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* 11. Age */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Age</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={walkinForm.age}
                  onChange={(e) => setWalkinForm({ ...walkinForm, age: e.target.value })}
                  placeholder="e.g. 35"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* 12. Gender */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Gender</label>
                <select
                  value={walkinForm.gender}
                  onChange={(e) => setWalkinForm({ ...walkinForm, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
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
                  value={walkinForm.address}
                  onChange={(e) => setWalkinForm({ ...walkinForm, address: e.target.value })}
                  placeholder="House / Street, Area, City, State"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* 16. Occupation */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Occupation</label>
                <select
                  value={walkinForm.occupation}
                  onChange={(e) => setWalkinForm({ ...walkinForm, occupation: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
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
                  value={walkinForm.idType}
                  onChange={(e) => setWalkinForm({ ...walkinForm, idType: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
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
                  value={walkinForm.idNumber}
                  onChange={(e) => setWalkinForm({ ...walkinForm, idNumber: e.target.value })}
                  placeholder="e.g. 1234-5678-9012"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: STAY SCHEDULE & ROOM ALLOCATION */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
              <BedDouble className="w-4 h-4 text-brand-600" />
              2. Stay Schedule & Room Allocation
            </h4>

            {/* AC / Non-AC Comfort Preference Quick Toggle */}
            <div className="p-3 bg-gradient-to-r from-slate-100 via-brand-50/50 to-slate-100 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                  Room Comfort Preference (AC / Non-AC)
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Automatically allocates suitable {walkinForm.acPreference === 'AC' ? 'Air Conditioned (AC)' : 'Standard Non-AC'} room for {walkinAdults} Adult{walkinAdults > 1 ? 's' : ''}
                </span>
              </div>
              <div className="inline-flex rounded-lg p-1 bg-white border border-slate-200 shadow-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleAcPreferenceToggle('NON_AC')}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                    walkinForm.acPreference === 'NON_AC'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span>🌀 Non-AC</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAcPreferenceToggle('AC')}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                    walkinForm.acPreference === 'AC'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span>❄️ AC Room</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              {/* 5. Arrival Date */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Arrival Date *</label>
                <input
                  type="date"
                  required
                  value={walkinForm.arrivalDate}
                  onChange={(e) => setWalkinForm({ ...walkinForm, arrivalDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* 6. Arrival Time */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Arrival Time *</label>
                <input
                  type="time"
                  required
                  value={walkinForm.arrivalTime}
                  onChange={(e) => setWalkinForm({ ...walkinForm, arrivalTime: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* 9. Departure Date */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Departure Date *</label>
                <input
                  type="date"
                  required
                  value={walkinForm.departureDate}
                  onChange={(e) => setWalkinForm({ ...walkinForm, departureDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* 10. Departure Time + Days Stayed */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-semibold text-slate-700 uppercase text-[11px]">Departure Time</label>
                  <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                    {walkinDaysStayed} Day{walkinDaysStayed > 1 ? 's' : ''} Stayed
                  </span>
                </div>
                <input
                  type="time"
                  required
                  value={walkinForm.departureTime}
                  onChange={(e) => setWalkinForm({ ...walkinForm, departureTime: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-200/60 text-xs">
              {/* 7. Room Type */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 uppercase text-[11px]">Room Type *</label>
                  <span className="font-mono font-bold text-brand-700 text-xs">
                    Rate: ₹{walkinPricePerNight} / night
                  </span>
                </div>
                <select
                  required
                  value={walkinForm.roomTypeId}
                  onChange={(e) => setWalkinForm({ ...walkinForm, roomTypeId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} ({rt.code}) — Base ₹{rt.baseRate}/night
                    </option>
                  ))}
                </select>
              </div>

              {/* 8. Room Number (Auto Allocated based on availability) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 uppercase text-[11px]">Room Number *</label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {walkinAutoAllocatedRoom ? `Auto-Allocated: Room ${walkinAutoAllocatedRoom.roomNumber}` : 'No Clean Room Available'}
                  </span>
                </div>
                <select
                  required
                  value={walkinForm.roomId}
                  onChange={(e) => setWalkinForm({ ...walkinForm, roomId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {availableRooms.length === 0 ? (
                    <option value="">No Clean Room Available for Stay Dates</option>
                  ) : (
                    availableRooms.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        Room {pr.roomNumber} ({pr.floor})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* 13. Adults */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Number of Adults *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={walkinForm.adults}
                  onChange={(e) => setWalkinForm({ ...walkinForm, adults: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* 14. Children */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Number of Children</label>
                <input
                  type="number"
                  min="0"
                  value={walkinForm.children}
                  onChange={(e) => setWalkinForm({ ...walkinForm, children: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* 15. Coming From */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Coming From (Origin)</label>
                <input
                  type="text"
                  value={walkinForm.comingFrom}
                  onChange={(e) => setWalkinForm({ ...walkinForm, comingFrom: e.target.value })}
                  placeholder="e.g. Guwahati, Delhi, Kolkata"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* 17. Purpose of Visit */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Purpose of Visit</label>
                <select
                  value={walkinForm.purposeOfVisit}
                  onChange={(e) => setWalkinForm({ ...walkinForm, purposeOfVisit: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                >
                  <option value="Tourism / Leisure">Tourism / Leisure</option>
                  <option value="Business / Corporate">Business / Corporate</option>
                  <option value="Personal / Family">Personal / Family</option>
                  <option value="Official / Government">Official / Government</option>
                  <option value="Medical / Health">Medical / Health</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: FINAL BILLING, PRICING & DIRECT CHECK-IN PAYMENT */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white space-y-4 border border-slate-700 shadow-md">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-400" />
                3. Final Price Calculation & Advance Deposit
              </span>
              <span className="text-[11px] text-emerald-400 font-mono font-bold">
                Occupancy: {walkinAdults} Adult(s){walkinChildren > 0 ? `, ${walkinChildren} Child` : ''}
              </span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Nightly Tariff ({selectedWalkinRoomType?.name}):</span>
                  <span className="font-mono font-bold">₹{walkinPricePerNight} / night</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Stay Duration:</span>
                  <span className="font-mono font-bold">{walkinDaysStayed} Night(s)</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Room Subtotal:</span>
                  <span className="font-mono font-bold">₹{walkinRoomSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-rose-300">
                  <span>Discount Applied (₹):</span>
                  <input
                    type="number"
                    min="0"
                    value={walkinForm.discountAmount}
                    onChange={(e) => setWalkinForm({ ...walkinForm, discountAmount: e.target.value })}
                    className="w-24 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-right font-mono text-white text-xs"
                  />
                </div>
                <div className="flex justify-between text-emerald-400/90 text-[11px]">
                  <span>GST Tax (5%):</span>
                  <span className="font-medium">Included in Tariff (₹{walkinGstTaxVal.toFixed(2)})</span>
                </div>
              </div>

              {/* Total Price & Payment Card */}
              <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">Total Payable:</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    ₹{walkinTotalPrice.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      Deposit Paid (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={walkinForm.depositAmount}
                      onChange={(e) => setWalkinForm({ ...walkinForm, depositAmount: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={walkinForm.paymentMethod}
                      onChange={(e) => setWalkinForm({ ...walkinForm, paymentMethod: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI / QR</option>
                      <option value="CARD">Credit / Debit Card</option>
                      <option value="NET_BANKING">Net Banking</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                  <span>Balance Due on Checkout:</span>
                  <span className={`font-mono font-bold ${walkinBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    ₹{walkinBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsWalkinOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Direct Check-in...</span>
                </>
              ) : (
                <span>Complete Walk-in Check-in (Instant Stay)</span>
              )}
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

          {/* Option to generate GST or Non-GST Bill in Payment Box */}
          {selectedRes?.isBilled ? (
            <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-700" />
                  <span className="text-xs font-bold text-purple-900">
                    Final {selectedRes.billType === 'NON_GST' ? 'Non-GST' : 'GST'} Bill Generated & Locked
                  </span>
                </div>
                <Badge variant="success">LOCKED</Badge>
              </div>
              <p className="text-[11px] text-purple-800">
                The bill for this stay has been finalized. Any payment recorded will be applied to this locked bill.
              </p>
              <button
                type="button"
                onClick={() => handleViewGeneratedBill(selectedRes)}
                disabled={fetchingInvoice}
                className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                <span>{fetchingInvoice ? 'Loading Final Bill...' : 'View Final Generated Bill'}</span>
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Generate Bill Option
                </label>
                <span className="text-[10px] text-slate-500 font-semibold">GST or Non-GST</span>
              </div>

              {/* Toggle GST vs Non-GST */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBillType('GST')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    billType === 'GST'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>GST Bill (5%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillType('NON_GST')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    billType === 'NON_GST'
                      ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Non-GST Bill</span>
                </button>
              </div>

              {billType === 'GST' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Customer GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono"
                  />
                </div>
              )}

              <div className="pt-1 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recordPaymentWithBill}
                    onChange={(e) => setRecordPaymentWithBill(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Generate Bill upon recording payment</span>
                </label>

                <button
                  type="button"
                  onClick={() => handleGenerateBill(selectedRes.id, billType, customerGstin)}
                  disabled={generatingBill}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                >
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{generatingBill ? 'Generating...' : 'Generate Bill Now'}</span>
                </button>
              </div>
            </div>
          )}

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

      {/* Modal 7: Room Service / Order Item */}
      <Modal
        isOpen={isRoomServiceOpen}
        onClose={() => setIsRoomServiceOpen(false)}
        title={`Add Room Order / Charge — Room ${selectedRes?.assignedRoom?.roomNumber || ''}`}
        maxWidth="lg"
      >
        <form onSubmit={handlePostRoomCharge} className="space-y-4">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block">
                Guest: {selectedRes?.guest?.displayName || 'In-House Guest'}
              </span>
              <span className="text-[11px] text-blue-700">
                Booking Ref: {selectedRes?.reservationRef} • Room {selectedRes?.assignedRoom?.roomNumber || 'N/A'}
              </span>
            </div>
            <Badge variant="info">In-House Stay</Badge>
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
              disabled={submitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Posting Charge...</span>
                </>
              ) : (
                <>
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>
                    Post ₹{((parseInt(serviceForm.quantity || '1', 10) || 1) * (parseFloat(serviceForm.unitPrice || '0') || 0)).toFixed(2)} to Room {selectedRes?.assignedRoom?.roomNumber || ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 8: Final Generated Bill Viewer & Print Voucher */}
      <Modal
        isOpen={isBillViewerOpen}
        onClose={() => setIsBillViewerOpen(false)}
        title={
          generatedInvoice?.isGstBill || generatedInvoice?.invoiceType === 'GST'
            ? `GST Tax Invoice: ${generatedInvoice?.invoiceRef || ''}`
            : `Hotel Bill & Receipt: ${generatedInvoice?.invoiceRef || ''}`
        }
        maxWidth="3xl"
      >
        {generatedInvoice ? (
          <div className="space-y-4">
            {/* Printable Container */}
            <div
              id="printable-bill"
              className="p-6 bg-white border border-slate-200 rounded-2xl space-y-5 text-xs text-slate-800 shadow-sm"
            >
              {/* Hotel Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">INDIRA LODGE</h2>
                  <p className="text-slate-500 font-medium">Solicitor Lodge, Near ASTC, Malow Ali, Jorhat, Assam - 781005</p>
                  <p className="text-slate-500 font-medium">Contact: +91 70028 90165 • info@indiralodge.com</p>
                  <p className="text-slate-700 font-bold mt-1">
                    GSTIN: <span className="font-mono">18AOIPB2857A1ZB</span> • State Code: 18
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className={`inline-block px-3 py-1 rounded-md text-xs font-black tracking-wider uppercase ${
                      generatedInvoice.isGstBill || generatedInvoice.invoiceType === 'GST'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-800 text-white'
                    }`}
                  >
                    {generatedInvoice.isGstBill || generatedInvoice.invoiceType === 'GST'
                      ? 'TAX INVOICE'
                      : 'HOTEL BILL & RECEIPT'}
                  </div>
                  <div className="mt-1 font-mono font-extrabold text-sm text-slate-900">
                    {generatedInvoice.invoiceRef}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Date:{' '}
                    <span className="font-semibold text-slate-700">
                      {new Date(generatedInvoice.invoiceDate || generatedInvoice.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Status: <span className="font-bold text-emerald-600 uppercase">{generatedInvoice.status || 'ISSUED'}</span>
                  </div>
                </div>
              </div>

              {/* Guest & Stay Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Guest Name</span>
                  <span className="font-extrabold text-slate-900 text-xs">
                    {generatedInvoice.guest?.displayName || 'Guest'}
                  </span>
                  <span className="block text-slate-500 text-[10px]">{generatedInvoice.guest?.phone || '—'}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Customer GSTIN</span>
                  <span className="font-mono font-bold text-slate-800">
                    {generatedInvoice.customerGstin ||
                      (generatedInvoice.isGstBill || generatedInvoice.invoiceType === 'GST'
                        ? 'Unregistered / B2C'
                        : 'N/A')}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Room & Category</span>
                  <span className="font-extrabold text-slate-900">
                    Room {generatedInvoice.reservation?.assignedRoom?.roomNumber || selectedRes?.assignedRoom?.roomNumber || '—'}
                  </span>
                  <span className="block text-slate-500 text-[10px]">
                    {generatedInvoice.reservation?.roomType?.name || selectedRes?.roomType?.name || 'Standard'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Booking Reference</span>
                  <span className="font-mono font-bold text-brand-700">
                    {generatedInvoice.reservation?.reservationRef || selectedRes?.reservationRef || '—'}
                  </span>
                  <span className="block text-slate-500 text-[10px]">
                    Stay: {generatedInvoice.reservation?.nights || selectedRes?.nights || 1} Night(s)
                  </span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-y border-slate-200 uppercase text-[10px] tracking-wider">
                      <th className="py-2 px-2.5 text-left w-8">#</th>
                      <th className="py-2 px-2.5 text-left">Particulars / Description</th>
                      {(generatedInvoice.isGstBill || generatedInvoice.invoiceType === 'GST') && (
                        <th className="py-2 px-2 text-center">HSN/SAC</th>
                      )}
                      <th className="py-2 px-2 text-center w-12">Qty</th>
                      <th className="py-2 px-2.5 text-right w-20">Rate (₹)</th>
                      {(generatedInvoice.isGstBill || generatedInvoice.invoiceType === 'GST') && (
                        <>
                          <th className="py-2 px-2.5 text-right w-20">Taxable (₹)</th>
                          <th className="py-2 px-2 text-right w-16">CGST (2.5%)</th>
                          <th className="py-2 px-2 text-right w-16">SGST (2.5%)</th>
                        </>
                      )}
                      <th className="py-2 px-2.5 text-right w-24">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {generatedInvoice.lines?.map((line: any, idx: number) => (
                      <tr key={line.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-2.5 text-slate-900 font-semibold">{line.description}</td>
                        {(generatedInvoice.isGstBill || generatedInvoice.invoiceType === 'GST') && (
                          <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600">
                            {line.hsnSacCode || '996311'}
                          </td>
                        )}
                        <td className="py-2 px-2 text-center font-mono">{line.quantity || 1}</td>
                        <td className="py-2 px-2.5 text-right font-mono">
                          ₹{Number(line.unitPrice || 0).toFixed(2)}
                        </td>
                        {(generatedInvoice.isGstBill || generatedInvoice.invoiceType === 'GST') && (
                          <>
                            <td className="py-2 px-2.5 text-right font-mono text-slate-700">
                              ₹{Number(line.taxableAmount || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">
                              ₹{Number(line.cgstAmount || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">
                              ₹{Number(line.sgstAmount || 0).toFixed(2)}
                            </td>
                          </>
                        )}
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                          ₹{Number(line.totalAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals Calculation Box */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end pt-3 border-t border-slate-200 gap-4">
                <div className="text-[11px] text-slate-500 max-w-xs space-y-1">
                  <div className="font-semibold text-slate-700">Terms & Conditions:</div>
                  <p>1. Check-out time is 11:00 AM.</p>
                  <p>2. Room tariffs are inclusive of applicable GST taxes.</p>
                  <p>3. This computer generated bill is final and acknowledged.</p>
                </div>

                <div className="w-full sm:w-72 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Subtotal:</span>
                    <span className="font-mono font-semibold">₹{Number(generatedInvoice.subtotal || 0).toFixed(2)}</span>
                  </div>

                  {Number(generatedInvoice.discount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span className="font-mono font-semibold">-₹{Number(generatedInvoice.discount || 0).toFixed(2)}</span>
                    </div>
                  )}

                  {(generatedInvoice.isGstBill || generatedInvoice.invoiceType === 'GST') && (
                    <>
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>CGST (2.5%):</span>
                        <span className="font-mono">₹{Number(generatedInvoice.cgstAmount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>SGST (2.5%):</span>
                        <span className="font-mono">₹{Number(generatedInvoice.sgstAmount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700 font-semibold text-[11px] border-t border-slate-200/60 pt-1">
                        <span>Total GST (5% Included):</span>
                        <span className="font-mono">
                          ₹{(Number(generatedInvoice.cgstAmount || 0) + Number(generatedInvoice.sgstAmount || 0)).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between border-t-2 border-slate-300 pt-2 text-sm font-black text-slate-900">
                    <span>Grand Total:</span>
                    <span className="font-mono text-emerald-700">
                      ₹{Number(generatedInvoice.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Locked System Banner */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2.5 text-purple-900 text-xs">
                <Lock className="w-4 h-4 text-purple-700 flex-shrink-0" />
                <div className="leading-snug">
                  <span className="font-bold block">
                    FINAL GENERATED BILL — LOCKED & REGISTERED
                  </span>
                  <span className="text-[11px] text-purple-800">
                    This bill has been officially locked. No modifications, edits, or extra items can be altered on this finalized bill.
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                Bill Reference: <strong className="font-mono text-slate-800">{generatedInvoice.invoiceRef}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBillViewerOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const printContents = document.getElementById('printable-bill')?.innerHTML;
                    if (!printContents) {
                      window.print();
                      return;
                    }
                    const printWindow = window.open('', '', 'height=700,width=900');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>${generatedInvoice.invoiceRef} - Indira Lodge</title>
                            <style>
                              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; }
                              table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
                              th, td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
                              th { background: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 10px; }
                              .text-right { text-align: right; }
                              .text-center { text-align: center; }
                              .font-mono { font-family: monospace; }
                              .font-bold { font-weight: bold; }
                              .border-b { border-bottom: 1px solid #e2e8f0; }
                              .border-t { border-top: 1px solid #e2e8f0; }
                              .text-xl { font-size: 20px; }
                              .text-sm { font-size: 14px; }
                              .text-xs { font-size: 12px; }
                              .text-slate-500 { color: #64748b; }
                              .bg-slate-50 { background: #f8fafc; }
                              .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
                              @media print { body { padding: 0; } }
                            </style>
                          </head>
                          <body>${printContents}</body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => {
                        printWindow.print();
                        printWindow.close();
                      }, 300);
                    } else {
                      window.print();
                    }
                  }}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Final Bill</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
            Loading bill details...
          </div>
        )}
      </Modal>
    </div>
  );
}
