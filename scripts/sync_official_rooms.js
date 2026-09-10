const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== SYNCING OFFICIAL INDIRA LODGE ROOM INVENTORY ===');

  const prop = await prisma.property.findFirst();
  if (!prop) {
    console.error('No property found!');
    return;
  }

  // 1. Fetch Room Types
  const roomTypes = await prisma.roomType.findMany({
    where: { propertyId: prop.id }
  });

  const typeMap = {};
  for (const rt of roomTypes) {
    typeMap[rt.code] = rt.id;
  }

  console.log('Loaded room types:', Object.keys(typeMap));

  // 2. Official Physical Rooms Definition
  const officialRooms = [
    // Double Bed NON AC (Standard): 101, 102, 207, 206
    { roomNumber: '101', floor: 'Floor 1', code: 'DBL-NAC' },
    { roomNumber: '102', floor: 'Floor 1', code: 'DBL-NAC' },
    { roomNumber: '206', floor: 'Floor 2', code: 'DBL-NAC' },
    { roomNumber: '207', floor: 'Floor 2', code: 'DBL-NAC' },

    // Double Bed AC (Standard): 201, 204, 301, 304, 303
    { roomNumber: '201', floor: 'Floor 2', code: 'DBL-AC' },
    { roomNumber: '204', floor: 'Floor 2', code: 'DBL-AC' },
    { roomNumber: '301', floor: 'Floor 3', code: 'DBL-AC' },
    { roomNumber: '303', floor: 'Floor 3', code: 'DBL-AC' },
    { roomNumber: '304', floor: 'Floor 3', code: 'DBL-AC' },

    // Triple Bed NON AC (Standard): 205
    { roomNumber: '205', floor: 'Floor 2', code: 'TPL-NAC' },

    // Triple Bed AC (Standard): 305
    { roomNumber: '305', floor: 'Floor 3', code: 'TPL-AC' },

    // Deluxe Rooms: 210, 211, 212, 302 (Can be booked as DLX-AC or DLX-NAC)
    { roomNumber: '210', floor: 'Floor 2', code: 'DLX-AC' },
    { roomNumber: '211', floor: 'Floor 2', code: 'DLX-AC' },
    { roomNumber: '212', floor: 'Floor 2', code: 'DLX-AC' },
    { roomNumber: '302', floor: 'Floor 3', code: 'DLX-AC' },

    // Executive Deluxe Rooms: 208, 209 (Can be booked as EDX-AC or EDX-NAC)
    { roomNumber: '208', floor: 'Floor 2', code: 'EDX-AC' },
    { roomNumber: '209', floor: 'Floor 2', code: 'EDX-AC' },

    // Single Bed Room NON AC: 104, 203, 213, 401
    { roomNumber: '104', floor: 'Floor 1', code: 'SGL-NAC' },
    { roomNumber: '203', floor: 'Floor 2', code: 'SGL-NAC' },
    { roomNumber: '213', floor: 'Floor 2', code: 'SGL-NAC' },
    { roomNumber: '401', floor: 'Floor 4', code: 'SGL-NAC' },
  ];

  const officialNumbers = new Set(officialRooms.map(r => r.roomNumber));

  // Upsert all 20 official rooms
  for (const r of officialRooms) {
    const rtId = typeMap[r.code];
    if (!rtId) {
      console.warn(`Missing room type for code ${r.code}`);
      continue;
    }

    const existing = await prisma.room.findUnique({
      where: { propertyId_roomNumber: { propertyId: prop.id, roomNumber: r.roomNumber } }
    });

    if (existing) {
      await prisma.room.update({
        where: { id: existing.id },
        data: {
          floor: r.floor,
          roomTypeId: rtId,
          isActive: true,
          maintenanceStatus: 'OPERATIONAL',
        }
      });
      console.log(`Updated Room ${r.roomNumber} -> ${r.floor}, ${r.code}`);
    } else {
      await prisma.room.create({
        data: {
          propertyId: prop.id,
          roomNumber: r.roomNumber,
          floor: r.floor,
          buildingBlock: 'Main Wing',
          roomTypeId: rtId,
          maxOccupancy: 4,
          availabilityStatus: 'AVAILABLE',
          housekeepingStatus: 'CLEAN',
          maintenanceStatus: 'OPERATIONAL',
          isActive: true,
        }
      });
      console.log(`Created Room ${r.roomNumber} -> ${r.floor}, ${r.code}`);
    }
  }

  // Reassign reservations from dummy room 103 to official Triple room 205
  const room205 = await prisma.room.findFirst({ where: { propertyId: prop.id, roomNumber: '205' } });
  const room103 = await prisma.room.findFirst({ where: { propertyId: prop.id, roomNumber: '103' } });
  if (room103 && room205) {
    await prisma.reservation.updateMany({
      where: { assignedRoomId: room103.id },
      data: { assignedRoomId: room205.id }
    });
    await prisma.room.delete({ where: { id: room103.id } });
    console.log('Reassigned bookings from Room 103 to Room 205, deleted Room 103');
  }

  // Deactivate or remove any other old dummy rooms not in the official list
  const allCurrentRooms = await prisma.room.findMany({ where: { propertyId: prop.id } });
  for (const cr of allCurrentRooms) {
    if (!officialNumbers.has(cr.roomNumber)) {
      const resCount = await prisma.reservation.count({ where: { assignedRoomId: cr.id } });
      if (resCount === 0) {
        await prisma.room.delete({ where: { id: cr.id } });
        console.log(`Removed unlisted dummy room: ${cr.roomNumber}`);
      } else {
        await prisma.room.update({ where: { id: cr.id }, data: { isActive: false } });
        console.log(`Deactivated legacy room with bookings: ${cr.roomNumber}`);
      }
    }
  }

  const finalRooms = await prisma.room.findMany({
    where: { propertyId: prop.id, isActive: true },
    include: { roomType: true },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }]
  });

  console.log(`\nSUCCESS! Active physical rooms count: ${finalRooms.length}`);
  finalRooms.forEach(r => console.log(` - Room ${r.roomNumber} (${r.floor}) => ${r.roomType.name}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
