import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { AILURUS_CONFIG } from './config';

type BcsBytes = Record<string, number> | Uint8Array;

function decodeBcsBytes(bcs: BcsBytes | undefined): Uint8Array | null {
  if (!bcs) return null;
  if (bcs instanceof Uint8Array) return bcs;
  if (typeof bcs !== 'object') return null;
  const bytes = Object.keys(bcs)
    .map(Number)
    .sort((left, right) => left - right)
    .map((index) => bcs[String(index)]);
  return bytes.length > 0 ? new Uint8Array(bytes) : null;
}

function ownerFromCreatorAvatarKeyBcs(bcs: BcsBytes | undefined): string | null {
  const bytes = decodeBcsBytes(bcs);
  if (!bytes) return null;

  // gRPC returns raw 32-byte addresses; some encodings prefix a variant byte.
  const addressBytes =
    bytes.length === 32 ? bytes : bytes.length >= 33 ? bytes.slice(1, 33) : null;
  if (!addressBytes) return null;

  return `0x${Array.from(addressBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function avatarIdFromValueBcs(bcs: BcsBytes | undefined): string {
  const bytes = decodeBcsBytes(bcs);
  if (!bytes || bytes.length === 0) return '';
  return new TextDecoder().decode(bytes);
}

function normalizeSuiAddress(address: string) {
  const hex = address.slice(2).toLowerCase();
  return `0x${hex.padStart(64, '0')}`;
}

function isCreatorAvatarField(type: string | undefined) {
  return Boolean(type?.includes('::platform::CreatorAvatarKey'));
}

type DynamicFieldWithValue = {
  name?: { type?: string; bcs?: Uint8Array };
  value?: { type?: string; bcs?: Uint8Array };
};

/** Reads creator avatar Walrus IDs stored as platform dynamic fields. */
export async function fetchCreatorAvatarMap(client: SuiGrpcClient): Promise<Record<string, string>> {
  const platformId = AILURUS_CONFIG.platformId;
  if (!platformId) return {};

  const avatars: Record<string, string> = {};
  let cursor: string | null = null;

  for (;;) {
    const page: Awaited<ReturnType<SuiGrpcClient['listDynamicFields']>> = await client.listDynamicFields({
      parentId: platformId,
      cursor: cursor ?? undefined,
      include: { value: true },
    });

    for (const rawField of page.dynamicFields) {
      const field = rawField as DynamicFieldWithValue;
      if (!isCreatorAvatarField(field.name?.type)) continue;

      const owner = ownerFromCreatorAvatarKeyBcs(field.name?.bcs);
      const avatarId = avatarIdFromValueBcs(field.value?.bcs);
      if (!owner || !avatarId) continue;
      avatars[normalizeSuiAddress(owner)] = avatarId;
    }

    if (!page.hasNextPage || !page.cursor) break;
    cursor = page.cursor;
  }

  return avatars;
}
