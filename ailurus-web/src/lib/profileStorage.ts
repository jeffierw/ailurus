import { normalizeUsername } from './routes';

export type StoredProfile = {
  username?: string;
  displayName?: string;
  bio?: string;
  avatarWalrusId?: string;
  onboardingCompleted?: boolean;
  userIntent?: 'fan' | 'creator';
};

type UsernameIndex = Record<string, string>;

const PROFILE_PREFIX = 'ailurus:profile:';
const USERNAME_INDEX_KEY = 'ailurus:username-index';

function profileKey(address: string) {
  return `${PROFILE_PREFIX}${address.toLowerCase()}`;
}

function readIndex(): UsernameIndex {
  try {
    const raw = localStorage.getItem(USERNAME_INDEX_KEY);
    return raw ? (JSON.parse(raw) as UsernameIndex) : {};
  } catch {
    return {};
  }
}

function writeIndex(index: UsernameIndex) {
  localStorage.setItem(USERNAME_INDEX_KEY, JSON.stringify(index));
}

export function loadProfile(address: string): StoredProfile {
  try {
    const raw = localStorage.getItem(profileKey(address));
    return raw ? (JSON.parse(raw) as StoredProfile) : {};
  } catch {
    return {};
  }
}

export function saveProfile(address: string, profile: StoredProfile) {
  localStorage.setItem(profileKey(address), JSON.stringify(profile));
}

export function isUsernameTaken(username: string, currentAddress?: string) {
  const normalized = normalizeUsername(username);
  const index = readIndex();
  const owner = index[normalized];
  if (!owner) return false;
  if (currentAddress && owner.toLowerCase() === currentAddress.toLowerCase()) return false;
  return true;
}

export function setUsername(address: string, username: string) {
  const normalized = normalizeUsername(username);
  if (!normalized) return;
  const index = readIndex();

  const existing = loadProfile(address);
  if (existing.username && existing.username !== normalized) {
    delete index[existing.username];
  }

  index[normalized] = address.toLowerCase();
  writeIndex(index);
  saveProfile(address, { ...existing, username: normalized });
}

export function resolveAddressBySlug(slug: string): string | null {
  if (slug.startsWith('0x')) return slug;
  const index = readIndex();
  return index[normalizeUsername(slug)] ?? null;
}

export function clearProfile(address: string) {
  const profile = loadProfile(address);
  if (profile.username) {
    const index = readIndex();
    delete index[profile.username];
    writeIndex(index);
  }
  localStorage.removeItem(profileKey(address));
}

export function getAvatarWalrusId(address: string) {
  return loadProfile(address).avatarWalrusId;
}
