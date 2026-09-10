import { db } from './db';
import { calculateIndiraLodgeRoomRate } from './roomRates';

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

  const taxRate = propSettings?.defaultTaxRate ?? 5.0;

  // Calculate nights
  const arr = new Date(input.arrivalDate);
  const dep = new Date(input.departureDate);
  const diffTime = Math.max(1, dep.getTime() - arr.getTime());
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Determine rate based on occupancy matrix
  const calculatedNightlyRate = calculateIndiraLodgeRoomRate(
    roomType.code,
    input.adults,
    input.children,
    roomType.baseRate
  );

  const baseRate = input.customRoomRate != null ? input.customRoomRate : calculatedNightlyRate;

  const roomTotal = baseRate * nights;
  const subtotal = roomTotal;

  const discountAmount = input.discountAmount ? Math.min(subtotal, Math.max(0, input.discountAmount)) : 0;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  // Since room rates are GST-inclusive, taxable base and GST are extracted from the total
  const taxableAmount = Math.round((totalAmount / (1 + taxRate / 100)) * 100) / 100;
  const taxAmount = Math.round((totalAmount - taxableAmount) * 100) / 100;

  return {
    nights,
    baseRate,
    extraAdultCharges: 0,
    extraChildCharges: 0,
    subtotal,
    discountAmount,
    taxableAmount,
    taxRate,
    taxAmount,
    totalAmount,
  };
}
