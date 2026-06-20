import { walrus } from '@mysten/walrus';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { walrusMediaUrl } from '../lib/walrusMedia';

export { isSuiObjectId } from '../lib/walrusMedia';

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

export async function loadWalrusMediaBytes(client: SuiGrpcClient, mediaId: string) {
  const trimmed = mediaId.trim();
  if (!trimmed) throw new Error('Missing Walrus media id');

  try {
    const { bytes, contentType } = await fetchWalrusMediaFromAggregator(trimmed);
    return { bytes, contentType };
  } catch {
    // Fall back to SDK only when the aggregator is unavailable.
  }

  const walrusClient = client.$extend(walrus());
  const [file] = await walrusClient.walrus.getFiles({ ids: [trimmed] });
  if (!file) throw new Error('Walrus media not found');

  const tags = await file.getTags();
  const bytes = await file.bytes();
  const contentType =
    tags['content-type'] ?? tags['ailurus-original-content-type'] ?? 'image/jpeg';

  return { bytes, contentType };
}

export function bytesToMediaObjectUrl(bytes: Uint8Array, contentType: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type: contentType });
  return URL.createObjectURL(blob);
}
