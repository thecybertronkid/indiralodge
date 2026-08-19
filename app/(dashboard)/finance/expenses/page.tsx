'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Send,
  Building,
  Check,
  X,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function ExpensesPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'expenses' | 'vendors'>('expenses');

  const [expenses, setExpenses] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Modals state
  const [isAddExpOpen, setIsAddExpOpen] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);

  const [expForm, setExpForm] = useState({
    category: 'MAINTENANCE',
    accountId: '',
    vendorId: '',
    amount: '',
    taxAmount: '0',
    paymentMethod: 'CASH',
    description: '',
  });

  const [vendorForm, setVendorForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eRes, vRes, aRes] = await Promise.all([
        fetch('/api/finance/expenses'),
        fetch('/api/finance/vendors'),
        fetch('/api/finance/accounts'),
      ]);

      if (eRes.ok) setExpenses((await eRes.json()).expenses || []);
      if (vRes.ok) setVendors((await vRes.json()).vendors || []);
      if (aRes.ok) {
        const d = await aRes.json();
        const expAccounts = (d.accounts || []).filter((a: any) => a.type === 'EXPENSE');
        setAccounts(expAccounts);
        if (expAccounts.length > 0 && !expForm.accountId) {
          setExpForm((prev) => ({ ...prev, accountId: expAccounts[0].id }));
        }
      }
    } catch (e) {
      showToast('Failed to load expense data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expForm),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to submit expense', 'error');
        setSubmitting(false);
        return;
      }

      showToast(`Expense claim ${data.expense.expenseRef} submitted!`, 'success');
      setIsAddExpOpen(false);
      fetchData();
    } catch (e) {
      showToast('Error creating expense', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorForm),
      });

      if (res.ok) {
        showToast('Vendor master profile created!', 'success');
        setIsAddVendorOpen(false);
        fetchData();
      } else {
        showToast('Failed to create vendor', 'error');
      }
    } catch (e) {
      showToast('Error creating vendor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (expenseId: string, action: 'approve' | 'post' | 'reject') => {
    try {
      const res = await fetch('/api/finance/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseId, action }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Expense action failed', 'error');
        return;
      }

      showToast(data.message || 'Expense status updated!', 'success');
      fetchData();
    } catch (e) {
      showToast('Error executing expense action', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-rose-600" />
            Operating Expenses & Accounts Payable
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Supplier bills, expense claims (Submit → Approve → Post to General Ledger), and Vendor Accounts Payable
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddVendorOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
          >
            <Building className="w-4 h-4 text-brand-600" />
            Add Vendor
          </button>
          <button
            onClick={() => setIsAddExpOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" />
            Submit Expense
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'expenses' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Expenses Register ({expenses.length})
        </button>

        <button
          onClick={() => setActiveTab('vendors')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'vendors' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          Vendor Accounts Payable ({vendors.length})
        </button>

        <button onClick={fetchData} className="ml-auto p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: EXPENSES TABLE */}
      {activeTab === 'expenses' && (
        <div className="pmfs-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Expense Ref</th>
                  <th className="pmfs-table-th">Date</th>
                  <th className="pmfs-table-th">Category</th>
                  <th className="pmfs-table-th">GL Account</th>
                  <th className="pmfs-table-th">Vendor</th>
                  <th className="pmfs-table-th">Description</th>
                  <th className="pmfs-table-th text-right">Total (₹)</th>
                  <th className="pmfs-table-th">Status</th>
                  <th className="pmfs-table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="pmfs-table-td font-mono font-bold text-rose-700">{e.expenseRef}</td>
                    <td className="pmfs-table-td text-xs text-slate-500">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="pmfs-table-td"><Badge variant="neutral">{e.category}</Badge></td>
                    <td className="pmfs-table-td font-semibold text-slate-800">{e.account?.code} - {e.account?.name}</td>
                    <td className="pmfs-table-td text-xs text-slate-700">{e.vendor?.name || 'Direct Expense'}</td>
                    <td className="pmfs-table-td text-xs text-slate-900">{e.description}</td>
                    <td className="pmfs-table-td text-right font-mono font-bold text-rose-700">₹{e.totalAmount.toFixed(2)}</td>
                    <td className="pmfs-table-td">
                      <Badge variant={e.status === 'POSTED' ? 'success' : e.status === 'APPROVED' ? 'info' : 'warning'}>
                        {e.status}
                      </Badge>
                    </td>
                    <td className="pmfs-table-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        {e.status === 'SUBMITTED' && (
                          <button
                            onClick={() => handleAction(e.id, 'approve')}
                            className="px-2 py-1 bg-brand-600 text-white rounded text-xs font-bold"
                          >
                            Approve
                          </button>
                        )}
                        {e.status === 'APPROVED' && (
                          <button
                            onClick={() => handleAction(e.id, 'post')}
                            className="px-2 py-1 bg-purple-600 text-white rounded text-xs font-bold"
                          >
                            Post to GL
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: VENDORS TABLE */}
      {activeTab === 'vendors' && (
        <div className="pmfs-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Vendor Code</th>
                  <th className="pmfs-table-th">Vendor Name</th>
                  <th className="pmfs-table-th">Contact Person</th>
                  <th className="pmfs-table-th">Phone</th>
                  <th className="pmfs-table-th">GSTIN</th>
                  <th className="pmfs-table-th">Payment Terms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="pmfs-table-td font-mono font-bold text-brand-700">{v.vendorRef}</td>
                    <td className="pmfs-table-td font-bold text-slate-900">{v.name}</td>
                    <td className="pmfs-table-td text-xs text-slate-700">{v.contactPerson || '—'}</td>
                    <td className="pmfs-table-td font-mono text-xs">{v.phone}</td>
                    <td className="pmfs-table-td font-mono text-xs">{v.gstin || 'Unregistered'}</td>
                    <td className="pmfs-table-td text-xs font-bold text-slate-600">{v.paymentTerms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Submit Expense */}
      <Modal isOpen={isAddExpOpen} onClose={() => setIsAddExpOpen(false)} title="Submit Expense Claim" maxWidth="md">
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Category *</label>
              <select
                value={expForm.category}
                onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              >
                <option value="MAINTENANCE">Maintenance</option>
                <option value="HOUSEKEEPING">Housekeeping</option>
                <option value="UTILITIES">Electricity & Utilities</option>
                <option value="SALARIES">Staff Salaries</option>
                <option value="MARKETING">Marketing & Advertising</option>
                <option value="ADMINISTRATIVE">Administrative</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">GL Expense Account *</label>
              <select
                required
                value={expForm.accountId}
                onChange={(e) => setExpForm({ ...expForm, accountId: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Vendor (Optional)</label>
              <select
                value={expForm.vendorId}
                onChange={(e) => setExpForm({ ...expForm, vendorId: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              >
                <option value="">Direct Cash Expense</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={expForm.amount}
                onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Description *</label>
            <input
              type="text"
              required
              value={expForm.description}
              onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
              placeholder="e.g. Purchased AC capacitors from Vijay Electricals"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddExpOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md"
            >
              {submitting ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Vendor */}
      <Modal isOpen={isAddVendorOpen} onClose={() => setIsAddVendorOpen(false)} title="Register Vendor Profile" maxWidth="md">
        <form onSubmit={handleCreateVendor} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Vendor Name *</label>
              <input
                type="text"
                required
                value={vendorForm.name}
                onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                placeholder="e.g. Vijay Electricals & Spares"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={vendorForm.phone}
                onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">GSTIN</label>
              <input
                type="text"
                value={vendorForm.gstin}
                onChange={(e) => setVendorForm({ ...vendorForm, gstin: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email</label>
              <input
                type="email"
                value={vendorForm.email}
                onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddVendorOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md"
            >
              {submitting ? 'Registering...' : 'Register Vendor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
