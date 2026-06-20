import { SessionKey, type ExportedSessionKey } from '@mysten/seal';
import { Transaction } from '@mysten/sui/transactions';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { AILURUS_CONFIG } from '../sui/config';
import { getSealClient, getSealThreshold, hasSealConfig } from './sealClient';
import { fetchWalrusMediaFromAggregator } from './walrusMediaLoader';

const SESSION_STORAGE_PREFIX = 'ailurus:seal-session:';

type SignPersonalMessage = (message: Uint8Array) => Promise<{ signature: string }>;

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
  const packageId = AILURUS_CONFIG.packageId!;
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
  signPersonalMessage: SignPersonalMessage;
}) {
  const packageId = AILURUS_CONFIG.packageId!;
  const storageKey = `${SESSION_STORAGE_PREFIX}${options.address.toLowerCase()}:${packageId}`;
  const raw = sessionStorage.getItem(storageKey);
  if (raw) {
    try {
      const session = SessionKey.import(JSON.parse(raw) as ExportedSessionKey, options.client);
      if (!session.isExpired()) return session;
    } catch {
      sessionStorage.removeItem(storageKey);
    }
  }

  const session = await SessionKey.create({
    address: options.address,
    packageId,
    ttlMin: 30,
    suiClient: options.client,
  });
  const { signature } = await options.signPersonalMessage(session.getPersonalMessage());
  await session.setPersonalMessageSignature(signature);
  sessionStorage.setItem(storageKey, JSON.stringify(session.export()));
  return session;
}

function buildSealApproveTxBytes(options: {
  client: SuiGrpcClient;
  fanAddress: string;
  creatorAddress: string;
  sealKeyId: string;
}) {
  const packageId = AILURUS_CONFIG.packageId!;
  const platformId = AILURUS_CONFIG.platformId!;
  const tx = new Transaction();
  tx.moveCall({
    target: `${packageId}::platform::seal_approve`,
    arguments: [
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(options.sealKeyId))),
      tx.object(platformId),
      tx.pure.address(options.fanAddress),
      tx.pure.address(options.creatorAddress),
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

export async function decryptWalrusMedia(options: {
  client: SuiGrpcClient;
  walrusObjectId: string;
  creatorAddress: string;
  viewerAddress: string;
  signPersonalMessage: SignPersonalMessage;
}) {
  const { bytes: ciphertext, tags } = await fetchWalrusMediaFromAggregator(options.walrusObjectId);
  const encryption = tags['ailurus-encryption'] ?? 'none';

  if (encryption === 'none') {
    const contentType = tags['content-type'] ?? tags['ailurus-original-content-type'] ?? 'image/jpeg';
    return { bytes: ciphertext, contentType };
  }

  if (!hasSealConfig()) {
    throw new Error('Encrypted media requires Seal configuration');
  }

  const sealKeyId = tags['ailurus-seal-id'];
  const wrappedDek = tags['ailurus-wrapped-dek'];
  const ivBase64 = tags['ailurus-iv'];
  if (!sealKeyId || !wrappedDek || !ivBase64) {
    throw new Error('Encrypted media is missing Seal metadata');
  }

  const seal = getSealClient(options.client);
  const session = await getOrCreateSessionKey({
    client: options.client,
    address: options.viewerAddress,
    signPersonalMessage: options.signPersonalMessage,
  });
  const txBytes = await buildSealApproveTxBytes({
    client: options.client,
    fanAddress: options.viewerAddress,
    creatorAddress: options.creatorAddress,
    sealKeyId,
  });

  const dek = await seal.decrypt({
    data: fromBase64(wrappedDek),
    sessionKey: session,
    txBytes,
  });
  const bytes = await decryptAesGcm(ciphertext, fromBase64(ivBase64), dek);
  const contentType = tags['ailurus-original-content-type'] ?? tags['content-type'] ?? 'image/jpeg';
  return { bytes, contentType };
}

export function bytesToObjectUrl(bytes: Uint8Array, contentType: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type: contentType });
  return URL.createObjectURL(blob);
}
