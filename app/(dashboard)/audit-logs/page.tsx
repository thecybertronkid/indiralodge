'use client';

import React, { useState, useEffect } from 'react';
import { FileCheck2, Search, Filter, RefreshCw, Loader2, Clock, User, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function AuditLogsPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const url = `/api/audit-logs?module=${encodeURIComponent(moduleFilter)}&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.auditLogs || []);
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
  }, [moduleFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <FileCheck2 className="w-6 h-6 text-brand-600" />
          System Audit & Security Trail
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Immutable audit record of administrative, security, and operational actions performed across Indira Lodge
        </p>
      </div>

      {/* Filter & Search */}
      <div className="pmfs-card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, module, or user..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Module:</span>
          </div>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Modules</option>
            <option value="auth">Authentication (Login/Logout)</option>
            <option value="users">User Management</option>
            <option value="settings">Property Settings</option>
            <option value="system">System Setup</option>
          </select>

          <button
            onClick={fetchAuditLogs}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audit Data Table */}
      <div className="pmfs-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pmfs-table-th">Timestamp</th>
                <th className="pmfs-table-th">User / Staff</th>
                <th className="pmfs-table-th">Action Performed</th>
                <th className="pmfs-table-th">Module</th>
                <th className="pmfs-table-th">Entity / Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-xs text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                    Loading system audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-xs text-slate-500">
                    No audit records match the current filter criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="pmfs-table-td text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="pmfs-table-td font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.user?.fullName || 'System'}</span>
                      </div>
                    </td>
                    <td className="pmfs-table-td">
                      <span className="font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded text-xs">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="pmfs-table-td">
                      <Badge variant="neutral">{log.module}</Badge>
                    </td>
                    <td className="pmfs-table-td text-xs text-slate-600 max-w-xs truncate">
                      {log.afterData ? (
                        <span className="font-mono text-[11px] text-slate-500">
                          {log.afterData.length > 50 ? log.afterData.substring(0, 50) + '...' : log.afterData}
                        </span>
                      ) : log.entityId ? (
                        <span>ID: {log.entityId}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
