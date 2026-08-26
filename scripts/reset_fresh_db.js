const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('      INDIRA LODGE - FRESH DATABASE RESET ENGINE    ');
  console.log('====================================================');

  console.log('[*] Clearing all guest reservations, folios, and invoices...');
  await prisma.taxInvoiceLine.deleteMany({});
  await prisma.taxInvoice.deleteMany({});
  await prisma.creditNote.deleteMany({});
  await prisma.debitNote.deleteMany({});
  await prisma.folioTransaction.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.folio.deleteMany({});
  await prisma.reservationGuest.deleteMany({});
  await prisma.stayHistory.deleteMany({});
  await prisma.reservation.deleteMany({});

  console.log('[*] Clearing guest profiles and documents...');
  await prisma.guestDocument.deleteMany({});
  await prisma.guest.deleteMany({});

  console.log('[*] Clearing housekeeping, maintenance, and lost & found records...');
  await prisma.housekeepingTask.deleteMany({});
  await prisma.housekeepingInspection.deleteMany({});
  await prisma.housekeepingNote.deleteMany({});
  await prisma.lostAndFoundItem.deleteMany({});
  await prisma.amenitiesConsumption.deleteMany({});
  await prisma.maintenanceTicket.deleteMany({});
  await prisma.maintenanceAsset.deleteMany({});
  await prisma.preventiveMaintenancePlan.deleteMany({});
  await prisma.roomBlock.deleteMany({});

  console.log('[*] Clearing audit logs, notifications, and sequence counters...');
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.referenceCounter.deleteMany({});

  console.log('[*] Resetting all physical rooms to CLEAN & AVAILABLE...');
  await prisma.room.updateMany({
    data: {
      availabilityStatus: 'AVAILABLE',
      housekeepingStatus: 'CLEAN',
      maintenanceStatus: 'OPERATIONAL',
      isDnd: false,
    },
  });

  console.log('====================================================');
  console.log('[SUCCESS] Database successfully reset to FRESH STATE!');
  console.log('  - All guest bookings and financial records cleared.');
  console.log('  - All rooms reset to AVAILABLE and CLEAN.');
  console.log('  - Login Credentials: admin@indiralodge / 12345678');
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
