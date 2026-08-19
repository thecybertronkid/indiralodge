'use client';

import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Lock,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function ChartOfAccountsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // New Account Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'EXPENSE',
    parentAccountId: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/accounts');
      if (res.ok) {
        const d = await res.json();
        setAccounts(d.accounts || []);
      }
    } catch (e) {
      showToast('Failed to load Chart of Accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create account', 'error');
        setSubmitting(false);
        return;
      }

      showToast(`Account ${data.account.code} - ${data.account.name} created!`, 'success');
      setIsAddOpen(false);
      fetchAccounts();
    } catch (e) {
      showToast('Error creating account', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAccounts = accounts.filter((a) => {
    const matchesSearch = a.code.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || a.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Landmark className="w-6 h-6 text-brand-600" />
            Chart of Accounts (COA)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Hierarchical ledger account structure for Assets, Liabilities, Equity, Revenue, and Operating Expenses
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" />
            Create Account
          </button>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="pmfs-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search account code or name..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                typeFilter === t ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
          <button onClick={fetchAccounts} className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="pmfs-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pmfs-table-th">Account Code</th>
                <th className="pmfs-table-th">Account Name</th>
                <th className="pmfs-table-th">Type</th>
                <th className="pmfs-table-th">Normal Balance</th>
                <th className="pmfs-table-th">System Tag</th>
                <th className="pmfs-table-th text-right">GL Ledger Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="pmfs-table-td font-mono font-bold text-brand-700">{a.code}</td>
                  <td className="pmfs-table-td font-bold text-slate-900 flex items-center gap-2">
                    {a.name}
                    {a.isSystemAccount && (
                      <span className="p-0.5 text-amber-600" title="Protected System Account">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </td>
                  <td className="pmfs-table-td">
                    <Badge variant={a.type === 'ASSET' ? 'info' : a.type === 'REVENUE' ? 'success' : a.type === 'EXPENSE' ? 'error' : 'neutral'}>
                      {a.type}
                    </Badge>
                  </td>
                  <td className="pmfs-table-td text-xs font-semibold text-slate-600">{a.normalBalance}</td>
                  <td className="pmfs-table-td text-xs text-slate-500">{a.systemType || '—'}</td>
                  <td className="pmfs-table-td text-right font-mono font-bold text-slate-900">
                    ₹{a.balance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Account */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create New Chart of Account" maxWidth="md">
        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Account Code *</label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. 5150"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Account Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              >
                <option value="ASSET">ASSET (1000)</option>
                <option value="LIABILITY">LIABILITY (2000)</option>
                <option value="EQUITY">EQUITY (3000)</option>
                <option value="REVENUE">REVENUE (4000)</option>
                <option value="EXPENSE">EXPENSE (5000)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Account Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Marketing & Publicity Expense"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional account notes"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md"
            >
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
