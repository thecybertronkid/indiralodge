import { db } from './db';
import { SYSTEM_PERMISSIONS, INITIAL_ROLES } from './permissions';
import { hashPassword } from './auth';

export const STANDARD_BOOKING_SOURCES = [
  { code: 'DIRECT', name: 'Direct Hotel Desk' },
  { code: 'WALKIN', name: 'Walk-in Guest' },
  { code: 'PHONE', name: 'Telephone Inquiry' },
  { code: 'WEBSITE', name: 'Hotel Website' },
  { code: 'BOOKING_COM', name: 'Booking.com' },
  { code: 'MMT', name: 'MakeMyTrip' },
  { code: 'AGODA', name: 'Agoda' },
  { code: 'GOIBIBO', name: 'Goibibo' },
  { code: 'CORPORATE', name: 'Corporate Account' },
  { code: 'TRAVEL_AGENT', name: 'Travel Agent' },
  { code: 'OTHER', name: 'Other Source' },
];

export async function seedPermissionsAndRoles(organizationId: string) {
  // 1. Seed System Permissions
  for (const perm of SYSTEM_PERMISSIONS) {
    await db.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, module: perm.module, description: perm.description },
      create: {
        code: perm.code,
        name: perm.name,
        module: perm.module,
        description: perm.description,
      },
    });
  }

  const allPermissions = await db.permission.findMany();

  // 2. Seed Initial System Roles for Organization
  for (const r of INITIAL_ROLES) {
    const role = await db.role.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: r.name,
        },
      },
      update: { description: r.description, isSystem: true },
      create: {
        organizationId,
        name: r.name,
        description: r.description,
        isSystem: true,
      },
    });

    let permCodes: string[] = [];
    if (r.name === 'Super Admin' || r.name === 'Owner' || r.name === 'General Manager') {
      permCodes = allPermissions.map((p) => p.code);
    } else if (r.name === 'Front Office Manager' || r.name === 'Receptionist') {
      permCodes = [
        'dashboard.view', 'frontdesk.view', 'guest.view', 'guest.create', 'guest.edit', 'guest.documents.view', 'guest.documents.manage',
        'room.view', 'room.status.manage', 'reservation.view', 'reservation.create', 'reservation.edit', 'reservation.cancel', 'reservation.no_show',
        'reservation.assign_room', 'reservation.discount', 'checkin.create', 'checkout.create', 'room.transfer', 'stay.extend',
        'folio.view', 'folio.charge', 'folio.payment', 'reports.view'
      ];
    } else {
      permCodes = ['dashboard.view'];
    }

    const matchedPerms = allPermissions.filter((p) => permCodes.includes(p.code));

    for (const perm of matchedPerms) {
      await db.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
  }

  return { permissionsCount: allPermissions.length, rolesCount: INITIAL_ROLES.length };
}

export async function seedPropertyDefaults(propertyId: string) {
  // Seed Booking Sources
  for (const src of STANDARD_BOOKING_SOURCES) {
    await db.bookingSource.upsert({
      where: {
        propertyId_code: {
          propertyId,
          code: src.code,
        },
      },
      update: { name: src.name, isActive: true },
      create: {
        propertyId,
        code: src.code,
        name: src.name,
        isActive: true,
      },
    });
  }

  // Seed Official Indira Lodge Room Types & Rates
  const officialRoomTypes = [
    {
      code: 'DBL-NAC',
      name: 'Double Bed NON AC (Standard)',
      description: 'Standard Double Bed Room Non-AC (1200 Single / 1500 Double Occupancy)',
      maxOccupancy: 2,
      adultsCapacity: 2,
      childrenCapacity: 1,
      baseRate: 1500.0,
      extraAdultRate: 500.0,
      extraChildRate: 300.0,
      numberOfBeds: 1,
      bedType: 'Double Bed',
      amenities: JSON.stringify(['Wi-Fi', 'Non-AC', 'TV', 'Intercom']),
    },
    {
      code: 'DBL-AC',
      name: 'Double Bed AC (Standard)',
      description: 'Standard Double Bed Room AC (1700 Single / 2000 Double Occupancy)',
      maxOccupancy: 2,
      adultsCapacity: 2,
      childrenCapacity: 1,
      baseRate: 2000.0,
      extraAdultRate: 500.0,
      extraChildRate: 300.0,
      numberOfBeds: 1,
      bedType: 'Double Bed',
      amenities: JSON.stringify(['Wi-Fi', 'Air Conditioning', 'TV', 'Intercom']),
    },
    {
      code: 'TPL-NAC',
      name: 'Triple Bed NON AC (Standard)',
      description: 'Standard Triple Bed Room Non-AC (1800 Double / 2300 Triple / 2500 Four Occupancy)',
      maxOccupancy: 4,
      adultsCapacity: 3,
      childrenCapacity: 2,
      baseRate: 2300.0,
      extraAdultRate: 500.0,
      extraChildRate: 300.0,
      numberOfBeds: 2,
      bedType: 'Triple Bed',
      amenities: JSON.stringify(['Wi-Fi', 'Non-AC', 'TV', 'Intercom']),
    },
    {
      code: 'TPL-AC',
      name: 'Triple Bed AC (Standard)',
      description: 'Standard Triple Bed Room AC (2300 Double / 2800 Triple / 3000 Four Occupancy)',
      maxOccupancy: 4,
      adultsCapacity: 3,
      childrenCapacity: 2,
      baseRate: 2800.0,
      extraAdultRate: 500.0,
      extraChildRate: 300.0,
      numberOfBeds: 2,
      bedType: 'Triple Bed',
      amenities: JSON.stringify(['Wi-Fi', 'Air Conditioning', 'TV', 'Intercom']),
    },
    {
      code: 'DLX-NAC',
      name: 'Deluxe Room NON AC',
      description: 'Deluxe Room Non-AC (1600 Single / 2000 Double / 2200 Triple Occupancy)',
      maxOccupancy: 3,
      adultsCapacity: 3,
      childrenCapacity: 1,
      baseRate: 2000.0,
      extraAdultRate: 500.0,
      extraChildRate: 300.0,
      numberOfBeds: 1,
      bedType: 'Deluxe Bed',
      amenities: JSON.stringify(['Wi-Fi', 'Non-AC', 'TV', 'Work Desk']),
    },
    {
      code: 'DLX-AC',
      name: 'Deluxe Room AC',
      description: 'Deluxe Room AC (2200 Single / 2300 Double / 2500 Triple Occupancy)',
      maxOccupancy: 3,
      adultsCapacity: 3,
      childrenCapacity: 1,
      baseRate: 2300.0,
      extraAdultRate: 500.0,
      extraChildRate: 300.0,
      numberOfBeds: 1,
      bedType: 'Deluxe Bed',
      amenities: JSON.stringify(['Wi-Fi', 'Air Conditioning', 'TV', 'Work Desk']),
    },
    {
      code: 'EDX-NAC',
      name: 'Executive Deluxe Room NON AC',
      description: 'Executive Deluxe Room Non-AC (2100 Single / 2500 Double / 3000 Triple / 3500 Four Occupancy)',
      maxOccupancy: 4,
      adultsCapacity: 4,
      childrenCapacity: 2,
      baseRate: 2500.0,
      extraAdultRate: 500.0,
      extraChildRate: 300.0,
      numberOfBeds: 2,
      bedType: 'Executive Deluxe Bed',
      amenities: JSON.stringify(['Wi-Fi', 'Non-AC', 'TV', 'Sofa', 'Balcony']),
    },
    {
      code: 'EDX-AC',
      name: 'Executive Deluxe Room AC',
      description: 'Executive Deluxe Room AC (2500 Single / 3000 Double / 3500 Triple / 4000 Four Occupancy)',
      maxOccupancy: 4,
      adultsCapacity: 4,
      childrenCapacity: 2,
      baseRate: 3000.0,
      extraAdultRate: 500.0,
      extraChildRate: 300.0,
      numberOfBeds: 2,
      bedType: 'Executive Deluxe Bed',
      amenities: JSON.stringify(['Wi-Fi', 'Air Conditioning', 'TV', 'Sofa', 'Balcony']),
    },
    {
      code: 'SGL-NAC',
      name: 'Single Bed Room NON AC',
      description: 'Single Bed Room Non-AC (1000 Single Occupancy)',
      maxOccupancy: 1,
      adultsCapacity: 1,
      childrenCapacity: 1,
      baseRate: 1000.0,
      extraAdultRate: 500.0,
      extraChildRate: 300.0,
      numberOfBeds: 1,
      bedType: 'Single Bed',
      amenities: JSON.stringify(['Wi-Fi', 'Non-AC', 'TV']),
    },
  ];

  const createdTypesMap: Record<string, string> = {};

  for (const rt of officialRoomTypes) {
    const existing = await db.roomType.findUnique({
      where: { propertyId_code: { propertyId, code: rt.code } },
    });

    if (existing) {
      const updated = await db.roomType.update({
        where: { id: existing.id },
        data: rt,
      });
      createdTypesMap[rt.code] = updated.id;
    } else {
      const created = await db.roomType.create({
        data: { propertyId, ...rt },
      });
      createdTypesMap[rt.code] = created.id;
    }
  }

  // Seed Physical Rooms for Indira Lodge (Official 21 Rooms)
  const roomCount = await db.room.count({ where: { propertyId } });
  if (roomCount === 0 || roomCount < 21) {
    const defaultRooms = [
      // Double Bed NON AC (Standard): 101, 102, 206, 207
      { roomNumber: '101', floor: 'Floor 1', code: 'DBL-NAC' },
      { roomNumber: '102', floor: 'Floor 1', code: 'DBL-NAC' },
      { roomNumber: '206', floor: 'Floor 2', code: 'DBL-NAC' },
      { roomNumber: '207', floor: 'Floor 2', code: 'DBL-NAC' },

      // Double Bed AC (Standard): 201, 204, 301, 303, 304
      { roomNumber: '201', floor: 'Floor 2', code: 'DBL-AC' },
      { roomNumber: '204', floor: 'Floor 2', code: 'DBL-AC' },
      { roomNumber: '301', floor: 'Floor 3', code: 'DBL-AC' },
      { roomNumber: '303', floor: 'Floor 3', code: 'DBL-AC' },
      { roomNumber: '304', floor: 'Floor 3', code: 'DBL-AC' },

      // Triple Bed NON AC (Standard): 205
      { roomNumber: '205', floor: 'Floor 2', code: 'TPL-NAC' },

      // Triple Bed AC (Standard): 305
      { roomNumber: '305', floor: 'Floor 3', code: 'TPL-AC' },

      // Deluxe Rooms (Shared AC / Non-AC): 210, 211, 212, 302
      { roomNumber: '210', floor: 'Floor 2', code: 'DLX-AC' },
      { roomNumber: '211', floor: 'Floor 2', code: 'DLX-AC' },
      { roomNumber: '212', floor: 'Floor 2', code: 'DLX-AC' },
      { roomNumber: '302', floor: 'Floor 3', code: 'DLX-AC' },

      // Executive Deluxe Rooms (Shared AC / Non-AC): 208, 209
      { roomNumber: '208', floor: 'Floor 2', code: 'EDX-AC' },
      { roomNumber: '209', floor: 'Floor 2', code: 'EDX-AC' },

      // Single Bed Room NON AC: 104, 203, 213, 401
      { roomNumber: '104', floor: 'Floor 1', code: 'SGL-NAC' },
      { roomNumber: '203', floor: 'Floor 2', code: 'SGL-NAC' },
      { roomNumber: '213', floor: 'Floor 2', code: 'SGL-NAC' },
      { roomNumber: '401', floor: 'Floor 4', code: 'SGL-NAC' },
    ];

    for (const dr of defaultRooms) {
      const rtId = createdTypesMap[dr.code];
      if (!rtId) continue;

      const existingRoom = await db.room.findUnique({
        where: { propertyId_roomNumber: { propertyId, roomNumber: dr.roomNumber } },
      });

      if (!existingRoom) {
        await db.room.create({
          data: {
            propertyId,
            roomTypeId: rtId,
            roomNumber: dr.roomNumber,
            floor: dr.floor,
            buildingBlock: 'Main Wing',
            maxOccupancy: 4,
            availabilityStatus: 'AVAILABLE',
            housekeepingStatus: 'CLEAN',
            maintenanceStatus: 'OPERATIONAL',
          },
        });
      } else {
        await db.room.update({
          where: { id: existingRoom.id },
          data: { roomTypeId: rtId },
        });
      }
    }
  }
}

/**
 * Ensures default admin account exists: admin@indiralodge / password: 12345678
 */
export async function ensureDefaultAdminAccount() {
  let organization = await db.organization.findFirst();
  if (!organization) {
    organization = await db.organization.create({
      data: {
        name: 'Indira Lodge Group',
        code: 'ORG-INDIRA-01',
      },
    });
  }

  let property = await db.property.findFirst({ where: { organizationId: organization.id } });
  if (!property) {
    property = await db.property.create({
      data: {
        organizationId: organization.id,
        name: 'Indira Lodge',
        code: 'PROP-INDIRA-01',
        address: 'GS Road, Dispur',
        city: 'Guwahati',
        state: 'Assam',
        country: 'India',
        zipCode: '781005',
        phone: '+91 98765 43210',
        email: 'info@indiralodge.com',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
      },
    });

    await db.propertySettings.create({
      data: {
        propertyId: property.id,
        currencySymbol: '₹',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12H',
      },
    });
  }

  await seedPermissionsAndRoles(organization.id);
  await seedPropertyDefaults(property.id);

  const ownerRole = await db.role.findFirst({
    where: { organizationId: organization.id, name: 'Owner' },
  });

  const passwordHash = await hashPassword('12345678');
  const emailsToEnsure = ['admin@indiralodge.com', 'admin@indiralodge'];

  for (const email of emailsToEnsure) {
    let user = await db.user.findUnique({ where: { email } });
    if (!user) {
      user = await db.user.create({
        data: {
          organizationId: organization.id,
          email,
          passwordHash,
          fullName: 'Indira Baruah',
          phone: '+91 98765 43210',
          status: 'ACTIVE',
        },
      });

      if (ownerRole) {
        await db.userRole.upsert({
          where: {
            userId_roleId_propertyId: {
              userId: user.id,
              roleId: ownerRole.id,
              propertyId: property.id,
            },
          },
          update: {},
          create: {
            userId: user.id,
            roleId: ownerRole.id,
            propertyId: property.id,
          },
        });
      }
    } else {
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    }
  }
}
