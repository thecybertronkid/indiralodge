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

  // Seed Demo Room Types & Physical Rooms if empty
  const roomTypeCount = await db.roomType.count({ where: { propertyId } });
  if (roomTypeCount === 0) {
    const stdType = await db.roomType.create({
      data: {
        propertyId,
        code: 'STD',
        name: 'Standard Room',
        description: 'Comfortable standard queen room with city view and Wi-Fi',
        maxOccupancy: 2,
        baseRate: 3500.0,
        extraAdultRate: 1000.0,
        extraChildRate: 500.0,
        numberOfBeds: 1,
        bedType: 'Queen Bed',
        amenities: JSON.stringify(['Wi-Fi', 'Air Conditioning', 'TV', 'Tea/Coffee']),
      },
    });

    const dlxType = await db.roomType.create({
      data: {
        propertyId,
        code: 'DLX',
        name: 'Deluxe Room',
        description: 'Spacious deluxe king room with balcony and workstation',
        maxOccupancy: 3,
        baseRate: 5000.0,
        extraAdultRate: 1200.0,
        extraChildRate: 600.0,
        numberOfBeds: 1,
        bedType: 'King Bed',
        amenities: JSON.stringify(['Wi-Fi', 'Air Conditioning', 'Mini Fridge', 'Workstation', 'Balcony']),
      },
    });

    const steType = await db.roomType.create({
      data: {
        propertyId,
        code: 'STE',
        name: 'Executive Suite',
        description: 'Luxury suite featuring separate living room, dining nook and jacuzzi',
        maxOccupancy: 4,
        baseRate: 8500.0,
        extraAdultRate: 1500.0,
        extraChildRate: 800.0,
        numberOfBeds: 2,
        bedType: 'King Bed + Sofa Bed',
        amenities: JSON.stringify(['Wi-Fi', 'Air Conditioning', 'Jacuzzi', 'Living Room', 'Mini Bar', 'Buffet Breakfast']),
      },
    });

    // Seed Physical Rooms
    const roomsToCreate = [
      { roomNumber: '101', floor: 'Floor 1', roomTypeId: stdType.id },
      { roomNumber: '102', floor: 'Floor 1', roomTypeId: stdType.id },
      { roomNumber: '103', floor: 'Floor 1', roomTypeId: stdType.id },
      { roomNumber: '201', floor: 'Floor 2', roomTypeId: dlxType.id },
      { roomNumber: '202', floor: 'Floor 2', roomTypeId: dlxType.id },
      { roomNumber: '203', floor: 'Floor 2', roomTypeId: dlxType.id },
      { roomNumber: '301', floor: 'Floor 3', roomTypeId: steType.id },
      { roomNumber: '302', floor: 'Floor 3', roomTypeId: steType.id },
    ];

    for (const r of roomsToCreate) {
      await db.room.create({
        data: {
          propertyId,
          roomTypeId: r.roomTypeId,
          roomNumber: r.roomNumber,
          floor: r.floor,
          buildingBlock: 'Main Wing',
          maxOccupancy: 3,
          availabilityStatus: 'AVAILABLE',
          housekeepingStatus: 'CLEAN',
          maintenanceStatus: 'OPERATIONAL',
        },
      });
    }
  }
}

/**
 * Ensures default admin account exists: admin@indiralodge.com / password: 12345678
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

    await seedPermissionsAndRoles(organization.id);
    await seedPropertyDefaults(property.id);
  }

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
      // Update password to 12345678 if requested
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    }
  }
}
