import type { LoginIntent } from '../context/modalContextBase';

let pendingPostLogin = false;
let loginIntent: LoginIntent | null = null;

export function markPendingPostLogin() {
  pendingPostLogin = true;
}

export function saveLoginIntent(intent: LoginIntent) {
  loginIntent = intent;
}

export function clearAuthSessionFlags() {
  pendingPostLogin = false;
  loginIntent = null;
}

export function consumePendingPostLogin() {
  const pending = pendingPostLogin;
  if (pending) pendingPostLogin = false;
  return pending;
}

export function consumeLoginIntent(): LoginIntent | null {
  const raw = loginIntent;
  loginIntent = null;
  if (raw === 'subscribe' || raw === 'deposit' || raw === 'create' || raw === 'default') {
    return raw;
  }
  return null;
}
