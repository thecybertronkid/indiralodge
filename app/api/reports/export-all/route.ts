import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import JSZip from 'jszip';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const zip = new JSZip();

    // 1. Fetch All Invoices & Bills
    const invoices = await db.taxInvoice.findMany({
      where: { propertyId },
      include: { guest: true, reservation: true },
      orderBy: { invoiceDate: 'desc' },
    });

    // 2. Fetch All Reservations
    const reservations = await db.reservation.findMany({
      where: { propertyId },
      include: { guest: true, roomType: true, assignedRoom: true },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Fetch All Guests
    const guests = await db.guest.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    // 4. Fetch All Rooms & Inventory
    const rooms = await db.room.findMany({
      where: { propertyId },
      include: { roomType: true },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    // 5. Fetch Audit Logs
    const auditLogs = await db.auditLog.findMany({
      where: { organizationId: session.organizationId },
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // --- CSV GENERATOR HELPERS ---
    const escapeCsv = (str: any) => {
      if (str == null) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    // CSV 1: Master Financial Invoices & Receipts
    let finCsv = 'Invoice Ref,Invoice Date,Bill Type,Guest Name,Phone,Guest GSTIN,Subtotal (INR),Discount (INR),CGST 9% (INR),SGST 9% (INR),Total Payable (INR)\n';
    invoices.forEach((inv) => {
      finCsv += `${escapeCsv(inv.invoiceRef)},${escapeCsv(new Date(inv.invoiceDate).toLocaleDateString('en-IN'))},${escapeCsv(inv.invoiceType)},${escapeCsv(inv.guest?.displayName)},${escapeCsv(inv.guest?.phone)},${escapeCsv(inv.customerGstin || 'Unregistered')},${inv.subtotal},${inv.discount},${inv.cgstAmount},${inv.sgstAmount},${inv.totalAmount}\n`;
    });
    zip.file('1_Master_Financial_Invoices_Excel.csv', finCsv);

    // CSV 2: Reservations Register
    let resCsv = 'Booking Ref,Status,Guest Name,Phone,Email,Assigned Room,Room Category,Arrival Date,Departure Date,Nights,Total Amount (INR),Balance (INR)\n';
    reservations.forEach((r) => {
      resCsv += `${escapeCsv(r.reservationRef)},${escapeCsv(r.status)},${escapeCsv(r.guest?.displayName)},${escapeCsv(r.guest?.phone)},${escapeCsv(r.guest?.email)},${escapeCsv(r.assignedRoom ? `Room ${r.assignedRoom.roomNumber}` : 'Unassigned')},${escapeCsv(r.roomType?.name)},${escapeCsv(new Date(r.arrivalDate).toLocaleDateString('en-IN'))},${escapeCsv(new Date(r.departureDate).toLocaleDateString('en-IN'))},${r.nights},${r.totalAmount},${r.balanceAmount}\n`;
    });
    zip.file('2_Reservations_Register_Excel.csv', resCsv);

    // CSV 3: Guests Directory
    let gstCsv = 'Guest Ref,Name,Phone,Email,Address,Age,Gender,Occupation,ID Type,ID Number,VIP Status\n';
    guests.forEach((g) => {
      gstCsv += `${escapeCsv(g.guestRef)},${escapeCsv(g.displayName)},${escapeCsv(g.phone)},${escapeCsv(g.email)},${escapeCsv(g.address)},${g.age || ''},${escapeCsv(g.gender)},${escapeCsv(g.occupation)},${escapeCsv(g.idType)},${escapeCsv(g.idNumber)},${g.vipStatus ? 'Yes' : 'No'}\n`;
    });
    zip.file('3_Guests_Database_Excel.csv', gstCsv);

    // CSV 4: Rooms & Inventory Audit
    let rmCsv = 'Room Number,Floor,Category Name,Category Code,Bed Type,Nightly Rate (INR),Availability Status,Housekeeping Status,Maintenance Status\n';
    rooms.forEach((r) => {
      rmCsv += `${escapeCsv(r.roomNumber)},${escapeCsv(r.floor)},${escapeCsv(r.roomType?.name)},${escapeCsv(r.roomType?.code)},${escapeCsv(r.roomType?.bedType)},${r.roomType?.baseRate},${escapeCsv(r.availabilityStatus)},${escapeCsv(r.housekeepingStatus)},${escapeCsv(r.maintenanceStatus)}\n`;
    });
    zip.file('4_Rooms_Inventory_Audit_Excel.csv', rmCsv);

    // CSV 5: System Security & Audit Trail
    let auditCsv = 'Timestamp,User Name,User Email,Action,Module,Entity ID\n';
    auditLogs.forEach((log) => {
      auditCsv += `${escapeCsv(new Date(log.createdAt).toLocaleString('en-IN'))},${escapeCsv(log.user?.fullName || 'System')},${escapeCsv(log.user?.email || 'system@indiralodge')},${escapeCsv(log.action)},${escapeCsv(log.module)},${escapeCsv(log.entityId)}\n`;
    });
    zip.file('5_System_Audit_Trail_Excel.csv', auditCsv);

    // Folder: Individual Tax Invoices & Receipt Statements
    const invoicesFolder = zip.folder('Invoices_And_Bill_Receipts');
    invoices.forEach((inv) => {
      const textBill = `
================================================================
INDIRA LODGE - ${inv.invoiceType === 'GST' ? 'TAX INVOICE' : 'HOTEL RECEIPT'}
Address: Solicitor Lodge, Near ASTC, Malow Ali, Jorhat, Assam - 781005
Phone: +91 70028 90165 | Property GSTIN: 18AOIPB2857A1ZB
Ref: ${inv.invoiceRef} | Date: ${new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
================================================================
Customer Name : ${inv.guest?.displayName || 'Guest'}
Phone Number  : ${inv.guest?.phone || 'N/A'}
Guest GSTIN   : ${inv.customerGstin || 'Unregistered / B2C'}
----------------------------------------------------------------
Subtotal Amount  : INR ${inv.subtotal.toFixed(2)}
Discount Applied : - INR ${inv.discount.toFixed(2)}
Taxable Subtotal : INR ${(inv.subtotal - inv.discount).toFixed(2)}
${inv.invoiceType === 'GST' ? `CGST Rate (2.5%) : INR ${inv.cgstAmount.toFixed(2)}\nSGST Rate (2.5%) : INR ${inv.sgstAmount.toFixed(2)}` : 'Tax Status       : Non-GST / Tax Exempt Receipt'}
----------------------------------------------------------------
GRAND TOTAL      : INR ${inv.totalAmount.toFixed(2)}
================================================================
Authorized Signatory: Indira Lodge Front Desk Management
Thank you for staying at Indira Lodge!
`;
      invoicesFolder?.file(`${inv.invoiceRef}.txt`, textBill.trim());
    });

    // Summary Readme Text File
    const summaryReadme = `
================================================================
INDIRA LODGE PROPERTY MANAGEMENT SYSTEM
MASTER EXPORT AUDIT PACKAGE
================================================================
Export Generated On : ${new Date().toLocaleString('en-IN')}
Total Invoices      : ${invoices.length}
Total Reservations  : ${reservations.length}
Total Registered Guests : ${guests.length}
Total Physical Rooms    : ${rooms.length}

PACKAGE CONTENTS:
1. 1_Master_Financial_Invoices_Excel.csv (Formatted for MS Excel)
2. 2_Reservations_Register_Excel.csv (All bookings history)
3. 3_Guests_Database_Excel.csv (Complete guest profiles & IDs)
4. 4_Rooms_Inventory_Audit_Excel.csv (Physical room matrix audit)
5. 5_System_Audit_Trail_Excel.csv (Security & operational logs)
6. Invoices_And_Bill_Receipts/ (Itemized individual bill text files)

All files are formatted for instant opening in Microsoft Excel, Numbers, and PDF tools.
`;
    zip.file('README_Audit_Summary.txt', summaryReadme.trim());

    // Generate Zip Blob
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

    const filename = `Indira_Lodge_Master_Report_${new Date().toISOString().split('T')[0]}.zip`;

    return new Response(zipBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to export master report zip' }, { status: 500 });
  }
}
