import { walrus } from '@mysten/walrus';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { walrusMediaUrl } from '../lib/walrusMedia';
import { bytesToMediaUrl } from '../lib/mediaUrl';

export {
  isSuiObjectId,
  normalizeWalrusStoredMediaId,
  resolveWalrusMediaId,
} from '../lib/walrusMedia';

const walrusTagsCache = new Map<string, Record<string, string>>();
const walrusTagsInflight = new Map<string, Promise<Record<string, string>>>();

/** @deprecated Use walrusMediaUrl — SDK reads issue 300+ sliver requests per blob in browsers. */
export function needsWalrusSdkFetch(mediaId: string) {
  return !walrusMediaUrl(mediaId);
}

function tagsFromResponse(response: Response) {
  const tags: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    tags[key.toLowerCase()] = value;
  });
  return tags;
}

export async function fetchWalrusMediaFromAggregator(mediaId: string) {
  const url = mediaId.startsWith('http') ? mediaId : walrusMediaUrl(mediaId);
  if (!url) throw new Error('Missing Walrus media id');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Walrus aggregator request failed (${response.status})`);
  }

  const tags = tagsFromResponse(response);
  const contentType =
    tags['ailurus-original-content-type'] ??
    tags['content-type'] ??
    response.headers.get('content-type') ??
    'application/octet-stream';

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType,
    tags,
  };
}

/** Walrus quilt native tags are not always exposed as aggregator HTTP headers. */
export async function loadWalrusTagsFromSdk(client: SuiGrpcClient, mediaId: string) {
  const trimmed = mediaId.trim();
  if (!trimmed) throw new Error('Missing Walrus media id');

  const cached = walrusTagsCache.get(trimmed);
  if (cached) return cached;

  const inflight = walrusTagsInflight.get(trimmed);
  if (inflight) return inflight;

  const load = (async () => {
    const walrusClient = client.$extend(walrus());
    const [file] = await walrusClient.walrus.getFiles({ ids: [trimmed] });
    if (!file) throw new Error('Walrus media not found');
    const tags = await file.getTags();
    walrusTagsCache.set(trimmed, tags);
    walrusTagsInflight.delete(trimmed);
    return tags;
  })().catch((error) => {
    walrusTagsInflight.delete(trimmed);
    throw error;
  });

  walrusTagsInflight.set(trimmed, load);
  return load;
}

export async function resolveWalrusImageUrl(mediaId: string) {
  const trimmed = mediaId.trim();
  if (!trimmed) throw new Error('Missing Walrus media id');

  const directUrl = walrusMediaUrl(trimmed);
  if (!directUrl) throw new Error('Missing Walrus media id');

  const response = await fetch(directUrl);
  if (response.ok) return directUrl;

  throw new Error(`Walrus aggregator could not serve this media id (${response.status})`);
}

export async function loadWalrusMediaBytes(_client: SuiGrpcClient, mediaId: string) {
  const trimmed = mediaId.trim();
  if (!trimmed) throw new Error('Missing Walrus media id');

  try {
    const { bytes, contentType } = await fetchWalrusMediaFromAggregator(trimmed);
    return { bytes, contentType };
  } catch (error) {
    throw error instanceof Error ? error : new Error('Walrus media unavailable');
  }
}

export function bytesToMediaObjectUrl(bytes: Uint8Array, contentType: string) {
  return bytesToMediaUrl(bytes, contentType);
}
