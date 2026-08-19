'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  BedDouble,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Plus,
  RefreshCw,
  Loader2,
  Search,
  Filter,
  ShieldAlert,
  Package,
  Layers,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function HousekeepingPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'kanban' | 'list' | 'workload' | 'lostfound'>('kanban');

  const [tasks, setTasks] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [lostItems, setLostItems] = useState<any[]>([]);

  // Modals state
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [isLostOpen, setIsLostOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [assignStaffId, setAssignStaffId] = useState('');

  // Inspection Form State
  const [inspectResult, setInspectResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [inspectReason, setInspectReason] = useState('');

  // New Task Form State
  const [newTaskForm, setNewTaskForm] = useState({
    roomId: '',
    taskType: 'TOUCHUP_CLEANING',
    priority: 'NORMAL',
    assignedStaffId: '',
    notes: '',
  });

  // Lost & Found Form State
  const [lostForm, setLostForm] = useState({
    roomId: '',
    category: 'ELECTRONICS',
    description: '',
    storageLocation: 'Front Office Safe #2',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, uRes, rRes, lfRes] = await Promise.all([
        fetch('/api/housekeeping/tasks'),
        fetch('/api/users'),
        fetch('/api/rooms'),
        fetch('/api/housekeeping/lost-and-found'),
      ]);

      if (tRes.ok) {
        const d = await tRes.json();
        setTasks(d.tasks || []);
      }
      if (uRes.ok) {
        const d = await uRes.json();
        setStaffList(d.users || []);
      }
      if (rRes.ok) {
        const d = await rRes.json();
        setRooms(d.rooms || []);
        if (d.rooms?.length > 0 && !newTaskForm.roomId) {
          setNewTaskForm((prev) => ({ ...prev, roomId: d.rooms[0].id }));
        }
      }
      if (lfRes.ok) {
        const d = await lfRes.json();
        setLostItems(d.items || []);
      }
    } catch (e) {
      showToast('Failed to load housekeeping operations data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/housekeeping/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskForm),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create task', 'error');
        setSubmitting(false);
        return;
      }

      showToast(`Housekeeping task ${data.task.taskRef} created!`, 'success');
      setIsNewTaskOpen(false);
      fetchData();
    } catch (e) {
      showToast('Error creating task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/housekeeping/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedStaffId: assignStaffId }),
      });

      if (res.ok) {
        showToast('Housekeeping staff assigned successfully!', 'success');
        setIsAssignOpen(false);
        fetchData();
      } else {
        showToast('Failed to assign staff', 'error');
      }
    } catch (e) {
      showToast('Error assigning staff', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInspectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/housekeeping/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.id,
          result: inspectResult,
          reason: inspectReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Inspection recording failed', 'error');
        setSubmitting(false);
        return;
      }

      if (inspectResult === 'PASS') {
        showToast(`Room ${selectedTask.room?.roomNumber} passed inspection and is now READY!`, 'success');
      } else {
        showToast(`Room ${selectedTask.room?.roomNumber} failed inspection and was returned for cleaning.`, 'error');
      }

      setIsInspectOpen(false);
      fetchData();
    } catch (e) {
      showToast('Error recording inspection', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/housekeeping/lost-and-found', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lostForm),
      });

      if (res.ok) {
        showToast('Lost & Found item registered!', 'success');
        setIsLostOpen(false);
        fetchData();
      } else {
        showToast('Failed to register lost item', 'error');
      }
    } catch (e) {
      showToast('Error registering item', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculated Real KPI Metrics
  const roomsToClean = tasks.filter((t) => t.status === 'PENDING' || t.status === 'ASSIGNED').length;
  const inCleaning = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const awaitingInspection = tasks.filter((t) => t.status === 'INSPECTION_REQUIRED').length;
  const readyRooms = rooms.filter((r) => r.housekeepingStatus === 'CLEAN').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-brand-600" />
            Housekeeping Operations Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time room status board, automated checkout tasks, inspections, staff workload, and Lost & Found
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/housekeeping/my-tasks"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <UserCheck className="w-4 h-4" />
            Housekeeper Mobile View
          </Link>
          <button
            onClick={() => setIsLostOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
          >
            <Package className="w-4 h-4 text-amber-600" />
            Register Lost Item
          </button>
          <button
            onClick={() => setIsNewTaskOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" />
            New Housekeeping Task
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="pmfs-card p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Rooms to Clean</span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{roomsToClean}</div>
        </div>
        <div className="pmfs-card p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">In Cleaning</span>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">{inCleaning}</div>
        </div>
        <div className="pmfs-card p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Awaiting Inspection</span>
          <div className="text-2xl font-extrabold text-purple-600 mt-1">{awaitingInspection}</div>
        </div>
        <div className="pmfs-card p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Clean & Ready</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{readyRooms}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'kanban' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          Kanban Board
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'list' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BedDouble className="w-4 h-4" />
          Task Master Register ({tasks.length})
        </button>

        <button
          onClick={() => setActiveTab('lostfound')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'lostfound' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          Lost & Found Register ({lostItems.length})
        </button>

        <button
          onClick={fetchData}
          className="ml-auto p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          title="Refresh board"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: KANBAN BOARD */}
      {activeTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { key: 'PENDING', title: 'Pending Assignment', color: 'border-slate-300 bg-slate-50' },
            { key: 'ASSIGNED', title: 'Assigned', color: 'border-blue-300 bg-blue-50/40' },
            { key: 'IN_PROGRESS', title: 'In Progress', color: 'border-amber-300 bg-amber-50/40' },
            { key: 'INSPECTION_REQUIRED', title: 'Inspection Required', color: 'border-purple-300 bg-purple-50/40' },
            { key: 'READY', title: 'Ready / Clean', color: 'border-emerald-300 bg-emerald-50/40' },
          ].map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);

            return (
              <div key={col.key} className={`rounded-xl border ${col.color} p-3.5 space-y-3 min-h-[450px]`}>
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">{col.title}</h3>
                  <span className="w-5 h-5 rounded-full bg-white text-slate-800 font-bold text-[11px] flex items-center justify-center shadow-xs">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colTasks.map((t) => (
                    <div key={t.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 text-sm">Room {t.room?.roomNumber}</span>
                        <Badge variant={t.priority === 'URGENT' ? 'error' : t.priority === 'HIGH' ? 'warning' : 'neutral'}>
                          {t.priority}
                        </Badge>
                      </div>

                      <div className="text-xs font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded w-fit">
                        {t.taskType.replace(/_/g, ' ')}
                      </div>

                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <div>Staff: <strong className="text-slate-800">{t.assignedStaff?.fullName || 'Unassigned'}</strong></div>
                        <div>Est: {t.estimatedDuration} mins {t.actualDuration ? `• Actual: ${t.actualDuration} mins` : ''}</div>
                      </div>

                      {/* Column Actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1">
                        {t.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setSelectedTask(t);
                              setIsAssignOpen(true);
                            }}
                            className="px-2.5 py-1 bg-brand-600 text-white rounded text-xs font-bold"
                          >
                            Assign
                          </button>
                        )}

                        {t.status === 'INSPECTION_REQUIRED' && (
                          <button
                            onClick={() => {
                              setSelectedTask(t);
                              setIsInspectOpen(true);
                            }}
                            className="px-2.5 py-1 bg-purple-600 text-white rounded text-xs font-bold"
                          >
                            Inspect Room
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: TASK LIST TABLE */}
      {activeTab === 'list' && (
        <div className="pmfs-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Task Ref</th>
                  <th className="pmfs-table-th">Room</th>
                  <th className="pmfs-table-th">Task Type</th>
                  <th className="pmfs-table-th">Priority</th>
                  <th className="pmfs-table-th">Assigned Staff</th>
                  <th className="pmfs-table-th">Duration (Est/Act)</th>
                  <th className="pmfs-table-th">Status</th>
                  <th className="pmfs-table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="pmfs-table-td font-mono font-bold text-brand-700">{t.taskRef}</td>
                    <td className="pmfs-table-td font-bold text-slate-900">Room {t.room?.roomNumber}</td>
                    <td className="pmfs-table-td">{t.taskType.replace(/_/g, ' ')}</td>
                    <td className="pmfs-table-td">
                      <Badge variant={t.priority === 'URGENT' ? 'error' : t.priority === 'HIGH' ? 'warning' : 'neutral'}>
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="pmfs-table-td text-xs text-slate-700">{t.assignedStaff?.fullName || 'Unassigned'}</td>
                    <td className="pmfs-table-td text-xs text-slate-600">{t.estimatedDuration}m / {t.actualDuration ? `${t.actualDuration}m` : '—'}</td>
                    <td className="pmfs-table-td">
                      <Badge variant={t.status === 'READY' ? 'success' : t.status === 'INSPECTION_REQUIRED' ? 'warning' : 'neutral'}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="pmfs-table-td text-right">
                      {t.status === 'INSPECTION_REQUIRED' && (
                        <button
                          onClick={() => {
                            setSelectedTask(t);
                            setIsInspectOpen(true);
                          }}
                          className="px-2.5 py-1 bg-purple-600 text-white rounded text-xs font-bold"
                        >
                          Inspect
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LOST & FOUND */}
      {activeTab === 'lostfound' && (
        <div className="pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Lost & Found Item Register
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Item Ref</th>
                  <th className="pmfs-table-th">Found Date</th>
                  <th className="pmfs-table-th">Room</th>
                  <th className="pmfs-table-th">Description</th>
                  <th className="pmfs-table-th">Storage Location</th>
                  <th className="pmfs-table-th">Found By</th>
                  <th className="pmfs-table-th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lostItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-xs text-slate-500">
                      No lost items registered.
                    </td>
                  </tr>
                ) : (
                  lostItems.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="pmfs-table-td font-mono font-bold text-amber-700">{l.itemRef}</td>
                      <td className="pmfs-table-td text-xs text-slate-500">{new Date(l.foundDate).toLocaleDateString()}</td>
                      <td className="pmfs-table-td font-bold text-slate-900">{l.room?.roomNumber ? `Room ${l.room.roomNumber}` : 'Common Area'}</td>
                      <td className="pmfs-table-td font-medium text-slate-900">{l.description}</td>
                      <td className="pmfs-table-td text-xs text-slate-600">{l.storageLocation}</td>
                      <td className="pmfs-table-td text-xs text-slate-600">{l.foundBy?.fullName}</td>
                      <td className="pmfs-table-td">
                        <Badge variant={l.status === 'RETURNED' || l.status === 'CLAIMED' ? 'success' : 'warning'}>
                          {l.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Housekeeping Task */}
      <Modal isOpen={isNewTaskOpen} onClose={() => setIsNewTaskOpen(false)} title="Create Housekeeping Task" maxWidth="md">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Select Room *
            </label>
            <select
              value={newTaskForm.roomId}
              onChange={(e) => setNewTaskForm({ ...newTaskForm, roomId: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.roomNumber} ({r.floor} - {r.housekeepingStatus})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Task Type *
              </label>
              <select
                value={newTaskForm.taskType}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, taskType: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              >
                <option value="CHECKOUT_CLEANING">Checkout Cleaning</option>
                <option value="STAYOVER_CLEANING">Stayover Cleaning</option>
                <option value="TOUCHUP_CLEANING">Touch-up Cleaning</option>
                <option value="DEEP_CLEANING">Deep Cleaning</option>
                <option value="SPECIAL_REQUEST">Special Request</option>
                <option value="VIP_PREPARATION">VIP Preparation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Priority *
              </label>
              <select
                value={newTaskForm.priority}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent ⭐</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Assign Staff Member
            </label>
            <select
              value={newTaskForm.assignedStaffId}
              onChange={(e) => setNewTaskForm({ ...newTaskForm, assignedStaffId: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              <option value="">Unassigned (Assign later)</option>
              {staffList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.userRoles?.[0]?.role?.name || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewTaskOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Assign Staff */}
      <Modal isOpen={isAssignOpen} onClose={() => setIsAssignOpen(false)} title={`Assign Staff for Room ${selectedTask?.room?.roomNumber}`} maxWidth="sm">
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Select Housekeeping Staff *
            </label>
            <select
              required
              value={assignStaffId}
              onChange={(e) => setAssignStaffId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              <option value="">Select Staff</option>
              {staffList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAssignOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Assigning...' : 'Assign Staff'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Inspect Room */}
      <Modal isOpen={isInspectOpen} onClose={() => setIsInspectOpen(false)} title={`Supervisor Inspection: Room ${selectedTask?.room?.roomNumber}`} maxWidth="md">
        <form onSubmit={handleInspectSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div>Task: <strong>{selectedTask?.taskRef}</strong> ({selectedTask?.taskType})</div>
            <div>Housekeeper: <strong>{selectedTask?.assignedStaff?.fullName || 'System'}</strong></div>
            <div>Cleaning Duration: <strong>{selectedTask?.actualDuration || selectedTask?.estimatedDuration} minutes</strong></div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Inspection Outcome *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setInspectResult('PASS')}
                className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  inspectResult === 'PASS'
                    ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" /> PASS (Make Ready)
              </button>

              <button
                type="button"
                onClick={() => setInspectResult('FAIL')}
                className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  inspectResult === 'FAIL'
                    ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <AlertTriangle className="w-4 h-4" /> FAIL (Return for Re-clean)
              </button>
            </div>
          </div>

          {inspectResult === 'FAIL' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Reason for Rejection *
              </label>
              <input
                type="text"
                required
                value={inspectReason}
                onChange={(e) => setInspectReason(e.target.value)}
                placeholder="e.g. Bathroom mirror not cleaned, bedsheets wrinkled"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
          )}

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsInspectOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Saving Result...' : 'Save Inspection Result'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Register Lost Item */}
      <Modal isOpen={isLostOpen} onClose={() => setIsLostOpen(false)} title="Register Lost & Found Item" maxWidth="md">
        <form onSubmit={handleLostSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Found Room / Location
            </label>
            <select
              value={lostForm.roomId}
              onChange={(e) => setLostForm({ ...lostForm, roomId: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              <option value="">Common Hotel Area / Lobby</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.roomNumber} ({r.floor})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Item Description *
            </label>
            <input
              type="text"
              required
              value={lostForm.description}
              onChange={(e) => setLostForm({ ...lostForm, description: e.target.value })}
              placeholder="e.g. Silver Titan Watch / Black Leather Wallet"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Secure Storage Location *
            </label>
            <input
              type="text"
              required
              value={lostForm.storageLocation}
              onChange={(e) => setLostForm({ ...lostForm, storageLocation: e.target.value })}
              placeholder="e.g. Front Office Safe #2"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsLostOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Register Item'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
