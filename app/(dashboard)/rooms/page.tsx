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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to post room charge', 'error');
        setPostingCharge(false);
        return;
      }
      showToast(data.message || 'Room charge posted successfully!', 'success');
      setIsRoomServiceOpen(false);
      setServiceForm({
        description: 'Packaged Drinking Water Bottle (1L)',
        category: 'FOOD_BEVERAGE',
        quantity: '1',
        unitPrice: '20',
        notes: '',
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
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BedDouble className="w-6 h-6 text-red-500" />
            Rooms & Inventory Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Visual room map matrix, housekeeping queue, Single/Double/Triple bed capacities, and physical inventory controls
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddRoomOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            Add Room Number
          </button>

          <button
            onClick={() => setIsAddTypeOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700/80 font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105"
          >
            <Layers className="w-4 h-4 text-zinc-400" />
            Create Category
          </button>
        </div>
      </div>

      {/* Navigation Tabs - Glassmorphism Design */}
      <div className="flex items-center justify-between overflow-x-auto py-1 gap-4">
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl glass-tab-container border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl shadow-xl">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'map'
                ? 'glass-tab-active bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-lg shadow-red-600/30'
                : 'glass-tab-inactive text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${activeTab === 'map' ? 'text-white' : 'text-red-400'}`} />
            <span>Visual Room Map Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'inventory'
                ? 'glass-tab-active bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-lg shadow-red-600/30'
                : 'glass-tab-inactive text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BedDouble className={`w-4 h-4 ${activeTab === 'inventory' ? 'text-white' : 'text-red-400'}`} />
            <span>Inventory List ({rooms.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('types')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'types'
                ? 'glass-tab-active bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-lg shadow-red-600/30'
                : 'glass-tab-inactive text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className={`w-4 h-4 ${activeTab === 'types' ? 'text-white' : 'text-red-400'}`} />
            <span>Room Categories ({roomTypes.length})</span>
          </button>
        </div>

        <button
          onClick={fetchData}
          className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all shadow-md shrink-0"
          title="Refresh Room Matrix"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: VISUAL ROOM MAP */}
      {activeTab === 'map' && (
        <div className="space-y-6">
          {/* Status Color Legend - Glassmorphism Design */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 p-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/75 backdrop-blur-xl text-xs font-semibold shadow-xl">
            <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-extrabold flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-red-600 rounded-full inline-block" />
              Room Matrix Legend:
            </span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-emerald-300 font-bold">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-pulse" />
              <span className="text-red-400 font-bold">Occupied (Guest In-House)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <span className="text-blue-400 font-bold">Reserved (Confirmed Booking)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              <span className="text-amber-400 font-bold">Dirty (Housekeeping Needed)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-zinc-500 shadow-xs" />
              <span className="text-zinc-400 font-bold">Maintenance / Blocked</span>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin text-red-500 mx-auto mb-2" />
              Loading room matrix...
            </div>
          ) : Object.keys(groupedByFloor).length === 0 ? (
            <div className="pmfs-card p-12 text-center text-xs text-zinc-400">
              No rooms added to inventory yet. Click "Add Room Number" above.
            </div>
          ) : (
            Object.entries(groupedByFloor).map(([floor, floorRooms]: [string, any]) => {
              return (
                <div key={floor} className="pmfs-card p-5 space-y-4 rounded-3xl border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-2xl shadow-xl">
                  <h3 className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider border-b border-zinc-800/80 pb-2.5 flex items-center justify-between">
                    <span>{floor} ({floorRooms.length} Rooms)</span>
                    <span className="text-[10px] text-zinc-500 font-mono font-normal">FLOOR GRID</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {floorRooms.map((r: any) => {
                      const activeStay = r.reservations?.[0];
                      const isOccupied = r.availabilityStatus === 'OCCUPIED' || activeStay?.status === 'CHECKED_IN';
                      const isReserved = !isOccupied && (r.availabilityStatus === 'RESERVED' || activeStay?.status === 'CONFIRMED');
                      const isBlocked = r.availabilityStatus === 'BLOCKED' || r.maintenanceStatus !== 'OPERATIONAL';
                      const isDirty = !isOccupied && r.housekeepingStatus === 'DIRTY';

                      let cardBorderBg = 'bg-zinc-900/80 backdrop-blur-md border border-emerald-500/40 hover:border-emerald-400 text-white shadow-md shadow-emerald-950/20';
                      let statusBadgeClass = 'text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 font-bold';
                      let statusText = 'AVAILABLE';

                      if (isBlocked) {
                        cardBorderBg = 'bg-zinc-900/60 backdrop-blur-md border border-zinc-700/50 hover:border-zinc-500 text-zinc-300';
                        statusBadgeClass = 'text-zinc-400 bg-zinc-800/80 border border-zinc-700/60';
                        statusText = 'BLOCKED';
                      } else if (isOccupied) {
                        cardBorderBg = 'bg-gradient-to-br from-red-950/60 via-zinc-950/90 to-zinc-900/90 backdrop-blur-md border border-red-500/70 hover:border-red-400 text-white shadow-lg shadow-red-950/50';
                        statusBadgeClass = 'text-red-300 bg-red-950/90 border border-red-600/70 font-extrabold animate-pulse';
                        statusText = 'OCCUPIED';
                      } else if (isReserved) {
                        cardBorderBg = 'bg-zinc-900/80 backdrop-blur-md border border-blue-500/50 hover:border-blue-400 text-white shadow-md shadow-blue-950/30';
                        statusBadgeClass = 'text-blue-300 bg-blue-950/70 border border-blue-500/40 font-bold';
                        statusText = 'RESERVED';
                      } else if (isDirty) {
                        cardBorderBg = 'bg-zinc-900/80 backdrop-blur-md border border-amber-500/50 hover:border-amber-400 text-white shadow-md shadow-amber-950/30';
                        statusBadgeClass = 'text-amber-300 bg-amber-950/70 border border-amber-500/40 font-bold';
                        statusText = 'DIRTY';
                      }

                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedRoom(r)}
                          className={`p-3.5 rounded-2xl transition-all duration-200 cursor-pointer hover:scale-[1.02] ${cardBorderBg}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-white text-sm tracking-tight">Room {r.roomNumber}</span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800/90 border border-zinc-700/60 text-zinc-300 shadow-sm">
                              {r.roomType?.code}
                            </span>
                          </div>

                          <div className="mt-2.5 space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400 text-[10px] uppercase font-semibold">Occupancy</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusBadgeClass}`}>
                                {statusText}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400 text-[10px] uppercase font-semibold">Housekeeping</span>
                              <span className={`font-bold text-[10px] ${isDirty ? 'text-amber-400' : 'text-zinc-300'}`}>
                                {r.housekeepingStatus}
                              </span>
                            </div>

                            {activeStay?.guest && (
                              <div className={`pt-1.5 mt-1.5 border-t border-zinc-800/80 flex items-center justify-between ${
                                isOccupied ? 'text-red-300' : 'text-blue-300'
                              }`}>
                                <span className="text-[10px] text-zinc-400 font-semibold uppercase">Guest</span>
                                <span className="font-extrabold text-[11px] truncate max-w-[95px] text-white">
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
                            <div key={c.id} className="p-1.5 rounded-lg bg-white/90 border border-blue-200/70 flex items-center justify-between text-[11px]">
                              <div className="truncate mr-2">
                                <span className="font-bold text-slate-900 block truncate">{c.description}</span>
                                <span className="text-[10px] text-slate-500">{c.quantity}x @ ₹{c.unitPrice}</span>
                              </div>
                              <span className="font-mono font-bold text-slate-900 shrink-0">₹{c.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );

              })()
            ) : selectedRoom.availabilityStatus === 'OCCUPIED' ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Room is marked Occupied.</span>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                <span>Room is currently Vacant & Available</span>
                <Badge variant="success">AVAILABLE</Badge>
              </div>
            )}
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
