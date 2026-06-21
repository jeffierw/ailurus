import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import type { Post } from '../data/models';
import { listAlbumMedia, type AlbumMediaRef } from '../services/albumMedia';
import { parseSealObjectId, sealMetaForMediaIndex } from '../lib/sealStorage';
import { cacheWalrusObjectUrl } from '../services/walrusMediaCache';
import { bytesToObjectUrl, decryptWalrusMedia } from '../services/sealMedia';
import { useSealPersonalMessageSign } from './useSealPersonalMessageSign';

export type AlbumSlide = AlbumMediaRef & {
  url: string | null;
  loading: boolean;
  error: string | null;
};

type AlbumState = {
  slides: AlbumSlide[];
  loading: boolean;
  error: string | null;
};

import { getDecryptedInflightCache, getDecryptedUrlCache } from '../lib/decryptedMediaCache';

const decryptedUrlCache = getDecryptedUrlCache();
const decryptedInflight = getDecryptedInflightCache();

function slideCacheKey(mediaId: string, viewerAddress: string, creatorId: string) {
  return `${mediaId}:${viewerAddress.toLowerCase()}:${creatorId.toLowerCase()}`;
}

async function resolveSlideUrl(options: {
  client: SuiGrpcClient;
  slide: AlbumMediaRef;
  post: Post;
  slideIndex: number;
  viewerAddress?: string;
  signPersonalMessage: (message: Uint8Array) => Promise<{ signature: string }>;
}) {
  const { slide, post } = options;

  if (!post.isLocked) {
    return slide.mediaKey;
  }

  const viewerAddress = options.viewerAddress;
  if (!viewerAddress) throw new Error('Sign in to view encrypted media');

  const cacheKey = slideCacheKey(slide.mediaId, viewerAddress, post.creatorId);
  const cached = decryptedUrlCache.get(cacheKey);
  if (cached) return cached;

  const inflight = decryptedInflight.get(cacheKey);
  if (inflight) return inflight;

  const parsedSeal = parseSealObjectId(post.sealObjectId);
  const inlineMeta = sealMetaForMediaIndex(parsedSeal.meta, options.slideIndex, slide.mediaId);

  const load = decryptWalrusMedia({
    client: options.client,
    walrusObjectId: slide.mediaId,
    creatorAddress: post.creatorId,
    viewerAddress,
    inlineMeta,
    signPersonalMessage: options.signPersonalMessage,
  })
    .then(({ bytes, contentType }) => {
      const url = bytesToObjectUrl(bytes, contentType);
      decryptedUrlCache.set(cacheKey, url);
      cacheWalrusObjectUrl(slide.mediaId, url);
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

export function useAlbumMedia(
  post: Post,
  options: {
    enabled: boolean;
    viewerAddress?: string;
    canDecrypt?: boolean;
  },
) {
  const client = useCurrentClient();
  const account = useCurrentAccount();
  const signPersonalMessage = useSealPersonalMessageSign();
  const clientRef = useRef(client);
  const signRef = useRef(signPersonalMessage);
  clientRef.current = client;
  signRef.current = signPersonalMessage;

  const albumKey = `${post.walrusBlobId}:${post.sealObjectId}`;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [state, setState] = useState<AlbumState>({
    slides: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    setCurrentIndex(0);
  }, [albumKey]);

  useEffect(() => {
    if (!options.enabled || post.type !== 'album') {
      setState({ slides: [], loading: false, error: null });
      return;
    }

    const refs = listAlbumMedia(post.walrusBlobId, post.sealObjectId);
    if (refs.length === 0) {
      setState({ slides: [], loading: false, error: 'Album is empty' });
      return;
    }

    setState({
      slides: refs.map((ref) => ({
        ...ref,
        url: null,
        loading: false,
        error: null,
      })),
      loading: false,
      error: null,
    });
  }, [albumKey, options.enabled, post.sealObjectId, post.type, post.walrusBlobId]);

  const loadSlide = useCallback(
    async (index: number) => {
      const slide = state.slides[index];
      if (!slide || slide.url || slide.loading) return;

      if (post.isLocked && !options.canDecrypt) return;

      const viewerAddress = account?.address ?? options.viewerAddress;
      if (post.isLocked && !viewerAddress) return;
      if (post.isLocked && !account?.address) return;

      setState((prev) => ({
        ...prev,
        slides: prev.slides.map((item, itemIndex) =>
          itemIndex === index ? { ...item, loading: true, error: null } : item,
        ),
      }));

      try {
        const url = await resolveSlideUrl({
          client: clientRef.current as SuiGrpcClient,
          slide,
          post,
          slideIndex: index,
          viewerAddress,
          signPersonalMessage: (message) => signRef.current(message),
        });
        setState((prev) => ({
          ...prev,
          slides: prev.slides.map((item, itemIndex) =>
            itemIndex === index ? { ...item, url, loading: false, error: null } : item,
          ),
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          slides: prev.slides.map((item, itemIndex) =>
            itemIndex === index
              ? {
                  ...item,
                  loading: false,
                  error: error instanceof Error ? error.message : 'Could not load media',
                }
              : item,
          ),
        }));
      }
    },
    [account?.address, options.canDecrypt, options.viewerAddress, post, state.slides],
  );

  useEffect(() => {
    if (!options.enabled || state.slides.length === 0) return;
    void loadSlide(currentIndex);
    if (currentIndex > 0) void loadSlide(currentIndex - 1);
    if (currentIndex < state.slides.length - 1) void loadSlide(currentIndex + 1);
  }, [currentIndex, loadSlide, options.enabled, state.slides.length]);

  const goTo = useCallback(
    (index: number) => {
      if (state.slides.length === 0) return;
      const next = Math.max(0, Math.min(state.slides.length - 1, index));
      setCurrentIndex(next);
    },
    [state.slides.length],
  );

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  return {
    slides: state.slides,
    currentIndex,
    currentSlide: state.slides[currentIndex] ?? null,
    total: state.slides.length,
    loading: state.loading,
    error: state.error,
    goNext,
    goPrev,
    goTo,
    hasMultiple: state.slides.length > 1,
  };
}
