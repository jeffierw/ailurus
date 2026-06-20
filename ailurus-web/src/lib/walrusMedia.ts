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
 * Single-request aggregator URL for Sui blob objects, quilt patch IDs, and blob IDs.
 * Prefer this over the Walrus SDK in browsers — SDK reads fan out to hundreds of sliver requests.
 */
export function walrusMediaUrl(mediaId: string) {
  const base = walrusAggregatorBase();
  const trimmed = mediaId.trim();
  if (!trimmed) return null;
  const query = '?skip_consistency_check=true';
  if (isSuiObjectId(trimmed)) return `${base}/v1/blobs/by-object-id/${trimmed}${query}`;
  if (isWalrusBlobId(trimmed)) return `${base}/v1/blobs/${trimmed}${query}`;
  return `${base}/v1/blobs/by-quilt-patch-id/${trimmed}${query}`;
}
