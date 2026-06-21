import { useCurrentAccount, useCurrentClient, useWalletConnection } from '@mysten/dapp-kit-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import type { Post } from '../data/models';
import {
  clearDecryptedMediaCaches,
  getDecryptedInflightCache,
  getDecryptedUrlCache,
} from '../lib/decryptedMediaCache';
import { logAppError, errorMessage } from '../lib/userFacingError';
import { parseSealObjectId, sealMetaForMediaIndex } from '../lib/sealStorage';
import { walrusMediaUrl } from '../lib/walrusMedia';
import { cacheWalrusObjectUrl } from '../services/walrusMediaCache';
import { bytesToObjectUrl, decryptWalrusMedia, type InlineSealMeta } from '../services/sealMedia';
import { useSealPersonalMessageSign } from './useSealPersonalMessageSign';

type MediaState = {
  url: string | null;
  loading: boolean;
  error: string | null;
};

const decryptedUrlCache = getDecryptedUrlCache();
const decryptedInflight = getDecryptedInflightCache();

export { clearDecryptedMediaCaches };

function decryptedCacheKey(mediaId: string, viewerAddress: string, creatorId: string) {
  return `${mediaId}:${viewerAddress.toLowerCase()}:${creatorId.toLowerCase()}`;
}

async function getDecryptedObjectUrl(options: {
  client: SuiGrpcClient;
  mediaId: string;
  creatorId: string;
  viewerAddress: string;
  inlineMeta?: InlineSealMeta;
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
    inlineMeta: options.inlineMeta,
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
    canDecrypt?: boolean;
  },
) {
  const client = useCurrentClient();
  const account = useCurrentAccount();
  const walletConnection = useWalletConnection();
  const signPersonalMessage = useSealPersonalMessageSign();
  const clientRef = useRef(client);
  const signRef = useRef(signPersonalMessage);
  clientRef.current = client;
  signRef.current = signPersonalMessage;

  const parsedSeal = useMemo(() => parseSealObjectId(post.sealObjectId), [post.sealObjectId]);
  const mediaId = parsedSeal.mediaIds[0] ?? post.walrusBlobId.trim();
  const inlineMeta = useMemo(
    () => sealMetaForMediaIndex(parsedSeal.meta, 0, mediaId),
    [parsedSeal.meta, mediaId],
  );

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

    if (!options.canDecrypt) {
      setState({ url: null, loading: false, error: null });
      return;
    }

    const viewerAddress = account?.address ?? options.viewerAddress;
    if (!viewerAddress) {
      setState({ url: null, loading: false, error: null });
      return;
    }

    if (!account?.address) {
      const waitingForWallet =
        walletConnection.isConnecting ||
        walletConnection.isReconnecting ||
        (options.canDecrypt && Boolean(viewerAddress));
      setState({ url: null, loading: waitingForWallet, error: null });
      return;
    }

    if (!clientRef.current) {
      setState({ url: null, loading: false, error: 'Wallet client not ready' });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    void getDecryptedObjectUrl({
      client: clientRef.current as SuiGrpcClient,
      mediaId,
      creatorId: post.creatorId,
      viewerAddress,
      inlineMeta,
      signPersonalMessage: (message) => signRef.current(message),
    })
      .then((objectUrl) => {
        if (cancelled) return;
        setState({ url: objectUrl, loading: false, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        logAppError('useDecryptedMedia', error);
        setState({
          url: null,
          loading: false,
          error: errorMessage(error, 'Could not decrypt media'),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    account?.address,
    mediaId,
    inlineMeta,
    options.canDecrypt,
    options.enabled,
    options.viewerAddress,
    post.creatorId,
    post.isLocked,
    walletConnection.isConnecting,
    walletConnection.isReconnecting,
  ]);

  return state;
}
