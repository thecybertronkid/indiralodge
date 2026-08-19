'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  Printer,
  TrendingUp,
  Scale,
  Building,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function FinancialReportsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'TRIAL_BALANCE' | 'PNL' | 'BALANCE_SHEET' | 'GENERAL_LEDGER'>('TRIAL_BALANCE');

  const [tbData, setTbData] = useState<any>(null);
  const [pnlData, setPnlData] = useState<any>(null);
  const [bsData, setBsData] = useState<any>(null);
  const [glData, setGlData] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (reportType === 'GENERAL_LEDGER' && accounts.length === 0) {
        const accRes = await fetch('/api/finance/accounts');
        if (accRes.ok) {
          const accs = (await accRes.json()).accounts || [];
          setAccounts(accs);
          if (accs.length > 0 && !selectedAccountId) setSelectedAccountId(accs[0].id);
        }
      }

      const url = reportType === 'GENERAL_LEDGER'
        ? `/api/finance/reports?type=GENERAL_LEDGER&accountId=${selectedAccountId}`
        : `/api/finance/reports?type=${reportType}`;

      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        if (reportType === 'TRIAL_BALANCE') setTbData(d);
        if (reportType === 'PNL') setPnlData(d);
        if (reportType === 'BALANCE_SHEET') setBsData(d);
        if (reportType === 'GENERAL_LEDGER') setGlData(d);
      }
    } catch (e) {
      showToast('Failed to generate financial report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, selectedAccountId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            Financial Statements & Accounting Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            General Ledger running balance, Trial Balance (Debit = Credit), Profit & Loss Statement, and Balance Sheet
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            Print Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { key: 'TRIAL_BALANCE', label: 'Trial Balance', icon: Scale },
          { key: 'PNL', label: 'Profit & Loss (P&L)', icon: TrendingUp },
          { key: 'BALANCE_SHEET', label: 'Balance Sheet', icon: Building },
          { key: 'GENERAL_LEDGER', label: 'General Ledger Detail', icon: FileSpreadsheet },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setReportType(t.key as any)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                reportType === t.key ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}

        <button onClick={fetchReport} className="ml-auto p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* REPORT 1: TRIAL BALANCE */}
      {reportType === 'TRIAL_BALANCE' && (
        <div className="pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Trial Balance Statement
            </h3>
            <div className="flex items-center gap-2 text-xs font-bold">
              {tbData?.isBalanced ? (
                <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> BALANCED</span>
              ) : (
                <span className="text-rose-700 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> UNBALANCED</span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Account Code</th>
                  <th className="pmfs-table-th">Account Name</th>
                  <th className="pmfs-table-th">Type</th>
                  <th className="pmfs-table-th text-right">Debit Balance (₹)</th>
                  <th className="pmfs-table-th text-right">Credit Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tbData?.tbLines?.map((l: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="pmfs-table-td font-mono font-bold text-brand-700">{l.code}</td>
                    <td className="pmfs-table-td font-bold text-slate-900">{l.name}</td>
                    <td className="pmfs-table-td"><Badge variant="neutral">{l.type}</Badge></td>
                    <td className="pmfs-table-td text-right font-mono font-bold text-slate-900">
                      {l.debit > 0 ? `₹${l.debit.toFixed(2)}` : '—'}
                    </td>
                    <td className="pmfs-table-td text-right font-mono font-bold text-slate-900">
                      {l.credit > 0 ? `₹${l.credit.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-extrabold text-sm">
                  <td colSpan={3} className="p-3">TOTAL TRIAL BALANCE</td>
                  <td className="p-3 text-right font-mono text-emerald-400">₹{tbData?.totalDebits?.toFixed(2)}</td>
                  <td className="p-3 text-right font-mono text-emerald-400">₹{tbData?.totalCredits?.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 2: PROFIT & LOSS */}
      {reportType === 'PNL' && (
        <div className="pmfs-card p-6 space-y-6">
          <div className="border-b pb-3 flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 uppercase">Profit & Loss Statement</h3>
            <span className="text-xs text-slate-500 font-mono">Calculated from GL Ledger</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue Section */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
              <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider">1. Operating Revenue</h4>
              <div className="space-y-2 text-xs">
                {pnlData?.revenues?.map((r: any) => (
                  <div key={r.code} className="flex justify-between font-medium">
                    <span>{r.code} — {r.name}</span>
                    <span className="font-mono font-bold text-slate-900">₹{r.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-emerald-200 flex justify-between font-extrabold text-sm text-emerald-900">
                <span>TOTAL REVENUE:</span>
                <span className="font-mono">₹{pnlData?.totalRevenue?.toFixed(2)}</span>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-3">
              <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider">2. Operating Expenses</h4>
              <div className="space-y-2 text-xs">
                {pnlData?.expenses?.map((e: any) => (
                  <div key={e.code} className="flex justify-between font-medium">
                    <span>{e.code} — {e.name}</span>
                    <span className="font-mono font-bold text-slate-900">₹{e.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-rose-200 flex justify-between font-extrabold text-sm text-rose-900">
                <span>TOTAL EXPENSES:</span>
                <span className="font-mono">₹{pnlData?.totalExpenses?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Bottom Net Profit Banner */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
            <span className="text-sm font-extrabold uppercase">NET OPERATING PROFIT / (LOSS):</span>
            <span className={`text-xl font-black font-mono ${pnlData?.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₹{pnlData?.netProfit?.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* REPORT 3: BALANCE SHEET */}
      {reportType === 'BALANCE_SHEET' && (
        <div className="pmfs-card p-6 space-y-6">
          <div className="border-b pb-3 flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 uppercase">Balance Sheet (Assets = Liabilities + Equity)</h3>
            <Badge variant={bsData?.isBalanced ? 'success' : 'error'}>
              {bsData?.isBalanced ? 'BALANCED' : 'UNBALANCED'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assets */}
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
              <h4 className="text-xs font-black text-blue-800 uppercase tracking-wider">ASSETS</h4>
              <div className="space-y-2 text-xs">
                {bsData?.assets?.map((a: any) => (
                  <div key={a.code} className="flex justify-between font-medium">
                    <span>{a.code} — {a.name}</span>
                    <span className="font-mono font-bold text-slate-900">₹{a.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-blue-200 flex justify-between font-extrabold text-sm text-blue-900">
                <span>TOTAL ASSETS:</span>
                <span className="font-mono">₹{bsData?.totalAssets?.toFixed(2)}</span>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3">
              <h4 className="text-xs font-black text-purple-800 uppercase tracking-wider">LIABILITIES & EQUITY</h4>
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-500 uppercase">Liabilities:</span>
                {bsData?.liabilities?.map((l: any) => (
                  <div key={l.code} className="flex justify-between font-medium pl-2">
                    <span>{l.code} — {l.name}</span>
                    <span className="font-mono font-bold text-slate-900">₹{l.amount.toFixed(2)}</span>
                  </div>
                ))}

                <span className="font-bold text-slate-500 uppercase block pt-2">Equity:</span>
                {bsData?.equity?.map((e: any) => (
                  <div key={e.code} className="flex justify-between font-medium pl-2">
                    <span>{e.code} — {e.name}</span>
                    <span className="font-mono font-bold text-slate-900">₹{e.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-medium pl-2 text-brand-700">
                  <span>Current Period Net Profit</span>
                  <span className="font-mono font-bold">₹{bsData?.currentPeriodProfit?.toFixed(2)}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-purple-200 flex justify-between font-extrabold text-sm text-purple-900">
                <span>TOTAL LIABILITIES & EQUITY:</span>
                <span className="font-mono">₹{bsData?.totalLiabilitiesAndEquity?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 4: GENERAL LEDGER DETAIL */}
      {reportType === 'GENERAL_LEDGER' && (
        <div className="pmfs-card p-4 space-y-4">
          <div className="flex items-center gap-3 max-w-md">
            <label className="text-xs font-bold text-slate-700 uppercase">Select Account:</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-bold"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name} ({a.type})
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Date</th>
                  <th className="pmfs-table-th">Journal Ref</th>
                  <th className="pmfs-table-th">Description</th>
                  <th className="pmfs-table-th text-right">Debit (₹)</th>
                  <th className="pmfs-table-th text-right">Credit (₹)</th>
                  <th className="pmfs-table-th text-right">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {glData?.ledgerLines?.map((l: any) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="pmfs-table-td text-xs text-slate-500">{new Date(l.date).toLocaleDateString()}</td>
                    <td className="pmfs-table-td font-mono font-bold text-purple-700">{l.entryRef}</td>
                    <td className="pmfs-table-td text-xs text-slate-900">{l.description}</td>
                    <td className="pmfs-table-td text-right font-mono font-bold">{l.debit > 0 ? `₹${l.debit.toFixed(2)}` : '—'}</td>
                    <td className="pmfs-table-td text-right font-mono font-bold">{l.credit > 0 ? `₹${l.credit.toFixed(2)}` : '—'}</td>
                    <td className="pmfs-table-td text-right font-mono font-black text-brand-700">₹{l.runningBalance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
