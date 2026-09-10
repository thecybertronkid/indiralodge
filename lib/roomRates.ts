/**
 * Indira Lodge Occupancy-Based Tariff Calculator
 */
export function calculateIndiraLodgeRoomRate(
  code: string,
  adults: number,
  children: number = 0,
  baseRateFallback: number = 2000
): number {
  const occ = Math.max(1, adults + children);
  const upperCode = (code || '').toUpperCase().trim();

  switch (upperCode) {
    case 'DBL-NAC':
      if (occ === 1) return 1200;
      if (occ === 2) return 1500;
      return 1500 + (occ - 2) * 500;

    case 'DBL-AC':
      if (occ === 1) return 1700;
      if (occ === 2) return 2000;
      return 2000 + (occ - 2) * 500;

    case 'TPL-NAC':
      if (occ <= 2) return 1800;
      if (occ === 3) return 2300;
      return 2500;

    case 'TPL-AC':
      if (occ <= 2) return 2300;
      if (occ === 3) return 2800;
      return 3000;

    case 'DLX-NAC':
      if (occ === 1) return 1600;
      if (occ === 2) return 2000;
      return 2200;

    case 'DLX-AC':
      if (occ === 1) return 2200;
      if (occ === 2) return 2300;
      return 2500;

    case 'EDX-NAC':
      if (occ === 1) return 2100;
      if (occ === 2) return 2500;
      if (occ === 3) return 3000;
      return 3500;

    case 'EDX-AC':
      if (occ === 1) return 2500;
      if (occ === 2) return 3000;
      if (occ === 3) return 3500;
      return 4000;

    case 'SGL-NAC':
      return 1000;

    default:
      return baseRateFallback;
  }
}
