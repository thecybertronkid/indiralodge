'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  Receipt,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Building,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatStayDateTime, openPrintBillWindow, segregateBillLines } from '@/lib/billPrinter';

export default function SingleInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const invoiceId = (params?.id as string) || '';
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    if (!invoiceId) return;

    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/finance/invoices/${encodeURIComponent(invoiceId)}`);
        if (!res.ok) {
          showToast('Invoice not found', 'error');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setInvoice(data.invoice);

        // Auto print if requested via query param
        if (searchParams.get('print') === 'true') {
          setTimeout(() => {
            openPrintBillWindow({
              invoice: data.invoice,
              reservation: data.invoice.reservation,
              guest: data.invoice.guest,
            });
          }, 500);
        }
      } catch (e) {
        showToast('Failed to load invoice', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading bill details...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Bill or Invoice Not Found</h2>
        <p className="text-xs text-slate-500">The requested bill reference ({invoiceId}) could not be located in the system.</p>
        <Link
          href="/finance/invoices"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices Register
        </Link>
      </div>
    );
  }

  const isNonGst =
    invoice.invoiceType === 'NON_GST' ||
    invoice.isGstBill === false ||
    (typeof invoice.invoiceRef === 'string' && invoice.invoiceRef.startsWith('BIL-')) ||
    invoice.reservation?.billType === 'NON_GST';

  const isGst = !isNonGst && Boolean(
    invoice.invoiceType === 'GST' ||
    invoice.isGstBill === true ||
    (typeof invoice.invoiceRef === 'string' && (invoice.invoiceRef.startsWith('INV-') || invoice.invoiceRef.startsWith('T ') || invoice.invoiceRef.startsWith('T-'))) ||
    invoice.reservation?.billType === 'GST' ||
    (Number(invoice.cgstAmount || 0) > 0 || Number(invoice.sgstAmount || 0) > 0)
  );

  const { roomLines, extraOrderLines } = segregateBillLines(invoice.lines || []);
  const roomBaseSub = roomLines.reduce((s: number, l: any) => s + (Number(l.taxableAmount || (l.unitPrice * l.quantity)) || 0), 0);
  const roomTariffTotal = roomLines.reduce((s: number, l: any) => s + (Number(l.totalAmount || (l.unitPrice * l.quantity)) || 0), 0);
  const extraSub = extraOrderLines.reduce((s: number, l: any) => s + (Number(l.totalAmount || (l.unitPrice * l.quantity)) || 0), 0);

  const cgst = isGst
    ? (Number(invoice.cgstAmount) || roomLines.reduce((s: number, l: any) => s + (Number(l.cgstAmount) || 0), 0) || Math.round((roomTariffTotal * 0.025) * 100) / 100)
    : 0;
  const sgst = isGst
    ? (Number(invoice.sgstAmount) || roomLines.reduce((s: number, l: any) => s + (Number(l.sgstAmount) || 0), 0) || Math.round((roomTariffTotal * 0.025) * 100) / 100)
    : 0;
  const totalGst = cgst + sgst;
  const roomSub = isGst ? roomBaseSub : roomTariffTotal;
  const discount = Number(invoice.discount || 0);
  const grandTotal = Number(invoice.totalAmount || Math.max(0, (roomSub + (isGst ? totalGst : 0) + extraSub - discount)));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/finance/invoices"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="Back to Invoices Register"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-extrabold text-slate-900">{invoice.invoiceRef}</span>
              {isGst ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                  GST Tax Invoice
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-800 border border-slate-300">
                  Non-GST Hotel Bill
                </span>
              )}
              <Badge variant={invoice.status === 'ISSUED' || invoice.status === 'PAID' ? 'success' : 'neutral'}>
                {invoice.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued for <span className="font-semibold text-slate-700">{invoice.guest?.displayName}</span> on{' '}
              {new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => {
              openPrintBillWindow({
                invoice,
                reservation: invoice.reservation,
                guest: invoice.guest,
              });
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>{isGst ? 'Print Tax Invoice' : 'Print Hotel Bill'}</span>
          </button>
        </div>
      </div>

      {/* Bill Card Preview (Exact Formal Document Layout) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6 text-xs text-slate-800" id="printable-invoice">
        {/* Letterhead */}
        <div className="flex items-start justify-between border-b pb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-white p-1 flex-shrink-0 shadow-xs">
              <img src="/logo.png" alt="Indira Lodge" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">INDIRA LODGE</h2>
              <p className="text-slate-500 font-medium text-xs">Solicitor Lodge, Near ASTC, Malow Ali, Jorhat, Assam - 781005</p>
              <p className="text-slate-500 font-medium text-xs">Contact: +91 70028 90165 • indiralodge@gmail.com</p>
              <p className="text-slate-700 font-bold text-xs mt-0.5">
                GSTIN: <span className="font-mono">18AOIPB2857A1ZB</span> • State Code: 18
              </p>
            </div>
          </div>
          <div className="text-right">
            {isGst ? (
              <span className="inline-block px-3 py-1 rounded text-xs font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                TAX INVOICE (GST)
              </span>
            ) : (
              <span className="inline-block px-3 py-1 rounded text-xs font-extrabold uppercase bg-slate-100 text-slate-800 border border-slate-300">
                HOTEL BILL & RECEIPT (NON-GST)
              </span>
            )}
            <p className="font-mono font-bold text-base text-slate-900 mt-1.5">{invoice.invoiceRef}</p>
            <p className="text-slate-500 text-xs">
              Date: {new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Guest & Stay Meta Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="font-bold text-slate-500 uppercase text-[10px] block">Billed To</span>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{invoice.guest?.displayName}</div>
            {invoice.guest?.company && (
              <div className="font-bold text-indigo-700 text-xs mt-0.5">🏢 {invoice.guest.company}</div>
            )}
            <div className="text-slate-500 text-[11px] mt-0.5">Phone: {invoice.guest?.phone || '—'}</div>
          </div>

          <div>
            <span className="font-bold text-slate-500 uppercase text-[10px] block">Customer GSTIN</span>
            <div className="font-mono font-bold text-slate-800 mt-0.5">
              {isGst
                ? (invoice.customerGstin || invoice.guest?.gstin || 'Unregistered / B2C')
                : 'N/A (Non-GST Bill)'}
            </div>
            <div className="text-slate-400 text-[11px]">Place of Supply: Assam (18)</div>
          </div>

          <div>
            <span className="font-bold text-slate-500 uppercase text-[10px] block">Room & Category</span>
            <div className="font-bold text-slate-900 text-sm mt-0.5">
              Room {invoice.reservation?.assignedRoom?.roomNumber || '—'}
            </div>
            <div className="text-slate-500 text-[11px]">
              {invoice.reservation?.roomType?.name || 'Standard Accommodation'}
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-500 uppercase text-[10px] block">Booking Reference</span>
            <div className="font-mono font-bold text-brand-700 mt-0.5">
              {invoice.reservation?.reservationRef || '—'}
            </div>
            <div className="text-slate-500 text-[11px]">
              Stay: {invoice.reservation?.nights || 1} Night(s)
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-500 uppercase text-[10px] block">Check-In Date & Time</span>
            <div className="font-bold text-slate-800 mt-0.5">
              {formatStayDateTime(
                invoice.reservation?.actualCheckInAt,
                invoice.reservation?.arrivalTime || '14:00',
                invoice.reservation?.arrivalDate
              )}
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-500 uppercase text-[10px] block">Check-Out Date & Time</span>
            <div className="font-bold text-slate-800 mt-0.5">
              {formatStayDateTime(
                invoice.reservation?.actualCheckOutAt,
                invoice.reservation?.departureTime || '11:00',
                invoice.reservation?.departureDate
              )}
            </div>
          </div>
        </div>

        {/* SECTION 1: Room Accommodation Tariff */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span>{isGst ? 'Section 1: Base Room Tariff & Accommodation' : 'Room Accommodation Charges'}</span>
            <span className="text-[11px] text-slate-300 font-normal">{isGst ? 'Tariff Particulars' : 'Stay Charges'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <th className="p-2.5 text-center w-10">#</th>
                  <th className="p-2.5 text-left">Particulars / Description</th>
                  {isGst && <th className="p-2.5 text-center w-24">HSN/SAC</th>}
                  <th className="p-2.5 text-center w-12">Qty</th>
                  <th className="p-2.5 text-right w-24">Rate (₹)</th>
                  {isGst && <th className="p-2.5 text-right w-24">Taxable (₹)</th>}
                  {isGst && <th className="p-2.5 text-right w-20">CGST (2.5%)</th>}
                  {isGst && <th className="p-2.5 text-right w-20">SGST (2.5%)</th>}
                  <th className="p-2.5 text-right w-28">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {roomLines.map((line: any, idx: number) => {
                  const unitPrice = Number(line.unitPrice || 0).toFixed(2);
                  const taxable = Number(line.taxableAmount || (line.quantity * line.unitPrice) || 0).toFixed(2);
                  const lCgst = (Number(line.cgstAmount) || (Number(taxable) * 0.025)).toFixed(2);
                  const lSgst = (Number(line.sgstAmount) || (Number(taxable) * 0.025)).toFixed(2);
                  const lTotal = isGst
                    ? Number(line.totalAmount || (Number(taxable) + Number(lCgst) + Number(lSgst)) || 0).toFixed(2)
                    : Number(line.totalAmount || (line.quantity * line.unitPrice) || 0).toFixed(2);
                  return (
                    <tr key={line.id || idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 text-center font-mono text-[11px] text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-semibold text-slate-900">{line.description}</td>
                      {isGst && <td className="p-2.5 text-center font-mono text-[11px] text-slate-600">{line.hsnSacCode || '996311'}</td>}
                      <td className="p-2.5 text-center font-mono">{line.quantity || 1}</td>
                      <td className="p-2.5 text-right font-mono">₹{unitPrice}</td>
                      {isGst && <td className="p-2.5 text-right font-mono text-slate-700">₹{taxable}</td>}
                      {isGst && <td className="p-2.5 text-right font-mono text-slate-600">₹{lCgst}</td>}
                      {isGst && <td className="p-2.5 text-right font-mono text-slate-600">₹{lSgst}</td>}
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">₹{lTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                  {isGst ? (
                    <>
                      <td colSpan={5} className="p-2.5 text-right text-slate-600">Section 1 Subtotal (Tariff):</td>
                      <td className="p-2.5 text-right font-mono text-slate-900">₹{roomSub.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono text-slate-700">₹{cgst.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono text-slate-700">₹{sgst.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono text-brand-700">₹{(roomSub + totalGst).toFixed(2)}</td>
                    </>
                  ) : (
                    <>
                      <td colSpan={4} className="p-2.5 text-right text-slate-600">Room Accommodation Total:</td>
                      <td className="p-2.5 text-right font-mono text-brand-700">₹{roomTariffTotal.toFixed(2)}</td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* SECTION 2: Extra Room Orders & Food Services */}
        {extraOrderLines.length > 0 && (
          <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/10">
            <div className="bg-amber-900 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span>{isGst ? 'Section 2: Extra Room Orders & Services' : 'Extra Room Orders & Food Services'}</span>
              <span className="text-[10px] text-amber-200 font-semibold bg-amber-800/60 px-2 py-0.5 rounded">
                {isGst ? 'Non-GST / Exempt (GST Charged on Room Tariff Only)' : 'Food & Extra Charges'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-amber-100/60 text-slate-700 font-bold border-b border-amber-200 uppercase text-[10px]">
                    <th className="p-2.5 text-center w-10">#</th>
                    <th className="p-2.5 text-left">Item Description</th>
                    <th className="p-2.5 text-center w-24">Type</th>
                    <th className="p-2.5 text-center w-12">Qty</th>
                    <th className="p-2.5 text-right w-24">Unit Rate (₹)</th>
                    {isGst && <th className="p-2.5 text-center w-24">Tax Status</th>}
                    <th className="p-2.5 text-right w-28">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 font-medium">
                  {extraOrderLines.map((line: any, idx: number) => {
                    const lineTot = Number(line.totalAmount || (line.quantity * line.unitPrice) || 0).toFixed(2);
                    return (
                      <tr key={line.id || idx} className="hover:bg-amber-50/40">
                        <td className="p-2.5 text-center font-mono text-[11px] text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-semibold text-slate-900">{line.description}</td>
                        <td className="p-2.5 text-center text-slate-500 font-mono text-[11px]">{line.hsnSacCode || 'FOLIO'}</td>
                        <td className="p-2.5 text-center font-mono">{line.quantity || 1}</td>
                        <td className="p-2.5 text-right font-mono">₹{Number(line.unitPrice || 0).toFixed(2)}</td>
                        {isGst && (
                          <td className="p-2.5 text-center">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                              0% (Exempt)
                            </span>
                          </td>
                        )}
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">₹{lineTot}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-50/80 font-bold border-t border-amber-200 text-xs">
                    <td colSpan={isGst ? 6 : 5} className="p-2.5 text-right text-amber-900">Orders Subtotal:</td>
                    <td className="p-2.5 text-right font-mono text-amber-900 font-bold">₹{extraSub.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Combined Totals & Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end pt-4 border-t border-slate-200 gap-6">
          <div className="text-xs text-slate-500 max-w-sm space-y-1.5">
            <div className="font-semibold text-slate-700">Terms & Conditions:</div>
            <p>1. Check-out time is 11:00 AM.</p>
            {isGst ? (
              <p>2. Goods & Services Tax (GST) is charged strictly on base room tariff as per hotel tax policy.</p>
            ) : (
              <p>2. Non-GST bill issued. No taxes collected on this receipt.</p>
            )}
            <p>3. This computer generated bill is final and acknowledged.</p>
            <div className="pt-2 text-[11px] text-slate-400">
              For any billing inquiries, reach out at <span className="font-medium text-slate-600">indiralodge@gmail.com</span>
            </div>
          </div>

          <div className="w-full sm:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>{isGst ? 'Section 1 (Room Tariff):' : 'Room Charges:'}</span>
              <span className="font-mono font-bold text-slate-900">₹{roomSub.toFixed(2)}</span>
            </div>
            {extraOrderLines.length > 0 && (
              <div className="flex justify-between text-amber-800">
                <span>{isGst ? 'Section 2 (Room Orders):' : 'Room Orders & Food:'}</span>
                <span className="font-mono font-bold">₹{extraSub.toFixed(2)}</span>
              </div>
            )}
            {isGst ? (
              <>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>CGST (2.5% on Room Tariff):</span>
                  <span className="font-mono">₹{cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>SGST (2.5% on Room Tariff):</span>
                  <span className="font-mono">₹{sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-700 font-bold text-[11px] border-t pt-1.5">
                  <span>Total GST (5%):</span>
                  <span className="font-mono">₹{totalGst.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>GST Tax:</span>
                <span className="font-mono text-slate-400">₹0.00 (Non-GST Bill)</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold text-xs border-t pt-1.5">
                <span>Discount / Round-Off:</span>
                <span className="font-mono font-bold">-₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t-2 border-slate-300">
              <span>Grand Total:</span>
              <span className="font-mono text-emerald-700">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer / Signatures */}
        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs text-slate-500">
          <div>
            <p>Thank you for staying at <strong>Indira Lodge</strong>!</p>
            <p className="text-[11px] text-slate-400">Computer Generated Invoice • Valid without physical seal</p>
          </div>
          <div className="text-center sm:text-right">
            <div className="h-12 border-b border-slate-300 w-48 mb-1" />
            <span className="text-[11px] font-bold text-slate-700 uppercase">Authorized Signatory</span>
          </div>
        </div>
      </div>
    </div>
  );
}
