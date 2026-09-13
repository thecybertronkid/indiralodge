const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const db = new DatabaseSync('prisma/dev.db');
let sql = '-- Indira Lodge Data Migration: SQLite -> Supabase PostgreSQL\n-- Paste this entire file into Supabase SQL Editor and click RUN\n\n';

function escStr(v) {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}
function escBool(v) {
  if (v === null || v === undefined) return 'NULL';
  return (v === 1 || v === true) ? 'true' : 'false';
}
function escNum(v) {
  if (v === null || v === undefined) return 'NULL';
  return Number(v);
}
function escDT(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return `'${new Date(v).toISOString()}'`;
  return `'${v}'`;
}

function ins(table, rows, cols) {
  if (!rows || rows.length === 0) { sql += `-- No data: ${table}\n`; return; }
  sql += `\n-- ${table} (${rows.length} rows)\n`;
  for (const row of rows) {
    const c = cols.map(([n]) => `"${n}"`).join(', ');
    const v = cols.map(([n, t]) => {
      const val = row[n];
      if (t === 'b') return escBool(val);
      if (t === 'n' || t === 'f') return escNum(val);
      if (t === 'dt') return escDT(val);
      return escStr(val);
    }).join(', ');
    sql += `INSERT INTO "${table}" (${c}) VALUES (${v}) ON CONFLICT DO NOTHING;\n`;
  }
}

function safeIns(table, query, cols) {
  try { ins(table, db.prepare(query).all(), cols); }
  catch (e) { sql += `-- ${table} error: ${e.message}\n`; }
}

safeIns('Organization', 'SELECT * FROM Organization', [['id','s'],['name','s'],['code','s'],['createdAt','dt'],['updatedAt','dt']]);
safeIns('Property', 'SELECT * FROM Property', [['id','s'],['organizationId','s'],['name','s'],['code','s'],['address','s'],['city','s'],['state','s'],['country','s'],['zipCode','s'],['phone','s'],['email','s'],['gstin','s'],['currency','s'],['timezone','s'],['status','s'],['createdAt','dt'],['updatedAt','dt']]);
safeIns('PropertySettings', 'SELECT * FROM PropertySettings', [['id','s'],['propertyId','s'],['dateFormat','s'],['timeFormat','s'],['currencySymbol','s'],['taxInclusive','b'],['defaultTaxRate','f'],['logoUrl','s'],['primaryColor','s'],['createdAt','dt'],['updatedAt','dt']]);
safeIns('User', 'SELECT * FROM "User"', [['id','s'],['organizationId','s'],['email','s'],['passwordHash','s'],['fullName','s'],['phone','s'],['status','s'],['lastLoginAt','dt'],['createdAt','dt'],['updatedAt','dt']]);
safeIns('Role', 'SELECT * FROM Role', [['id','s'],['organizationId','s'],['name','s'],['description','s'],['isSystem','b'],['createdAt','dt'],['updatedAt','dt']]);
safeIns('Permission', 'SELECT * FROM Permission', [['id','s'],['code','s'],['name','s'],['module','s'],['description','s'],['createdAt','dt']]);
safeIns('RolePermission', 'SELECT * FROM RolePermission', [['roleId','s'],['permissionId','s'],['createdAt','dt']]);
safeIns('UserRole', 'SELECT * FROM UserRole', [['userId','s'],['roleId','s'],['propertyId','s'],['assignedAt','dt']]);
safeIns('SystemSettings', 'SELECT * FROM SystemSettings', [['id','s'],['key','s'],['value','s'],['category','s'],['isEditable','b'],['updatedAt','dt']]);
safeIns('ReferenceCounter', 'SELECT * FROM ReferenceCounter', [['id','s'],['propertyId','s'],['prefix','s'],['year','n'],['lastSequence','n']]);
safeIns('RoomType', 'SELECT * FROM RoomType', [['id','s'],['propertyId','s'],['code','s'],['name','s'],['description','s'],['maxOccupancy','n'],['adultsCapacity','n'],['childrenCapacity','n'],['baseRate','f'],['extraAdultRate','f'],['extraChildRate','f'],['numberOfBeds','n'],['bedType','s'],['amenities','s'],['isActive','b'],['createdAt','dt'],['updatedAt','dt']]);
safeIns('Room', 'SELECT * FROM Room', [['id','s'],['propertyId','s'],['roomTypeId','s'],['roomNumber','s'],['floor','s'],['buildingBlock','s'],['maxOccupancy','n'],['description','s'],['amenities','s'],['availabilityStatus','s'],['housekeepingStatus','s'],['maintenanceStatus','s'],['isDnd','b'],['isActive','b'],['createdAt','dt'],['updatedAt','dt']]);
safeIns('BookingSource', 'SELECT * FROM BookingSource', [['id','s'],['propertyId','s'],['code','s'],['name','s'],['isActive','b'],['createdAt','dt'],['updatedAt','dt']]);
safeIns('Guest', 'SELECT * FROM Guest', [['id','s'],['organizationId','s'],['guestRef','s'],['firstName','s'],['middleName','s'],['lastName','s'],['displayName','s'],['gender','s'],['dateOfBirth','dt'],['nationality','s'],['phone','s'],['alternatePhone','s'],['email','s'],['address','s'],['city','s'],['state','s'],['country','s'],['postalCode','s'],['company','s'],['gstin','s'],['guestType','s'],['notes','s'],['age','n'],['occupation','s'],['idType','s'],['idNumber','s'],['vipStatus','b'],['blacklistedStatus','b'],['createdAt','dt'],['updatedAt','dt']]);
safeIns('Reservation', 'SELECT * FROM Reservation', [['id','s'],['propertyId','s'],['reservationRef','s'],['guestId','s'],['bookingSourceId','s'],['status','s'],['arrivalDate','dt'],['departureDate','dt'],['actualCheckInAt','dt'],['actualCheckOutAt','dt'],['nights','n'],['adults','n'],['children','n'],['roomTypeId','s'],['assignedRoomId','s'],['ratePlan','s'],['roomRate','f'],['discountAmount','f'],['discountReason','s'],['taxAmount','f'],['totalAmount','f'],['depositAmount','f'],['paidAmount','f'],['balanceAmount','f'],['specialRequests','s'],['internalNotes','s'],['guestNotes','s'],['arrivalTime','s'],['departureTime','s'],['comingFrom','s'],['purposeOfVisit','s'],['cancelledReason','s'],['cancelledAt','dt'],['noShowAt','dt'],['isBilled','b'],['billType','s'],['billedAt','dt'],['billedInvoiceId','s'],['createdById','s'],['createdAt','dt'],['updatedAt','dt']]);
safeIns('Folio', 'SELECT * FROM Folio', [['id','s'],['propertyId','s'],['reservationId','s'],['guestId','s'],['folioNumber','s'],['status','s'],['totalCharges','f'],['totalPayments','f'],['balanceAmount','f'],['createdAt','dt'],['updatedAt','dt']]);
safeIns('FolioTransaction', 'SELECT * FROM FolioTransaction', [['id','s'],['folioId','s'],['transactionRef','s'],['date','dt'],['type','s'],['category','s'],['description','s'],['quantity','n'],['unitPrice','f'],['discount','f'],['tax','f'],['amount','f'],['status','s'],['postedById','s'],['reference','s'],['createdAt','dt']]);
safeIns('Payment', 'SELECT * FROM Payment', [['id','s'],['propertyId','s'],['folioId','s'],['reservationId','s'],['guestId','s'],['paymentRef','s'],['amount','f'],['method','s'],['date','dt'],['transactionRef','s'],['notes','s'],['receivedById','s'],['createdAt','dt']]);
safeIns('TaxInvoice', 'SELECT * FROM TaxInvoice', [['id','s'],['propertyId','s'],['reservationId','s'],['folioId','s'],['guestId','s'],['invoiceRef','s'],['invoiceDate','dt'],['invoiceType','s'],['placeOfSupply','s'],['customerGstin','s'],['subtotal','f'],['discount','f'],['cgstAmount','f'],['sgstAmount','f'],['totalAmount','f'],['isGstBill','b'],['issuedById','s'],['createdAt','dt'],['updatedAt','dt']]);
safeIns('NotificationPreference', 'SELECT * FROM NotificationPreference', [['id','s'],['userId','s'],['emailAlerts','b'],['inAppAlerts','b'],['updatedAt','dt']]);
safeIns('HousekeepingChecklist', 'SELECT * FROM HousekeepingChecklist', [['id','s'],['propertyId','s'],['category','s'],['itemText','s'],['isRequired','b'],['createdAt','dt']]);

db.close();
fs.writeFileSync('supabase_seed.sql', sql, 'utf8');
const size = (fs.statSync('supabase_seed.sql').size / 1024).toFixed(1);
console.log('✅ Done! Generated supabase_seed.sql (' + size + ' KB)');
console.log('📂 Location: e:\\Indira Lodge\\supabase_seed.sql');
console.log('\nNext: Open Supabase → SQL Editor → paste the file → Run');
