import { db } from './db';

export interface PricingInput {
  propertyId: string;
  roomTypeId: string;
  arrivalDate: Date;
  departureDate: Date;
  adults: number;
  children: number;
  discountAmount?: number;
  customRoomRate?: number;
}

export interface PricingOutput {
  nights: number;
  baseRate: number;
  extraAdultCharges: number;
  extraChildCharges: number;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

export async function calculateReservationPricing(input: PricingInput): Promise<PricingOutput> {
  const roomType = await db.roomType.findUnique({
    where: { id: input.roomTypeId },
  });

  if (!roomType) {
    throw new Error('Invalid room type specified for pricing calculation.');
  }

  const propSettings = await db.propertySettings.findUnique({
    where: { propertyId: input.propertyId },
  });

  const taxRate = propSettings?.defaultTaxRate ?? 18.0;

  // Calculate nights
  const arr = new Date(input.arrivalDate);
  const dep = new Date(input.departureDate);
  const diffTime = Math.max(1, dep.getTime() - arr.getTime());
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const baseRate = input.customRoomRate != null ? input.customRoomRate : roomType.baseRate;

  // Extra guests calculation
  const extraAdults = Math.max(0, input.adults - roomType.adultsCapacity);
  const extraChildren = Math.max(0, input.children - roomType.childrenCapacity);

  const extraAdultCharges = extraAdults * roomType.extraAdultRate * nights;
  const extraChildCharges = extraChildren * roomType.extraChildRate * nights;

  const roomTotal = baseRate * nights;
  const subtotal = roomTotal + extraAdultCharges + extraChildCharges;

  const discountAmount = input.discountAmount ? Math.min(subtotal, Math.max(0, input.discountAmount)) : 0;
  const taxableAmount = subtotal - discountAmount;

  const taxAmount = Math.round(((taxableAmount * taxRate) / 100) * 100) / 100;
  const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

  return {
    nights,
    baseRate,
    extraAdultCharges,
    extraChildCharges,
    subtotal,
    discountAmount,
    taxableAmount,
    taxRate,
    taxAmount,
    totalAmount,
  };
}
