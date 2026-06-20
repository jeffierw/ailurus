import type { LoginIntent } from '../context/modalContextBase';

const PENDING_POST_LOGIN_KEY = 'ailurus:pending-post-login';
const LOGIN_INTENT_KEY = 'ailurus:login-intent';

export function markPendingPostLogin() {
  sessionStorage.setItem(PENDING_POST_LOGIN_KEY, '1');
}

export function saveLoginIntent(intent: LoginIntent) {
  sessionStorage.setItem(LOGIN_INTENT_KEY, intent);
}

export function clearAuthSessionFlags() {
  sessionStorage.removeItem(PENDING_POST_LOGIN_KEY);
  sessionStorage.removeItem(LOGIN_INTENT_KEY);
}

export function consumePendingPostLogin() {
  const pending = sessionStorage.getItem(PENDING_POST_LOGIN_KEY) === '1';
  if (pending) {
    sessionStorage.removeItem(PENDING_POST_LOGIN_KEY);
  }
  return pending;
}

export function consumeLoginIntent(): LoginIntent | null {
  const raw = sessionStorage.getItem(LOGIN_INTENT_KEY);
  sessionStorage.removeItem(LOGIN_INTENT_KEY);
  if (raw === 'subscribe' || raw === 'deposit' || raw === 'create' || raw === 'default') {
    return raw;
  }
  return null;
}
