'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wrench,
  AlertTriangle,
  Clock,
  UserCheck,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldAlert,
  HardDrive,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function MaintenancePage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'kanban' | 'tickets' | 'assets' | 'preventive'>('kanban');

  const [tickets, setTickets] = useState<any[]>([]);
  const [techList, setTechList] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [preventivePlans, setPreventivePlans] = useState<any[]>([]);

  // Modals state
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [assignTechId, setAssignTechId] = useState('');

  // Resolution Form State
  const [resolveForm, setResolveForm] = useState({
    resolutionSummary: '',
    labourCost: '0',
    partsCost: '0',
    actualCost: '0',
  });

  // New Ticket Form State
  const [newTicketForm, setNewTicketForm] = useState({
    category: 'AC',
    roomId: '',
    assetId: '',
    title: '',
    description: '',
    priority: 'NORMAL',
    assignedTechnicianId: '',
    estimatedCost: '0',
  });

  // Asset Form State
  const [assetForm, setAssetForm] = useState({
    name: '',
    category: 'AC_UNIT',
    roomId: '',
    brand: '',
    model: '',
    serialNumber: '',
    warrantyExpiry: '',
  });

  // Preventive Plan Form State
  const [planForm, setPlanForm] = useState({
    taskTitle: '',
    frequencyDays: '30',
    assetId: '',
    assignedTechnicianId: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, uRes, rRes, aRes, pRes] = await Promise.all([
        fetch('/api/maintenance/tickets'),
        fetch('/api/users'),
        fetch('/api/rooms'),
        fetch('/api/maintenance/assets'),
        fetch('/api/maintenance/preventive'),
      ]);

      if (tRes.ok) {
        const d = await tRes.json();
        setTickets(d.tickets || []);
      }
      if (uRes.ok) {
        const d = await uRes.json();
        setTechList(d.users || []);
      }
      if (rRes.ok) {
        const d = await rRes.json();
        setRooms(d.rooms || []);
      }
      if (aRes.ok) {
        const d = await aRes.json();
        setAssets(d.assets || []);
      }
      if (pRes.ok) {
        const d = await pRes.json();
        setPreventivePlans(d.plans || []);
      }
    } catch (e) {
      showToast('Failed to load maintenance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/maintenance/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTicketForm),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create ticket', 'error');
        setSubmitting(false);
        return;
      }

      showToast(`Maintenance Ticket ${data.ticket.ticketRef} created!`, 'success');
      setIsNewTicketOpen(false);
      fetchData();
    } catch (e) {
      showToast('Error creating ticket', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/maintenance/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTechnicianId: assignTechId }),
      });

      if (res.ok) {
        showToast('Technician assigned successfully!', 'success');
        setIsAssignOpen(false);
        fetchData();
      } else {
        showToast('Failed to assign technician', 'error');
      }
    } catch (e) {
      showToast('Error assigning technician', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/maintenance/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          ...resolveForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to resolve ticket', 'error');
        setSubmitting(false);
        return;
      }

      showToast(`Ticket ${selectedTicket.ticketRef} verified and resolved! Room restored to operational status.`, 'success');
      setIsResolveOpen(false);
      fetchData();
    } catch (e) {
      showToast('Error resolving ticket', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/maintenance/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetForm),
      });

      if (res.ok) {
        showToast('Equipment asset registered!', 'success');
        setIsAddAssetOpen(false);
        fetchData();
      } else {
        showToast('Failed to register asset', 'error');
      }
    } catch (e) {
      showToast('Error creating asset', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/maintenance/preventive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planForm),
      });

      if (res.ok) {
        showToast('Preventive maintenance schedule created!', 'success');
        setIsAddPlanOpen(false);
        fetchData();
      } else {
        showToast('Failed to create plan', 'error');
      }
    } catch (e) {
      showToast('Error creating plan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Real Calculated KPIs
  const openTickets = tickets.filter((t) => t.status === 'REPORTED' || t.status === 'ASSIGNED').length;
  const inProgress = tickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'AWAITING_PARTS').length;
  const criticalCount = tickets.filter((t) => t.priority === 'CRITICAL' && t.status !== 'RESOLVED').length;
  const totalRepairCost = tickets.reduce((acc, t) => acc + (t.actualCost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-brand-600" />
            Maintenance Operations Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Work order tickets, technician assignments, equipment assets, warranty tracking, and preventive plans
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/maintenance/my-tickets"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <UserCheck className="w-4 h-4" />
            Technician Mobile View
          </Link>
          <button
            onClick={() => setIsAddAssetOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
          >
            <HardDrive className="w-4 h-4 text-brand-600" />
            Add Asset
          </button>
          <button
            onClick={() => setIsNewTicketOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" />
            Create Work Order
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="pmfs-card p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Open Work Orders</span>
          <div className="text-2xl font-extrabold text-brand-600 mt-1">{openTickets}</div>
        </div>
        <div className="pmfs-card p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">In Progress</span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{inProgress}</div>
        </div>
        <div className="pmfs-card p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Critical Tickets</span>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">{criticalCount}</div>
        </div>
        <div className="pmfs-card p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Maintenance Cost</span>
          <div className="text-2xl font-extrabold text-purple-600 mt-1">₹{totalRepairCost.toFixed(2)}</div>
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
          onClick={() => setActiveTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'tickets' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Ticket Register ({tickets.length})
        </button>

        <button
          onClick={() => setActiveTab('assets')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'assets' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          Asset Register ({assets.length})
        </button>

        <button
          onClick={() => setActiveTab('preventive')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'preventive' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Preventive Schedules ({preventivePlans.length})
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { key: 'REPORTED', title: 'Reported', color: 'border-slate-300 bg-slate-50' },
            { key: 'IN_PROGRESS', title: 'In Progress / Parts', color: 'border-amber-300 bg-amber-50/40' },
            { key: 'VERIFICATION_REQUIRED', title: 'Verification Required', color: 'border-purple-300 bg-purple-50/40' },
            { key: 'RESOLVED', title: 'Resolved', color: 'border-emerald-300 bg-emerald-50/40' },
          ].map((col) => {
            const colTickets = tickets.filter((t) => {
              if (col.key === 'REPORTED') return t.status === 'REPORTED' || t.status === 'ASSIGNED';
              if (col.key === 'IN_PROGRESS') return t.status === 'IN_PROGRESS' || t.status === 'AWAITING_PARTS';
              if (col.key === 'VERIFICATION_REQUIRED') return t.status === 'VERIFICATION_REQUIRED' || t.status === 'REPAIR_COMPLETED';
              return t.status === 'RESOLVED';
            });

            return (
              <div key={col.key} className={`rounded-xl border ${col.color} p-3.5 space-y-3 min-h-[450px]`}>
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">{col.title}</h3>
                  <span className="w-5 h-5 rounded-full bg-white text-slate-800 font-bold text-[11px] flex items-center justify-center shadow-xs">
                    {colTickets.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colTickets.map((t) => (
                    <div key={t.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {t.room?.roomNumber ? `Room ${t.room.roomNumber}` : t.asset?.name || 'General'}
                        </span>
                        <Badge variant={t.priority === 'CRITICAL' ? 'error' : t.priority === 'HIGH' ? 'warning' : 'neutral'}>
                          {t.priority}
                        </Badge>
                      </div>

                      <div className="font-semibold text-xs text-slate-800">{t.title}</div>

                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <div>Ref: <strong className="font-mono text-brand-700">{t.ticketRef}</strong></div>
                        <div>Tech: <strong className="text-slate-800">{t.assignedTechnician?.fullName || 'Unassigned'}</strong></div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1">
                        {(t.status === 'REPORTED' || t.status === 'ASSIGNED') && (
                          <button
                            onClick={() => {
                              setSelectedTicket(t);
                              setIsAssignOpen(true);
                            }}
                            className="px-2.5 py-1 bg-brand-600 text-white rounded text-xs font-bold"
                          >
                            Assign Tech
                          </button>
                        )}

                        {(t.status === 'VERIFICATION_REQUIRED' || t.status === 'REPAIR_COMPLETED') && (
                          <button
                            onClick={() => {
                              setSelectedTicket(t);
                              setIsResolveOpen(true);
                            }}
                            className="px-2.5 py-1 bg-purple-600 text-white rounded text-xs font-bold"
                          >
                            Verify & Resolve
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

      {/* TAB 2: TICKET LIST */}
      {activeTab === 'tickets' && (
        <div className="pmfs-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Ticket Ref</th>
                  <th className="pmfs-table-th">Room / Asset</th>
                  <th className="pmfs-table-th">Category</th>
                  <th className="pmfs-table-th">Issue Title</th>
                  <th className="pmfs-table-th">Priority</th>
                  <th className="pmfs-table-th">Technician</th>
                  <th className="pmfs-table-th">Cost (₹)</th>
                  <th className="pmfs-table-th">Status</th>
                  <th className="pmfs-table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="pmfs-table-td font-mono font-bold text-brand-700">{t.ticketRef}</td>
                    <td className="pmfs-table-td font-bold text-slate-900">{t.room?.roomNumber ? `Room ${t.room.roomNumber}` : t.asset?.name || 'General'}</td>
                    <td className="pmfs-table-td"><Badge variant="neutral">{t.category}</Badge></td>
                    <td className="pmfs-table-td font-medium text-slate-900">{t.title}</td>
                    <td className="pmfs-table-td">
                      <Badge variant={t.priority === 'CRITICAL' ? 'error' : t.priority === 'HIGH' ? 'warning' : 'neutral'}>
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="pmfs-table-td text-xs text-slate-700">{t.assignedTechnician?.fullName || 'Unassigned'}</td>
                    <td className="pmfs-table-td font-bold text-slate-900">₹{t.actualCost || 0}</td>
                    <td className="pmfs-table-td">
                      <Badge variant={t.status === 'RESOLVED' ? 'success' : t.status === 'IN_PROGRESS' ? 'warning' : 'neutral'}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="pmfs-table-td text-right">
                      {t.status !== 'RESOLVED' && (
                        <button
                          onClick={() => {
                            setSelectedTicket(t);
                            setIsResolveOpen(true);
                          }}
                          className="px-2 py-1 bg-purple-600 text-white rounded text-xs font-bold"
                        >
                          Resolve
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

      {/* TAB 3: ASSETS */}
      {activeTab === 'assets' && (
        <div className="pmfs-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Asset Code</th>
                  <th className="pmfs-table-th">Asset Name</th>
                  <th className="pmfs-table-th">Category</th>
                  <th className="pmfs-table-th">Location / Room</th>
                  <th className="pmfs-table-th">Brand & Serial</th>
                  <th className="pmfs-table-th">Warranty Expiry</th>
                  <th className="pmfs-table-th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="pmfs-table-td font-mono font-bold text-brand-700">{a.assetRef}</td>
                    <td className="pmfs-table-td font-bold text-slate-900">{a.name}</td>
                    <td className="pmfs-table-td"><Badge variant="neutral">{a.category}</Badge></td>
                    <td className="pmfs-table-td text-xs text-slate-700">{a.room?.roomNumber ? `Room ${a.room.roomNumber}` : a.location || 'Property Wide'}</td>
                    <td className="pmfs-table-td text-xs text-slate-600">{a.brand || '—'} {a.serialNumber ? `(S/N: ${a.serialNumber})` : ''}</td>
                    <td className="pmfs-table-td">
                      {a.warrantyExpiry ? (
                        <span className={`text-xs font-bold ${a.isExpiringSoon ? 'text-rose-600 flex items-center gap-1' : 'text-slate-700'}`}>
                          {a.isExpiringSoon && <ShieldAlert className="w-3.5 h-3.5" />}
                          {new Date(a.warrantyExpiry).toLocaleDateString()}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="pmfs-table-td">
                      <Badge variant={a.status === 'OPERATIONAL' ? 'success' : 'error'}>{a.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PREVENTIVE SCHEDULES */}
      {activeTab === 'preventive' && (
        <div className="pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Preventive Maintenance Task Schedules
            </h3>
            <button
              onClick={() => setIsAddPlanOpen(true)}
              className="px-3 py-1.5 bg-brand-600 text-white rounded text-xs font-bold"
            >
              + Create Schedule
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Task Title</th>
                  <th className="pmfs-table-th">Target Asset / Room</th>
                  <th className="pmfs-table-th">Frequency</th>
                  <th className="pmfs-table-th">Next Due Date</th>
                  <th className="pmfs-table-th">Assigned Technician</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preventivePlans.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="pmfs-table-td font-bold text-slate-900">{p.taskTitle}</td>
                    <td className="pmfs-table-td">{p.asset?.name || `Room ${p.room?.roomNumber || 'General'}`}</td>
                    <td className="pmfs-table-td">Every {p.frequencyDays} Days</td>
                    <td className="pmfs-table-td font-bold text-purple-700">{new Date(p.nextDue).toLocaleDateString()}</td>
                    <td className="pmfs-table-td text-xs text-slate-700">{p.assignedTechnician?.fullName || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Ticket */}
      <Modal isOpen={isNewTicketOpen} onClose={() => setIsNewTicketOpen(false)} title="Create Maintenance Work Order" maxWidth="md">
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Room (Optional)</label>
            <select
              value={newTicketForm.roomId}
              onChange={(e) => setNewTicketForm({ ...newTicketForm, roomId: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              <option value="">General Property / Shared Asset</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.roomNumber} ({r.floor})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Category *</label>
              <select
                value={newTicketForm.category}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              >
                <option value="AC">AC Unit</option>
                <option value="PLUMBING">Plumbing</option>
                <option value="ELECTRICAL">Electrical</option>
                <option value="TELEVISION">Television</option>
                <option value="WIFI_NETWORK">Wi-Fi / Network</option>
                <option value="FURNITURE">Furniture</option>
                <option value="DOOR_LOCK">Door Lock</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Priority *</label>
              <select
                value={newTicketForm.priority}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, priority: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical (Blocks Room Out of Order) ⚠️</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Issue Title *</label>
            <input
              type="text"
              required
              value={newTicketForm.title}
              onChange={(e) => setNewTicketForm({ ...newTicketForm, title: e.target.value })}
              placeholder="e.g. AC compressor noise / Bathroom faucet leak"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Detailed Description *</label>
            <textarea
              required
              rows={3}
              value={newTicketForm.description}
              onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewTicketOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md"
            >
              {submitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Assign Technician */}
      <Modal isOpen={isAssignOpen} onClose={() => setIsAssignOpen(false)} title={`Assign Technician for ${selectedTicket?.ticketRef}`} maxWidth="sm">
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Technician *</label>
            <select
              required
              value={assignTechId}
              onChange={(e) => setAssignTechId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              <option value="">Select Technician</option>
              {techList.map((u) => (
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
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md"
            >
              {submitting ? 'Assigning...' : 'Assign Technician'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Resolve & Cost Record */}
      <Modal isOpen={isResolveOpen} onClose={() => setIsResolveOpen(false)} title={`Verify & Resolve Ticket ${selectedTicket?.ticketRef}`} maxWidth="md">
        <form onSubmit={handleResolveSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Resolution Summary *</label>
            <input
              type="text"
              required
              value={resolveForm.resolutionSummary}
              onChange={(e) => setResolveForm({ ...resolveForm, resolutionSummary: e.target.value })}
              placeholder="e.g. Replaced AC capacitor, pressure tested"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Labour Cost (₹)</label>
              <input
                type="number"
                value={resolveForm.labourCost}
                onChange={(e) => setResolveForm({ ...resolveForm, labourCost: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Parts Cost (₹)</label>
              <input
                type="number"
                value={resolveForm.partsCost}
                onChange={(e) => setResolveForm({ ...resolveForm, partsCost: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsResolveOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md"
            >
              {submitting ? 'Resolving...' : 'Confirm Verification & Resolve'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Asset */}
      <Modal isOpen={isAddAssetOpen} onClose={() => setIsAddAssetOpen(false)} title="Register Equipment Asset" maxWidth="md">
        <form onSubmit={handleCreateAsset} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Asset Name *</label>
              <input
                type="text"
                required
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                placeholder="e.g. Blue Star 1.5T AC"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Category *</label>
              <select
                value={assetForm.category}
                onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              >
                <option value="AC_UNIT">AC Unit</option>
                <option value="TV">Television</option>
                <option value="REFRIGERATOR">Refrigerator</option>
                <option value="GENERATOR">Generator</option>
                <option value="WATER_PUMP">Water Pump</option>
                <option value="BOILER">Boiler</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Location / Room</label>
              <select
                value={assetForm.roomId}
                onChange={(e) => setAssetForm({ ...assetForm, roomId: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              >
                <option value="">Property Wide / Common Area</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.roomNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Warranty Expiry</label>
              <input
                type="date"
                value={assetForm.warrantyExpiry}
                onChange={(e) => setAssetForm({ ...assetForm, warrantyExpiry: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddAssetOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md"
            >
              {submitting ? 'Registering...' : 'Register Asset'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Preventive Schedule */}
      <Modal isOpen={isAddPlanOpen} onClose={() => setIsAddPlanOpen(false)} title="Create Preventive Schedule" maxWidth="md">
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Schedule Task Title *</label>
            <input
              type="text"
              required
              value={planForm.taskTitle}
              onChange={(e) => setPlanForm({ ...planForm, taskTitle: e.target.value })}
              placeholder="e.g. Quarterly AC Filter & Pressure Servicing"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Frequency (Days) *</label>
              <input
                type="number"
                required
                value={planForm.frequencyDays}
                onChange={(e) => setPlanForm({ ...planForm, frequencyDays: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Assigned Technician</label>
              <select
                value={planForm.assignedTechnicianId}
                onChange={(e) => setPlanForm({ ...planForm, assignedTechnicianId: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              >
                <option value="">Unassigned</option>
                {techList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddPlanOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md"
            >
              {submitting ? 'Creating...' : 'Save Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
