/**
 * Persist Enoki / dApp Kit wallet session across page reloads.
 * Only stores wallet connection metadata — not balances or profile data.
 */
export const walletStorage: Storage =
  typeof window !== 'undefined' ? window.sessionStorage : createNoopStorage();

function createNoopStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}
