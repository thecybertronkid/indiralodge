import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const property = await db.property.findFirst({
      where: session.propertyId ? { id: session.propertyId } : { organizationId: session.organizationId },
      include: { settings: true },
    });

    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

    const activeSessionsCount = await db.userSession.count({
      where: { expiresAt: { gt: new Date() } },
    });

    return NextResponse.json({ property, activeSessionsCount });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch property' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session.permissions, 'settings.edit')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permission' }, { status: 403 });
    }

    const body = await req.json();
    const { name, address, city, state, country, zipCode, phone, email, gstin, currency, timezone, dateFormat, timeFormat, taxInclusive, defaultTaxRate } = body;

    const property = await db.property.findFirst({
      where: session.propertyId ? { id: session.propertyId } : { organizationId: session.organizationId },
    });

    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

    const updatedProp = await db.property.update({
      where: { id: property.id },
      data: {
        ...(name ? { name } : {}),
        ...(address ? { address } : {}),
        ...(city ? { city } : {}),
        ...(state ? { state } : {}),
        ...(country ? { country } : {}),
        ...(zipCode ? { zipCode } : {}),
        ...(phone ? { phone } : {}),
        ...(email ? { email } : {}),
        ...(gstin !== undefined ? { gstin } : {}),
        ...(currency ? { currency } : {}),
        ...(timezone ? { timezone } : {}),
      },
    });

    const currSymbol = (currency || property.currency) === 'USD' ? '$' : (currency || property.currency) === 'EUR' ? '€' : (currency || property.currency) === 'GBP' ? '£' : '₹';

    await db.propertySettings.upsert({
      where: { propertyId: property.id },
      update: {
        ...(dateFormat ? { dateFormat } : {}),
        ...(timeFormat ? { timeFormat } : {}),
        currencySymbol: currSymbol,
        ...(taxInclusive !== undefined ? { taxInclusive } : {}),
        ...(defaultTaxRate !== undefined ? { defaultTaxRate: parseFloat(defaultTaxRate) } : {}),
      },
      create: {
        propertyId: property.id,
        dateFormat: dateFormat || 'DD/MM/YYYY',
        timeFormat: timeFormat || '12H',
        currencySymbol: currSymbol,
        taxInclusive: taxInclusive || false,
        defaultTaxRate: defaultTaxRate ? parseFloat(defaultTaxRate) : 18.0,
      },
    });

    await logAuditEvent({
      organizationId: session.organizationId,
      propertyId: property.id,
      userId: session.userId,
      action: 'PROPERTY_SETTINGS_UPDATED',
      module: 'settings',
      afterData: body,
    });

    return NextResponse.json({ success: true, property: updatedProp });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update property settings' }, { status: 500 });
  }
}
