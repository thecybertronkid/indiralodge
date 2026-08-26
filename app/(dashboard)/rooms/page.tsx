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
                      const isOccupied = r.availabilityStatus === 'OCCUPIED';
                      const isDirty = r.housekeepingStatus === 'DIRTY';
                      const isBlocked = r.availabilityStatus === 'BLOCKED' || r.maintenanceStatus !== 'OPERATIONAL';

                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedRoom(r)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                            isOccupied
                              ? 'bg-blue-50/80 border-blue-200'
                              : isBlocked
                              ? 'bg-rose-50/80 border-rose-200'
                              : isDirty
                              ? 'bg-amber-50/80 border-amber-200'
                              : 'bg-emerald-50/80 border-emerald-200'
                          }`}
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
                              <span className={`font-bold ${isOccupied ? 'text-blue-700' : 'text-emerald-700'}`}>
                                {r.availabilityStatus}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Housekeeping:</span>
                              <span className={`font-bold ${isDirty ? 'text-amber-700' : 'text-slate-700'}`}>
                                {r.housekeepingStatus}
                              </span>
                            </div>

                            {isOccupied && r.reservations?.[0]?.guest && (
                              <div className="pt-1.5 border-t border-blue-200/60 mt-1.5 flex items-center justify-between">
                                <span className="text-[10px] text-slate-500 font-medium">Guest:</span>
                                <span className="font-bold text-blue-900 text-[11px] truncate max-w-[95px]">
                                  {r.reservations[0].guest.displayName}
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
                      <Badge variant={r.availabilityStatus === 'OCCUPIED' ? 'info' : 'success'}>
                        {r.availabilityStatus}
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
            <button
              onClick={() => setIsBlockOpen(true)}
              className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
            >
              <Wrench className="w-4 h-4" /> Block Room for Maintenance
            </button>

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
    </div>
  );
}
