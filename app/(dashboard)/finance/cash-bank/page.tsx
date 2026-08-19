'use client';

import React, { useState, useEffect } from 'react';
import {
  Building,
  RefreshCw,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Scale,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function CashAndBankPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);

  const [activeShift, setActiveShift] = useState<any>(null);
  const [shiftHistory, setShiftHistory] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // Shift & Recon Modal States
  const [isOpenShiftModal, setIsOpenShiftModal] = useState(false);
  const [isCloseShiftModal, setIsCloseShiftModal] = useState(false);
  const [isReconModal, setIsReconModal] = useState(false);

  const [openingCash, setOpeningCash] = useState('1000');
  const [actualCash, setActualCash] = useState('');
  const [discrepancyReason, setDiscrepancyReason] = useState('');

  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [stmtBalance, setStmtBalance] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, bRes] = await Promise.all([
        fetch('/api/finance/cash-shifts'),
        fetch('/api/finance/bank-reconciliation'),
      ]);

      if (cRes.ok) {
        const d = await cRes.json();
        setActiveShift(d.activeShift);
        setShiftHistory(d.shiftHistory || []);
      }
      if (bRes.ok) {
        const d = await bRes.json();
        setBankAccounts(d.bankAccounts || []);
      }
    } catch (e) {
      showToast('Failed to load cash and bank data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/cash-shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open', openingCash }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to open shift', 'error');
        setSubmitting(false);
        return;
      }

      showToast('Cashier shift opened successfully!', 'success');
      setIsOpenShiftModal(false);
      fetchData();
    } catch (e) {
      showToast('Error opening shift', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/cash-shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', actualCash, discrepancyReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to close shift', 'error');
        setSubmitting(false);
        return;
      }

      showToast('Cashier shift closed successfully!', 'success');
      setIsCloseShiftModal(false);
      fetchData();
    } catch (e) {
      showToast('Error closing shift', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/finance/bank-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId: selectedBank.id,
          statementClosingBalance: stmtBalance,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Reconciliation failed', 'error');
        setSubmitting(false);
        return;
      }

      showToast('Bank reconciliation completed!', 'success');
      setIsReconModal(false);
      fetchData();
    } catch (e) {
      showToast('Error executing reconciliation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building className="w-6 h-6 text-blue-600" />
            Cash Management & Bank Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cashier shift opening & closing, cash discrepancy tracking, and bank statement matching
          </p>
        </div>
      </div>

      {/* Cashier Shift Status Banner */}
      <div className="pmfs-card p-4 border-l-4 border-l-brand-600 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Cashier Shift Status:</span>
            <Badge variant={activeShift ? 'success' : 'neutral'}>
              {activeShift ? 'SHIFT OPEN' : 'NO ACTIVE SHIFT'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {activeShift
              ? `Opened at ${new Date(activeShift.openedAt).toLocaleTimeString()} with ₹${activeShift.openingCash} opening cash.`
              : 'Open a cashier shift before collecting cash payments at the front desk.'}
          </p>
        </div>

        <div>
          {!activeShift ? (
            <button
              onClick={() => setIsOpenShiftModal(true)}
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
            >
              <Unlock className="w-4 h-4" /> Open Cashier Shift
            </button>
          ) : (
            <button
              onClick={() => setIsCloseShiftModal(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
            >
              <Lock className="w-4 h-4" /> Close Cashier Shift
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Shift History */}
        <div className="pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Cashier Shift History
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Staff Member</th>
                  <th className="pmfs-table-th">Opened At</th>
                  <th className="pmfs-table-th text-right">Opening (₹)</th>
                  <th className="pmfs-table-th text-right">Expected (₹)</th>
                  <th className="pmfs-table-th text-right">Actual (₹)</th>
                  <th className="pmfs-table-th text-right">Discrepancy (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shiftHistory.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="pmfs-table-td font-bold text-slate-900">{s.user?.fullName}</td>
                    <td className="pmfs-table-td text-xs text-slate-500">{new Date(s.openedAt).toLocaleDateString()}</td>
                    <td className="pmfs-table-td text-right font-mono font-bold">₹{s.openingCash}</td>
                    <td className="pmfs-table-td text-right font-mono font-bold">₹{s.expectedCash}</td>
                    <td className="pmfs-table-td text-right font-mono font-bold">₹{s.actualCash}</td>
                    <td className={`pmfs-table-td text-right font-mono font-bold ${s.discrepancy < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₹{s.discrepancy.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Bank Accounts & Reconciliation */}
        <div className="pmfs-card p-4 space-y-4">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Bank Accounts & Reconciliation Register
          </h3>

          <div className="space-y-3">
            {bankAccounts.map((b) => (
              <div key={b.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">{b.accountName}</div>
                    <div className="text-xs text-slate-500 font-mono">{b.bankName} • Account: {b.accountNumberMasked}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-slate-900">₹{b.currentBalance.toFixed(2)}</div>
                    <span className="text-[10px] text-slate-400">Book Balance</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedBank(b);
                      setStmtBalance(b.currentBalance.toString());
                      setIsReconModal(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm"
                  >
                    Reconcile Statement
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Open Shift */}
      <Modal isOpen={isOpenShiftModal} onClose={() => setIsOpenShiftModal(false)} title="Open Cashier Shift" maxWidth="sm">
        <form onSubmit={handleOpenShift} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Opening Cash Balance (₹) *</label>
            <input
              type="number"
              required
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsOpenShiftModal(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md"
            >
              {submitting ? 'Opening...' : 'Open Shift'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Close Shift */}
      <Modal isOpen={isCloseShiftModal} onClose={() => setIsCloseShiftModal(false)} title="Close Cashier Shift" maxWidth="sm">
        <form onSubmit={handleCloseShift} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Actual Physical Cash Count (₹) *</label>
            <input
              type="number"
              required
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              placeholder="Count cash in till"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Discrepancy Explanation</label>
            <input
              type="text"
              value={discrepancyReason}
              onChange={(e) => setDiscrepancyReason(e.target.value)}
              placeholder="Required if actual cash != expected cash"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCloseShiftModal(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md"
            >
              {submitting ? 'Closing...' : 'Close Shift'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Bank Reconciliation */}
      <Modal isOpen={isReconModal} onClose={() => setIsReconModal(false)} title={`Bank Reconciliation: ${selectedBank?.accountName}`} maxWidth="sm">
        <form onSubmit={handleReconcile} className="space-y-4">
          <div className="p-3 bg-slate-50 border rounded-xl text-xs">
            <div>Current Book Balance: <strong>₹{selectedBank?.currentBalance.toFixed(2)}</strong></div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Bank Statement Closing Balance (₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={stmtBalance}
              onChange={(e) => setStmtBalance(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsReconModal(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md"
            >
              {submitting ? 'Reconciling...' : 'Confirm Reconciliation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
