import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { checkRoomTypeAvailability, getAvailablePhysicalRooms } from '@/lib/availability';

export async function GET(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const propertyId = session.propertyId || (await db.property.findFirst({ where: { organizationId: session.organizationId } }))?.id;
    if (!propertyId) return NextResponse.json({ error: 'No active property found' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const arrivalStr = searchParams.get('arrivalDate');
    const departureStr = searchParams.get('departureDate');
    const roomTypeId = searchParams.get('roomTypeId');

    if (!arrivalStr || !departureStr) {
      return NextResponse.json({ error: 'Arrival and departure dates are required.' }, { status: 400 });
    }

    const arrivalDate = new Date(arrivalStr);
    const departureDate = new Date(departureStr);

    if (isNaN(arrivalDate.getTime()) || isNaN(departureDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format specified.' }, { status: 400 });
    }

    if (departureDate <= arrivalDate) {
      return NextResponse.json({ error: 'Departure date must be after arrival date.' }, { status: 400 });
    }

    const roomTypesAvailability = await checkRoomTypeAvailability(propertyId, arrivalDate, departureDate);

    let availablePhysicalRooms: any[] = [];
    if (roomTypeId) {
      availablePhysicalRooms = await getAvailablePhysicalRooms(propertyId, roomTypeId, arrivalDate, departureDate);
    }

    return NextResponse.json({
      arrivalDate,
      departureDate,
      roomTypesAvailability,
      availablePhysicalRooms,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to check room availability' }, { status: 500 });
  }
}
