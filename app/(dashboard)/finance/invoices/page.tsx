'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  RefreshCw,
  Search,
  Printer,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function TaxInvoicesPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Modals state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const [guestId, setGuestId] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('State');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [iRes, gRes] = await Promise.all([
        fetch('/api/finance/invoices'),
        fetch('/api/guests'),
      ]);

      if (iRes.ok) setInvoices((await iRes.json()).invoices || []);
      if (gRes.ok) {
        const d = await gRes.json();
        setGuests(d.guests || []);
        if (d.guests?.length > 0 && !guestId) setGuestId(d.guests[0].id);
      }
    } catch (e) {
      showToast('Failed to load tax invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIssueInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/finance/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId,
          customerGstin,
          placeOfSupply,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to issue tax invoice', 'error');
        setSubmitting(false);
        return;
      }

      showToast(`Tax Invoice ${data.invoice.invoiceRef} issued successfully!`, 'success');
      setIsNewOpen(false);
      fetchData();
    } catch (e) {
      showToast('Error issuing tax invoice', 'error');
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
            <Receipt className="w-6 h-6 text-emerald-600" />
            GST Tax Invoices & Billing
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Indian GST compliant tax invoices (INV-2026-XXXXXX), SAC 996311 lodging breakdown, Credit Notes, and Printable Vouchers
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsNewOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" />
            Issue Tax Invoice
          </button>
        </div>
      </div>

      {/* Tax Invoices Register Table */}
      <div className="pmfs-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Issued Tax Invoices ({invoices.length})
          </h3>
          <button onClick={fetchData} className="p-1.5 text-slate-500 hover:text-slate-800 rounded">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pmfs-table-th">Invoice Ref</th>
                <th className="pmfs-table-th">Invoice Date</th>
                <th className="pmfs-table-th">Guest Name</th>
                <th className="pmfs-table-th">GSTIN</th>
                <th className="pmfs-table-th text-right">Subtotal (₹)</th>
                <th className="pmfs-table-th text-right">CGST + SGST (₹)</th>
                <th className="pmfs-table-th text-right">Total Invoice (₹)</th>
                <th className="pmfs-table-th">Status</th>
                <th className="pmfs-table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="pmfs-table-td font-mono font-bold text-emerald-700">{inv.invoiceRef}</td>
                  <td className="pmfs-table-td text-xs text-slate-500">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                  <td className="pmfs-table-td font-bold text-slate-900">{inv.guest?.displayName}</td>
                  <td className="pmfs-table-td text-xs text-slate-600">{inv.customerGstin || 'Unregistered'}</td>
                  <td className="pmfs-table-td text-right font-mono font-bold text-slate-900">₹{inv.subtotal.toFixed(2)}</td>
                  <td className="pmfs-table-td text-right font-mono font-bold text-slate-600">₹{(inv.cgstAmount + inv.sgstAmount + inv.igstAmount).toFixed(2)}</td>
                  <td className="pmfs-table-td text-right font-mono font-bold text-emerald-700">₹{inv.totalAmount.toFixed(2)}</td>
                  <td className="pmfs-table-td">
                    <Badge variant={inv.status === 'ISSUED' || inv.status === 'PAID' ? 'success' : 'neutral'}>
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="pmfs-table-td text-right">
                    <button
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setIsPrintOpen(true);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold flex items-center gap-1 ml-auto"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Issue New Tax Invoice */}
      <Modal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} title="Issue Indian GST Tax Invoice" maxWidth="md">
        <form onSubmit={handleIssueInvoice} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Guest *</label>
            <select
              required
              value={guestId}
              onChange={(e) => setGuestId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              {guests.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.displayName} ({g.phone}) {g.company ? `- ${g.company}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Customer GSTIN (Optional)</label>
              <input
                type="text"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value)}
                placeholder="27AAAAA0000A1Z5"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Place of Supply</label>
              <input
                type="text"
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md"
            >
              {submitting ? 'Issuing...' : 'Issue Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Printable Tax Invoice Layout */}
      <Modal isOpen={isPrintOpen} onClose={() => setIsPrintOpen(false)} title={`Tax Invoice: ${selectedInvoice?.invoiceRef}`} maxWidth="lg">
        <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-6 text-xs" id="printable-invoice">
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">INDIRA LODGE</h2>
              <p className="text-slate-500">Main Road, Hotel District</p>
              <p className="text-slate-500">GSTIN: 27AABCI1234F1Z9</p>
            </div>
            <div className="text-right">
              <span className="text-base font-extrabold text-emerald-700">TAX INVOICE</span>
              <p className="font-mono font-bold text-slate-800">{selectedInvoice?.invoiceRef}</p>
              <p className="text-slate-500">Date: {selectedInvoice?.invoiceDate ? new Date(selectedInvoice.invoiceDate).toLocaleDateString() : ''}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl">
            <div>
              <span className="font-bold text-slate-700 uppercase">Billed To:</span>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedInvoice?.guest?.displayName}</div>
              <div>Phone: {selectedInvoice?.guest?.phone}</div>
              <div>GSTIN: {selectedInvoice?.customerGstin || 'Unregistered'}</div>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-700 uppercase">Place of Supply:</span>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedInvoice?.placeOfSupply}</div>
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b">
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-center">SAC Code</th>
                <th className="p-2 text-right">Taxable Amt</th>
                <th className="p-2 text-right">CGST (6%)</th>
                <th className="p-2 text-right">SGST (6%)</th>
                <th className="p-2 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selectedInvoice?.lines?.map((l: any, idx: number) => (
                <tr key={idx}>
                  <td className="p-2 font-medium text-slate-900">{l.description}</td>
                  <td className="p-2 text-center font-mono">{l.hsnSacCode}</td>
                  <td className="p-2 text-right font-mono">₹{l.taxableAmount.toFixed(2)}</td>
                  <td className="p-2 text-right font-mono">₹{l.cgstAmount.toFixed(2)}</td>
                  <td className="p-2 text-right font-mono">₹{l.sgstAmount.toFixed(2)}</td>
                  <td className="p-2 text-right font-mono font-bold text-slate-900">₹{l.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <div className="w-64 space-y-1 text-right">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono font-bold">₹{selectedInvoice?.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST (6%):</span>
                <span className="font-mono font-bold">₹{selectedInvoice?.cgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST (6%):</span>
                <span className="font-mono font-bold">₹{selectedInvoice?.sgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-emerald-700 pt-2 border-t">
                <span>Total Invoice:</span>
                <span className="font-mono">₹{selectedInvoice?.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
