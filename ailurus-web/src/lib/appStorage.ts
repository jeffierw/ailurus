import type { AppState } from '../context/modalContextBase';
import { AILURUS_CONFIG } from '../sui/config';

const STATE_PREFIX = 'ailurus:state:';

type PersistedState = Omit<AppState, 'isLoggedIn' | 'address'> & {
  platformId?: string | null;
};

const defaultPersisted: PersistedState = {
  balanceUsdc: 0,
  subscribedCreators: [],
  isCreator: false,
  creatorPriceUsdc: 4.99,
  username: null,
  displayName: null,
  onboardingCompleted: false,
  userIntent: null,
  activity: [],
  platformId: null,
};

function migratePersistedState(state: PersistedState): PersistedState {
  const platformId = AILURUS_CONFIG.platformId ?? null;
  if (!platformId) return state;
  if (state.platformId === platformId) return { ...state, platformId };

  // New platform deployment — drop stale on-chain role flags from localStorage.
  return {
    ...state,
    platformId,
    isCreator: false,
    subscribedCreators: [],
  };
}

export function loadPersistedState(address: string): PersistedState {
  try {
    const raw = localStorage.getItem(`${STATE_PREFIX}${address.toLowerCase()}`);
    if (!raw) return migratePersistedState({ ...defaultPersisted });
    return migratePersistedState({
      ...defaultPersisted,
      ...(JSON.parse(raw) as Partial<PersistedState>),
    });
  } catch {
    return migratePersistedState({ ...defaultPersisted });
  }
}

export function savePersistedState(address: string, state: PersistedState) {
  const platformId = AILURUS_CONFIG.platformId ?? state.platformId ?? null;
  localStorage.setItem(
    `${STATE_PREFIX}${address.toLowerCase()}`,
    JSON.stringify({ ...state, platformId }),
  );
}

export function clearPersistedState(address: string) {
  localStorage.removeItem(`${STATE_PREFIX}${address.toLowerCase()}`);
}

export function toPersisted(state: AppState): PersistedState {
  const {
    isLoggedIn: _isLoggedIn,
    address: _address,
    ...rest
  } = state;
  return rest;
}
