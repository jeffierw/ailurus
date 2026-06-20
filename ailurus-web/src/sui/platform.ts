import type { SuiGrpcClient } from '@mysten/sui/grpc';
import type { Creator, Post, PostContentType } from '../data/models';
import { bytesToString, creatorAvatar, formatRelativeTime, gradientForSeed, unwrapMoveFields } from '../lib/format';
import { loadProfile } from '../lib/profileStorage';
import { normalizeUsername } from '../lib/routes';
import { AILURUS_CONFIG } from './config';

export type OnChainCreator = {
  owner: string;
  name: string;
  handle: string;
  bio: string;
  priceMicros: bigint;
  subscriberCount: number;
  postCount: number;
  incomeMicros: bigint;
};

export type OnChainPost = {
  id: number;
  creator: string;
  caption: string;
  contentType: PostContentType;
  walrusBlobId: string;
  sealObjectId: string;
  isLocked: boolean;
  createdAtMs: number;
};

export type OnChainSubscription = {
  fan: string;
  creator: string;
  startedAtMs: number;
  expiresAtMs: number;
  paidMicros: bigint;
};

export type PlatformSnapshot = {
  creators: OnChainCreator[];
  posts: OnChainPost[];
  subscriptions: OnChainSubscription[];
};

type CreatorFields = {
  owner: string;
  name: string;
  handle: string;
  bio: string;
  price_micros: string;
  seal_policy_id: number[];
  subscriber_count: string;
  post_count: string;
  income_micros: string;
};

type PostFields = {
  id: string | number;
  creator: string;
  caption: string;
  content_type: string | number;
  walrus_blob_id: number[] | string;
  seal_object_id: number[] | string;
  is_locked: boolean;
  created_at_ms: string | number;
};

type SubscriptionFields = {
  fan: string;
  creator: string;
  started_at_ms: string | number;
  expires_at_ms: string | number;
  paid_micros: string;
};

type CreatorJson = {
  fields?: Partial<CreatorFields>;
};

type PostJson = {
  fields?: Partial<PostFields>;
};

type SubscriptionJson = {
  fields?: Partial<SubscriptionFields>;
};

type PlatformJson = {
  creators?: CreatorJson[];
  posts?: PostJson[];
  subscriptions?: SubscriptionJson[];
  fields?: {
    creators?: CreatorJson[];
    posts?: PostJson[];
    subscriptions?: SubscriptionJson[];
  };
};

function parseCreator(raw: unknown): OnChainCreator | null {
  const fields = unwrapMoveFields<CreatorFields>(raw);
  if (!fields || !isCreatorFields(fields)) return null;

  return {
    owner: fields.owner,
    name: fields.name,
    handle: fields.handle,
    bio: fields.bio,
    priceMicros: BigInt(fields.price_micros),
    subscriberCount: Number(fields.subscriber_count),
    postCount: Number(fields.post_count),
    incomeMicros: BigInt(fields.income_micros),
  };
}

function parsePost(raw: unknown): OnChainPost | null {
  const fields = unwrapMoveFields<PostFields>(raw);
  if (!fields || !isPostFields(fields)) return null;

  return {
    id: Number(fields.id),
    creator: fields.creator,
    caption: fields.caption,
    contentType: contentTypeFromMove(Number(fields.content_type)),
    walrusBlobId: bytesToString(fields.walrus_blob_id),
    sealObjectId: bytesToString(fields.seal_object_id),
    isLocked: fields.is_locked,
    createdAtMs: Number(fields.created_at_ms),
  };
}

function parseSubscription(raw: unknown): OnChainSubscription | null {
  const fields = unwrapMoveFields<SubscriptionFields>(raw);
  if (!fields || !isSubscriptionFields(fields)) return null;

  return {
    fan: fields.fan,
    creator: fields.creator,
    startedAtMs: Number(fields.started_at_ms),
    expiresAtMs: Number(fields.expires_at_ms),
    paidMicros: BigInt(fields.paid_micros),
  };
}

function isCreatorFields(value: unknown): value is CreatorFields {
  if (!value || typeof value !== 'object') return false;
  const fields = value as Partial<CreatorFields>;
  return (
    typeof fields.owner === 'string' &&
    typeof fields.name === 'string' &&
    typeof fields.handle === 'string' &&
    typeof fields.bio === 'string' &&
    typeof fields.price_micros === 'string' &&
    typeof fields.subscriber_count === 'string' &&
    typeof fields.post_count === 'string' &&
    typeof fields.income_micros === 'string'
  );
}

function isPostFields(value: unknown): value is PostFields {
  if (!value || typeof value !== 'object') return false;
  const fields = value as Partial<PostFields>;
  return (
    (typeof fields.id === 'string' || typeof fields.id === 'number') &&
    typeof fields.creator === 'string' &&
    typeof fields.caption === 'string' &&
    (typeof fields.content_type === 'string' || typeof fields.content_type === 'number') &&
    (typeof fields.walrus_blob_id === 'string' || Array.isArray(fields.walrus_blob_id)) &&
    (typeof fields.seal_object_id === 'string' || Array.isArray(fields.seal_object_id)) &&
    typeof fields.is_locked === 'boolean' &&
    (typeof fields.created_at_ms === 'string' || typeof fields.created_at_ms === 'number')
  );
}

function isSubscriptionFields(value: unknown): value is SubscriptionFields {
  if (!value || typeof value !== 'object') return false;
  const fields = value as Partial<SubscriptionFields>;
  return (
    typeof fields.fan === 'string' &&
    typeof fields.creator === 'string' &&
    (typeof fields.started_at_ms === 'string' || typeof fields.started_at_ms === 'number') &&
    (typeof fields.expires_at_ms === 'string' || typeof fields.expires_at_ms === 'number') &&
    typeof fields.paid_micros === 'string'
  );
}

function contentTypeFromMove(value: number): PostContentType {
  if (value === 1) return 'album';
  if (value === 2) return 'video';
  return 'photo';
}

export async function fetchPlatformSnapshot(client: SuiGrpcClient): Promise<PlatformSnapshot> {
  const platformId = AILURUS_CONFIG.platformId;
  if (!platformId) {
    return { creators: [], posts: [], subscriptions: [] };
  }

  const obj = await client.getObject({
    objectId: platformId,
    include: { json: true },
  });

  const json = obj.object?.json as PlatformJson | null | undefined;
  const root = json?.fields ?? json;

  const creators = (root?.creators ?? []).map(parseCreator).filter((c): c is OnChainCreator => c !== null);
  const posts = (root?.posts ?? [])
    .map(parsePost)
    .filter((post): post is OnChainPost => post !== null)
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
  const subscriptions = (root?.subscriptions ?? [])
    .map(parseSubscription)
    .filter((sub): sub is OnChainSubscription => sub !== null);

  return { creators, posts, subscriptions };
}

export async function fetchPlatformCreators(client: SuiGrpcClient): Promise<OnChainCreator[]> {
  const snapshot = await fetchPlatformSnapshot(client);
  return snapshot.creators;
}

export async function findCreatorByAddress(
  client: SuiGrpcClient,
  address: string,
): Promise<OnChainCreator | null> {
  const creators = await fetchPlatformCreators(client);
  return creators.find((c) => c.owner.toLowerCase() === address.toLowerCase()) ?? null;
}

export async function findCreatorByHandle(
  client: SuiGrpcClient,
  handle: string,
): Promise<OnChainCreator | null> {
  const normalized = normalizeUsername(handle);
  const creators = await fetchPlatformCreators(client);
  return creators.find((c) => normalizeUsername(c.handle) === normalized) ?? null;
}

export function microsToUsdc(micros: bigint) {
  return Number(micros) / 1_000_000;
}

export function toCreatorModel(onChain: OnChainCreator): Creator {
  const profile = loadProfile(onChain.owner);
  return {
    id: onChain.owner,
    address: onChain.owner,
    name: profile.displayName ?? onChain.name,
    handle: onChain.handle.startsWith('@') ? onChain.handle : `@${onChain.handle}`,
    avatar: creatorAvatar(onChain.owner),
    avatarWalrusId: profile.avatarWalrusId,
    bio: profile.bio ?? onChain.bio,
    subscribers: onChain.subscriberCount,
    posts: onChain.postCount,
    priceUsdc: microsToUsdc(onChain.priceMicros),
    verified: true,
  };
}

export function toPostModel(onChain: OnChainPost, creator: Creator): Post {
  const mediaSeed = onChain.walrusBlobId || onChain.sealObjectId || String(onChain.id);
  return {
    id: String(onChain.id),
    creatorId: creator.id,
    creator,
    caption: onChain.caption,
    imageUrl: gradientForSeed(mediaSeed),
    walrusBlobId: onChain.walrusBlobId,
    sealObjectId: onChain.sealObjectId,
    likes: 0,
    comments: 0,
    isLocked: onChain.isLocked,
    type: onChain.contentType,
    createdAt: formatRelativeTime(onChain.createdAtMs),
    createdAtMs: onChain.createdAtMs,
  };
}

export function buildFeedPosts(snapshot: PlatformSnapshot): Post[] {
  return buildAllPosts(snapshot).filter((post) => !post.isLocked);
}

export function buildAllPosts(snapshot: PlatformSnapshot): Post[] {
  const creatorByAddress = new Map(
    snapshot.creators.map((creator) => [creator.owner.toLowerCase(), toCreatorModel(creator)]),
  );

  return snapshot.posts.flatMap((post) => {
    const creator = creatorByAddress.get(post.creator.toLowerCase());
    if (!creator) return [];
    return [toPostModel(post, creator)];
  });
}

export function isActiveSubscription(
  subscription: OnChainSubscription,
  fanAddress: string,
  creatorAddress: string,
  nowMs = Date.now(),
) {
  return (
    subscription.fan.toLowerCase() === fanAddress.toLowerCase() &&
    subscription.creator.toLowerCase() === creatorAddress.toLowerCase() &&
    subscription.expiresAtMs > nowMs
  );
}

export function hasActiveSubscription(
  subscriptions: OnChainSubscription[],
  fanAddress: string,
  creatorAddress: string,
  nowMs = Date.now(),
) {
  return subscriptions.some((subscription) =>
    isActiveSubscription(subscription, fanAddress, creatorAddress, nowMs),
  );
}

export const PLATFORM_QUERY_KEY = ['ailurus', 'platform'] as const;
