import { AILURUS_CONFIG } from '../sui/config';
import { getNetworkConfig, getStoredNetwork } from './networkConfig';

const DEFAULT_AGGREGATOR =
  AILURUS_CONFIG.defaultNetwork === 'mainnet'
    ? 'https://aggregator.walrus-mainnet.walrus.space'
    : 'https://aggregator.walrus-testnet.walrus.space';

export function walrusAggregatorBase() {
  const network = getStoredNetwork();
  const fromNetwork = getNetworkConfig(network).walrusAggregatorUrl;
  return (
    (import.meta.env.VITE_WALRUS_AGGREGATOR_URL as string | undefined) ?? fromNetwork ?? DEFAULT_AGGREGATOR
  );
}

export function isSuiObjectId(value: string) {
  return /^0x[a-fA-F0-9]{1,64}$/.test(value.trim());
}

/** Walrus SDK may prefix Sui blob object ids with `B` (e.g. `B0xabc…`). */
export function normalizeWalrusStoredMediaId(mediaId: string) {
  const trimmed = mediaId.trim();
  if (/^B0x[a-fA-F0-9]{64}$/i.test(trimmed)) return trimmed.slice(1);
  return trimmed;
}

function fromUrlSafeBase64(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const normalized = padded + '='.repeat(padLength);
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/** Walrus BlobId is 32 bytes when decoded from URL-safe base64. */
export function isWalrusBlobId(value: string) {
  const trimmed = value.trim();
  if (!trimmed || isSuiObjectId(trimmed)) return false;
  try {
    return fromUrlSafeBase64(trimmed).length === 32;
  } catch {
    return false;
  }
}

/**
 * Quilt patch IDs embed a Walrus BlobId plus quilt index bytes.
 * The aggregator `/by-quilt-patch-id/` route often 500s; extracting the inner BlobId fixes reads.
 */
export function extractWalrusBlobIdFromQuiltPatch(mediaId: string): string | null {
  const trimmed = mediaId.trim();
  if (isWalrusBlobId(trimmed)) return trimmed;
  if (trimmed.length <= 33 || !trimmed.startsWith('2')) return null;

  for (let end = trimmed.length; end > 10; end -= 1) {
    const candidate = trimmed.slice(1, end);
    if (isWalrusBlobId(candidate)) return candidate;
  }
  return null;
}

/** Normalize stored media ids to a form the Walrus aggregator can serve in one request. */
export function resolveWalrusMediaId(mediaId: string) {
  const trimmed = normalizeWalrusStoredMediaId(mediaId);
  if (!trimmed) return trimmed;
  if (isSuiObjectId(trimmed) || isWalrusBlobId(trimmed)) return trimmed;

  const blobId = extractWalrusBlobIdFromQuiltPatch(trimmed);
  if (blobId) return blobId;

  return trimmed;
}

/**
 * Single-request aggregator URL for Sui blob objects, Walrus BlobIds, and quilt patch IDs.
 * Prefer this over the Walrus SDK in browsers — SDK reads fan out to hundreds of sliver requests.
 */
export function walrusMediaUrl(mediaId: string) {
  const base = walrusAggregatorBase();
  const trimmed = resolveWalrusMediaId(mediaId);
  if (!trimmed) return null;
  const query = '?skip_consistency_check=true';
  if (isSuiObjectId(trimmed)) return `${base}/v1/blobs/by-object-id/${trimmed}${query}`;
  if (isWalrusBlobId(trimmed)) return `${base}/v1/blobs/${trimmed}${query}`;
  return `${base}/v1/blobs/by-quilt-patch-id/${trimmed}${query}`;
}
