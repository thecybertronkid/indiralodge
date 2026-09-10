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
  Receipt,
  FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function FinancialReportsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<
    'TRIAL_BALANCE' | 'PNL' | 'BALANCE_SHEET' | 'GENERAL_LEDGER' | 'GST_REPORT' | 'NON_GST_REPORT'
  >('GST_REPORT');

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // empty = full year

  const [tbData, setTbData] = useState<any>(null);
  const [pnlData, setPnlData] = useState<any>(null);
  const [bsData, setBsData] = useState<any>(null);
  const [glData, setGlData] = useState<any>(null);
  const [gstData, setGstData] = useState<any>(null);
  const [nonGstData, setNonGstData] = useState<any>(null);

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

      if (reportType === 'GST_REPORT') {
        const monthQuery = selectedMonth ? `&month=${selectedMonth}` : '';
        const res = await fetch(`/api/reports/gst?year=${selectedYear}${monthQuery}`);
        if (res.ok) setGstData(await res.json());
      } else if (reportType === 'NON_GST_REPORT') {
        const monthQuery = selectedMonth ? `&month=${selectedMonth}` : '';
        const res = await fetch(`/api/reports/non-gst?year=${selectedYear}${monthQuery}`);
        if (res.ok) setNonGstData(await res.json());
      } else {
        const url =
          reportType === 'GENERAL_LEDGER'
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
      }
    } catch (e) {
      showToast('Failed to generate financial report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, selectedAccountId, selectedYear, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            Financial & Tax Audit Statements
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Segmented GST Monthly/Annual Reports, Non-GST Reports, Trial Balance, P&L, Balance Sheet, and General Ledger
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

      {/* Report Filter Controls */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Financial Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  FY {y} - {y + 1}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Period Filter</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
            >
              <option value="">Full Year (Annual View)</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchReport}
          className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Report
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { key: 'GST_REPORT', label: 'GST Monthly/Annual Report', icon: Receipt },
          { key: 'NON_GST_REPORT', label: 'Non-GST Sales Report', icon: FileText },
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
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                reportType === t.key ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* REPORT 1: GST MONTHLY / ANNUAL REPORT */}
      {reportType === 'GST_REPORT' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="pmfs-card p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Total GST Invoices Issued</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{gstData?.summary?.totalInvoices ?? 0}</div>
            </div>
            <div className="pmfs-card p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Taxable Subtotal</span>
              <div className="text-2xl font-black text-brand-700 mt-1">
                ₹{gstData?.summary?.totalTaxable?.toLocaleString('en-IN') ?? '0'}
              </div>
            </div>
            <div className="pmfs-card p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Total GST Collected (CGST+SGST)</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                ₹{gstData?.summary?.totalGstCollected?.toLocaleString('en-IN') ?? '0'}
              </div>
            </div>
            <div className="pmfs-card p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Gross GST Revenue</span>
              <div className="text-2xl font-black text-indigo-700 mt-1">
                ₹{gstData?.summary?.grossTotal?.toLocaleString('en-IN') ?? '0'}
              </div>
            </div>
          </div>

          {/* Monthly Breakdown Table (for Annual View) */}
          {!selectedMonth && (
            <div className="pmfs-card overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Annual Monthly GST Summary ({selectedYear})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <th className="p-3 text-left">Month</th>
                      <th className="p-3 text-center">Invoice Count</th>
                      <th className="p-3 text-right">Taxable Value (₹)</th>
                      <th className="p-3 text-right">GST Collected (₹)</th>
                      <th className="p-3 text-right">Gross Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gstData?.monthlyBreakdown?.map((m: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{m.monthName}</td>
                        <td className="p-3 text-center font-mono">{m.count}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">₹{m.taxable.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">₹{m.gst.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-black text-indigo-700">₹{m.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Itemized Invoices List */}
          <div className="pmfs-card overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Itemized GST Tax Invoices Log
              </h3>
              <Badge variant="info">Property GSTIN: 18AOIPB2857A1ZB</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="pmfs-table-th">Invoice Ref</th>
                    <th className="pmfs-table-th">Date</th>
                    <th className="pmfs-table-th">Guest Name</th>
                    <th className="pmfs-table-th">Guest GSTIN</th>
                    <th className="pmfs-table-th">Taxable Subtotal</th>
                    <th className="pmfs-table-th">CGST (9%)</th>
                    <th className="pmfs-table-th">SGST (9%)</th>
                    <th className="pmfs-table-th">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {gstData?.invoices?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-500">
                        No GST tax invoices issued for this period.
                      </td>
                    </tr>
                  ) : (
                    gstData?.invoices?.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="pmfs-table-td font-mono font-bold text-brand-700">{inv.invoiceRef}</td>
                        <td className="pmfs-table-td text-slate-500">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                        <td className="pmfs-table-td font-bold text-slate-900">{inv.guest?.displayName}</td>
                        <td className="pmfs-table-td font-mono">{inv.customerGstin || 'Unregistered'}</td>
                        <td className="pmfs-table-td font-semibold text-slate-900">₹{(inv.subtotal - inv.discount).toFixed(2)}</td>
                        <td className="pmfs-table-td text-emerald-600 font-bold">₹{inv.cgstAmount.toFixed(2)}</td>
                        <td className="pmfs-table-td text-emerald-600 font-bold">₹{inv.sgstAmount.toFixed(2)}</td>
                        <td className="pmfs-table-td font-black text-slate-900">₹{inv.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: NON-GST SALES REPORT */}
      {reportType === 'NON_GST_REPORT' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="pmfs-card p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Total Non-GST Bills Issued</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{nonGstData?.summary?.totalBills ?? 0}</div>
            </div>
            <div className="pmfs-card p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Discounts Granted</span>
              <div className="text-2xl font-black text-rose-600 mt-1">
                ₹{nonGstData?.summary?.totalDiscount?.toLocaleString('en-IN') ?? '0'}
              </div>
            </div>
            <div className="pmfs-card p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Net Non-GST Revenue</span>
              <div className="text-2xl font-black text-indigo-700 mt-1">
                ₹{nonGstData?.summary?.totalRevenue?.toLocaleString('en-IN') ?? '0'}
              </div>
            </div>
          </div>

          {/* Itemized Non-GST Bills List */}
          <div className="pmfs-card overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Itemized Non-GST Hotel Receipts Log
              </h3>
              <Badge variant="neutral">Tax Exempt Sales</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="pmfs-table-th">Bill Ref</th>
                    <th className="pmfs-table-th">Date</th>
                    <th className="pmfs-table-th">Guest Name</th>
                    <th className="pmfs-table-th">Subtotal</th>
                    <th className="pmfs-table-th">Discount</th>
                    <th className="pmfs-table-th">Total Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nonGstData?.bills?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        No Non-GST bills issued for this period.
                      </td>
                    </tr>
                  ) : (
                    nonGstData?.bills?.map((b: any) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="pmfs-table-td font-mono font-bold text-indigo-700">{b.invoiceRef}</td>
                        <td className="pmfs-table-td text-slate-500">{new Date(b.invoiceDate).toLocaleDateString()}</td>
                        <td className="pmfs-table-td font-bold text-slate-900">{b.guest?.displayName}</td>
                        <td className="pmfs-table-td font-semibold text-slate-900">₹{b.subtotal.toFixed(2)}</td>
                        <td className="pmfs-table-td font-semibold text-rose-600">- ₹{b.discount.toFixed(2)}</td>
                        <td className="pmfs-table-td font-black text-slate-900">₹{b.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 3: TRIAL BALANCE */}
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
              <tbody className="divide-y divide-slate-100 text-xs">
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

      {/* REPORT 4: PROFIT & LOSS */}
      {reportType === 'PNL' && (
        <div className="pmfs-card p-6 space-y-6">
          <div className="border-b pb-3 flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 uppercase">Profit & Loss Statement</h3>
            <span className="text-xs text-slate-500 font-mono">Calculated from GL Ledger</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
            <span className="text-sm font-extrabold uppercase">NET OPERATING PROFIT / (LOSS):</span>
            <span className={`text-xl font-black font-mono ${pnlData?.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₹{pnlData?.netProfit?.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* REPORT 5: BALANCE SHEET */}
      {reportType === 'BALANCE_SHEET' && (
        <div className="pmfs-card p-6 space-y-6">
          <div className="border-b pb-3 flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 uppercase">Balance Sheet (Assets = Liabilities + Equity)</h3>
            <Badge variant={bsData?.isBalanced ? 'success' : 'error'}>
              {bsData?.isBalanced ? 'BALANCED' : 'UNBALANCED'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      {/* REPORT 6: GENERAL LEDGER DETAIL */}
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
            <table className="w-full text-xs">
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
