import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { bytesToString, unwrapMoveFields } from '../lib/format';
import { normalizeUsername } from '../lib/routes';
import { AILURUS_CONFIG } from './config';
import { findCreatorByHandle, type OnChainCreator } from './platform';

export type OnChainFan = {
  owner: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarWalrusId: string;
};

type FanFields = {
  owner: string;
  handle: string;
  display_name: string;
  bio: string;
  avatar_walrus_id: number[] | string;
};

type FanJson = {
  fields?: Partial<FanFields>;
};

type ProfileRegistryJson = {
  fans?: FanJson[];
  fields?: {
    fans?: FanJson[];
  };
};

function parseFan(raw: unknown): OnChainFan | null {
  const fields = unwrapMoveFields<FanFields>(raw);
  if (!fields || typeof fields.owner !== 'string' || typeof fields.handle !== 'string') {
    return null;
  }
  return {
    owner: fields.owner,
    handle: fields.handle,
    displayName: fields.display_name ?? fields.handle,
    bio: fields.bio ?? '',
    avatarWalrusId: bytesToString(fields.avatar_walrus_id ?? ''),
  };
}

export async function fetchProfileRegistryFans(client: SuiGrpcClient): Promise<OnChainFan[]> {
  const registryId = AILURUS_CONFIG.profileRegistryId;
  if (!registryId) return [];

  const obj = await client.getObject({ objectId: registryId, include: { json: true } });
  const json = obj.object?.json as ProfileRegistryJson | null | undefined;
  const root = json?.fields ?? json;
  return (root?.fans ?? []).map(parseFan).filter((fan): fan is OnChainFan => fan !== null);
}

export async function findFanByAddress(
  client: SuiGrpcClient,
  address: string,
): Promise<OnChainFan | null> {
  const fans = await fetchProfileRegistryFans(client);
  return fans.find((fan) => fan.owner.toLowerCase() === address.toLowerCase()) ?? null;
}

export async function findFanByHandle(
  client: SuiGrpcClient,
  handle: string,
): Promise<OnChainFan | null> {
  const normalized = normalizeUsername(handle);
  const fans = await fetchProfileRegistryFans(client);
  return fans.find((fan) => normalizeUsername(fan.handle) === normalized) ?? null;
}

export async function isHandleTakenOnChain(
  client: SuiGrpcClient,
  handle: string,
  currentAddress?: string,
): Promise<boolean> {
  const normalized = normalizeUsername(handle);
  const [creator, fan] = await Promise.all([
    findCreatorByHandle(client, normalized),
    findFanByHandle(client, normalized),
  ]);
  if (creator && currentAddress && creator.owner.toLowerCase() === currentAddress.toLowerCase()) {
    return false;
  }
  if (fan && currentAddress && fan.owner.toLowerCase() === currentAddress.toLowerCase()) {
    return false;
  }
  return Boolean(creator || fan);
}

export async function resolveSlugToAddress(
  client: SuiGrpcClient,
  slug: string,
): Promise<{ address: string; creator: OnChainCreator | null; fan: OnChainFan | null } | null> {
  const normalized = normalizeUsername(slug);
  const [creator, fan] = await Promise.all([
    findCreatorByHandle(client, normalized),
    findFanByHandle(client, normalized),
  ]);
  if (creator) return { address: creator.owner, creator, fan: null };
  if (fan) return { address: fan.owner, creator: null, fan };
  return null;
}

export const PROFILE_REGISTRY_QUERY_KEY = ['ailurus', 'profile-registry'] as const;
