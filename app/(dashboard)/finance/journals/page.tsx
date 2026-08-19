'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function JournalEntriesPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [journals, setJournals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<any>(null);

  // New Journal Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [description, setDescription] = useState('');
  const [sourceModule, setSourceModule] = useState('MANUAL');
  const [lines, setLines] = useState([
    { accountId: '', debit: '0', credit: '0', description: '' },
    { accountId: '', debit: '0', credit: '0', description: '' },
  ]);

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jRes, aRes] = await Promise.all([
        fetch('/api/finance/journals'),
        fetch('/api/finance/accounts'),
      ]);

      if (jRes.ok) setJournals((await jRes.json()).journals || []);
      if (aRes.ok) setAccounts((await aRes.json()).accounts || []);
    } catch (e) {
      showToast('Failed to load journal entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate live sum of Debits & Credits in new journal form
  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit || '0') || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit || '0') || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleAddLine = () => {
    setLines([...lines, { accountId: '', debit: '0', credit: '0', description: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: string) => {
    const newLines = [...lines];
    (newLines[index] as any)[field] = value;
    setLines(newLines);
  };

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      showToast('Unbalanced journal! Total Debits must equal Total Credits.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          sourceModule,
          lines,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to post journal entry', 'error');
        setSubmitting(false);
        return;
      }

      showToast(`Double-entry journal ${data.journal.entryRef} posted to General Ledger!`, 'success');
      setIsAddOpen(false);
      setDescription('');
      fetchData();
    } catch (e) {
      showToast('Error creating journal', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverseJournal = async (journalId: string) => {
    try {
      const res = await fetch(`/api/finance/journals/${journalId}/reverse`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to reverse journal', 'error');
        return;
      }

      showToast(`Reversing journal ${data.reversalJournal.entryRef} created!`, 'success');
      setIsDetailOpen(false);
      fetchData();
    } catch (e) {
      showToast('Error reversing journal', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-purple-600" />
            General Ledger & Journal Entries
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Double-entry transactions (Debit = Credit), automatic posting audit trail, and journal reversals
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" />
            New Double-Entry Journal
          </button>
        </div>
      </div>

      {/* Journal List Table */}
      <div className="pmfs-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            General Ledger Journal Register ({journals.length})
          </h3>
          <button onClick={fetchData} className="p-1.5 text-slate-500 hover:text-slate-800 rounded">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pmfs-table-th">Entry Ref</th>
                <th className="pmfs-table-th">Date</th>
                <th className="pmfs-table-th">Source</th>
                <th className="pmfs-table-th">Description</th>
                <th className="pmfs-table-th text-right">Debit (₹)</th>
                <th className="pmfs-table-th text-right">Credit (₹)</th>
                <th className="pmfs-table-th">Status</th>
                <th className="pmfs-table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {journals.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50">
                  <td className="pmfs-table-td font-mono font-bold text-purple-700">{j.entryRef}</td>
                  <td className="pmfs-table-td text-xs text-slate-500">{new Date(j.date).toLocaleDateString()}</td>
                  <td className="pmfs-table-td"><Badge variant="neutral">{j.sourceModule}</Badge></td>
                  <td className="pmfs-table-td font-medium text-slate-900">{j.description}</td>
                  <td className="pmfs-table-td text-right font-mono font-bold text-slate-900">₹{j.totalDebit.toFixed(2)}</td>
                  <td className="pmfs-table-td text-right font-mono font-bold text-slate-900">₹{j.totalCredit.toFixed(2)}</td>
                  <td className="pmfs-table-td">
                    <Badge variant={j.status === 'POSTED' ? 'success' : j.status === 'REVERSED' ? 'error' : 'neutral'}>
                      {j.status}
                    </Badge>
                  </td>
                  <td className="pmfs-table-td text-right">
                    <button
                      onClick={() => {
                        setSelectedJournal(j);
                        setIsDetailOpen(true);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold"
                    >
                      View Voucher
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Journal Entry Wizard */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="New Double-Entry Journal Entry" maxWidth="lg">
        <form onSubmit={handleCreateJournal} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Journal Description *</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Monthly Electricity Bill Payment"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Source Module</label>
              <select
                value={sourceModule}
                onChange={(e) => setSourceModule(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              >
                <option value="MANUAL">MANUAL (Manual Journal)</option>
                <option value="EXPENSE">EXPENSE</option>
                <option value="FOLIO">FOLIO</option>
                <option value="ADJUSTMENT">ADJUSTMENT</option>
              </select>
            </div>
          </div>

          {/* Double Entry Lines Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-800 uppercase">
                Ledger Lines (At least 1 Debit & 1 Credit)
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
              >
                + Add Line
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <select
                    required
                    value={line.accountId}
                    onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-900"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name} ({a.type})
                      </option>
                    ))}
                  </select>

                  <div className="w-28">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Debit ₹"
                      value={line.debit}
                      onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-right font-mono font-bold"
                    />
                  </div>

                  <div className="w-28">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Credit ₹"
                      value={line.credit}
                      onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-right font-mono font-bold"
                    />
                  </div>

                  {lines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Live Balance Checker Banner */}
          <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
            isBalanced ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {isBalanced ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
              <span>
                {isBalanced
                  ? 'Double-Entry Balanced: Debits equal Credits!'
                  : `Unbalanced! Total Debits (₹${totalDebit.toFixed(2)}) != Total Credits (₹${totalCredit.toFixed(2)})`}
              </span>
            </div>
            <div className="font-mono text-xs">
              Sum: Debit ₹{totalDebit.toFixed(2)} | Credit ₹{totalCredit.toFixed(2)}
            </div>
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
              disabled={submitting || !isBalanced}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post Journal Entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Journal Voucher Detail */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Journal Voucher: ${selectedJournal?.entryRef}`} maxWidth="md">
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div>Description: <strong>{selectedJournal?.description}</strong></div>
            <div>Source: <strong>{selectedJournal?.sourceModule}</strong> {selectedJournal?.sourceReference ? `(${selectedJournal.sourceReference})` : ''}</div>
            <div>Date: <strong>{selectedJournal?.date ? new Date(selectedJournal.date).toLocaleString() : ''}</strong></div>
            <div>Status: <Badge variant={selectedJournal?.status === 'POSTED' ? 'success' : 'error'}>{selectedJournal?.status}</Badge></div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="p-2 text-left">Account</th>
                <th className="p-2 text-right">Debit (₹)</th>
                <th className="p-2 text-right">Credit (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selectedJournal?.lines?.map((l: any) => (
                <tr key={l.id}>
                  <td className="p-2 font-semibold text-slate-900">{l.account?.code} — {l.account?.name}</td>
                  <td className="p-2 text-right font-mono font-bold text-slate-900">₹{l.debit.toFixed(2)}</td>
                  <td className="p-2 text-right font-mono font-bold text-slate-900">₹{l.credit.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {selectedJournal?.status === 'POSTED' && (
            <div className="pt-3 flex justify-end border-t border-slate-100">
              <button
                onClick={() => handleReverseJournal(selectedJournal.id)}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <RotateCcw className="w-4 h-4" /> Reverse Journal Entry
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
