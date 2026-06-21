import { useEffect, useState } from 'react';
import { walrusMediaUrl } from '../lib/walrusMedia';
import { resolveWalrusImageUrl } from '../services/walrusMediaLoader';

export function useWalrusImageUrl(mediaId?: string | null, fallbackUrl = '') {
  const [url, setUrl] = useState<string | null>(() => {
    if (!mediaId) return null;
    return walrusMediaUrl(mediaId);
  });

  useEffect(() => {
    if (!mediaId) {
      setUrl(null);
      return;
    }

    let cancelled = false;

    void resolveWalrusImageUrl(mediaId)
      .then((resolvedUrl) => {
        if (!cancelled) setUrl(resolvedUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  if (!mediaId) return fallbackUrl;
  return url ?? fallbackUrl;
}
