import { SessionKey, EncryptedObject } from '@mysten/seal';
import { fromHex } from '@mysten/bcs';
import { Transaction } from '@mysten/sui/transactions';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { AILURUS_CONFIG, getSealPackageId } from '../sui/config';
import type { InlineSealMeta } from '../lib/sealStorage';
import { bytesToMediaUrl } from '../lib/mediaUrl';
import { getSealClient, getSealThreshold, hasSealConfig } from './sealClient';
import { fetchWalrusMediaFromAggregator, loadWalrusTagsFromSdk } from './walrusMediaLoader';

const SESSION_STORAGE_PREFIX = 'ailurus:seal-session:';
const sealSessionStore = new Map<string, SessionKey>();

type SignPersonalMessage = (message: Uint8Array) => Promise<{ signature: string }>;

export type { InlineSealMeta };

function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

function sessionStorageKey(address: string, packageId: string) {
  return `${SESSION_STORAGE_PREFIX}${normalizeAddress(address)}:${packageId}`;
}

function clearStoredSessionKey(address: string, packageId: string) {
  sealSessionStore.delete(sessionStorageKey(address, packageId));
}

/** zkLogin reconnects with a new ephemeral key — stale Seal sessions must not be reused. */
export function clearAllSealSessionKeys() {
  sealSessionStore.clear();
}

function isSessionAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /session|personal message|signature|not signed in|unauthorized|forbidden|401|403/i.test(
    message,
  );
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

/** Seal inner id must be hex — @mysten/seal calls fromHex() on it. */
export function createSealKeyId(_creatorAddress: string) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function wrapDekWithSeal(options: {
  client: SuiGrpcClient;
  sealKeyId: string;
  dek: Uint8Array;
}) {
  const seal = getSealClient(options.client);
  const packageId = getSealPackageId();
  if (!packageId) throw new Error('Seal package ID is not configured');
  const threshold = getSealThreshold();
  const { encryptedObject } = await seal.encrypt({
    threshold,
    packageId,
    id: options.sealKeyId,
    data: new Uint8Array(options.dek),
  });
  return toBase64(encryptedObject);
}

async function getOrCreateSessionKey(options: {
  client: SuiGrpcClient;
  address: string;
  packageId: string;
  signPersonalMessage: SignPersonalMessage;
  forceNew?: boolean;
}) {
  const packageId = options.packageId;
  const address = normalizeAddress(options.address);
  const storageKey = sessionStorageKey(address, packageId);

  if (!options.forceNew) {
    const cached = sealSessionStore.get(storageKey);
    if (cached) {
      try {
        if (!cached.isExpired()) return cached;
      } catch {
        sealSessionStore.delete(storageKey);
      }
    }
  } else {
    sealSessionStore.delete(storageKey);
  }

  const session = await SessionKey.create({
    address,
    packageId,
    ttlMin: 30,
    suiClient: options.client,
  });
  const { signature } = await options.signPersonalMessage(session.getPersonalMessage());
  await session.setPersonalMessageSignature(signature);
  sealSessionStore.set(storageKey, session);
  return session;
}

function rethrowSealError(error: unknown): never {
  if (error === undefined || error === null) {
    throw new Error('Seal key servers did not return enough decryption shares');
  }
  throw error;
}

function buildSealApproveTxBytes(options: {
  client: SuiGrpcClient;
  packageId: string;
  fanAddress: string;
  creatorAddress: string;
  wrappedDek: string;
}) {
  const packageId = options.packageId;
  const platformId = AILURUS_CONFIG.platformId!;
  const fanAddress = normalizeAddress(options.fanAddress);
  const creatorAddress = normalizeAddress(options.creatorAddress);
  const sealKeyId = EncryptedObject.parse(fromBase64(options.wrappedDek)).id;
  const tx = new Transaction();
  tx.setSender(fanAddress);
  tx.moveCall({
    target: `${packageId}::platform::seal_approve`,
    arguments: [
      tx.pure.vector('u8', Array.from(fromHex(sealKeyId))),
      tx.object(platformId),
      tx.pure.address(fanAddress),
      tx.pure.address(creatorAddress),
      tx.object.clock(),
    ],
  });
  return tx.build({ client: options.client, onlyTransactionKind: true });
}

async function decryptAesGcm(ciphertext: Uint8Array, iv: Uint8Array, dek: Uint8Array) {
  const keyMaterial = new Uint8Array(dek);
  const ivBytes = new Uint8Array(iv);
  const cipherBytes = new Uint8Array(ciphertext);
  const key = await crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, cipherBytes);
  return new Uint8Array(plaintext);
}

async function resolveEncryptionTags(options: {
  client: SuiGrpcClient;
  walrusObjectId: string;
  inlineMeta?: InlineSealMeta;
  aggregatorTags: Record<string, string>;
}) {
  if (options.inlineMeta) {
    return {
      sealKeyId: options.inlineMeta.sealKeyId,
      wrappedDek: options.inlineMeta.wrappedDek,
      ivBase64: options.inlineMeta.iv,
      contentType: options.inlineMeta.originalContentType ?? 'image/jpeg',
    };
  }

  const encryption = options.aggregatorTags['ailurus-encryption'] ?? 'none';
  if (encryption === 'none') {
    return null;
  }

  let sealKeyId = options.aggregatorTags['ailurus-seal-id'];
  let wrappedDek = options.aggregatorTags['ailurus-wrapped-dek'];
  let ivBase64 = options.aggregatorTags['ailurus-iv'];
  let contentType =
    options.aggregatorTags['ailurus-original-content-type'] ??
    options.aggregatorTags['content-type'] ??
    'image/jpeg';

  if (!sealKeyId || !wrappedDek || !ivBase64) {
    const sdkTags = await loadWalrusTagsFromSdk(options.client, options.walrusObjectId);
    sealKeyId = sdkTags['ailurus-seal-id'];
    wrappedDek = sdkTags['ailurus-wrapped-dek'];
    ivBase64 = sdkTags['ailurus-iv'];
    contentType = sdkTags['ailurus-original-content-type'] ?? contentType;
  }

  if (!sealKeyId || !wrappedDek || !ivBase64) {
    throw new Error('Encrypted media is missing Seal metadata');
  }

  return { sealKeyId, wrappedDek, ivBase64, contentType };
}

async function unwrapDekWithSeal(options: {
  client: SuiGrpcClient;
  viewerAddress: string;
  creatorAddress: string;
  sealKeyId: string;
  wrappedDek: string;
  sealPackageId: string;
  signPersonalMessage: SignPersonalMessage;
}) {
  const packageId = options.sealPackageId;
  const viewerAddress = normalizeAddress(options.viewerAddress);
  const creatorAddress = normalizeAddress(options.creatorAddress);
  const seal = getSealClient(options.client);

  const attempt = async (forceNewSession: boolean) => {
    const session = await getOrCreateSessionKey({
      client: options.client,
      address: viewerAddress,
      packageId,
      signPersonalMessage: options.signPersonalMessage,
      forceNew: forceNewSession,
    });
    const txBytes = await buildSealApproveTxBytes({
      client: options.client,
      packageId,
      fanAddress: viewerAddress,
      creatorAddress,
      wrappedDek: options.wrappedDek,
    });
    return seal.decrypt({
      data: fromBase64(options.wrappedDek),
      sessionKey: session,
      txBytes,
    });
  };

  try {
    return await attempt(false);
  } catch (error) {
    if (!isSessionAuthError(error)) rethrowSealError(error);
    clearStoredSessionKey(viewerAddress, packageId);
    try {
      return await attempt(true);
    } catch (retryError) {
      rethrowSealError(retryError);
    }
  }
}

function resolveSealPackageId(inlineMeta?: InlineSealMeta) {
  return inlineMeta?.sealPackageId ?? getSealPackageId();
}

export async function decryptWalrusMedia(options: {
  client: SuiGrpcClient;
  walrusObjectId: string;
  creatorAddress: string;
  viewerAddress: string;
  signPersonalMessage: SignPersonalMessage;
  inlineMeta?: InlineSealMeta;
}) {
  const { bytes: ciphertext, tags } = await fetchWalrusMediaFromAggregator(options.walrusObjectId);
  const encryption = tags['ailurus-encryption'] ?? (options.inlineMeta ? 'AES-256-GCM' : 'none');

  if (encryption === 'none' && !options.inlineMeta) {
    const contentType = tags['content-type'] ?? tags['ailurus-original-content-type'] ?? 'image/jpeg';
    return { bytes: ciphertext, contentType };
  }

  if (!hasSealConfig()) {
    throw new Error('Encrypted media requires Seal configuration');
  }

  const resolved = await resolveEncryptionTags({
    client: options.client,
    walrusObjectId: options.walrusObjectId,
    inlineMeta: options.inlineMeta,
    aggregatorTags: tags,
  });
  if (!resolved) {
    const contentType = tags['content-type'] ?? tags['ailurus-original-content-type'] ?? 'image/jpeg';
    return { bytes: ciphertext, contentType };
  }

  const { sealKeyId, wrappedDek, ivBase64, contentType } = resolved;
  const sealPackageId = resolveSealPackageId(options.inlineMeta);
  const dek = await unwrapDekWithSeal({
    client: options.client,
    viewerAddress: options.viewerAddress,
    creatorAddress: options.creatorAddress,
    sealKeyId,
    wrappedDek,
    sealPackageId,
    signPersonalMessage: options.signPersonalMessage,
  });
  const dekBytes = dek instanceof Uint8Array ? dek : new Uint8Array(dek as ArrayBuffer);
  const bytes = await decryptAesGcm(ciphertext, fromBase64(ivBase64), dekBytes);
  return { bytes, contentType };
}

export function bytesToObjectUrl(bytes: Uint8Array, contentType: string) {
  return bytesToMediaUrl(bytes, contentType);
}
