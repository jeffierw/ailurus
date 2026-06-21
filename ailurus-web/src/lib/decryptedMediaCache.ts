const decryptedUrlCache = new Map<string, string>();
const decryptedInflight = new Map<string, Promise<string>>();

export function getDecryptedUrlCache() {
  return decryptedUrlCache;
}

export function getDecryptedInflightCache() {
  return decryptedInflight;
}

/** Drop in-memory decrypted media URLs after logout or wallet switch. */
export function clearDecryptedMediaCaches() {
  decryptedUrlCache.clear();
  decryptedInflight.clear();
}
