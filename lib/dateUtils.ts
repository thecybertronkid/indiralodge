/**
 * Utility functions for date and time parsing, comparison, and validation across Indira Lodge.
 */

export function parseTimeToMinutes(t?: string | null, defaultMinutes = 0): number {
  if (!t) return defaultMinutes;
  const clean = t.trim();
  const parts = clean.split(':');
  if (parts.length < 2) return defaultMinutes;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return defaultMinutes;
  return h * 60 + m;
}

export function getDateStringYMD(d: string | Date): string {
  if (typeof d === 'string') {
    return d.split('T')[0].trim();
  }
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export interface StayValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that arrival date & time is strictly before departure date & time.
 * For same-day stays (arrival date == departure date), departure time must be after arrival time.
 */
export function validateStayDatesAndTimes(
  arrivalDate: string | Date | null | undefined,
  arrivalTime: string | null | undefined,
  departureDate: string | Date | null | undefined,
  departureTime: string | null | undefined
): StayValidationResult {
  if (!arrivalDate || !departureDate) {
    return { valid: false, error: 'Arrival date and departure date are required.' };
  }

  const arrYmd = getDateStringYMD(arrivalDate);
  const depYmd = getDateStringYMD(departureDate);

  if (depYmd < arrYmd) {
    return { valid: false, error: 'Departure date cannot be before arrival date.' };
  }

  if (depYmd === arrYmd) {
    const arrMins = parseTimeToMinutes(arrivalTime, 14 * 60); // default 14:00 (2:00 pm)
    const depMins = parseTimeToMinutes(departureTime, 11 * 60); // default 11:00 (11:00 am)
    if (depMins <= arrMins) {
      return {
        valid: false,
        error: 'For same-day stays, departure time must be after arrival time.',
      };
    }
  }

  return { valid: true };
}
