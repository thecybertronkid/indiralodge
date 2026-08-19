'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Landmark,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  Building,
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function FinanceDashboardPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [pnlData, setPnlData] = useState<any>(null);
  const [arData, setArData] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);

  const fetchFinanceOverview = async () => {
    setLoading(true);
    try {
      const [accRes, pnlRes, arRes, expRes, jRes] = await Promise.all([
        fetch('/api/finance/accounts'),
        fetch('/api/finance/reports?type=PNL'),
        fetch('/api/finance/receivables'),
        fetch('/api/finance/expenses'),
        fetch('/api/finance/journals'),
      ]);

      if (accRes.ok) setAccounts((await accRes.json()).accounts || []);
      if (pnlRes.ok) setPnlData(await pnlRes.json());
      if (arRes.ok) setArData(await arRes.json());
      if (expRes.ok) setExpenses((await expRes.json()).expenses || []);
      if (jRes.ok) setJournals((await jRes.json()).journals || []);
    } catch (e) {
      showToast('Failed to load financial overview', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceOverview();
  }, []);

  // Calculated Real Values from General Ledger & DB
  const cashAccount = accounts.find((a) => a.code === '1100');
  const bankAccount = accounts.find((a) => a.code === '1200');
  const arAccount = accounts.find((a) => a.code === '1300');

  const cashBalance = cashAccount ? cashAccount.balance : 0;
  const bankBalance = bankAccount ? bankAccount.balance : 0;
  const arOutstanding = arData?.summary?.totalOutstanding || (arAccount ? arAccount.balance : 0);

  const pendingExpenses = expenses.filter((e) => e.status === 'SUBMITTED' || e.status === 'APPROVED').length;
  const totalRevenue = pnlData?.totalRevenue || 0;
  const totalExpenses = pnlData?.totalExpenses || 0;
  const netProfit = pnlData?.netProfit || 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Landmark className="w-6 h-6 text-brand-600" />
            Finance & Accounting Executive Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Double-entry General Ledger, Chart of Accounts, GST Tax Invoices, Expenses, Accounts Receivable, and Financial Statements
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/finance/reports"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Financial Statements
          </Link>
          <Link
            href="/finance/journals"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" />
            New Journal Entry
          </Link>
        </div>
      </div>

      {/* Financial Executive KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="pmfs-card p-3.5 flex flex-col justify-between border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Revenue</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">₹{totalRevenue.toFixed(2)}</div>
          <span className="text-[10px] text-slate-400 mt-1">From room night tariffs & hotel services</span>
        </div>

        <div className="pmfs-card p-3.5 flex flex-col justify-between border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Operating Expenses</span>
            <ArrowDownRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">₹{totalExpenses.toFixed(2)}</div>
          <span className="text-[10px] text-slate-400 mt-1">Maintenance, utilities, & admin</span>
        </div>

        <div className="pmfs-card p-3.5 flex flex-col justify-between border-l-4 border-l-brand-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Net Operating Profit</span>
            <Scale className="w-4 h-4 text-brand-600" />
          </div>
          <div className={`text-2xl font-extrabold mt-1 ${netProfit >= 0 ? 'text-brand-600' : 'text-rose-600'}`}>
            ₹{netProfit.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1">General Ledger Calculated</span>
        </div>

        <div className="pmfs-card p-3.5 flex flex-col justify-between border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Guest Receivables (AR)</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">₹{arOutstanding.toFixed(2)}</div>
          <span className="text-[10px] text-slate-400 mt-1">Outstanding guest stay balances</span>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link href="/finance/accounts" className="pmfs-card p-3 flex flex-col items-center text-center hover:border-brand-500 hover:shadow-md transition-all">
          <Landmark className="w-5 h-5 text-brand-600 mb-1" />
          <span className="text-xs font-bold text-slate-800">Chart of Accounts</span>
          <span className="text-[10px] text-slate-500 mt-0.5">{accounts.length} Accounts</span>
        </Link>

        <Link href="/finance/journals" className="pmfs-card p-3 flex flex-col items-center text-center hover:border-brand-500 hover:shadow-md transition-all">
          <Scale className="w-5 h-5 text-purple-600 mb-1" />
          <span className="text-xs font-bold text-slate-800">Journal Entries</span>
          <span className="text-[10px] text-slate-500 mt-0.5">{journals.length} Entries</span>
        </Link>

        <Link href="/finance/invoices" className="pmfs-card p-3 flex flex-col items-center text-center hover:border-brand-500 hover:shadow-md transition-all">
          <Receipt className="w-5 h-5 text-emerald-600 mb-1" />
          <span className="text-xs font-bold text-slate-800">GST Tax Invoices</span>
          <span className="text-[10px] text-slate-500 mt-0.5">INV-2026-XXXXXX</span>
        </Link>

        <Link href="/finance/expenses" className="pmfs-card p-3 flex flex-col items-center text-center hover:border-brand-500 hover:shadow-md transition-all">
          <CreditCard className="w-5 h-5 text-rose-600 mb-1" />
          <span className="text-xs font-bold text-slate-800">Expenses & AP</span>
          <span className="text-[10px] text-slate-500 mt-0.5">{pendingExpenses} Pending</span>
        </Link>

        <Link href="/finance/cash-bank" className="pmfs-card p-3 flex flex-col items-center text-center hover:border-brand-500 hover:shadow-md transition-all">
          <Building className="w-5 h-5 text-blue-600 mb-1" />
          <span className="text-xs font-bold text-slate-800">Cash & Bank</span>
          <span className="text-[10px] text-slate-500 mt-0.5">Shift & Recon</span>
        </Link>

        <Link href="/finance/reports" className="pmfs-card p-3 flex flex-col items-center text-center hover:border-brand-500 hover:shadow-md transition-all">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600 mb-1" />
          <span className="text-xs font-bold text-slate-800">Financial Reports</span>
          <span className="text-[10px] text-slate-500 mt-0.5">Trial Bal / P&L / BS</span>
        </Link>
      </div>

      {/* Main Double Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Double-Entry Journal Entries */}
        <div className="pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-600" /> Recent Posted Journal Entries
            </h3>
            <Link href="/finance/journals" className="text-xs font-bold text-brand-600 hover:underline">
              View All →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Ref</th>
                  <th className="pmfs-table-th">Source</th>
                  <th className="pmfs-table-th">Description</th>
                  <th className="pmfs-table-th text-right">Debit (₹)</th>
                  <th className="pmfs-table-th text-right">Credit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {journals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-xs text-slate-500">
                      No journal entries posted yet. Check in a guest or record a payment to trigger automatic postings.
                    </td>
                  </tr>
                ) : (
                  journals.slice(0, 5).map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50">
                      <td className="pmfs-table-td font-mono font-bold text-purple-700">{j.entryRef}</td>
                      <td className="pmfs-table-td"><Badge variant="neutral">{j.sourceModule}</Badge></td>
                      <td className="pmfs-table-td text-xs text-slate-900 font-medium">{j.description}</td>
                      <td className="pmfs-table-td text-right font-mono font-bold text-slate-900">₹{j.totalDebit.toFixed(2)}</td>
                      <td className="pmfs-table-td text-right font-mono font-bold text-slate-900">₹{j.totalCredit.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Chart of Accounts Key Balances & Receivables */}
        <div className="space-y-4">
          <div className="pmfs-card p-4 space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Cash & Liquidity Reserves
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">1100 — Cash in Safe</span>
                <div className="text-lg font-black text-slate-900 mt-0.5">₹{cashBalance.toFixed(2)}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">1200 — Bank Operating</span>
                <div className="text-lg font-black text-slate-900 mt-0.5">₹{bankBalance.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="pmfs-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" /> Accounts Receivable Aging Summary
              </h3>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <span className="text-[10px] font-bold text-emerald-700">1-30 Days</span>
                <div className="font-extrabold text-slate-900 mt-0.5">₹{arData?.summary?.days1to30 || 0}</div>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg">
                <span className="text-[10px] font-bold text-amber-700">31-60 Days</span>
                <div className="font-extrabold text-slate-900 mt-0.5">₹{arData?.summary?.days31to60 || 0}</div>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <span className="text-[10px] font-bold text-orange-700">61-90 Days</span>
                <div className="font-extrabold text-slate-900 mt-0.5">₹{arData?.summary?.days61to90 || 0}</div>
              </div>
              <div className="p-2 bg-rose-50 rounded-lg">
                <span className="text-[10px] font-bold text-rose-700">90+ Days</span>
                <div className="font-extrabold text-slate-900 mt-0.5">₹{arData?.summary?.days90Plus || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
