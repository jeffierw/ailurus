/** App routes that must not be used as usernames. */
export const RESERVED_USERNAMES = new Set([
  'feed',
  'explore',
  'create',
  'profile',
  'creator',
  'wallet',
  'notifications',
  'settings',
  'login',
  'auth',
  'api',
  'admin',
  'app',
  'assets',
  'static',
  'health',
  'sponsor',
]);

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/^@/, '');
}

export function isSuiAddress(value: string) {
  return /^0x[a-fA-F0-9]{1,64}$/.test(value);
}

export function validateUsername(value: string): string | null {
  const username = normalizeUsername(value);
  if (!USERNAME_RE.test(username)) {
    return 'Username must be 3–30 characters: lowercase letters, numbers, underscore.';
  }
  if (RESERVED_USERNAMES.has(username)) {
    return 'This username is reserved.';
  }
  return null;
}

export function getProfilePath(address: string, username?: string | null) {
  if (username) return `/${username}`;
  return `/${address}`;
}
