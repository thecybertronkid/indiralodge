import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { seedPermissionsAndRoles, seedPropertyDefaults } from '@/lib/seed';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  try {
    const orgCount = await db.organization.count();
    const userCount = await db.user.count();

    if (orgCount > 0 && userCount > 0) {
      const property = await db.property.findFirst({ select: { name: true } });
      return NextResponse.json({ isConfigured: true, propertyName: property?.name || 'Indira Lodge' });
    }

    return NextResponse.json({ isConfigured: false });
  } catch (error) {
    return NextResponse.json({ isConfigured: false, error: 'Database check failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      hotelName,
      address,
      city,
      state,
      country,
      zipCode,
      phone,
      email,
      gstin,
      currency,
      timezone,
      adminFullName,
      adminEmail,
      adminPassword,
    } = body;

    if (!hotelName || !address || !city || !state || !country || !phone || !email || !adminFullName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'All required setup fields must be provided.' }, { status: 400 });
    }

    if (adminPassword.length < 8) {
      return NextResponse.json({ error: 'Administrator password must be at least 8 characters long.' }, { status: 400 });
    }

    // 1. Create Organization
    const orgCode = 'ORG-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const organization = await db.organization.create({
      data: {
        name: hotelName + ' Group',
        code: orgCode,
      },
    });

    // 2. Create Property
    const propCode = 'PROP-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const property = await db.property.create({
      data: {
        organizationId: organization.id,
        name: hotelName,
        code: propCode,
        address,
        city,
        state,
        country,
        zipCode: zipCode || '781005',
        phone,
        email,
        gstin: gstin || null,
        currency: currency || 'INR',
        timezone: timezone || 'Asia/Kolkata',
      },
    });

    // 3. Create Property Settings
    const currSymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₹';
    await db.propertySettings.create({
      data: {
        propertyId: property.id,
        currencySymbol: currSymbol,
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12H',
        taxInclusive: false,
        defaultTaxRate: 18.0,
      },
    });

    // 4. Seed Permissions, System Roles, and Default Booking Sources/Room Types
    await seedPermissionsAndRoles(organization.id);
    await seedPropertyDefaults(property.id);

    // 5. Fetch Owner Role
    const ownerRole = await db.role.findFirst({
      where: { organizationId: organization.id, name: 'Owner' },
    });

    if (!ownerRole) {
      return NextResponse.json({ error: 'Failed to generate initial system roles.' }, { status: 500 });
    }

    // 6. Create Admin User
    const passwordHash = await hashPassword(adminPassword);
    const adminUser = await db.user.create({
      data: {
        organizationId: organization.id,
        email: adminEmail.toLowerCase().trim(),
        passwordHash,
        fullName: adminFullName.trim(),
        phone: phone,
        status: 'ACTIVE',
        lastLoginAt: new Date(),
      },
    });

    // 7. Assign UserRole to Property
    await db.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: ownerRole.id,
        propertyId: property.id,
      },
    });

    // 8. Create User Session
    const token = await createSession(adminUser.id);

    // 9. Log Audit Event
    await logAuditEvent({
      organizationId: organization.id,
      propertyId: property.id,
      userId: adminUser.id,
      action: 'INITIAL_SETUP_COMPLETED',
      module: 'system',
      afterData: {
        hotelName,
        adminEmail,
        currency,
        timezone,
      },
    });

    const response = NextResponse.json({
      success: true,
      message: 'Initial setup completed successfully.',
      user: {
        id: adminUser.id,
        fullName: adminUser.fullName,
        email: adminUser.email,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred during setup.' }, { status: 500 });
  }
}
