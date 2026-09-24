'use client';

import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Clock,
  User,
  ShieldCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export default function AuditLogsPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const limit = 50;

  // Filters
  const [moduleFilter, setModuleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log Details Modal
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const applyDatePreset = (preset: 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom') => {
    setDateRangePreset(preset);
    setPage(1);

    const now = new Date();
    const toDateString = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = toDateString(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yest = new Date(now.getTime() - 86400000);
      const yestStr = toDateString(yest);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === '7days') {
      const past7 = new Date(now.getTime() - 7 * 86400000);
      setStartDate(toDateString(past7));
      setEndDate(toDateString(now));
    } else if (preset === '30days') {
      const past30 = new Date(now.getTime() - 30 * 86400000);
      setStartDate(toDateString(past30));
      setEndDate(toDateString(now));
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(moduleFilter ? { module: moduleFilter } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      });

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.auditLogs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        showToast('Failed to fetch audit logs', 'error');
      }
    } catch (e) {
      showToast('Network error fetching audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, moduleFilter, startDate, endDate]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchAuditLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileCheck2 className="w-6 h-6 text-brand-600" />
            System Audit & Security Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete immutable audit log of administrative, financial, and front-desk actions (50 records per page)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="neutral" className="font-mono text-xs px-3 py-1">
            Total Logs: {total.toLocaleString()}
          </Badge>
          <button
            onClick={() => {
              setPage(1);
              fetchAuditLogs();
            }}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="pmfs-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="relative md:col-span-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, module, staff name, entity ID..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Module Filter */}
          <div className="md:col-span-3 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Modules</option>
              <option value="auth">Authentication (Login/Logout)</option>
              <option value="front_office">Front Office & Check-In</option>
              <option value="reservation">Reservations</option>
              <option value="rooms">Rooms & Inventory</option>
              <option value="billing">Billing & Room Orders</option>
              <option value="finance">Finance & Accounts</option>
              <option value="users">User & Staff Management</option>
              <option value="housekeeping">Housekeeping</option>
              <option value="maintenance">Maintenance</option>
              <option value="settings">Property Settings</option>
              <option value="system">System Setup</option>
            </select>
          </div>

          {/* Date Presets */}
          <div className="md:col-span-5 flex flex-wrap items-center gap-1.5 justify-start md:justify-end">
            {(
              [
                { label: 'All Time', value: 'all' },
                { label: 'Today', value: 'today' },
                { label: 'Yesterday', value: 'yesterday' },
                { label: 'Last 7 Days', value: '7days' },
                { label: 'Last 30 Days', value: '30days' },
                { label: 'Custom', value: 'custom' },
              ] as const
            ).map((p) => (
              <button
                key={p.value}
                onClick={() => applyDatePreset(p.value)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dateRangePreset === p.value
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Pickers (if selected) */}
        {dateRangePreset === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Start Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">End Date:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Audit Data Table */}
      <div className="pmfs-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pmfs-table-th">Timestamp</th>
                <th className="pmfs-table-th">Staff / User</th>
                <th className="pmfs-table-th">Action</th>
                <th className="pmfs-table-th">Module</th>
                <th className="pmfs-table-th">Details / Entity</th>
                <th className="pmfs-table-th text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-xs text-slate-500">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2.5 text-brand-600" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-xs text-slate-500">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span>No audit records match the current filter criteria.</span>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="pmfs-table-td text-xs text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </td>

                    <td className="pmfs-table-td font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {log.user?.fullName ? log.user.fullName.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div className="truncate max-w-[150px]">
                          <span className="font-semibold block truncate">{log.user?.fullName || 'System'}</span>
                          {log.user?.email && (
                            <span className="text-[10px] text-slate-400 block truncate">{log.user.email}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="pmfs-table-td">
                      <span className="font-semibold text-brand-700 bg-brand-50 border border-brand-200/60 px-2 py-0.5 rounded text-xs">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="pmfs-table-td">
                      <Badge variant="neutral" className="uppercase text-[10px]">
                        {log.module}
                      </Badge>
                    </td>

                    <td className="pmfs-table-td text-xs text-slate-600 max-w-xs truncate">
                      {log.afterData ? (
                        <span className="font-mono text-[11px] text-slate-600 block truncate">
                          {log.afterData}
                        </span>
                      ) : log.entityId ? (
                        <span className="font-mono text-[11px] text-slate-500">ID: {log.entityId}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="pmfs-table-td text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold"
                        title="View Full Audit Payload"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-600" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls - 50 per page */}
        {!loading && total > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing <span className="font-bold text-slate-900">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-bold text-slate-900">{total}</span> records (50 per page)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="px-3 py-1.5 font-bold font-mono text-slate-900 bg-slate-100 rounded-lg">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full Audit Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Audit Trail Record Details"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Action</span>
                <span className="font-bold text-brand-700 text-sm">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Module</span>
                <span className="font-bold text-slate-900 text-sm uppercase">{selectedLog.module}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Timestamp</span>
                <span className="font-mono text-slate-800">{new Date(selectedLog.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">User</span>
                <span className="font-semibold text-slate-800">{selectedLog.user?.fullName || 'System'} ({selectedLog.user?.email || 'N/A'})</span>
              </div>
              {selectedLog.entityId && (
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Entity ID</span>
                  <span className="font-mono text-slate-800">{selectedLog.entityId}</span>
                </div>
              )}
            </div>

            {selectedLog.afterData && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700 uppercase">Payload Data / Changes:</span>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedLog.afterData), null, 2);
                    } catch {
                      return selectedLog.afterData;
                    }
                  })()}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
