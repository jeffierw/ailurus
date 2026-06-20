export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

export function formatRelativeTime(timestampMs: number): string {
  const diffMs = Date.now() - timestampMs;
  if (diffMs < 0) return 'just now';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(timestampMs).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function bytesToString(value: unknown): string {
  if (typeof value === 'string') {
    if (/^[A-Za-z0-9+/]+=*$/.test(value) && value.length > 8) {
      try {
        const decoded = atob(value);
        if (/^[\x20-\x7E]+$/.test(decoded)) return decoded;
      } catch {
        // fall through to raw string
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    return new TextDecoder().decode(new Uint8Array(value as number[]));
  }
  return '';
}

/** gRPC JSON is flat; JSON-RPC nests under `fields`. */
export function unwrapMoveFields<T extends object>(raw: unknown): T | null {
  if (!raw || typeof raw !== 'object') return null;
  if ('fields' in raw && raw.fields && typeof raw.fields === 'object') {
    return raw.fields as T;
  }
  return raw as T;
}

export function creatorAvatar(address: string) {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${address}`;
}

const GRADIENTS = [
  'from-rose-100 via-orange-50 to-amber-100',
  'from-sky-100 via-indigo-50 to-violet-100',
  'from-emerald-100 via-teal-50 to-cyan-100',
  'from-fuchsia-100 via-pink-50 to-rose-100',
  'from-amber-100 via-yellow-50 to-lime-100',
  'from-violet-100 via-purple-50 to-fuchsia-100',
];

export function gradientForSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return GRADIENTS[hash % GRADIENTS.length];
}
