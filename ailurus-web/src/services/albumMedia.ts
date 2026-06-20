import { walrusMediaUrl } from '../lib/walrusMedia';
import { parseStoredMediaIds } from '../lib/postMedia';

export type AlbumMediaRef = {
  mediaId: string;
  /** Aggregator URL — one HTTP request per slide */
  mediaKey: string;
  identifier: string;
  contentType: string;
};

export function parseAlbumMediaIds(walrusBlobId: string, sealObjectId: string): string[] {
  const fromSeal = parseStoredMediaIds(sealObjectId);
  if (fromSeal.length > 0) return fromSeal;
  const blobId = walrusBlobId.trim();
  return blobId ? [blobId] : [];
}

/** Build album slides from on-chain media ids — no Walrus SDK / quilt index reads. */
export function listAlbumMedia(walrusBlobId: string, sealObjectId: string): AlbumMediaRef[] {
  return parseAlbumMediaIds(walrusBlobId, sealObjectId).map((mediaId, index) => ({
    mediaId,
    mediaKey: walrusMediaUrl(mediaId) ?? mediaId,
    identifier: `item-${index + 1}`,
    contentType: 'image/jpeg',
  }));
}
