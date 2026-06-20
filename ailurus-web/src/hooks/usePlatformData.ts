import { useMemo } from 'react';
import { useCurrentClient } from '@mysten/dapp-kit-react';
import { useQuery } from '@tanstack/react-query';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import type { Creator, Post } from '../data/models';
import { normalizeUsername } from '../lib/routes';
import { hasOnChainConfig } from '../sui/config';
import {
  buildAllPosts,
  buildFeedPosts,
  fetchPlatformSnapshot,
  hasActiveSubscription,
  PLATFORM_QUERY_KEY,
  toCreatorModel,
  type OnChainCreator,
  type PlatformSnapshot,
} from '../sui/platform';

export function usePlatformSnapshot() {
  const client = useCurrentClient();
  const enabled = hasOnChainConfig();

  return useQuery({
    queryKey: PLATFORM_QUERY_KEY,
    queryFn: () => fetchPlatformSnapshot(client as SuiGrpcClient),
    enabled,
    staleTime: 30_000,
  });
}

export function usePlatformPosts() {
  const query = usePlatformSnapshot();
  const posts = useMemo(() => (query.data ? buildFeedPosts(query.data) : []), [query.data]);
  return { ...query, posts };
}

export function usePlatformCreators() {
  const query = usePlatformSnapshot();
  const creators = useMemo(
    () => query.data?.creators.map(toCreatorModel) ?? [],
    [query.data],
  );
  return { ...query, creators };
}

export function useCreatorPosts(creatorAddress?: string | null) {
  const query = usePlatformSnapshot();
  const allPosts = useMemo(() => (query.data ? buildAllPosts(query.data) : []), [query.data]);
  const creatorPosts = useMemo(() => {
    if (!creatorAddress) return [];
    const normalizedCreatorAddress = creatorAddress.toLowerCase();
    return allPosts.filter((post) => post.creatorId.toLowerCase() === normalizedCreatorAddress);
  }, [allPosts, creatorAddress]);
  return { ...query, posts: creatorPosts };
}

export function useResolvedCreator(slug?: string | null) {
  const query = usePlatformSnapshot();

  const data = useMemo((): OnChainCreator | null => {
    if (!slug || !query.data) return null;
    const normalized = normalizeUsername(slug);
    const byHandle = query.data.creators.find(
      (creator) => normalizeUsername(creator.handle) === normalized,
    );
    if (byHandle) return byHandle;
    if (/^0x[a-fA-F0-9]{1,64}$/.test(slug)) {
      return (
        query.data.creators.find(
          (creator) => creator.owner.toLowerCase() === slug.toLowerCase(),
        ) ?? null
      );
    }
    return null;
  }, [query.data, slug]);

  return { ...query, data };
}

export function useCreatorModel(slug?: string | null): {
  creator: Creator | null;
  isLoading: boolean;
} {
  const query = useResolvedCreator(slug);
  return {
    creator: query.data ? toCreatorModel(query.data) : null,
    isLoading: query.isLoading,
  };
}

export function useIsSubscribedTo(creatorAddress?: string | null, viewerAddress?: string | null) {
  const { data } = usePlatformSnapshot();
  if (!creatorAddress || !viewerAddress || !data) return false;
  return hasActiveSubscription(data.subscriptions, viewerAddress, creatorAddress);
}

export function usePostById(postId?: string | null): Post | null {
  const query = usePlatformSnapshot();
  if (!postId || !query.data) return null;
  const posts = buildAllPosts(query.data);
  return posts.find((post) => post.id === postId) ?? null;
}

export type { PlatformSnapshot };
