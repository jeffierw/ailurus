import { parseSealObjectId } from './sealStorage';

/** Comma-separated Walrus media ids (Sui object ids or blob ids) stored in sealObjectId for albums. */
export function parseStoredMediaIds(sealObjectId: string): string[] {
  return parseSealObjectId(sealObjectId).mediaIds;
}

export function primaryPostMediaId(sealObjectId: string, walrusBlobId: string) {
  const ids = parseStoredMediaIds(sealObjectId);
  if (ids.length > 0) return ids[0];
  return walrusBlobId.trim();
}

/** @deprecated Use parseStoredMediaIds */
export const parseStoredPatchIds = parseStoredMediaIds;
