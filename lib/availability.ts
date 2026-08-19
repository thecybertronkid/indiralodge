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
    const totalRoomsCount = rt.rooms.length;

    // Find reservations overlapping [arrivalDate, departureDate)
    const overlappingRes = await db.reservation.findMany({
      where: {
        propertyId,
        roomTypeId: rt.id,
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
    const roomIds = rt.rooms.map((r) => r.id);
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

    const maintenanceRooms = rt.rooms.filter(
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
  roomTypeId: string,
  arrivalDate: Date,
  departureDate: Date,
  excludeReservationId?: string
) {
  const rooms = await db.room.findMany({
    where: {
      propertyId,
      roomTypeId,
      isActive: true,
      maintenanceStatus: 'OPERATIONAL',
    },
    include: {
      roomType: { select: { name: true, code: true } },
    },
  });

  const availableRooms = [];
  for (const r of rooms) {
    const isAvail = await isRoomAvailable(r.id, arrivalDate, departureDate, excludeReservationId);
    if (isAvail) {
      availableRooms.push(r);
    }
  }

  return availableRooms;
}
