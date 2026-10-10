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
import { formatStayDateTime, openPrintBillWindow, segregateBillLines } from '@/lib/billPrinter';

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
  const [companyName, setCompanyName] = useState('');
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
        if (d.guests?.length > 0 && !guestId) {
          setGuestId(d.guests[0].id);
          setCompanyName(d.guests[0].company || '');
          setCustomerGstin(d.guests[0].gstin || '');
        }
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
          companyName,
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
              onChange={(e) => {
                const id = e.target.value;
                setGuestId(id);
                const g = guests.find((x) => x.id === id);
                if (g) {
                  setCompanyName(g.company || '');
                  setCustomerGstin(g.gstin || '');
                }
              }}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              {guests.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.displayName} ({g.phone}) {g.company ? `- ${g.company}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Company Name (Optional)</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp / Tata Sons"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Customer GSTIN (Optional)</label>
              <input
                type="text"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                placeholder="18AOIPB2857A1ZB"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono"
              />
            </div>
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
      <Modal isOpen={isPrintOpen} onClose={() => setIsPrintOpen(false)} title={`Tax Invoice: ${selectedInvoice?.invoiceRef}`} maxWidth="xl">
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (selectedInvoice) {
                  openPrintBillWindow({
                    invoice: selectedInvoice,
                    reservation: selectedInvoice.reservation,
                    guest: selectedInvoice.guest,
                  });
                }
              }}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Tax Invoice</span>
            </button>
          </div>

          <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-5 text-xs text-slate-800 shadow-sm" id="printable-invoice">
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white p-1 flex-shrink-0 shadow-xs">
                  <img src="/logo.png" alt="Indira Lodge" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">INDIRA LODGE</h2>
                  <p className="text-slate-500 font-medium text-[11px]">Solicitor Lodge, Near ASTC, Malow Ali, Jorhat, Assam - 781005</p>
                  <p className="text-slate-500 font-medium text-[11px]">Contact: +91 70028 90165 • indiralodge@gmail.com</p>
                  <p className="text-slate-700 font-bold text-[11px] mt-0.5">
                    GSTIN: <span className="font-mono">18AOIPB2857A1ZB</span> • State Code: 18
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded text-xs font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                  TAX INVOICE
                </span>
                <p className="font-mono font-bold text-sm text-slate-900 mt-1">{selectedInvoice?.invoiceRef}</p>
                <p className="text-slate-500 text-[11px]">
                  Date: {selectedInvoice?.invoiceDate ? new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
              <div>
                <span className="font-bold text-slate-500 uppercase text-[10px] block">Billed To</span>
                <div className="font-bold text-slate-900 text-xs mt-0.5">{selectedInvoice?.guest?.displayName}</div>
                {selectedInvoice?.guest?.company && (
                  <div className="font-bold text-indigo-700 text-[11px] mt-0.5">🏢 {selectedInvoice.guest.company}</div>
                )}
                <div className="text-slate-500 text-[10px] mt-0.5">Phone: {selectedInvoice?.guest?.phone || '—'}</div>
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase text-[10px] block">Customer GSTIN</span>
                <div className="font-mono font-bold text-slate-800 mt-0.5">
                  {selectedInvoice?.customerGstin || selectedInvoice?.guest?.gstin || 'Unregistered / B2C'}
                </div>
                <div className="text-slate-400 text-[10px]">Place of Supply: Assam (18)</div>
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase text-[10px] block">Room & Category</span>
                <div className="font-bold text-slate-900 text-xs mt-0.5">
                  Room {selectedInvoice?.reservation?.assignedRoom?.roomNumber || '—'}
                </div>
                <div className="text-slate-500 text-[10px]">
                  {selectedInvoice?.reservation?.roomType?.name || 'Standard Accommodation'}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase text-[10px] block">Booking Reference</span>
                <div className="font-mono font-bold text-brand-700 mt-0.5">
                  {selectedInvoice?.reservation?.reservationRef || '—'}
                </div>
                <div className="text-slate-500 text-[10px]">
                  Stay: {selectedInvoice?.reservation?.nights || 1} Night(s)
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase text-[10px] block">Check-In Date & Time</span>
                <div className="font-bold text-slate-800 mt-0.5">
                  {formatStayDateTime(
                    selectedInvoice?.reservation?.actualCheckInAt,
                    selectedInvoice?.reservation?.arrivalTime || '14:00',
                    selectedInvoice?.reservation?.arrivalDate
                  )}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase text-[10px] block">Check-Out Date & Time</span>
                <div className="font-bold text-slate-800 mt-0.5">
                  {formatStayDateTime(
                    selectedInvoice?.reservation?.actualCheckOutAt,
                    selectedInvoice?.reservation?.departureTime || '11:00',
                    selectedInvoice?.reservation?.departureDate
                  )}
                </div>
              </div>
            </div>

            {(() => {
              const { roomLines, extraOrderLines } = segregateBillLines(selectedInvoice?.lines || []);
              const roomSub = roomLines.reduce((s: number, l: any) => s + (Number(l.taxableAmount || (l.unitPrice * l.quantity)) || 0), 0);
              const extraSub = extraOrderLines.reduce((s: number, l: any) => s + (Number(l.totalAmount || (l.unitPrice * l.quantity)) || 0), 0);
              const isGst = selectedInvoice?.invoiceType === 'GST' || selectedInvoice?.isGstBill || true; // Invoices here are Tax Invoices
              const cgst = isGst ? (Number(selectedInvoice?.cgstAmount) || Math.round(roomSub * 0.025 * 100) / 100) : 0;
              const sgst = isGst ? (Number(selectedInvoice?.sgstAmount) || Math.round(roomSub * 0.025 * 100) / 100) : 0;
              const totalGst = cgst + sgst;
              const grandTotal = Number(selectedInvoice?.totalAmount || (roomSub + totalGst + extraSub));

              return (
                <div className="space-y-4">
                  {/* SECTION 1: Room Accommodation Tariff */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-900 text-white px-3.5 py-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                      <span>Section 1: Base Room Tariff & Accommodation</span>
                      <span className="text-[11px] text-slate-300 font-normal">Tariff Particulars</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                            <th className="p-2 text-center w-8">#</th>
                            <th className="p-2 text-left">Particulars / Description</th>
                            <th className="p-2 text-center w-20">HSN/SAC</th>
                            <th className="p-2 text-center w-12">Qty</th>
                            <th className="p-2 text-right w-20">Rate (₹)</th>
                            <th className="p-2 text-right w-20">Taxable (₹)</th>
                            <th className="p-2 text-right w-16">CGST (2.5%)</th>
                            <th className="p-2 text-right w-16">SGST (2.5%)</th>
                            <th className="p-2 text-right w-24">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {roomLines.map((line: any, idx: number) => {
                            const unitPrice = Number(line.unitPrice || 0).toFixed(2);
                            const taxable = Number(line.taxableAmount || (line.quantity * line.unitPrice) || 0).toFixed(2);
                            const lCgst = (Number(line.cgstAmount) || (Number(taxable) * 0.025)).toFixed(2);
                            const lSgst = (Number(line.sgstAmount) || (Number(taxable) * 0.025)).toFixed(2);
                            const lTotal = (Number(taxable) + Number(lCgst) + Number(lSgst)).toFixed(2);
                            return (
                              <tr key={line.id || idx} className="hover:bg-slate-50/50">
                                <td className="p-2 text-center font-mono text-[11px] text-slate-400">{idx + 1}</td>
                                <td className="p-2 font-semibold text-slate-900">{line.description}</td>
                                <td className="p-2 text-center font-mono text-[11px] text-slate-600">{line.hsnSacCode || '996311'}</td>
                                <td className="p-2 text-center font-mono">{line.quantity || 1}</td>
                                <td className="p-2 text-right font-mono">₹{unitPrice}</td>
                                <td className="p-2 text-right font-mono text-slate-700">₹{taxable}</td>
                                <td className="p-2 text-right font-mono text-slate-600">₹{lCgst}</td>
                                <td className="p-2 text-right font-mono text-slate-600">₹{lSgst}</td>
                                <td className="p-2 text-right font-mono font-bold text-slate-900">₹{lTotal}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 font-bold border-t border-slate-200 text-[11px]">
                            <td colSpan={5} className="p-2 text-right text-slate-600">Section 1 Subtotal (Tariff):</td>
                            <td className="p-2 text-right font-mono text-slate-900">₹{roomSub.toFixed(2)}</td>
                            <td className="p-2 text-right font-mono text-slate-700">₹{cgst.toFixed(2)}</td>
                            <td className="p-2 text-right font-mono text-slate-700">₹{sgst.toFixed(2)}</td>
                            <td className="p-2 text-right font-mono text-brand-700">₹{(roomSub + totalGst).toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* SECTION 2: Extra Room Orders & Services */}
                  {extraOrderLines.length > 0 && (
                    <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/10">
                      <div className="bg-amber-900 text-white px-3.5 py-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                        <span>Section 2: Extra Room Orders & Services</span>
                        <span className="text-[10px] text-amber-200 font-semibold bg-amber-800/60 px-2 py-0.5 rounded">
                          Non-GST / Exempt (GST Charged on Room Tariff Only)
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-amber-100/60 text-slate-700 font-bold border-b border-amber-200 uppercase text-[10px]">
                              <th className="p-2 text-center w-8">#</th>
                              <th className="p-2 text-left">Item Description</th>
                              <th className="p-2 text-center w-20">Type</th>
                              <th className="p-2 text-center w-12">Qty</th>
                              <th className="p-2 text-right w-24">Unit Rate (₹)</th>
                              <th className="p-2 text-center w-24">Tax Status</th>
                              <th className="p-2 text-right w-24">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100 font-medium">
                            {extraOrderLines.map((line: any, idx: number) => {
                              const lineTot = Number(line.totalAmount || (line.quantity * line.unitPrice) || 0).toFixed(2);
                              return (
                                <tr key={line.id || idx} className="hover:bg-amber-50/40">
                                  <td className="p-2 text-center font-mono text-[11px] text-slate-400">{idx + 1}</td>
                                  <td className="p-2 font-semibold text-slate-900">{line.description}</td>
                                  <td className="p-2 text-center text-slate-500 font-mono text-[11px]">{line.hsnSacCode || 'FOLIO'}</td>
                                  <td className="p-2 text-center font-mono">{line.quantity || 1}</td>
                                  <td className="p-2 text-right font-mono">₹{Number(line.unitPrice || 0).toFixed(2)}</td>
                                  <td className="p-2 text-center">
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                                      0% (Exempt)
                                    </span>
                                  </td>
                                  <td className="p-2 text-right font-mono font-bold text-slate-900">₹{lineTot}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-amber-50/80 font-bold border-t border-amber-200 text-[11px]">
                              <td colSpan={6} className="p-2 text-right text-amber-900">Section 2 Subtotal (Room Orders):</td>
                              <td className="p-2 text-right font-mono text-amber-900">₹{extraSub.toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Combined Totals & Summary */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end pt-3 border-t border-slate-200 gap-4">
                    <div className="text-[11px] text-slate-500 max-w-xs space-y-1">
                      <div className="font-semibold text-slate-700">Terms & Conditions:</div>
                      <p>1. Check-out time is 11:00 AM.</p>
                      <p>2. Goods & Services Tax (GST) is charged strictly on base room tariff as per hotel tax policy.</p>
                      <p>3. This computer generated bill is final and acknowledged.</p>
                    </div>

                    <div className="w-full sm:w-72 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Section 1 (Room Tariff):</span>
                        <span className="font-mono font-bold">₹{roomSub.toFixed(2)}</span>
                      </div>
                      {extraOrderLines.length > 0 && (
                        <div className="flex justify-between text-amber-800">
                          <span>Section 2 (Room Orders):</span>
                          <span className="font-mono font-bold">₹{extraSub.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>CGST (2.5% on Room Tariff):</span>
                        <span className="font-mono">₹{cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>SGST (2.5% on Room Tariff):</span>
                        <span className="font-mono">₹{sgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700 font-bold text-[11px] border-t pt-1">
                        <span>Total GST (5%):</span>
                        <span className="font-mono">₹{totalGst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t-2 border-slate-300">
                        <span>Grand Total:</span>
                        <span className="font-mono text-emerald-700">₹{grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </Modal>
    </div>
  );
}
