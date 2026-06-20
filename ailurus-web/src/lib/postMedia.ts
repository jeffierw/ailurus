/** Comma-separated Walrus media ids (Sui object ids or blob ids) stored in sealObjectId for albums. */
export function parseStoredMediaIds(sealObjectId: string): string[] {
  const trimmed = sealObjectId.trim();
  if (!trimmed) return [];
  if (trimmed.includes(',')) {
    return trimmed.split(',').map((id) => id.trim()).filter(Boolean);
  }
  return [trimmed];
}

export function primaryPostMediaId(sealObjectId: string, walrusBlobId: string) {
  const ids = parseStoredMediaIds(sealObjectId);
  if (ids.length > 0) return ids[0];
  return walrusBlobId.trim();
}

/** @deprecated Use parseStoredMediaIds */
export const parseStoredPatchIds = parseStoredMediaIds;
