'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BedDouble,
  Layers,
  Plus,
  Filter,
  RefreshCw,
  Loader2,
  Sparkles,
  Wrench,
  X,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  User,
  Calendar,
  Phone,
  Receipt,
  Trash2,
  CheckCircle,
  LogOut,
  UtensilsCrossed,
  Coffee,
  ShoppingBag,
  PlusCircle,
  GlassWater,
  Lock,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { getStayDayInfo } from '@/lib/billPrinter';
import { calculateIndiraLodgeRoomRate } from '@/lib/roomRates';
import { validateStayDatesAndTimes } from '@/lib/dateUtils';

const getCurrentTimeString = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

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

export default function RoomsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'map' | 'inventory' | 'types'>('map');
  const [loading, setLoading] = useState(true);

  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);

  // Selected Room Drawer State
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  // Modals state
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Walk-in Direct Check-In State
  const [isWalkinOpen, setIsWalkinOpen] = useState(false);
  const [walkinAutoAllocatedRoom, setWalkinAutoAllocatedRoom] = useState<any>(null);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [guestSearchQuery, setGuestSearchQuery] = useState('');
  const [matchedGuests, setMatchedGuests] = useState<any[]>([]);
  const [selectedGuestProfile, setSelectedGuestProfile] = useState<any>(null);
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);

  const [walkinForm, setWalkinForm] = useState({
    guestId: undefined as string | undefined,
    firstName: '',
    lastName: '',
    phone: '+91 ',
    email: '',
    address: '',
    city: '',
    state: '',
    arrivalDate: new Date().toISOString().split('T')[0],
    arrivalTime: getCurrentTimeString(),
    acPreference: 'NON_AC' as 'NON_AC' | 'AC',
    roomTypeId: '',
    roomId: '',
    departureDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
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
    roomRate: '',
    depositAmount: '0',
    paymentMethod: 'CASH',
    specialRequests: '',
  });

  // Room Service & Extra Item Charges State
  const [isRoomServiceOpen, setIsRoomServiceOpen] = useState(false);
  const [roomExtraCharges, setRoomExtraCharges] = useState<any[]>([]);
  const [loadingCharges, setLoadingCharges] = useState(false);
  const [postingCharge, setPostingCharge] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    description: 'Packaged Drinking Water Bottle (1L)',
    category: 'FOOD_BEVERAGE',
    quantity: '1',
    unitPrice: '20',
    notes: '',
    orderDate: new Date().toISOString().split('T')[0],
  });

  // New Physical Room Form State
  const [newRoom, setNewRoom] = useState({
    roomNumber: '',
    roomTypeId: '',
    floor: 'Floor 1',
  });

  // New Room Type Form State (Single Bed, Double Bed, Triple Bed preset handling)
  const [newType, setNewType] = useState({
    code: '',
    name: '',
    description: '',
    bedType: 'Single Bed',
    adultsCapacity: '1',
    childrenCapacity: '1',
    maxOccupancy: '2',
    baseRate: '2500',
    extraAdultRate: '800',
    extraChildRate: '400',
  });

  // Maintenance Block Form State
  const [blockForm, setBlockForm] = useState({
    reason: 'Routine Air Conditioner Maintenance',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRooms, resTypes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/room-types'),
      ]);

      if (resRooms.ok && resTypes.ok) {
        const roomsData = await resRooms.json();
        const typesData = await resTypes.json();

        setRooms(roomsData.rooms || []);
        setRoomTypes(typesData.roomTypes || []);

        if (typesData.roomTypes?.length > 0 && !newRoom.roomTypeId) {
          setNewRoom((prev) => ({ ...prev, roomTypeId: typesData.roomTypes[0].id }));
        }
      }
    } catch (e) {
      showToast('Failed to fetch rooms and categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-allocate Room Category / AC Preference toggle
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

  // Open Direct Check-in Modal for a specific selected room
  const openWalkinModalForRoom = async (room: any) => {
    const isDirtyOrCleaning = room?.housekeepingStatus === 'DIRTY' || room?.housekeepingStatus === 'CLEANING';
    const isBlocked = room?.availabilityStatus === 'BLOCKED' || room?.maintenanceStatus !== 'OPERATIONAL';
    const isOccupied = room?.availabilityStatus === 'OCCUPIED' || (room?.reservations && room.reservations.length > 0 && room.reservations[0].status === 'CHECKED_IN');
    const isReserved = room?.availabilityStatus === 'RESERVED' || (room?.reservations && room.reservations.length > 0 && room.reservations[0].status === 'CONFIRMED');

    if (isDirtyOrCleaning || isBlocked || isOccupied || isReserved) {
      showToast(
        isDirtyOrCleaning
          ? `Room ${room?.roomNumber} is ${room?.housekeepingStatus?.toLowerCase()}. Only clean and vacant rooms can be checked in.`
          : isBlocked
          ? `Room ${room?.roomNumber} is blocked for maintenance.`
          : isOccupied
          ? `Room ${room?.roomNumber} is currently occupied.`
          : `Room ${room?.roomNumber} is reserved for a confirmed booking.`,
        'error'
      );
      return;
    }

    setSelectedGuestProfile(null);
    setGuestSearchQuery('');
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const targetRoomTypeId = room?.roomTypeId || roomTypes[0]?.id || '';
    const roomTypeObj = roomTypes.find((rt) => rt.id === targetRoomTypeId) || room?.roomType;
    const prefAc = isAcRoomType(roomTypeObj) ? 'AC' : 'NON_AC';

    setWalkinAutoAllocatedRoom(room);

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
      acPreference: prefAc,
      roomTypeId: targetRoomTypeId,
      roomId: room?.id || '',
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
      roomRate: '',
      depositAmount: '0',
      paymentMethod: 'CASH',
      specialRequests: '',
    });

    try {
      const res = await fetch(
        `/api/availability?arrivalDate=${encodeURIComponent(todayStr)}&departureDate=${encodeURIComponent(tomorrowStr)}${targetRoomTypeId ? `&roomTypeId=${targetRoomTypeId}` : ''}&requireClean=true`
      );
      if (res.ok) {
        const data = await res.json();
        let availRooms = data.availablePhysicalRooms || [];
        const isRoomClean = room && (room.housekeepingStatus === 'CLEAN' || room.housekeepingStatus === 'INSPECTED') && room.maintenanceStatus === 'OPERATIONAL' && room.availabilityStatus !== 'BLOCKED';
        if (isRoomClean && !availRooms.some((r: any) => r.id === room.id)) {
          availRooms = [room, ...availRooms];
        }
        setAvailableRooms(availRooms);
        setWalkinForm((prev) => ({
          ...prev,
          roomId: room ? room.id : (availRooms[0]?.id || ''),
        }));
      } else {
        setAvailableRooms(room ? [room] : []);
        setWalkinForm((prev) => ({ ...prev, roomId: room ? room.id : '' }));
      }
    } catch (e) {
      setAvailableRooms(room ? [room] : []);
      setWalkinForm((prev) => ({ ...prev, roomId: room ? room.id : '' }));
    }

    setIsWalkinOpen(true);
  };

  // Fetch Available Rooms & Auto-allocate Physical Room when dates or roomType change
  useEffect(() => {
    if (!walkinForm.roomTypeId || !walkinForm.arrivalDate || !walkinForm.departureDate || !isWalkinOpen) return;

    const fetchAvailability = async () => {
      try {
        const res = await fetch(
          `/api/availability?arrivalDate=${encodeURIComponent(walkinForm.arrivalDate)}&departureDate=${encodeURIComponent(walkinForm.departureDate)}&roomTypeId=${walkinForm.roomTypeId}&requireClean=true`
        );
        if (res.ok) {
          const data = await res.json();
          let roomsList = data.availablePhysicalRooms || [];
          const allocatedRoom = walkinAutoAllocatedRoom || selectedRoom;
          const isAllocatedCleanAndVacant =
            allocatedRoom &&
            (allocatedRoom.housekeepingStatus === 'CLEAN' || allocatedRoom.housekeepingStatus === 'INSPECTED') &&
            allocatedRoom.maintenanceStatus === 'OPERATIONAL' &&
            allocatedRoom.availabilityStatus !== 'BLOCKED' &&
            allocatedRoom.availabilityStatus !== 'OCCUPIED' &&
            (!allocatedRoom.reservations || allocatedRoom.reservations.length === 0);

          if (isAllocatedCleanAndVacant && allocatedRoom.roomTypeId === walkinForm.roomTypeId && !roomsList.some((r: any) => r.id === allocatedRoom.id)) {
            roomsList = [allocatedRoom, ...roomsList];
          }
          setAvailableRooms(roomsList);
          if (roomsList.length > 0) {
            const hasCurrent = walkinForm.roomId && roomsList.some((r: any) => r.id === walkinForm.roomId);
            const targetId = hasCurrent
              ? walkinForm.roomId
              : (allocatedRoom && roomsList.some((r: any) => r.id === allocatedRoom.id) ? allocatedRoom.id : roomsList[0].id);
            setWalkinForm((prev) => ({
              ...prev,
              roomId: targetId,
            }));
            const foundObj = roomsList.find((r: any) => r.id === targetId) || roomsList[0];
            setWalkinAutoAllocatedRoom(foundObj);
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
  const standardWalkinPricePerNight = selectedWalkinRoomType
    ? calculateIndiraLodgeRoomRate(selectedWalkinRoomType.code, walkinAdults, walkinChildren, selectedWalkinRoomType.baseRate)
    : 0;

  const walkinPricePerNight =
    walkinForm.roomRate !== '' && !isNaN(parseFloat(walkinForm.roomRate))
      ? Math.max(0, parseFloat(walkinForm.roomRate))
      : standardWalkinPricePerNight;

  const walkinRoomSubtotal = walkinPricePerNight * walkinDaysStayed;
  const walkinTotalPrice = Math.max(0, walkinRoomSubtotal);
  const walkinGstTaxVal = Math.round((walkinTotalPrice * 0.05) * 100) / 100;
  const walkinTaxableVal = Math.round((walkinTotalPrice - walkinGstTaxVal) * 100) / 100;
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

  const handleWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalkinSubmitting(true);

    const dateValidation = validateStayDatesAndTimes(
      walkinForm.arrivalDate,
      walkinForm.arrivalTime,
      walkinForm.departureDate,
      walkinForm.departureTime
    );
    if (!dateValidation.valid) {
      showToast(dateValidation.error || 'Arrival date and time must be before departure date and time.', 'error');
      setWalkinSubmitting(false);
      return;
    }

    try {
      const targetRoomId = walkinForm.roomId || walkinAutoAllocatedRoom?.id || (availableRooms.length > 0 ? availableRooms[0].id : '');
      if (!targetRoomId) {
        showToast('No room allocated for check-in.', 'error');
        setWalkinSubmitting(false);
        return;
      }

      const payload = {
        ...walkinForm,
        roomId: targetRoomId,
        customRoomRate: walkinPricePerNight,
        roomRate: walkinPricePerNight,
        discountAmount: 0,
      };

      const res = await fetch('/api/front-desk/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Walk-in check-in failed', 'error');
        setWalkinSubmitting(false);
        return;
      }

      showToast(`Walk-in guest ${walkinForm.firstName} ${walkinForm.lastName} checked in successfully!`, 'success');
      setIsWalkinOpen(false);

      // Refresh room list and update selectedRoom drawer if open
      await fetchData();
      try {
        const resRooms = await fetch('/api/rooms');
        if (resRooms.ok) {
          const roomsData = await resRooms.json();
          const updated = (roomsData.rooms || []).find((r: any) => r.id === targetRoomId);
          if (updated) {
            setSelectedRoom(updated);
          }
        }
      } catch (err) {}
    } catch (e) {
      showToast('Error completing walk-in', 'error');
    } finally {
      setWalkinSubmitting(false);
    }
  };

  // Update Bed Type Presets
  const handleBedTypePresetChange = (selectedBedType: string) => {
    let adultsCap = '1';
    let childrenCap = '1';
    let maxOcc = '2';

    if (selectedBedType === 'Double Bed') {
      adultsCap = '2';
      childrenCap = '2';
      maxOcc = '4';
    } else if (selectedBedType === 'Triple Bed') {
      adultsCap = '3';
      childrenCap = '3';
      maxOcc = '6';
    }

    setNewType((prev) => ({
      ...prev,
      bedType: selectedBedType,
      adultsCapacity: adultsCap,
      childrenCapacity: childrenCap,
      maxOccupancy: maxOcc,
    }));
  };

  const handleUpdateRoomStatus = async (roomId: string, field: string, value: string) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, [field]: value }),
      });

      if (res.ok) {
        showToast('Room status updated successfully', 'success');
        fetchData();
        if (selectedRoom && selectedRoom.id === roomId) {
          setSelectedRoom((prev: any) => ({ ...prev, [field]: value }));
        }
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update status', 'error');
      }
    } catch (e) {
      showToast('Error updating status', 'error');
    }
  };

  const handleClearMaintenance = async (roomId: string) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          maintenanceStatus: 'OPERATIONAL',
          availabilityStatus: 'AVAILABLE',
          housekeepingStatus: 'CLEAN',
        }),
      });

      if (res.ok) {
        showToast('Room cleared from maintenance — now Available & Clean!', 'success');
        fetchData();
        if (selectedRoom && selectedRoom.id === roomId) {
          setSelectedRoom((prev: any) => ({
            ...prev,
            maintenanceStatus: 'OPERATIONAL',
            availabilityStatus: 'AVAILABLE',
            housekeepingStatus: 'CLEAN',
          }));
        }
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to clear maintenance', 'error');
      }
    } catch (e) {
      showToast('Error clearing maintenance', 'error');
    }
  };

  const [checkingOut, setCheckingOut] = useState(false);

  const handleRoomCheckout = async (reservationId: string, guestName: string, roomNumber: string) => {
    if (!confirm(`Check out ${guestName} from Room ${roomNumber}?\n\nThis will mark the room as DIRTY for housekeeping.`)) return;
    setCheckingOut(true);
    try {
      const res = await fetch('/api/front-desk/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, overrideBalance: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresOverride) {
          const reason = prompt(
            `Outstanding balance \u20b9${Number(data.outstandingBalance || 0).toFixed(2)}.\n\nEnter manager override reason to proceed anyway:`
          );
          if (!reason) { setCheckingOut(false); return; }
          const res2 = await fetch('/api/front-desk/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservationId, overrideBalance: true, overrideReason: reason }),
          });
          const data2 = await res2.json();
          if (!res2.ok) {
            showToast(data2.error || 'Checkout failed', 'error');
            setCheckingOut(false);
            return;
          }
        } else {
          showToast(data.error || 'Checkout failed', 'error');
          setCheckingOut(false);
          return;
        }
      }
      showToast(`${guestName} checked out. Room ${roomNumber} queued for housekeeping.`, 'success');
      setSelectedRoom(null);
      fetchData();
    } catch {
      showToast('Error completing checkout', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  const loadRoomCharges = async (roomId: string) => {
    setLoadingCharges(true);
    try {
      const res = await fetch(`/api/front-desk/room-charges?roomId=${roomId}`);
      if (res.ok) {
        const data = await res.json();
        setRoomExtraCharges(data.extraCharges || []);
      } else {
        setRoomExtraCharges([]);
      }
    } catch {
      setRoomExtraCharges([]);
    } finally {
      setLoadingCharges(false);
    }
  };

  useEffect(() => {
    if (selectedRoom?.id && (selectedRoom.availabilityStatus === 'OCCUPIED' || selectedRoom.reservations?.length > 0)) {
      loadRoomCharges(selectedRoom.id);
    } else {
      setRoomExtraCharges([]);
    }
  }, [selectedRoom?.id]);

  const handlePostRoomCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom?.id) return;
    setPostingCharge(true);
    try {
      const qty = parseInt(serviceForm.quantity || '1', 10);
      const price = parseFloat(serviceForm.unitPrice || '0');
      const res = await fetch('/api/front-desk/room-charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          description: serviceForm.description,
          category: serviceForm.category,
          quantity: qty,
          unitPrice: price,
          notes: serviceForm.notes,
          orderDate: serviceForm.orderDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to post room charge', 'error');
        setPostingCharge(false);
        return;
      }
      showToast('Room charge posted successfully!', 'success');
      setIsRoomServiceOpen(false);
      setServiceForm({
        description: 'Packaged Drinking Water Bottle (1L)',
        category: 'FOOD_BEVERAGE',
        quantity: '1',
        unitPrice: '20',
        notes: '',
        orderDate: new Date().toISOString().split('T')[0],
      });
      loadRoomCharges(selectedRoom.id);
      fetchData();

      // Instantly update selectedRoom drawer balance
      setSelectedRoom((prev: any) => {
        if (!prev) return prev;
        const copy = JSON.parse(JSON.stringify(prev));
        if (copy.reservations?.[0]) {
          const added = Math.round(qty * price * 100) / 100;
          if (copy.reservations[0].folios?.[0]) {
            copy.reservations[0].folios[0].balanceAmount = (copy.reservations[0].folios[0].balanceAmount || 0) + added;
            copy.reservations[0].folios[0].totalCharges = (copy.reservations[0].folios[0].totalCharges || 0) + added;
          }
          copy.reservations[0].balanceAmount = (copy.reservations[0].balanceAmount || 0) + added;
          copy.reservations[0].totalAmount = (copy.reservations[0].totalAmount || 0) + added;
        }
        return copy;
      });
    } catch {
      showToast('Error posting room charge', 'error');
    } finally {
      setPostingCharge(false);
    }
  };

  const handleDeleteRoomCharge = async (transactionId: string, description: string) => {
    if (!confirm(`Are you sure you want to delete the room order "${description}"? This will reverse the charge.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/front-desk/room-charges?transactionId=${transactionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to delete room order', 'error');
        return;
      }
      showToast(data.message || 'Room order deleted successfully!', 'success');
      if (selectedRoom?.id) {
        loadRoomCharges(selectedRoom.id);
      }
      fetchData();
    } catch {
      showToast('Error deleting room order', 'error');
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoom),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create room', 'error');
        setSubmitting(false);
        return;
      }

      showToast(`Room ${newRoom.roomNumber} created successfully!`, 'success');
      setIsAddRoomOpen(false);
      setNewRoom({ roomNumber: '', roomTypeId: roomTypes[0]?.id || '', floor: 'Floor 1' });
      fetchData();
    } catch (e) {
      showToast('Error creating room', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/room-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newType),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create room category', 'error');
        setSubmitting(false);
        return;
      }

      showToast(`Room Category ${newType.name} created!`, 'success');
      setIsAddTypeOpen(false);
      fetchData();
    } catch (e) {
      showToast('Error creating room category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async (roomId: string, roomNumber: string) => {
    if (!confirm(`Are you sure you want to permanently delete Room ${roomNumber}?`)) return;

    try {
      const res = await fetch(`/api/rooms?id=${roomId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to delete room', 'error');
        return;
      }

      showToast(`Room ${roomNumber} deleted from inventory.`, 'success');
      if (selectedRoom?.id === roomId) setSelectedRoom(null);
      fetchData();
    } catch (e) {
      showToast('Error deleting room', 'error');
    }
  };

  const handleDeleteRoomType = async (typeId: string, typeName: string) => {
    if (!confirm(`Are you sure you want to delete room category '${typeName}'?`)) return;

    try {
      const res = await fetch(`/api/room-types?id=${typeId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to delete room category', 'error');
        return;
      }

      showToast(`Room category '${typeName}' deleted.`, 'success');
      fetchData();
    } catch (e) {
      showToast('Error deleting room category', 'error');
    }
  };

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setSubmitting(true);

    try {
      await handleUpdateRoomStatus(selectedRoom.id, 'availabilityStatus', 'BLOCKED');
      await handleUpdateRoomStatus(selectedRoom.id, 'maintenanceStatus', 'UNDER_MAINTENANCE');
      showToast(`Room ${selectedRoom.roomNumber} blocked for maintenance.`, 'info');
      setIsBlockOpen(false);
    } catch (e) {
      showToast('Error blocking room', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const groupedByFloor = rooms.reduce((acc: any, r: any) => {
    const fl = r.floor || 'Unassigned';
    if (!acc[fl]) acc[fl] = [];
    acc[fl].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BedDouble className="w-6 h-6 text-brand-600" />
            Rooms & Inventory Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visual room map matrix, housekeeping queue, Single/Double/Triple bed capacities, and physical inventory controls
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddRoomOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Room Number
          </button>

          <button
            onClick={() => setIsAddTypeOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <Layers className="w-4 h-4" />
            Create Category
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 overflow-x-auto pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'map' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Visual Room Map Matrix
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'inventory' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BedDouble className="w-4 h-4" />
            Inventory List ({rooms.length})
          </button>

          <button
            onClick={() => setActiveTab('types')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'types' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            Room Categories ({roomTypes.length})
          </button>
        </div>

        <button onClick={fetchData} className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: VISUAL ROOM MAP */}
      {activeTab === 'map' && (
        <div className="space-y-6">
          {/* Status Color Legend */}
          <div className="flex flex-wrap items-center gap-4 p-3.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold shadow-xs">
            <span className="text-slate-500 uppercase tracking-wider text-[11px] font-bold">Room Matrix Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs" />
              <span className="text-slate-700 font-bold">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-600 shadow-xs animate-pulse" />
              <span className="text-rose-700 font-bold">Occupied (Guest In-House)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 shadow-xs" />
              <span className="text-blue-700 font-bold">Reserved (Confirmed Booking)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-xs" />
              <span className="text-amber-700 font-bold">Dirty (Housekeeping Needed)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-500 shadow-xs" />
              <span className="text-slate-700 font-bold">Maintenance / Blocked</span>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600 mx-auto mb-2" />
              Loading room matrix...
            </div>
          ) : Object.keys(groupedByFloor).length === 0 ? (
            <div className="pmfs-card p-12 text-center text-xs text-slate-500">
              No rooms added to inventory yet. Click "Add Room Number" above.
            </div>
          ) : (
            Object.entries(groupedByFloor).map(([floor, floorRooms]: [string, any]) => {
              return (
                <div key={floor} className="pmfs-card p-5 space-y-3">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    {floor} ({floorRooms.length} Rooms)
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {floorRooms.map((r: any) => {
                      const activeStay = r.reservations?.[0];
                      const isOccupied = r.availabilityStatus === 'OCCUPIED' || activeStay?.status === 'CHECKED_IN';
                      const isReserved = !isOccupied && (r.availabilityStatus === 'RESERVED' || activeStay?.status === 'CONFIRMED');
                      const isBlocked = r.availabilityStatus === 'BLOCKED' || r.maintenanceStatus !== 'OPERATIONAL';
                      const isDirty = !isOccupied && r.housekeepingStatus === 'DIRTY';

                      let cardBorderBg = 'bg-emerald-50/80 border-emerald-300 hover:border-emerald-500 text-emerald-950';
                      let statusBadgeClass = 'text-emerald-800 bg-emerald-100 border-emerald-200';
                      let statusText = 'AVAILABLE';

                      if (isBlocked) {
                        cardBorderBg = 'bg-slate-100/90 border-slate-300 hover:border-slate-500 text-slate-900';
                        statusBadgeClass = 'text-slate-700 bg-slate-200 border-slate-300';
                        statusText = 'BLOCKED';
                      } else if (isOccupied) {
                        cardBorderBg = 'bg-rose-50/90 border-rose-300 hover:border-rose-500 text-rose-950 shadow-sm';
                        statusBadgeClass = 'text-rose-800 bg-rose-100 border-rose-300 font-extrabold animate-pulse';
                        statusText = 'OCCUPIED';
                      } else if (isReserved) {
                        cardBorderBg = 'bg-blue-50/90 border-blue-300 hover:border-blue-500 text-blue-950';
                        statusBadgeClass = 'text-blue-800 bg-blue-100 border-blue-200 font-bold';
                        statusText = 'RESERVED';
                      } else if (isDirty) {
                        cardBorderBg = 'bg-amber-50/90 border-amber-300 hover:border-amber-500 text-amber-950';
                        statusBadgeClass = 'text-amber-800 bg-amber-100 border-amber-200 font-bold';
                        statusText = 'DIRTY';
                      }

                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedRoom(r)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${cardBorderBg}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 text-sm">Room {r.roomNumber}</span>
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white text-slate-700 shadow-2xs">
                              {r.roomType?.code}
                            </span>
                          </div>

                          <div className="mt-2.5 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Occupancy:</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${statusBadgeClass}`}>
                                {statusText}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Housekeeping:</span>
                              <span className={`font-bold ${isDirty ? 'text-amber-700' : 'text-slate-700'}`}>
                                {r.housekeepingStatus}
                              </span>
                            </div>

                            {activeStay?.guest && (
                              <div className={`pt-1.5 mt-1.5 border-t flex items-center justify-between ${
                                isOccupied ? 'border-rose-200/80 text-rose-900' : 'border-blue-200/80 text-blue-900'
                              }`}>
                                <span className="text-[10px] text-slate-500 font-medium">Guest:</span>
                                <span className="font-bold text-[11px] truncate max-w-[95px]">
                                  {activeStay.guest.displayName}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: INVENTORY TABLE */}
      {activeTab === 'inventory' && (
        <div className="pmfs-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Room #</th>
                  <th className="pmfs-table-th">Floor</th>
                  <th className="pmfs-table-th">Room Category</th>
                  <th className="pmfs-table-th">Availability</th>
                  <th className="pmfs-table-th">Housekeeping</th>
                  <th className="pmfs-table-th">Maintenance</th>
                  <th className="pmfs-table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="pmfs-table-td font-bold text-slate-900">Room {r.roomNumber}</td>
                    <td className="pmfs-table-td">{r.floor}</td>
                    <td className="pmfs-table-td font-semibold">{r.roomType?.name}</td>
                    <td className="pmfs-table-td">
                      <Badge
                        variant={
                          r.availabilityStatus === 'OCCUPIED' || r.reservations?.[0]?.status === 'CHECKED_IN'
                            ? 'error'
                            : r.availabilityStatus === 'RESERVED' || r.reservations?.[0]?.status === 'CONFIRMED'
                            ? 'info'
                            : r.availabilityStatus === 'BLOCKED' || r.maintenanceStatus !== 'OPERATIONAL'
                            ? 'neutral'
                            : 'success'
                        }
                      >
                        {r.availabilityStatus === 'OCCUPIED' || r.reservations?.[0]?.status === 'CHECKED_IN'
                          ? 'OCCUPIED'
                          : r.availabilityStatus === 'RESERVED' || r.reservations?.[0]?.status === 'CONFIRMED'
                          ? 'RESERVED'
                          : r.availabilityStatus}
                      </Badge>
                    </td>
                    <td className="pmfs-table-td">
                      <Badge variant={r.housekeepingStatus === 'CLEAN' ? 'success' : 'warning'}>
                        {r.housekeepingStatus}
                      </Badge>
                    </td>
                    <td className="pmfs-table-td">
                      <Badge variant={r.maintenanceStatus === 'OPERATIONAL' ? 'neutral' : 'error'}>
                        {r.maintenanceStatus}
                      </Badge>
                    </td>
                    <td className="pmfs-table-td text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.availabilityStatus === 'AVAILABLE' && r.maintenanceStatus === 'OPERATIONAL' && (r.housekeepingStatus === 'CLEAN' || r.housekeepingStatus === 'INSPECTED') && (!r.reservations || r.reservations.length === 0) && (
                          <button
                            type="button"
                            onClick={() => openWalkinModalForRoom(r)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Check-In</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedRoom(r)}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold hover:bg-slate-200"
                        >
                          Manage Status
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(r.id, r.roomNumber)}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                          title="Delete Room"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ROOM TYPES */}
      {activeTab === 'types' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roomTypes.map((rt) => (
            <div key={rt.id} className="pmfs-card p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">{rt.name}</h3>
                    <span className="font-mono text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded font-semibold">
                      Code: {rt.code}
                    </span>
                  </div>
                  <span className="text-lg font-extrabold text-slate-900">₹{rt.baseRate}</span>
                </div>

                <p className="text-xs text-slate-600">{rt.description || 'No description provided.'}</p>

                <div className="space-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="font-semibold text-slate-800">Bed Configuration: {rt.bedType}</div>
                  <div>Maximum Capacity: <strong>{rt.adultsCapacity} Adult(s), {rt.childrenCapacity} Child(ren)</strong></div>
                  <div>Max Occupancy Limit: {rt.maxOccupancy} Person(s)</div>
                  <div className="text-brand-700 font-medium pt-1">
                    * Extra Mattress / Bed Charge: ₹{rt.extraAdultRate} per night
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleDeleteRoomType(rt.id, rt.name)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Category
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over Side Panel for Selected Room */}
      {selectedRoom && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl border-l border-slate-200 p-6 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Room {selectedRoom.roomNumber}</h3>
              <p className="text-xs text-slate-500">{selectedRoom.floor} • {selectedRoom.roomType?.name}</p>
            </div>
            <button
              onClick={() => setSelectedRoom(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Guest Details */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase">
              Current Occupancy & Guest Details
            </label>
            {selectedRoom.reservations && selectedRoom.reservations.length > 0 ? (
              (() => {
                const res = selectedRoom.reservations[0];
                const folio = res.folios?.[0];
                const checkInStr = res.arrivalDate ? new Date(res.arrivalDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                const checkOutStr = res.departureDate ? new Date(res.departureDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

                return (
                  <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-blue-200/60 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                          {res.guest?.displayName?.[0] || 'G'}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{res.guest?.displayName || 'In-House Guest'}</h4>
                          <p className="text-[11px] text-blue-700 font-medium">{res.guest?.phone || 'No Phone'}</p>
                        </div>
                      </div>
                      <Badge variant={res.status === 'CHECKED_IN' ? 'info' : 'warning'}>
                        {res.status === 'CHECKED_IN' ? 'In-House' : res.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 pt-1">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Booking Ref</span>
                        <span className="font-mono font-bold text-slate-900">{res.reservationRef}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Occupants</span>
                        <span className="font-bold">{res.adults || 1} Adult(s){res.children ? `, ${res.children} Child` : ''}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Check-In</span>
                        <span className="font-medium text-slate-800">{checkInStr}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Check-Out</span>
                        <span className="font-medium text-slate-800">{checkOutStr}</span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-blue-200/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Folio Balance</span>
                        <span className={`font-extrabold text-sm ${folio && folio.balanceAmount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                          ₹{Number(folio?.balanceAmount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <Link
                        href={`/reservations/${res.id}`}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </Link>
                    </div>

                    {res.status === 'CHECKED_IN' && (
                      <div className="pt-2 space-y-2">
                        {res.isBilled ? (
                          <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-purple-700 flex-shrink-0" />
                            <span className="font-semibold text-[11px]">Final {res.billType || ''} Bill Locked. No extra orders can be posted.</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setIsRoomServiceOpen(true)}
                            className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
                          >
                            <UtensilsCrossed className="w-3.5 h-3.5" />
                            <span>+ Add Room Order / Food Item</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleRoomCheckout(res.id, res.guest?.displayName || 'Guest', selectedRoom.roomNumber)}
                          disabled={checkingOut}
                          className="w-full px-3 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          {checkingOut ? 'Processing Checkout…' : 'Manual Check-Out'}
                        </button>
                      </div>
                    )}

                    {/* Extra Room Orders List */}
                    {roomExtraCharges.length > 0 && (
                      <div className="pt-2.5 border-t border-blue-200/60 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-600">
                          <span>Room Orders & Extras ({roomExtraCharges.length})</span>
                          <span className="text-indigo-700 font-extrabold font-mono">
                            ₹{roomExtraCharges.reduce((sum, c) => sum + (c.amount || 0), 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {roomExtraCharges.map((c: any) => (
                            <div key={c.id} className="p-1.5 rounded-lg bg-white/90 border border-blue-200/70 flex items-center justify-between text-[11px] group">
                              <div className="truncate mr-2">
                                <span className="font-bold text-slate-900 block truncate">{c.description}</span>
                                <span className="text-[10px] text-slate-500">{c.quantity}x @ ₹{c.unitPrice}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-mono font-bold text-slate-900">₹{c.amount.toFixed(2)}</span>
                                {!res.isBilled && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRoomCharge(c.id, c.description)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                    title="Delete this room order"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );

              })()
            ) : (() => {
              const isBlocked = selectedRoom.availabilityStatus === 'BLOCKED' || selectedRoom.maintenanceStatus !== 'OPERATIONAL';
              const isOccupiedWithoutRes = selectedRoom.availabilityStatus === 'OCCUPIED';
              const isReservedWithoutRes = selectedRoom.availabilityStatus === 'RESERVED';
              const isDirty = selectedRoom.housekeepingStatus === 'DIRTY';
              const isCleaning = selectedRoom.housekeepingStatus === 'CLEANING';
              const isCleanAndVacant = !isBlocked && !isOccupiedWithoutRes && !isReservedWithoutRes && !isDirty && !isCleaning;

              return (
                <div className="space-y-3">
                  {isOccupiedWithoutRes ? (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="font-semibold">Room is marked Occupied</span>
                      </div>
                      <Badge variant="error">OCCUPIED</Badge>
                    </div>
                  ) : isReservedWithoutRes ? (
                    <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-semibold">Room is Reserved (Confirmed Booking)</span>
                      </div>
                      <Badge variant="info">RESERVED</Badge>
                    </div>
                  ) : isBlocked ? (
                    <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-slate-600 shrink-0" />
                        <div>
                          <span className="font-bold block">Blocked for Maintenance</span>
                          <span className="text-[11px] text-slate-500">Not available for guest check-in</span>
                        </div>
                      </div>
                      <Badge variant="neutral">BLOCKED</Badge>
                    </div>
                  ) : isDirty ? (
                    <div className="space-y-2">
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <div>
                            <span className="font-extrabold block">Room is Dirty</span>
                            <span className="text-[11px] text-amber-700">Housekeeping needed before check-in</span>
                          </div>
                        </div>
                        <Badge variant="warning">DIRTY</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 italic px-1">
                        ⚠️ Direct check-in is disabled. Mark room as Clean below once housekeeping is complete.
                      </p>
                    </div>
                  ) : isCleaning ? (
                    <div className="space-y-2">
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-amber-600 shrink-0 animate-spin" />
                          <div>
                            <span className="font-extrabold block">Cleaning in Progress</span>
                            <span className="text-[11px] text-amber-700">Housekeeper currently servicing room</span>
                          </div>
                        </div>
                        <Badge variant="warning">CLEANING</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 italic px-1">
                        ⚠️ Direct check-in is disabled while room is being cleaned.
                      </p>
                    </div>
                  ) : isCleanAndVacant ? (
                    <>
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-extrabold block text-emerald-950">Vacant & Clean</span>
                            <span className="text-[11px] text-emerald-700">Ready for guest check-in</span>
                          </div>
                        </div>
                        <Badge variant="success">AVAILABLE</Badge>
                      </div>

                      <button
                        type="button"
                        onClick={() => openWalkinModalForRoom(selectedRoom)}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all transform active:scale-98"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Direct Check-In to Room {selectedRoom.roomNumber}</span>
                      </button>
                    </>
                  ) : null}
                </div>
              );
            })()}
          </div>

          {/* Quick Housekeeping Toggle */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase">
              Housekeeping Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['CLEAN', 'DIRTY', 'CLEANING', 'INSPECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => handleUpdateRoomStatus(selectedRoom.id, 'housekeepingStatus', st)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    selectedRoom.housekeepingStatus === st
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Maintenance & Out of Order */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase">Maintenance Actions</h4>

            {/* Block for Maintenance */}
            <button
              onClick={() => setIsBlockOpen(true)}
              className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
            >
              <Wrench className="w-4 h-4" /> Block Room for Maintenance
            </button>

            {/* Clear Maintenance → Mark Available */}
            {(selectedRoom.maintenanceStatus === 'UNDER_MAINTENANCE' ||
              selectedRoom.maintenanceStatus === 'OUT_OF_ORDER' ||
              selectedRoom.availabilityStatus === 'OUT_OF_ORDER') && (
              <button
                onClick={() => handleClearMaintenance(selectedRoom.id)}
                className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Clear Maintenance — Mark Available
              </button>
            )}

            {/* Quick release even if not blocked — useful if stuck */}
            {selectedRoom.maintenanceStatus !== 'OPERATIONAL' && (
              <button
                onClick={() => handleClearMaintenance(selectedRoom.id)}
                className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Release Room — Mark Operational & Available
              </button>
            )}

            <button
              onClick={() => handleDeleteRoom(selectedRoom.id, selectedRoom.roomNumber)}
              className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete Room from Inventory
            </button>
          </div>

        </div>
      )}

      {/* Modal: Walk-In Direct Check-In (Immediate Stay) */}
      <Modal
        isOpen={isWalkinOpen}
        onClose={() => setIsWalkinOpen(false)}
        title={`Walk-in Direct Check-In (Immediate Stay) — Room ${walkinAutoAllocatedRoom?.roomNumber || selectedRoom?.roomNumber || ''}`}
        maxWidth="4xl"
      >
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
                  onChange={(e) => {
                    const newArr = e.target.value;
                    setWalkinForm((prev) => {
                      let newDep = prev.departureDate;
                      if (newDep < newArr) newDep = newArr;
                      let newDepTime = prev.departureTime;
                      if (newDep === newArr && newDepTime <= prev.arrivalTime) {
                        const [h, m] = prev.arrivalTime.split(':').map(Number);
                        const bumpedH = Math.min(23, (isNaN(h) ? 14 : h) + 4);
                        newDepTime = `${String(bumpedH).padStart(2, '0')}:${String(isNaN(m) ? 0 : m).padStart(2, '0')}`;
                      }
                      return { ...prev, arrivalDate: newArr, departureDate: newDep, departureTime: newDepTime };
                    });
                  }}
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
                  onChange={(e) => {
                    const newTime = e.target.value;
                    setWalkinForm((prev) => {
                      let newDepTime = prev.departureTime;
                      if (prev.departureDate === prev.arrivalDate && newDepTime <= newTime) {
                        const [h, m] = newTime.split(':').map(Number);
                        const bumpedH = Math.min(23, (isNaN(h) ? 14 : h) + 4);
                        newDepTime = `${String(bumpedH).padStart(2, '0')}:${String(isNaN(m) ? 0 : m).padStart(2, '0')}`;
                      }
                      return { ...prev, arrivalTime: newTime, departureTime: newDepTime };
                    });
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* 9. Departure Date */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Departure Date *</label>
                <input
                  type="date"
                  required
                  min={walkinForm.arrivalDate}
                  value={walkinForm.departureDate}
                  onChange={(e) => {
                    const newDep = e.target.value;
                    setWalkinForm((prev) => {
                      let newDepTime = prev.departureTime;
                      if (newDep === prev.arrivalDate && newDepTime <= prev.arrivalTime) {
                        const [h, m] = prev.arrivalTime.split(':').map(Number);
                        const bumpedH = Math.min(23, (isNaN(h) ? 14 : h) + 4);
                        newDepTime = `${String(bumpedH).padStart(2, '0')}:${String(isNaN(m) ? 0 : m).padStart(2, '0')}`;
                      }
                      return { ...prev, departureDate: newDep, departureTime: newDepTime };
                    });
                  }}
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
                  min={walkinForm.departureDate === walkinForm.arrivalDate ? walkinForm.arrivalTime : undefined}
                  value={walkinForm.departureTime}
                  onChange={(e) => setWalkinForm({ ...walkinForm, departureTime: e.target.value })}
                  className={`w-full px-3 py-2 bg-white border ${
                    walkinForm.departureDate === walkinForm.arrivalDate && walkinForm.departureTime <= walkinForm.arrivalTime
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-slate-200 focus:ring-brand-500'
                  } rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2`}
                />
                {walkinForm.departureDate === walkinForm.arrivalDate && walkinForm.departureTime <= walkinForm.arrivalTime && (
                  <p className="text-[10px] text-red-600 font-medium mt-1">
                    Must be after arrival time ({walkinForm.arrivalTime})
                  </p>
                )}
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

              {/* 8. Room Number (Physical Room Allocated) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 uppercase text-[11px]">Room Number *</label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {walkinAutoAllocatedRoom ? `Allocated: Room ${walkinAutoAllocatedRoom.roomNumber}` : 'Select Room'}
                  </span>
                </div>
                <select
                  required
                  value={walkinForm.roomId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const found = availableRooms.find((r) => r.id === selId) || rooms.find((r) => r.id === selId);
                    setWalkinAutoAllocatedRoom(found || null);
                    setWalkinForm({ ...walkinForm, roomId: selId });
                  }}
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
              <div className="space-y-2">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Standard Tariff ({selectedWalkinRoomType?.name}):</span>
                  <span className="font-mono text-slate-400">₹{standardWalkinPricePerNight} / night</span>
                </div>

                {/* Direct Room Tariff Input (Changed Price is Base Price) */}
                <div className="flex justify-between items-center bg-slate-800/90 p-2.5 rounded-lg border border-emerald-500/40">
                  <div>
                    <label className="font-bold text-emerald-300 block text-xs">Stay Room Tariff (₹ / night) *</label>
                    <span className="text-[10px] text-slate-400">Directly change tariff for this stay</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-emerald-400 text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={walkinForm.roomRate !== '' ? walkinForm.roomRate : standardWalkinPricePerNight}
                      onChange={(e) => setWalkinForm({ ...walkinForm, roomRate: e.target.value })}
                      className="w-28 px-2.5 py-1.5 bg-slate-900 border border-emerald-500/70 rounded-md text-right font-mono font-bold text-emerald-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-inner"
                    />
                    {walkinForm.roomRate !== '' && parseFloat(walkinForm.roomRate) !== standardWalkinPricePerNight && (
                      <button
                        type="button"
                        onClick={() => setWalkinForm({ ...walkinForm, roomRate: '' })}
                        className="text-[10px] text-slate-400 hover:text-white underline ml-1"
                        title="Reset to standard tariff"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between text-slate-300 pt-1">
                  <span>Stay Duration:</span>
                  <span className="font-mono font-bold">{walkinDaysStayed} Night(s)</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Room Tariff Total:</span>
                  <span className="font-mono font-bold">₹{walkinTotalPrice.toFixed(2)}</span>
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
              disabled={walkinSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {walkinSubmitting ? (
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

      {/* Modal: Add Physical Room */}
      <Modal isOpen={isAddRoomOpen} onClose={() => setIsAddRoomOpen(false)} title="Add Physical Room to Inventory" maxWidth="md">
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Room Number * (Unique)
            </label>
            <input
              type="text"
              required
              value={newRoom.roomNumber}
              onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
              placeholder="e.g. 104"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Floor *
            </label>
            <select
              value={newRoom.floor}
              onChange={(e) => setNewRoom({ ...newRoom, floor: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              <option value="Floor 1">Floor 1</option>
              <option value="Floor 2">Floor 2</option>
              <option value="Floor 3">Floor 3</option>
              <option value="Floor 4">Floor 4</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Room Category *
            </label>
            <select
              value={newRoom.roomTypeId}
              onChange={(e) => setNewRoom({ ...newRoom, roomTypeId: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name} ({rt.bedType} — ₹{rt.baseRate})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddRoomOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Add Room to Inventory'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Room Type (Single Bed, Double Bed, Triple Bed handling) */}
      <Modal isOpen={isAddTypeOpen} onClose={() => setIsAddTypeOpen(false)} title="Create Room Category & Bed Configuration" maxWidth="md">
        <form onSubmit={handleCreateType} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Category Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. DLX"
                value={newType.code}
                onChange={(e) => setNewType({ ...newType, code: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Category Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Deluxe Suite"
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Bed Type Configuration *
            </label>
            <select
              value={newType.bedType}
              onChange={(e) => handleBedTypePresetChange(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900"
            >
              <option value="Single Bed">Single Bed (1 Adult, 1 Child)</option>
              <option value="Double Bed">Double Bed (2 Adults, 2 Children)</option>
              <option value="Triple Bed">Triple Bed (3 Adults, 3 Children)</option>
            </select>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <span className="font-bold text-slate-800 uppercase text-[10px]">Configured Max Occupancy</span>
            <div className="grid grid-cols-3 gap-2 text-slate-700">
              <div>Adults: <strong>{newType.adultsCapacity}</strong></div>
              <div>Children: <strong>{newType.childrenCapacity}</strong></div>
              <div>Max Limit: <strong>{newType.maxOccupancy}</strong></div>
            </div>
            <p className="text-[11px] text-brand-700 pt-1 font-medium">
              * Extra beds/mattresses beyond capacity will be charged extra per night.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Base Nightly Tariff (₹) *
              </label>
              <input
                type="number"
                required
                value={newType.baseRate}
                onChange={(e) => setNewType({ ...newType, baseRate: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Extra Bed Rate (₹)
              </label>
              <input
                type="number"
                value={newType.extraAdultRate}
                onChange={(e) => setNewType({ ...newType, extraAdultRate: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddTypeOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Save Room Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Room Block */}
      <Modal isOpen={isBlockOpen} onClose={() => setIsBlockOpen(false)} title={`Block Room ${selectedRoom?.roomNumber}`} maxWidth="md">
        <form onSubmit={handleBlockSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Block Reason *
            </label>
            <input
              type="text"
              required
              value={blockForm.reason}
              onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={blockForm.startDate}
                onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={blockForm.endDate}
                onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBlockOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Blocking...' : 'Block Room'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Room Service & Extra Orders */}
      <Modal
        isOpen={isRoomServiceOpen}
        onClose={() => setIsRoomServiceOpen(false)}
        title={`Add Room Order / Charge — Room ${selectedRoom?.roomNumber || ''}`}
        maxWidth="lg"
      >
        <form onSubmit={handlePostRoomCharge} className="space-y-4">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block">
                Guest: {selectedRoom?.reservations?.[0]?.guest?.displayName || 'In-House Guest'}
              </span>
              <span className="text-[11px] text-blue-700">
                Booking Ref: {selectedRoom?.reservations?.[0]?.reservationRef} • Room {selectedRoom?.roomNumber}
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
                  const arrDate = selectedRoom?.reservations?.[0]?.arrivalDate;
                  const dayInfo = getStayDayInfo(serviceForm.orderDate, arrDate);
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
                    Post ₹{((parseInt(serviceForm.quantity || '1', 10) || 1) * (parseFloat(serviceForm.unitPrice || '0') || 0)).toFixed(2)} to Room {selectedRoom?.roomNumber || ''}
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
