import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { walrusMediaUrl } from '../lib/walrusMedia';
import { bytesToMediaObjectUrl, loadWalrusMediaBytes } from './walrusMediaLoader';

const objectUrlCache = new Map<string, string>();
const inflightLoads = new Map<string, Promise<string>>();

export function getWalrusObjectUrl(client: SuiGrpcClient, mediaId: string) {
  const trimmed = mediaId.trim();
  if (!trimmed) return Promise.reject(new Error('Missing Walrus media id'));

  const directUrl = walrusMediaUrl(trimmed);
  if (directUrl) return Promise.resolve(directUrl);

  const cached = objectUrlCache.get(trimmed);
  if (cached) return Promise.resolve(cached);

  const inflight = inflightLoads.get(trimmed);
  if (inflight) return inflight;

  const load = loadWalrusMediaBytes(client, trimmed)
    .then(({ bytes, contentType }) => {
      const url = bytesToMediaObjectUrl(bytes, contentType);
      objectUrlCache.set(trimmed, url);
      inflightLoads.delete(trimmed);
      return url;
    })
    .catch((error) => {
      inflightLoads.delete(trimmed);
      throw error;
    });

  inflightLoads.set(trimmed, load);
  return load;
}

export function cacheWalrusObjectUrl(mediaId: string, url: string) {
  const trimmed = mediaId.trim();
  if (!trimmed || objectUrlCache.has(trimmed)) return;
  objectUrlCache.set(trimmed, url);
}
