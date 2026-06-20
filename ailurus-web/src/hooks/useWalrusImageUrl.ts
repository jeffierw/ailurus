import { useCurrentClient } from '@mysten/dapp-kit-react';
import { useEffect, useRef, useState } from 'react';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { walrusMediaUrl } from '../lib/walrusMedia';
import { getWalrusObjectUrl } from '../services/walrusMediaCache';

export function useWalrusImageUrl(mediaId?: string | null, fallbackUrl = '') {
  const client = useCurrentClient();
  const clientRef = useRef(client);
  clientRef.current = client;

  const [url, setUrl] = useState<string | null>(() => {
    if (!mediaId) return null;
    return walrusMediaUrl(mediaId);
  });

  useEffect(() => {
    if (!mediaId) {
      setUrl(null);
      return;
    }

    const directUrl = walrusMediaUrl(mediaId);
    if (directUrl) {
      setUrl(directUrl);
      return;
    }

    let cancelled = false;
    void getWalrusObjectUrl(clientRef.current as SuiGrpcClient, mediaId)
      .then((objectUrl) => {
        if (!cancelled) setUrl(objectUrl);
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
