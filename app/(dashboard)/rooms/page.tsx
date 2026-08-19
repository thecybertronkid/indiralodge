'use client';

import React, { useState, useEffect } from 'react';
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

  // Selected Room for Side Panel Quick Actions
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  // Modals state
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);

  // Form states
  const [newRoom, setNewRoom] = useState({
    roomNumber: '',
    floor: 'Floor 1',
    roomTypeId: '',
    buildingBlock: 'Main Wing',
  });

  const [newType, setNewType] = useState({
    code: '',
    name: '',
    description: '',
    baseRate: '3500',
    extraAdultRate: '1000',
    extraChildRate: '500',
    maxOccupancy: '2',
    bedType: 'King Bed',
  });

  const [blockForm, setBlockForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    reason: 'Maintenance',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, rtRes] = await Promise.all([fetch('/api/rooms'), fetch('/api/room-types')]);
      if (rRes.ok) {
        const d = await rRes.json();
        setRooms(d.rooms || []);
      }
      if (rtRes.ok) {
        const d = await rtRes.json();
        setRoomTypes(d.roomTypes || []);
        if (d.roomTypes?.length > 0 && !newRoom.roomTypeId) {
          setNewRoom((prev) => ({ ...prev, roomTypeId: d.roomTypes[0].id }));
        }
      }
    } catch (e) {
      showToast('Failed to load room data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        showToast(data.error || 'Failed to create room type', 'error');
        setSubmitting(false);
        return;
      }

      showToast(`Room Type "${newType.name}" created successfully!`, 'success');
      setIsAddTypeOpen(false);
      fetchData();
    } catch (e) {
      showToast('Error creating room type', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRoomStatus = async (roomId: string, statusType: 'availabilityStatus' | 'housekeepingStatus' | 'maintenanceStatus', value: string) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, [statusType]: value }),
      });

      if (res.ok) {
        showToast('Room status updated!', 'success');
        fetchData();
        if (selectedRoom?.id === roomId) {
          setSelectedRoom((prev: any) => ({ ...prev, [statusType]: value }));
        }
      }
    } catch (e) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/rooms/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          ...blockForm,
        }),
      });

      if (res.ok) {
        showToast(`Room ${selectedRoom.roomNumber} blocked for maintenance!`, 'success');
        setIsBlockOpen(false);
        fetchData();
      } else {
        showToast('Failed to block room', 'error');
      }
    } catch (e) {
      showToast('Error blocking room', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Group rooms by floor for Visual Room Map
  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BedDouble className="w-6 h-6 text-brand-600" />
            Rooms & Inventory Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visual room map, physical inventory status, room categories, and maintenance block controls
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddTypeOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
          >
            <Plus className="w-4 h-4 text-brand-600" />
            Add Room Type
          </button>
          <button
            onClick={() => setIsAddRoomOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add Physical Room
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'map' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          Visual Room Map
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'inventory' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BedDouble className="w-4 h-4" />
          Physical Inventory List ({rooms.length})
        </button>

        <button
          onClick={() => setActiveTab('types')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'types' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Room Categories & Rates ({roomTypes.length})
        </button>
      </div>

      {/* TAB 1: VISUAL ROOM MAP */}
      {activeTab === 'map' && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
              Loading visual room map...
            </div>
          ) : floors.length === 0 ? (
            <div className="pmfs-card p-12 text-center text-xs text-slate-500">
              No rooms configured in property inventory. Click "Add Physical Room" to set up inventory.
            </div>
          ) : (
            floors.map((floor) => {
              const floorRooms = rooms.filter((r) => r.floor === floor);

              return (
                <div key={floor} className="pmfs-card p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {floor} ({floorRooms.length} Rooms)
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {floorRooms.map((r) => {
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
                  <th className="pmfs-table-th">Room Type</th>
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
                    <td className="pmfs-table-td">{r.roomType?.name}</td>
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
                      <button
                        onClick={() => setSelectedRoom(r)}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold hover:bg-slate-200"
                      >
                        Manage Status
                      </button>
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
            <div key={rt.id} className="pmfs-card p-5 space-y-3">
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

              <div className="space-y-1 text-xs text-slate-500 pt-2">
                <div>Capacity: {rt.adultsCapacity} Adults, {rt.childrenCapacity} Children</div>
                <div>Bed Type: {rt.bedType} ({rt.numberOfBeds} Beds)</div>
                <div>Extra Adult Rate: ₹{rt.extraAdultRate}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over Side Panel for Selected Room Quick Actions */}
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

          {/* Maintenance Block Action */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase">Maintenance & Out of Order</h4>
            <button
              onClick={() => setIsBlockOpen(true)}
              className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
            >
              <Wrench className="w-4 h-4" /> Block Room for Maintenance
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
                  {rt.name} (Base ₹{rt.baseRate})
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

      {/* Modal: Add Room Type */}
      <Modal isOpen={isAddTypeOpen} onClose={() => setIsAddTypeOpen(false)} title="Create Room Category" maxWidth="md">
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
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Blocking...' : 'Block Room'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
