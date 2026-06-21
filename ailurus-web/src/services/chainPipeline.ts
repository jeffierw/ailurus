import { walrus, WalrusFile } from '@mysten/walrus';
import { UserFacingError } from '../lib/userFacingError';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { AILURUS_CONFIG, hasOnChainConfig, missingConfigKeys, getSealPackageId } from '../sui/config';
import { DEFAULT_WALRUS_EPOCHS, clampEpochs } from '../lib/walrusEpochs';
import { normalizeWalrusStoredMediaId } from '../lib/walrusMedia';
import { encodeSealObjectId, type SealEncryptionMeta } from '../lib/sealStorage';
import { createSealKeyId, wrapDekWithSeal } from './sealMedia';
import { hasSealConfig } from './sealClient';

const TESTNET_RPC_URL = 'https://fullnode.testnet.sui.io:443';
const SUI_COIN_TYPE = '0x2::sui::SUI';
const REQUIRED_WAL_PATTERN =
  /Insufficient balance of .*::wal::WAL for owner .*?\.?\s+Required: ([0-9]+), Available: ([0-9]+)/;
const DEFAULT_CERTIFY_GAS_MIST = 5_000_000n;
const UPLOAD_GAS_BUFFER_MIST = 1_000_000n;
const FALLBACK_REGISTER_GAS_MIST = 20_000_000n;
const MAX_REGISTER_GAS_MIST = 200_000_000n;

export type UploadPipelineInput = {
  fileName: string;
  caption: string;
  contentType: 'photo' | 'album' | 'video';
  estimatedCostUsdc: number;
  encrypted: boolean;
  epochs?: number;
  creatorAddress?: string;
  files: UploadFileInput[];
};

export type UploadFileInput = {
  name: string;
  type: string;
  size: number;
  bytes: Uint8Array;
};

export type UploadPipelineResult = {
  walrusBlobId: string;
  sealObjectId: string;
  sealPolicyId: string;
  epochs: number;
  mode: 'demo' | 'configured' | 'walrus-sdk';
  steps: string[];
};

export const ENCRYPTED_UPLOAD_PROGRESS_STEPS = [
  { id: 'encrypt', label: 'Encrypting with Seal envelope' },
  { id: 'walrus-encode', label: 'Preparing Walrus storage' },
  {
    id: 'walrus-register',
    label: 'Registering on Walrus',
    caption: 'Wallet may prompt to sign a Walrus storage tx.',
  },
  { id: 'walrus-upload', label: 'Uploading slivers through Walrus relay' },
  {
    id: 'walrus-certify',
    label: 'Certifying Walrus blob',
    caption: 'Wallet may prompt to sign a certify tx.',
  },
  {
    id: 'publish',
    label: 'Sign the transaction in your wallet',
    caption: 'Approve the publish post transaction.',
  },
  { id: 'confirm', label: 'Confirming on-chain' },
] as const;

export const PUBLIC_UPLOAD_PROGRESS_STEPS = [
  { id: 'walrus-encode', label: 'Preparing Walrus storage' },
  {
    id: 'walrus-register',
    label: 'Registering on Walrus',
    caption: 'Wallet may prompt to sign a Walrus storage tx.',
  },
  { id: 'walrus-upload', label: 'Uploading slivers through Walrus relay' },
  {
    id: 'walrus-certify',
    label: 'Certifying Walrus blob',
    caption: 'Wallet may prompt to sign a certify tx.',
  },
  {
    id: 'publish',
    label: 'Sign the transaction in your wallet',
    caption: 'Approve the publish post transaction.',
  },
  { id: 'confirm', label: 'Confirming on-chain' },
] as const;

export const EXTEND_STORAGE_PROGRESS_STEPS = [
  { id: 'extend', label: 'Extending Walrus storage' },
  { id: 'sign', label: 'Sign the transaction in your wallet' },
  { id: 'confirm', label: 'Confirming on-chain' },
] as const;

export type UploadProgressStepId =
  | (typeof ENCRYPTED_UPLOAD_PROGRESS_STEPS)[number]['id']
  | (typeof PUBLIC_UPLOAD_PROGRESS_STEPS)[number]['id']
  | (typeof EXTEND_STORAGE_PROGRESS_STEPS)[number]['id'];

export type UploadProgressState = {
  stepIndex: number;
  steps: readonly { id: string; label: string; caption?: string }[];
  detail?: string;
};

export type UploadProgressHandler = (progress: UploadProgressState) => void;

export function uploadProgressSteps(encrypted: boolean) {
  return encrypted ? ENCRYPTED_UPLOAD_PROGRESS_STEPS : PUBLIC_UPLOAD_PROGRESS_STEPS;
}

export function reportUploadProgress(
  onProgress: UploadProgressHandler | undefined,
  steps: UploadProgressState['steps'],
  stepId: string,
  detail?: string,
) {
  const stepIndex = steps.findIndex((step) => step.id === stepId);
  onProgress?.({
    stepIndex: stepIndex < 0 ? 0 : stepIndex,
    steps,
    detail,
  });
}

type WalrusExtendableClient = {
  $extend: (extension: unknown) => {
    walrus: {
      writeFilesFlow: (options: { files: WalrusFile[] }) => {
        encode: () => Promise<unknown>;
        register: (options: { epochs: number; owner: string; deletable: boolean }) => BuildableTransaction;
        upload: (options?: { digest?: string }) => Promise<unknown>;
        certify: () => unknown;
        listFiles: () => Promise<{ id: string; blobId: string; blobObject?: unknown }[]>;
      };
      writeBlobFlow: (options: { blob: Uint8Array }) => {
        encode: () => Promise<unknown>;
        register: (options: {
          epochs: number;
          owner: string;
          deletable: boolean;
          attributes?: Record<string, string>;
        }) => BuildableTransaction;
        upload: (options?: { digest?: string }) => Promise<unknown>;
        certify: () => unknown;
        getBlob: () => Promise<{ blobId: string; blobObjectId: string }>;
      };
      extendBlobTransaction: (options: {
        blobObjectId: string;
        epochs: number;
      }) => Promise<unknown>;
    };
    waitForTransaction?: (options: { digest: string }) => Promise<unknown>;
  };
  waitForTransaction: (options: { digest: string }) => Promise<unknown>;
};

type BuildableTransaction = {
  build: (options: { client: unknown; onlyTransactionKind?: boolean }) => Promise<Uint8Array>;
};

type SignAndExecute = (args: { transaction: unknown; label?: string }) => Promise<unknown>;

export function usdcToMicros(amount: number) {
  return BigInt(Math.round(amount * 1_000_000));
}

export function contentTypeToMove(type: UploadPipelineInput['contentType']): 0 | 1 | 2 {
  if (type === 'album') return 1;
  if (type === 'video') return 2;
  return 0;
}

export async function prepareEncryptedUpload(input: UploadPipelineInput): Promise<UploadPipelineResult> {
  const fileSeed = input.files.map((file) => `${file.name}:${file.size}:${file.type}`).join('|');
  const seed = `${input.fileName}:${input.caption}:${fileSeed}:${input.encrypted}:${Date.now()}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  const mode =
    hasOnChainConfig() && (!input.encrypted || hasSealConfig()) ? 'configured' : 'demo';

  return {
    walrusBlobId: `walrus_${hex.slice(0, 32)}`,
    sealObjectId: `seal_${hex.slice(32, 64)}`,
    sealPolicyId: `policy_${hex.slice(0, 16)}`,
    epochs: clampEpochs(input.epochs ?? DEFAULT_WALRUS_EPOCHS),
    mode,
    steps: [
      input.encrypted ? 'Seal envelope encryption prepared' : 'Public Walrus upload prepared',
      `Walrus SDK relay: ${AILURUS_CONFIG.walrusUploadRelayUrl}`,
      `Storage cost reserved: $${input.estimatedCostUsdc.toFixed(2)} USDC`,
      mode === 'configured'
        ? 'Ready for sponsored on-chain publish'
        : `Demo fallback because config is missing: ${missingConfigKeys().join(', ') || 'Seal key servers'}`,
    ],
  };
}

export async function uploadContentWithWalrusSdk(
  input: UploadPipelineInput,
  options: {
    address: string;
    client: unknown;
    signAndExecute: SignAndExecute;
    onProgress?: UploadProgressHandler;
  },
): Promise<UploadPipelineResult> {
  const { onProgress } = options;
  const steps = uploadProgressSteps(input.encrypted);
  const policy = await prepareEncryptedUpload(input);

  const suiClient = options.client as WalrusExtendableClient;
  const client = suiClient.$extend(
    walrus({
      uploadRelay: {
        host: AILURUS_CONFIG.walrusUploadRelayUrl,
        sendTip: {
          max: AILURUS_CONFIG.walrusUploadRelayTipMax,
        },
      },
    }),
  );

  let encryptionMeta: SealEncryptionMeta | undefined;
  const files = input.encrypted
    ? await createEncryptedFiles(input, {
        client: options.client as SuiGrpcClient,
        creatorAddress: options.address,
        onProgress,
        steps,
      }).then((result) => {
        encryptionMeta = result.meta;
        return result.files;
      })
    : createPublicFiles(input);

  if (input.encrypted) {
    reportUploadProgress(onProgress, steps, 'encrypt', 'Seal-wrapped keys ready');
  } else {
    reportUploadProgress(onProgress, steps, 'walrus-encode', 'Preparing public media for Walrus');
  }

  const epochs = clampEpochs(input.epochs ?? DEFAULT_WALRUS_EPOCHS);

  const flow = client.walrus.writeFilesFlow({ files });
  reportUploadProgress(onProgress, steps, 'walrus-encode', 'Encoding quilt for Walrus storage');
  await flow.encode();

  const registerTx = flow.register({
    epochs,
    owner: options.address,
    deletable: true,
  });

  reportUploadProgress(
    onProgress,
    steps,
    'walrus-register',
    'Estimating storage cost — approve register tx in your wallet',
  );
  await ensureTestnetUploadFunds({
    address: options.address,
    client: suiClient,
    registerTx,
  });

  const registerResult = await options.signAndExecute({
    transaction: registerTx,
    label: 'Register Walrus blob',
  });
  const registerDigest = extractDigest(registerResult);
  reportUploadProgress(onProgress, steps, 'walrus-upload', 'Waiting for register confirmation');
  await suiClient.waitForTransaction({ digest: registerDigest });

  reportUploadProgress(onProgress, steps, 'walrus-upload', 'Uploading slivers through Walrus relay');
  await flow.upload({ digest: registerDigest });

  reportUploadProgress(
    onProgress,
    steps,
    'walrus-certify',
    'Approve certify tx in your wallet',
  );
  const certifyResult = await options.signAndExecute({
    transaction: flow.certify(),
    label: 'Certify Walrus blob',
  });
  const certifyDigest = extractDigest(certifyResult);
  reportUploadProgress(onProgress, steps, 'walrus-certify', 'Waiting for certify confirmation');
  await suiClient.waitForTransaction({ digest: certifyDigest });

  const storedFiles = await flow.listFiles();
  if (storedFiles.length === 0) throw new Error('Walrus upload finished without a file reference');

  // Album: store every quilt patch id on-chain (comma-separated). Display uses aggregator
  // by-quilt-patch-id — one HTTP request per image, no quilt index / SDK reads in the browser.
  const mediaIds = storedFiles.map((file) => file.id);
  const sealObjectId = encodeSealObjectId(
    mediaIds,
    input.encrypted ? encryptionMeta : undefined,
  );

  return {
    ...policy,
    walrusBlobId: storedFiles[0].blobId,
    sealObjectId,
    epochs,
    mode: 'walrus-sdk',
    steps: [
      input.encrypted ? 'AES-GCM payload encrypted locally' : 'Public media uploaded',
      'Walrus SDK encoded quilt',
      `Register tx: ${registerDigest}`,
      'Slivers uploaded through Walrus upload relay',
      `Certify tx: ${certifyDigest}`,
    ],
  };
}

/** @deprecated Use uploadContentWithWalrusSdk */
export const uploadEncryptedContentWithWalrusSdk = uploadContentWithWalrusSdk;

export const UPLOAD_PROGRESS_STEPS = ENCRYPTED_UPLOAD_PROGRESS_STEPS;

export function getAuthMode() {
  return AILURUS_CONFIG.enokiApiKey && AILURUS_CONFIG.googleClientId
    ? 'Enoki Google login configured'
    : 'Demo Google login';
}

export async function uploadAvatarToWalrus(
  file: UploadFileInput,
  options: {
    address: string;
    client: unknown;
    signAndExecute: SignAndExecute;
  },
) {
  const result = await uploadSingleBlobWithWalrusSdk(file, {
    ...options,
    attributes: {
      'content-type': file.type || 'image/jpeg',
      'ailurus-original-content-type': file.type || 'image/jpeg',
      'ailurus-original-name': file.name,
      'ailurus-role': 'avatar',
      app: 'ailurus',
    },
  });
  // Sui blob object id — one aggregator request via /by-object-id/, no quilt/SDK reads.
  return normalizeWalrusStoredMediaId(result.blobObjectId);
}

async function uploadSingleBlobWithWalrusSdk(
  file: UploadFileInput,
  options: {
    address: string;
    client: unknown;
    signAndExecute: SignAndExecute;
    epochs?: number;
    attributes?: Record<string, string>;
  },
) {
  const suiClient = options.client as WalrusExtendableClient;
  const client = suiClient.$extend(
    walrus({
      uploadRelay: {
        host: AILURUS_CONFIG.walrusUploadRelayUrl,
        sendTip: {
          max: AILURUS_CONFIG.walrusUploadRelayTipMax,
        },
      },
    }),
  );

  const epochs = clampEpochs(options.epochs ?? DEFAULT_WALRUS_EPOCHS);
  const flow = client.walrus.writeBlobFlow({ blob: file.bytes });
  await flow.encode();

  const registerTx = flow.register({
    epochs,
    owner: options.address,
    deletable: true,
    attributes: options.attributes,
  });

  await ensureTestnetUploadFunds({
    address: options.address,
    client: suiClient,
    registerTx,
  });

  const registerResult = await options.signAndExecute({
    transaction: registerTx,
    label: 'Register Walrus blob',
  });
  const registerDigest = extractDigest(registerResult);
  await suiClient.waitForTransaction({ digest: registerDigest });

  await flow.upload({ digest: registerDigest });

  const certifyResult = await options.signAndExecute({
    transaction: flow.certify(),
    label: 'Certify Walrus blob',
  });
  const certifyDigest = extractDigest(certifyResult);
  await suiClient.waitForTransaction({ digest: certifyDigest });

  return flow.getBlob();
}

async function ensureTestnetUploadFunds(options: {
  address: string;
  client: unknown;
  registerTx: BuildableTransaction;
}) {
  if (AILURUS_CONFIG.defaultNetwork !== 'testnet') return;

  const { walTopUp, suiTopUp } = await estimateUploadFundShortfall(options);
  if (walTopUp <= 0n && suiTopUp <= 0n) return;

  const walBalance = await getCoinBalance(options.address, AILURUS_CONFIG.walType);
  const suiBalance = await getCoinBalance(options.address, SUI_COIN_TYPE);

  await requestTestnetUploadFunds(options.address, walTopUp, suiTopUp);

  if (walTopUp > 0n) {
    await waitForCoinBalance(options.address, AILURUS_CONFIG.walType, walBalance + walTopUp);
  }
  if (suiTopUp > 0n) {
    await waitForCoinBalance(options.address, SUI_COIN_TYPE, suiBalance + suiTopUp);
  }
}

async function estimateUploadFundShortfall(options: {
  address: string;
  client: unknown;
  registerTx: BuildableTransaction;
}) {
  const walTopUp = await estimateWalTopUpAmount(options.registerTx, options.client);
  const relayTip = await getRelayTipAmount();
  const registerGas = clampGasEstimate(
    await estimateRegisterGasMist(options.registerTx, options.address, options.client),
  );
  const suiRequired = registerGas + DEFAULT_CERTIFY_GAS_MIST + relayTip + UPLOAD_GAS_BUFFER_MIST;
  const suiAvailable = await getCoinBalance(options.address, SUI_COIN_TYPE);
  const suiTopUp = suiRequired > suiAvailable ? suiRequired - suiAvailable : 0n;

  return { walTopUp, suiTopUp };
}

async function getRelayTipAmount() {
  try {
    const response = await fetch(`${AILURUS_CONFIG.walrusUploadRelayUrl}/v1/tip-config`);
    if (!response.ok) return 105n;
    const data = (await response.json()) as {
      send_tip?: { kind?: { const?: number; linear?: { base: number } } };
    };
    if (data.send_tip?.kind && 'const' in data.send_tip.kind) {
      return BigInt(data.send_tip.kind.const ?? 105);
    }
    if (data.send_tip?.kind?.linear?.base != null) {
      return BigInt(data.send_tip.kind.linear.base);
    }
  } catch {
    // fall through
  }
  return 105n;
}

async function estimateRegisterGasMist(
  registerTx: BuildableTransaction,
  address: string,
  client: unknown,
) {
  try {
    const bytes = await registerTx.build({ client, onlyTransactionKind: true });
    const result = await suiJsonRpc<{
      effects?: {
        status?: { status?: string };
        gasUsed?: {
          computationCost?: string;
          storageCost?: string;
          nonRefundableStorageFee?: string;
        };
      };
    }>('sui_devInspectTransactionBlock', [address, toBase64(bytes)]);
    if (result.effects?.status?.status === 'success' && result.effects.gasUsed) {
      const { computationCost, storageCost, nonRefundableStorageFee } = result.effects.gasUsed;
      return (
        BigInt(computationCost ?? 0) +
        BigInt(storageCost ?? 0) +
        BigInt(nonRefundableStorageFee ?? 0)
      );
    }
  } catch {
    // fall through
  }
  return FALLBACK_REGISTER_GAS_MIST;
}

function clampGasEstimate(gas: bigint) {
  return gas > MAX_REGISTER_GAS_MIST ? MAX_REGISTER_GAS_MIST : gas;
}

async function estimateWalTopUpAmount(registerTx: BuildableTransaction, client: unknown) {
  try {
    await registerTx.build({ client, onlyTransactionKind: true });
    return 0n;
  } catch (error) {
    const topUpAmount = parseRequiredWalTopUp(error instanceof Error ? error.message : String(error));
    if (topUpAmount !== null) return topUpAmount;
    throw error;
  }
}

function parseRequiredWalTopUp(error: string) {
  const match = error.match(REQUIRED_WAL_PATTERN);
  if (!match) return null;
  const required = BigInt(match[1]);
  const available = BigInt(match[2]);
  return required > available ? required - available : 0n;
}

async function requestTestnetUploadFunds(address: string, walAmount: bigint, suiAmount: bigint) {
  const workerUrl = import.meta.env.VITE_SPONSOR_WORKER_URL as string | undefined;
  if (!workerUrl) throw new Error('Upload faucet worker is not configured');

  const response = await fetch(`${workerUrl}/testnet/upload-funds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: address,
      walAmount: walAmount.toString(),
      suiAmount: suiAmount.toString(),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    console.error('[Ailurus] upload-funds worker error', payload);
    throw new UserFacingError(
      payload.error ?? `Testnet upload funding failed (${response.status})`,
      'Upload credits are temporarily unavailable. Please try again in a moment.',
    );
  }
}

async function waitForCoinBalance(address: string, coinType: string, minimum: bigint) {
  let balance = 0n;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    balance = await getCoinBalance(address, coinType);
    if (balance >= minimum) return balance;
    await delay(1_500);
  }
  return balance;
}

async function getCoinBalance(owner: string, coinType: string) {
  const result = await suiJsonRpc<{ totalBalance: string }>('suix_getBalance', [owner, coinType]);
  return BigInt(result.totalBalance);
}

async function suiJsonRpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(TESTNET_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const payload = (await response.json()) as { result?: T; error?: { message?: string } };
  if (!response.ok || payload.error || !payload.result) {
    throw new Error(payload.error?.message ?? `Sui RPC ${method} failed`);
  }
  return payload.result;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPublicFiles(input: UploadPipelineInput) {
  return input.files.map((sourceFile, index) =>
    WalrusFile.from({
      contents: sourceFile.bytes,
      identifier: buildWalrusIdentifier(sourceFile.name, index),
      tags: {
        'content-type': sourceFile.type || 'application/octet-stream',
        'ailurus-original-content-type': sourceFile.type || 'application/octet-stream',
        'ailurus-original-name': sourceFile.name,
        'ailurus-content-kind': input.contentType,
        'ailurus-encryption': 'none',
        app: 'ailurus',
      },
    }),
  );
}

async function createEncryptedFiles(
  input: UploadPipelineInput,
  options: {
    client: SuiGrpcClient;
    creatorAddress: string;
    onProgress?: UploadProgressHandler;
    steps: UploadProgressState['steps'];
  },
) {
  if (!hasSealConfig()) {
    throw new Error('Seal key servers are required for encrypted uploads');
  }

  reportUploadProgress(
    options.onProgress,
    options.steps,
    'encrypt',
    'Generating AES keys and wrapping with Seal',
  );

  const sealKeyId = createSealKeyId(options.creatorAddress);
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const rawDek = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  const wrappedDek = await wrapDekWithSeal({
    client: options.client,
    sealKeyId,
    dek: rawDek,
  });

  const ivs: string[] = [];
  const files = await Promise.all(
    input.files.map(async (sourceFile, index) => {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ivBase64 = toBase64(iv);
      ivs.push(ivBase64);
      const plaintext = sourceFile.bytes.buffer.slice(
        sourceFile.bytes.byteOffset,
        sourceFile.bytes.byteOffset + sourceFile.bytes.byteLength,
      ) as ArrayBuffer;
      const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext),
      );

      return WalrusFile.from({
        contents: ciphertext,
        identifier: buildWalrusIdentifier(sourceFile.name, index),
        tags: {
          'content-type': 'application/octet-stream',
          'ailurus-original-content-type': sourceFile.type || 'application/octet-stream',
          'ailurus-original-name': sourceFile.name,
          'ailurus-content-kind': input.contentType,
          'ailurus-encryption': 'AES-256-GCM',
          'ailurus-iv': ivBase64,
          'ailurus-seal-id': sealKeyId,
          'ailurus-wrapped-dek': wrappedDek,
          'ailurus-creator': options.creatorAddress,
          app: 'ailurus',
        },
      });
    }),
  );

  return {
    files,
    meta: {
      sealKeyId,
      wrappedDek,
      ivs,
      sealPackageId: getSealPackageId(),
    },
  };
}

function buildWalrusIdentifier(fileName: string, index: number) {
  const clean = fileName.trim().replaceAll('/', '-').replace(/^_+/, '');
  return clean || `ailurus-upload-${index + 1}`;
}

function extractDigest(result: unknown) {
  if (
    result &&
    typeof result === 'object' &&
    'Transaction' in result &&
    result.Transaction &&
    typeof result.Transaction === 'object' &&
    'digest' in result.Transaction &&
    typeof result.Transaction.digest === 'string'
  ) {
    return result.Transaction.digest;
  }
  if (
    result &&
    typeof result === 'object' &&
    'digest' in result &&
    typeof result.digest === 'string'
  ) {
    return result.digest;
  }
  if (
    result &&
    typeof result === 'object' &&
    'FailedTransaction' in result &&
    result.FailedTransaction &&
    typeof result.FailedTransaction === 'object' &&
    'digest' in result.FailedTransaction &&
    typeof result.FailedTransaction.digest === 'string'
  ) {
    throw new Error(`Transaction failed: ${result.FailedTransaction.digest}`);
  }
  throw new Error('Transaction failed before returning a digest');
}

export async function extendWalrusBlob(
  options: {
    address: string;
    client: unknown;
    blobObjectId: string;
    epochs: number;
    signAndExecute: SignAndExecute;
    onProgress?: UploadProgressHandler;
  },
) {
  const epochs = clampEpochs(options.epochs);
  const steps = EXTEND_STORAGE_PROGRESS_STEPS;
  const suiClient = options.client as WalrusExtendableClient;
  const client = suiClient.$extend(
    walrus({
      uploadRelay: {
        host: AILURUS_CONFIG.walrusUploadRelayUrl,
        sendTip: { max: AILURUS_CONFIG.walrusUploadRelayTipMax },
      },
    }),
  );

  reportUploadProgress(options.onProgress, steps, 'extend', `Extending storage by ${epochs} epoch(s)`);

  if (AILURUS_CONFIG.defaultNetwork === 'testnet') {
    await requestTestnetUploadFunds(options.address, 100_000_000n, 30_000_000n);
  }

  const extendTx = await client.walrus.extendBlobTransaction({
    blobObjectId: options.blobObjectId,
    epochs,
  });

  reportUploadProgress(options.onProgress, steps, 'sign', 'Extend Walrus storage — approve in wallet');
  const result = await options.signAndExecute({
    transaction: extendTx,
    label: 'Extend Walrus storage',
  });
  const digest = extractDigest(result);
  reportUploadProgress(options.onProgress, steps, 'confirm', 'Waiting for extend confirmation');
  await suiClient.waitForTransaction({ digest });
  return { digest, epochs };
}

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}
