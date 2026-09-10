import { db } from './db';

export interface RoomTypeAvailability {
  roomTypeId: string;
  code: string;
  name: string;
  baseRate: number;
  totalRooms: number;
  occupiedOrReserved: number;
  blockedOrMaintenance: number;
  availableRooms: number;
}

export async function checkRoomTypeAvailability(
  propertyId: string,
  arrivalDate: Date,
  departureDate: Date
): Promise<RoomTypeAvailability[]> {
  const roomTypes = await db.roomType.findMany({
    where: { propertyId, isActive: true },
    include: {
      rooms: {
        where: { isActive: true },
      },
    },
  });

  const results: RoomTypeAvailability[] = [];

  for (const rt of roomTypes) {
    // Handle shared inventory for Deluxe (DLX-AC & DLX-NAC) and Executive Deluxe (EDX-AC & EDX-NAC)
    let relatedTypeIds = [rt.id];
    let candidateRooms = rt.rooms;

    if (rt.code === 'DLX-NAC' || rt.code === 'DLX-AC') {
      const dlxTypes = roomTypes.filter((t) => t.code === 'DLX-NAC' || t.code === 'DLX-AC');
      relatedTypeIds = dlxTypes.map((t) => t.id);
      candidateRooms = roomTypes
        .filter((t) => t.code === 'DLX-NAC' || t.code === 'DLX-AC')
        .flatMap((t) => t.rooms);
    } else if (rt.code === 'EDX-NAC' || rt.code === 'EDX-AC') {
      const edxTypes = roomTypes.filter((t) => t.code === 'EDX-NAC' || t.code === 'EDX-AC');
      relatedTypeIds = edxTypes.map((t) => t.id);
      candidateRooms = roomTypes
        .filter((t) => t.code === 'EDX-NAC' || t.code === 'EDX-AC')
        .flatMap((t) => t.rooms);
    }

    const totalRoomsCount = candidateRooms.length;

    // Find reservations overlapping [arrivalDate, departureDate)
    const overlappingRes = await db.reservation.findMany({
      where: {
        propertyId,
        roomTypeId: { in: relatedTypeIds },
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        AND: [
          { arrivalDate: { lt: departureDate } },
          { departureDate: { gt: arrivalDate } },
        ],
      },
      select: { id: true, assignedRoomId: true },
    });

    const reservedCount = overlappingRes.length;

    // Find room blocks overlapping dates
    const roomIds = candidateRooms.map((r) => r.id);
    const overlappingBlocks = await db.roomBlock.findMany({
      where: {
        propertyId,
        roomId: { in: roomIds },
        AND: [
          { startDate: { lt: departureDate } },
          { endDate: { gt: arrivalDate } },
        ],
      },
    });

    const maintenanceRooms = candidateRooms.filter(
      (r) => r.maintenanceStatus === 'OUT_OF_ORDER' || r.maintenanceStatus === 'MAINTENANCE'
    ).length;

    const totalBlocked = overlappingBlocks.length + maintenanceRooms;
    const available = Math.max(0, totalRoomsCount - reservedCount - totalBlocked);

    results.push({
      roomTypeId: rt.id,
      code: rt.code,
      name: rt.name,
      baseRate: rt.baseRate,
      totalRooms: totalRoomsCount,
      occupiedOrReserved: reservedCount,
      blockedOrMaintenance: totalBlocked,
      availableRooms: available,
    });
  }

  return results;
}

/**
 * Checks if a specific physical room is available for [arrivalDate, departureDate)
 */
export async function isRoomAvailable(
  roomId: string,
  arrivalDate: Date,
  departureDate: Date,
  excludeReservationId?: string
): Promise<boolean> {
  const room = await db.room.findUnique({ where: { id: roomId } });
  if (!room || !room.isActive || room.maintenanceStatus !== 'OPERATIONAL') {
    return false;
  }

  // Check conflicting reservations
  const conflictingRes = await db.reservation.findFirst({
    where: {
      assignedRoomId: roomId,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
      AND: [
        { arrivalDate: { lt: departureDate } },
        { departureDate: { gt: arrivalDate } },
      ],
    },
  });

  if (conflictingRes) return false;

  // Check conflicting room blocks
  const conflictingBlock = await db.roomBlock.findFirst({
    where: {
      roomId,
      AND: [
        { startDate: { lt: departureDate } },
        { endDate: { gt: arrivalDate } },
      ],
    },
  });

  return !conflictingBlock;
}

/**
 * Retrieves all available physical rooms for a given room type & date range
 */
export async function getAvailablePhysicalRooms(
  propertyId: string,
  roomTypeId?: string,
  arrivalDate?: Date,
  departureDate?: Date,
  excludeReservationId?: string,
  requireCleanForCheckin: boolean = false
) {
  let targetTypeIds: string[] | undefined = undefined;

  if (roomTypeId) {
    const selectedType = await db.roomType.findUnique({
      where: { id: roomTypeId },
      select: { code: true, propertyId: true },
    });

    if (selectedType) {
      if (selectedType.code === 'DLX-NAC' || selectedType.code === 'DLX-AC') {
        const paired = await db.roomType.findMany({
          where: { propertyId: selectedType.propertyId, code: { in: ['DLX-NAC', 'DLX-AC'] } },
          select: { id: true },
        });
        targetTypeIds = paired.map((p) => p.id);
      } else if (selectedType.code === 'EDX-NAC' || selectedType.code === 'EDX-AC') {
        const paired = await db.roomType.findMany({
          where: { propertyId: selectedType.propertyId, code: { in: ['EDX-NAC', 'EDX-AC'] } },
          select: { id: true },
        });
        targetTypeIds = paired.map((p) => p.id);
      } else {
        targetTypeIds = [roomTypeId];
      }
    }
  }

  const rooms = await db.room.findMany({
    where: {
      propertyId,
      ...(targetTypeIds ? { roomTypeId: { in: targetTypeIds } } : {}),
      isActive: true,
      maintenanceStatus: 'OPERATIONAL',
      ...(requireCleanForCheckin ? { housekeepingStatus: { in: ['CLEAN', 'INSPECTED'] } } : {}),
    },
    include: {
      roomType: { select: { name: true, code: true, adultsCapacity: true, maxOccupancy: true, bedType: true } },
    },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
  });

  if (!arrivalDate || !departureDate) return rooms;

  const availableRooms = [];
  for (const r of rooms) {
    const isAvail = await isRoomAvailable(r.id, arrivalDate, departureDate, excludeReservationId);
    if (isAvail) {
      availableRooms.push(r);
    }
  }

  return availableRooms;
}
