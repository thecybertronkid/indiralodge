const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    include: { roomType: true },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
  });

  console.log(`=== CURRENT OFFICIAL INVENTORY: ${rooms.length} ROOMS ===`);

  const categoryBuckets = {
    'Double Bed NON AC (Standard)': [],
    'Double Bed AC (Standard)': [],
    'Triple Bed NON AC (Standard)': [],
    'Triple Bed AC (Standard)': [],
    'Deluxe Room (AC / Non-AC Dual Mode)': [],
    'Executive Deluxe Room (AC / Non-AC Dual Mode)': [],
    'Single Bed Room NON AC': [],
  };

  for (const r of rooms) {
    if (r.roomType.code === 'DBL-NAC') categoryBuckets['Double Bed NON AC (Standard)'].push(r.roomNumber);
    else if (r.roomType.code === 'DBL-AC') categoryBuckets['Double Bed AC (Standard)'].push(r.roomNumber);
    else if (r.roomType.code === 'TPL-NAC') categoryBuckets['Triple Bed NON AC (Standard)'].push(r.roomNumber);
    else if (r.roomType.code === 'TPL-AC') categoryBuckets['Triple Bed AC (Standard)'].push(r.roomNumber);
    else if (r.roomType.code === 'DLX-AC' || r.roomType.code === 'DLX-NAC') categoryBuckets['Deluxe Room (AC / Non-AC Dual Mode)'].push(r.roomNumber);
    else if (r.roomType.code === 'EDX-AC' || r.roomType.code === 'EDX-NAC') categoryBuckets['Executive Deluxe Room (AC / Non-AC Dual Mode)'].push(r.roomNumber);
    else if (r.roomType.code === 'SGL-NAC') categoryBuckets['Single Bed Room NON AC'].push(r.roomNumber);
  }

  for (const [cat, roomList] of Object.entries(categoryBuckets)) {
    console.log(`\n• ${cat}: ${roomList.join(', ')} (Total: ${roomList.length})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
