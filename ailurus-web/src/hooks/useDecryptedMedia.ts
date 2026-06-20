import { useCurrentClient } from '@mysten/dapp-kit-react';
import { useDAppKit } from '@mysten/dapp-kit-react';
import { useEffect, useRef, useState } from 'react';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import type { Post } from '../data/models';
import { primaryPostMediaId } from '../lib/postMedia';
import { walrusMediaUrl } from '../lib/walrusMedia';
import { cacheWalrusObjectUrl } from '../services/walrusMediaCache';
import { bytesToObjectUrl, decryptWalrusMedia } from '../services/sealMedia';

type MediaState = {
  url: string | null;
  loading: boolean;
  error: string | null;
};

const decryptedUrlCache = new Map<string, string>();
const decryptedInflight = new Map<string, Promise<string>>();

function decryptedCacheKey(mediaId: string, viewerAddress: string, creatorId: string) {
  return `${mediaId}:${viewerAddress.toLowerCase()}:${creatorId.toLowerCase()}`;
}

async function getDecryptedObjectUrl(options: {
  client: SuiGrpcClient;
  mediaId: string;
  creatorId: string;
  viewerAddress: string;
  signPersonalMessage: (message: Uint8Array) => Promise<{ signature: string }>;
}) {
  const cacheKey = decryptedCacheKey(options.mediaId, options.viewerAddress, options.creatorId);
  const cached = decryptedUrlCache.get(cacheKey);
  if (cached) return cached;

  const inflight = decryptedInflight.get(cacheKey);
  if (inflight) return inflight;

  const load = decryptWalrusMedia({
    client: options.client,
    walrusObjectId: options.mediaId,
    creatorAddress: options.creatorId,
    viewerAddress: options.viewerAddress,
    signPersonalMessage: options.signPersonalMessage,
  })
    .then(({ bytes, contentType }) => {
      const url = bytesToObjectUrl(bytes, contentType);
      decryptedUrlCache.set(cacheKey, url);
      cacheWalrusObjectUrl(options.mediaId, url);
      decryptedInflight.delete(cacheKey);
      return url;
    })
    .catch((error) => {
      decryptedInflight.delete(cacheKey);
      throw error;
    });

  decryptedInflight.set(cacheKey, load);
  return load;
}

export function useDecryptedMedia(
  post: Post,
  options: {
    enabled: boolean;
    viewerAddress?: string;
    isOwnPost?: boolean;
  },
) {
  const client = useCurrentClient();
  const dAppKit = useDAppKit();
  const clientRef = useRef(client);
  const dAppKitRef = useRef(dAppKit);
  clientRef.current = client;
  dAppKitRef.current = dAppKit;

  const mediaId = primaryPostMediaId(post.sealObjectId, post.walrusBlobId);

  const [state, setState] = useState<MediaState>(() => {
    if (!options.enabled || !mediaId) {
      return { url: null, loading: false, error: null };
    }
    if (!post.isLocked) {
      return { url: walrusMediaUrl(mediaId), loading: false, error: null };
    }
    return { url: null, loading: true, error: null };
  });

  useEffect(() => {
    if (!options.enabled) {
      setState({ url: null, loading: false, error: null });
      return;
    }

    if (!mediaId) {
      setState({ url: null, loading: false, error: null });
      return;
    }

    let cancelled = false;

    if (!post.isLocked) {
      setState({ url: walrusMediaUrl(mediaId), loading: false, error: null });
      return;
    }

    if (!options.viewerAddress) {
      setState({ url: null, loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    void getDecryptedObjectUrl({
      client: clientRef.current as SuiGrpcClient,
      mediaId,
      creatorId: post.creatorId,
      viewerAddress: options.viewerAddress,
      signPersonalMessage: async (message) => {
        const result = await dAppKitRef.current.signPersonalMessage({ message });
        return { signature: result.signature };
      },
    })
      .then((objectUrl) => {
        if (cancelled) return;
        setState({ url: objectUrl, loading: false, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({
          url: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Could not decrypt media',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [mediaId, options.enabled, options.viewerAddress, post.creatorId, post.isLocked]);

  return state;
}
