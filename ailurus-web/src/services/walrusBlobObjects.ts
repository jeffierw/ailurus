import { blobIdToInt } from '@mysten/walrus';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import type { Post } from '../data/models';
import { GRPC_URLS, type SuiNetwork } from '../sui/config';

const WALRUS_SYSTEM_OBJECTS: Record<SuiNetwork, string> = {
  testnet: '0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af',
  mainnet: '0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2',
};

type WalrusBlobObject = {
  blobObjectId: string;
  walrusBlobId: string;
  endEpoch?: number;
};

export type CreatorWalrusStorageItem = {
  postId: string;
  caption: string;
  walrusBlobId: string;
  blobObjectId: string;
  endEpoch?: number;
};

function createRpcClient(network: SuiNetwork) {
  return new SuiJsonRpcClient({ url: GRPC_URLS[network], network });
}

async function getWalrusBlobType(client: SuiJsonRpcClient, network: SuiNetwork) {
  const system = await client.getObject({
    id: WALRUS_SYSTEM_OBJECTS[network],
    options: { showType: true },
  });
  const systemType = system.data?.type;
  const packageId = systemType?.split('::')[0];
  if (!packageId) throw new Error('Could not resolve Walrus package id');
  return `${packageId}::blob::Blob`;
}

function unwrapFields(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  const object = value as Record<string, unknown>;
  const fields = object.fields;
  return fields && typeof fields === 'object' ? (fields as Record<string, unknown>) : object;
}

function fieldAsString(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return null;
}

function fieldAsNumber(value: unknown) {
  const stringValue = fieldAsString(value);
  if (!stringValue) return undefined;
  const numberValue = Number(stringValue);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function extractBlobIdInt(fields: Record<string, unknown>) {
  return (
    fieldAsString(fields.blob_id) ??
    fieldAsString(fields.blobId) ??
    fieldAsString(fields.id)
  );
}

function extractEndEpoch(fields: Record<string, unknown>) {
  const direct = fieldAsNumber(fields.end_epoch ?? fields.endEpoch);
  if (direct != null) return direct;

  const storageFields = unwrapFields(fields.storage);
  if (!storageFields) return undefined;
  return fieldAsNumber(storageFields.end_epoch ?? storageFields.endEpoch);
}

export async function fetchOwnedWalrusBlobObjects(
  owner: string,
  network: SuiNetwork,
): Promise<WalrusBlobObject[]> {
  const client = createRpcClient(network);
  const blobType = await getWalrusBlobType(client, network);
  const blobs: WalrusBlobObject[] = [];
  let cursor: string | null | undefined;

  do {
    const page = await client.getOwnedObjects({
      owner,
      cursor,
      filter: { StructType: blobType },
      options: { showContent: true, showType: true },
    });

    for (const object of page.data) {
      const content = object.data?.content;
      const fields =
        content && typeof content === 'object' && 'fields' in content
          ? unwrapFields((content as { fields?: unknown }).fields)
          : null;
      const blobIdInt = fields ? extractBlobIdInt(fields) : null;
      const objectId = object.data?.objectId;
      if (!blobIdInt || !objectId) continue;

      if (!fields) continue;

      blobs.push({
        blobObjectId: objectId,
        walrusBlobId: '', // Filled by the post match step.
        endEpoch: extractEndEpoch(fields),
      });
      blobs[blobs.length - 1].walrusBlobId = blobIdInt;
    }

    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);

  return blobs;
}

export async function fetchCreatorWalrusStorageItems(
  owner: string,
  posts: Post[],
  network: SuiNetwork,
): Promise<CreatorWalrusStorageItem[]> {
  const ownedBlobs = await fetchOwnedWalrusBlobObjects(owner, network);
  const objectByBlobId = new Map(ownedBlobs.map((blob) => [blob.walrusBlobId, blob]));
  const itemsByObjectId = new Map<string, CreatorWalrusStorageItem>();

  for (const post of posts) {
    if (!post.walrusBlobId) continue;
    let blobIdInt: string;
    try {
      blobIdInt = blobIdToInt(post.walrusBlobId).toString();
    } catch {
      continue;
    }

    const blob = objectByBlobId.get(blobIdInt);
    if (!blob || itemsByObjectId.has(blob.blobObjectId)) continue;

    itemsByObjectId.set(blob.blobObjectId, {
      postId: post.id,
      caption: post.caption,
      walrusBlobId: post.walrusBlobId,
      blobObjectId: blob.blobObjectId,
      endEpoch: blob.endEpoch,
    });
  }

  return [...itemsByObjectId.values()];
}
