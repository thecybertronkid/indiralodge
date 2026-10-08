/**
 * Bill & Tax Invoice Printing Engine for Indira Lodge
 * Generates pixel-perfect, GST-compliant printouts with small, minimal logo badges
 * and accurate check-in/out timestamps.
 */

export function formatStayDateTime(
  dateValue?: string | Date | null,
  timeValue?: string | null,
  fallbackDate?: string | Date | null
): string {
  const target = dateValue || fallbackDate;
  if (!target) return '—';
  const d = new Date(target);
  if (isNaN(d.getTime())) return '—';

  const dateStr = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // If dateValue is a full ISO timestamp with non-zero hours/minutes
  if (dateValue) {
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
    if (hasTime) {
      const timeStr = d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `${dateStr}, ${timeStr}`;
    }
  }

  if (timeValue) {
    const parts = timeValue.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        const temp = new Date();
        temp.setHours(h, m, 0);
        const formattedTime = temp.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        return `${dateStr}, ${formattedTime}`;
      }
    }
    return `${dateStr}, ${timeValue}`;
  }

  return dateStr;
}

export interface PrintableBillProps {
  invoice: any;
  reservation?: any;
  guest?: any;
}

export function generateBillHtml({ invoice, reservation, guest }: PrintableBillProps): string {
  const isGst = invoice?.isGstBill || invoice?.invoiceType === 'GST';
  const res = invoice?.reservation || reservation || {};
  const gstGuest = invoice?.guest || guest || res?.guest || {};

  const checkInFormatted = formatStayDateTime(
    res?.actualCheckInAt,
    res?.arrivalTime || '14:00',
    res?.arrivalDate
  );

  const checkOutFormatted = formatStayDateTime(
    res?.actualCheckOutAt,
    res?.departureTime || '11:00',
    res?.departureDate
  );

  const invDateFormatted = invoice?.invoiceDate
    ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  const lines = invoice?.lines || [];
  const subtotal = Number(invoice?.subtotal || 0);
  const discount = Number(invoice?.discount || 0);
  const cgstAmount = Number(invoice?.cgstAmount || 0);
  const sgstAmount = Number(invoice?.sgstAmount || 0);
  const totalGst = cgstAmount + sgstAmount;
  const grandTotal = Number(invoice?.totalAmount || 0);

  const linesHtml = lines
    .map((line: any, idx: number) => {
      const unitPrice = Number(line.unitPrice || 0).toFixed(2);
      const taxable = Number(line.taxableAmount || (line.quantity * line.unitPrice) || 0).toFixed(2);
      const cgst = Number(line.cgstAmount || 0).toFixed(2);
      const sgst = Number(line.sgstAmount || 0).toFixed(2);
      const total = Number(line.totalAmount || 0).toFixed(2);

      if (isGst) {
        return `
          <tr>
            <td class="text-center font-mono">${idx + 1}</td>
            <td class="font-bold">${line.description || 'Accommodation Charge'}</td>
            <td class="text-center font-mono">${line.hsnSacCode || '996311'}</td>
            <td class="text-center font-mono">${line.quantity || 1}</td>
            <td class="text-right font-mono">₹${unitPrice}</td>
            <td class="text-right font-mono">₹${taxable}</td>
            <td class="text-right font-mono">₹${cgst}</td>
            <td class="text-right font-mono">₹${sgst}</td>
            <td class="text-right font-mono font-bold">₹${total}</td>
          </tr>
        `;
      }

      return `
        <tr>
          <td class="text-center font-mono">${idx + 1}</td>
          <td class="font-bold">${line.description || 'Accommodation Charge'}</td>
          <td class="text-center font-mono">${line.quantity || 1}</td>
          <td class="text-right font-mono">₹${unitPrice}</td>
          <td class="text-right font-mono font-bold">₹${total}</td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${invoice?.invoiceRef || 'Bill'} - Indira Lodge</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      font-size: 11px;
      line-height: 1.45;
    }
    .bill-wrapper {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      background: #ffffff;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
    }
    .header-table td {
      vertical-align: top;
      border: none;
      padding: 0 0 12px 0;
    }
    .logo-container {
      display: inline-block;
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      padding: 2px;
      background: #ffffff;
      vertical-align: top;
      margin-right: 12px;
    }
    .logo-img {
      width: 100% !important;
      height: 100% !important;
      max-width: 44px !important;
      max-height: 44px !important;
      object-fit: contain !important;
      display: block;
    }
    .hotel-name {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 0 0 2px 0;
      text-transform: uppercase;
    }
    .hotel-meta {
      font-size: 10.5px;
      color: #475569;
      margin: 1px 0;
    }
    .hotel-gst {
      font-size: 11px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 3px;
    }
    .doc-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: #0f172a;
      color: #ffffff;
    }
    .doc-badge.gst {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .invoice-ref {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 800;
      font-size: 13px;
      color: #0f172a;
      margin-top: 4px;
    }
    .meta-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 16px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
    }
    .meta-table td {
      vertical-align: top;
      padding: 4px 8px;
      border: none;
      width: 33.33%;
    }
    .meta-label {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.03em;
      display: block;
      margin-bottom: 2px;
    }
    .meta-val {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }
    .meta-sub {
      font-size: 10px;
      color: #64748b;
      display: block;
      margin-top: 1px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 10.5px;
    }
    .items-table th {
      background: #f1f5f9;
      color: #1e293b;
      font-weight: 800;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 7px 8px;
      border: 1px solid #cbd5e1;
    }
    .items-table td {
      padding: 7px 8px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .text-left { text-align: left; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .totals-wrapper {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 16px;
    }
    .totals-wrapper td {
      vertical-align: top;
      border: none;
      padding: 0;
    }
    .totals-table {
      width: 270px;
      margin-left: auto;
      border-collapse: collapse;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
    }
    .totals-table td {
      padding: 4px 10px;
      border: none;
      font-size: 11px;
    }
    .grand-row td {
      border-top: 2px solid #0f172a;
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
      padding-top: 7px;
      padding-bottom: 7px;
    }
    .footer-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
    }
    .footer-table td {
      border: none;
      vertical-align: bottom;
      padding: 0;
    }
    .terms-box {
      font-size: 9.5px;
      color: #64748b;
      line-height: 1.5;
    }
    .sign-box {
      text-align: right;
    }
    .sign-line {
      width: 130px;
      border-bottom: 1px solid #475569;
      margin-bottom: 4px;
      margin-left: auto;
    }
    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      .bill-wrapper {
        border: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="bill-wrapper">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 60%;">
          <table style="border-collapse: collapse;">
            <tr>
              <td style="vertical-align: middle;">
                <div class="logo-container">
                  <img src="/logo.png" alt="Indira Lodge" class="logo-img" />
                </div>
              </td>
              <td style="vertical-align: middle;">
                <div class="hotel-name">INDIRA LODGE</div>
                <div class="hotel-meta">Solicitor Lodge, Near ASTC, Malow Ali, Jorhat, Assam - 781005</div>
                <div class="hotel-meta">Contact: +91 70028 90165 • indiralodge@gmail.com</div>
                <div class="hotel-gst">GSTIN: <span class="font-mono">18AOIPB2857A1ZB</span> • State Code: 18</div>
              </td>
            </tr>
          </table>
        </td>
        <td style="width: 40%; text-align: right;">
          <div class="doc-badge ${isGst ? 'gst' : ''}">
            ${isGst ? 'TAX INVOICE' : 'HOTEL BILL & RECEIPT'}
          </div>
          <div class="invoice-ref">${invoice?.invoiceRef || 'INV-DRAFT'}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Date: <strong style="color: #0f172a;">${invDateFormatted}</strong></div>
          <div style="font-size: 10px; color: #64748b;">Status: <strong style="color: #059669;">${invoice?.status || 'ISSUED'}</strong></div>
        </td>
      </tr>
    </table>

    <!-- Guest & Stay Meta Box -->
    <div class="meta-card">
      <table class="meta-table">
        <tr>
          <td>
            <span class="meta-label">Guest / Billed To</span>
            <span class="meta-val">${gstGuest.displayName || gstGuest.name || 'Guest'}</span>
            ${gstGuest.company ? `<span class="meta-sub" style="font-weight: bold; color: #4338ca;">🏢 ${gstGuest.company}</span>` : ''}
            <span class="meta-sub">Phone: ${gstGuest.phone || '—'}</span>
          </td>
          <td>
            <span class="meta-label">Customer GSTIN</span>
            <span class="meta-val font-mono">${invoice?.customerGstin || gstGuest.gstin || (isGst ? 'Unregistered / B2C' : 'N/A')}</span>
            <span class="meta-sub">Place of Supply: Assam (18)</span>
          </td>
          <td>
            <span class="meta-label">Room & Category</span>
            <span class="meta-val">Room ${res?.assignedRoom?.roomNumber || '—'}</span>
            <span class="meta-sub">${res?.roomType?.name || 'Standard Accommodation'}</span>
          </td>
        </tr>
        <tr>
          <td style="padding-top: 10px;">
            <span class="meta-label">Booking Reference</span>
            <span class="meta-val font-mono" style="color: #0284c7;">${res?.reservationRef || '—'}</span>
            <span class="meta-sub">Stay: ${res?.nights || 1} Night(s)</span>
          </td>
          <td style="padding-top: 10px;">
            <span class="meta-label">Check-In Date & Time</span>
            <span class="meta-val">${checkInFormatted}</span>
          </td>
          <td style="padding-top: 10px;">
            <span class="meta-label">Check-Out Date & Time</span>
            <span class="meta-val">${checkOutFormatted}</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 28px;" class="text-center">#</th>
          <th class="text-left">Particulars / Description</th>
          ${isGst ? '<th class="text-center" style="width: 70px;">HSN/SAC</th>' : ''}
          <th class="text-center" style="width: 40px;">Qty</th>
          <th class="text-right" style="width: 75px;">Rate (₹)</th>
          ${isGst ? `
            <th class="text-right" style="width: 80px;">Taxable (₹)</th>
            <th class="text-right" style="width: 70px;">CGST (2.5%)</th>
            <th class="text-right" style="width: 70px;">SGST (2.5%)</th>
          ` : ''}
          <th class="text-right" style="width: 85px;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>

    <!-- Totals -->
    <table class="totals-wrapper">
      <tr>
        <td style="width: 50%;">
          <div class="terms-box">
            <strong style="color: #334155;">Terms & Conditions:</strong><br />
            1. Check-out time is 11:00 AM.<br />
            2. This computer generated bill is final and acknowledged.<br />
            3. Subject to Jorhat Jurisdiction.
          </div>
        </td>
        <td style="width: 50%;">
          <table class="totals-table">
            <tr>
              <td class="text-left">Gross Subtotal:</td>
              <td class="text-right font-mono font-bold">₹${subtotal.toFixed(2)}</td>
            </tr>
            ${discount > 0 ? `
              <tr>
                <td class="text-left" style="color: #059669;">Discount:</td>
                <td class="text-right font-mono font-bold" style="color: #059669;">-₹${discount.toFixed(2)}</td>
              </tr>
            ` : ''}
            ${isGst ? `
              <tr>
                <td class="text-left" style="color: #475569;">CGST (2.5%):</td>
                <td class="text-right font-mono">₹${cgstAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td class="text-left" style="color: #475569;">SGST (2.5%):</td>
                <td class="text-right font-mono">₹${sgstAmount.toFixed(2)}</td>
              </tr>
              <tr style="border-top: 1px solid #cbd5e1;">
                <td class="text-left font-bold" style="color: #334155;">Total GST (5%):</td>
                <td class="text-right font-mono font-bold">₹${totalGst.toFixed(2)}</td>
              </tr>
            ` : ''}
            <tr class="grand-row">
              <td class="text-left">Grand Total:</td>
              <td class="text-right font-mono" style="color: #059669;">₹${grandTotal.toFixed(2)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Footer / Signatures -->
    <table class="footer-table">
      <tr>
        <td style="width: 60%;">
          <div style="font-size: 10px; color: #64748b;">
            Thank you for staying at <strong>Indira Lodge</strong>! Have a safe journey ahead.
          </div>
        </td>
        <td style="width: 40%;" class="sign-box">
          <div class="sign-line"></div>
          <div style="font-size: 10px; font-weight: 700; color: #334155;">Authorized Signatory</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `.trim();
}

export function openPrintBillWindow(props: PrintableBillProps) {
  const html = generateBillHtml(props);
  const printWindow = window.open('', '_blank', 'height=750,width=950');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  } else {
    window.print();
  }
}
