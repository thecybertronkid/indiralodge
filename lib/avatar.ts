/**
 * Helper to resolve custom user avatar picture based on email or full name.
 */
export function getUserAvatar(email?: string | null, fullName?: string | null): string | null {
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanName = (fullName || '').toLowerCase().trim();
  const prefix = cleanEmail.split('@')[0]?.replace(/[^a-z0-9_-]/g, '');

  if (
    cleanEmail === 'ayan@indiralodge' ||
    cleanEmail === 'ayan@indiralodge.com' ||
    cleanName.includes('ayan')
  ) {
    return '/avatars/ayan.png';
  }

  if (
    cleanEmail === 'nilutpal@indiralodge' ||
    cleanEmail === 'nilutpal@indiralodge.com' ||
    cleanName.includes('nilutpal')
  ) {
    return '/avatars/nilutpal.png';
  }

  if (prefix) {
    return `/avatars/${prefix}.png`;
  }

  return null;
}
