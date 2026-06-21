import { EnokiClient, EnokiClientError } from '@mysten/enoki';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1';
import { Transaction } from '@mysten/sui/transactions';
import { z } from 'zod';
import {
  addComment,
  getEngagement,
  shareOgHtml,
  toggleLike,
  toggleSave,
} from './engagement';

type Env = {
  ENOKI_SECRET_KEY: string;
  WAL_FAUCET_SECRET_KEY?: string;
  SUI_NETWORK: 'testnet' | 'mainnet' | 'devnet';
  ALLOWED_ORIGINS?: string;
  AILURUS_PACKAGE_ID: string;
  AILURUS_PLATFORM_ID: string;
  AILURUS_PROFILE_REGISTRY_ID?: string;
  WAL_TYPE?: string;
  WAL_MAX_DRIP_AMOUNT?: string;
  SUI_MAX_DRIP_AMOUNT?: string;
  WALRUS_PACKAGE_ID?: string;
  WALRUS_UPLOAD_RELAY_TIP_ADDRESS?: string;
  USDC_TYPE?: string;
  USDC_MAX_DRIP_AMOUNT?: string;
};

const HEX_ADDRESS = /^0x[a-fA-F0-9]{1,64}$/;
const DEFAULT_WAL_TYPE =
  '0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL';
const DEFAULT_WALRUS_PACKAGE_ID =
  '0x849e95d2718938d66c37fb91df76d72f78526c1864c339bac415ce8ecda2d8cc';
const DEFAULT_UPLOAD_RELAY_TIP_ADDRESS =
  '0x4b6a7439159cf10533147fc3d678cf10b714f2bc998f6cb1f1b0b9594cdc52b6';
const SUI_FRAMEWORK_PKG =
  '0x0000000000000000000000000000000000000000000000000000000000000002';
const DEFAULT_MAX_WAL_DRIP_AMOUNT = 200_000_000n;
const DEFAULT_MAX_SUI_DRIP_AMOUNT = 1_000_000_000n;
const DEFAULT_USDC_TYPE =
  '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC';
const DEFAULT_MAX_USDC_DRIP_AMOUNT = 1_000_000n;
const TESTNET_RPC_URL = 'https://fullnode.testnet.sui.io:443';
const SUI_COIN_TYPE = '0x2::sui::SUI';

const createSponsoredSchema = z
  .object({
    network: z.enum(['testnet', 'mainnet', 'devnet']).optional(),
    transactionKindBytes: z.string().min(1),
    jwt: z.string().min(1).optional(),
    sender: z.string().regex(HEX_ADDRESS).optional(),
    extraAllowedAddresses: z.array(z.string().regex(HEX_ADDRESS)).max(10).optional(),
  })
  .refine((value) => Boolean(value.jwt) !== Boolean(value.sender), {
    message: 'Provide exactly one of jwt or sender',
    path: ['jwt'],
  });

const executeSponsoredSchema = z.object({
  digest: z.string().min(1),
  signature: z.string().min(1),
});

const testnetFaucetSchema = z.object({
  recipient: z.string().regex(HEX_ADDRESS),
});

const testnetWalSchema = z.object({
  recipient: z.string().regex(HEX_ADDRESS),
  amount: z.string().regex(/^[1-9][0-9]*$/),
});

const testnetUploadFundsSchema = z
  .object({
    recipient: z.string().regex(HEX_ADDRESS),
    walAmount: z.string().regex(/^[0-9]+$/).optional(),
    suiAmount: z.string().regex(/^[0-9]+$/).optional(),
  })
  .refine(
    (value) => {
      const wal = BigInt(value.walAmount ?? '0');
      const sui = BigInt(value.suiAmount ?? '0');
      return wal > 0n || sui > 0n;
    },
    { message: 'At least one of walAmount or suiAmount must be positive' },
  );

const testnetUsdcSchema = z.object({
  recipient: z.string().regex(HEX_ADDRESS),
  amount: z.string().regex(/^[1-9][0-9]*$/),
});

const engagementLikeSchema = z.object({
  postId: z.string().min(1),
  address: z.string().regex(HEX_ADDRESS),
});

const engagementCommentSchema = z.object({
  postId: z.string().min(1),
  address: z.string().regex(HEX_ADDRESS),
  text: z.string().min(1).max(500),
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/health' && request.method === 'GET') {
        return json({ ok: true, network: env.SUI_NETWORK }, corsHeaders);
      }

      if (url.pathname === '/sponsor/create' && request.method === 'POST') {
        return await createSponsoredTransaction(request, env, corsHeaders);
      }

      if (url.pathname === '/sponsor/execute' && request.method === 'POST') {
        return await executeSponsoredTransaction(request, env, corsHeaders);
      }

      if (url.pathname === '/testnet/faucet' && request.method === 'POST') {
        return await requestTestnetFaucet(request, env, corsHeaders);
      }

      if (url.pathname === '/testnet/wal' && request.method === 'POST') {
        return await dripTestnetWal(request, env, corsHeaders);
      }

      if (url.pathname === '/testnet/upload-funds' && request.method === 'POST') {
        return await dripTestnetUploadFunds(request, env, corsHeaders);
      }

      if (url.pathname === '/testnet/usdc' && request.method === 'POST') {
        return await dripTestnetUsdc(request, env, corsHeaders);
      }

      if (url.pathname === '/engagement' && request.method === 'GET') {
        const postIds = (url.searchParams.get('postIds') ?? '')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);
        return json({ posts: getEngagement(postIds) }, corsHeaders);
      }

      if (url.pathname === '/engagement/like' && request.method === 'POST') {
        const body = engagementLikeSchema.parse(await request.json());
        const post = toggleLike(body.postId, body.address);
        return json({ post }, corsHeaders);
      }

      if (url.pathname === '/engagement/comment' && request.method === 'POST') {
        const body = engagementCommentSchema.parse(await request.json());
        const post = addComment(body.postId, body.address, body.text);
        return json({ post }, corsHeaders);
      }

      if (url.pathname === '/engagement/save' && request.method === 'POST') {
        const body = engagementLikeSchema.parse(await request.json());
        const post = toggleSave(body.postId, body.address);
        return json({ post }, corsHeaders);
      }

      if (url.pathname.startsWith('/share/post/') && request.method === 'GET') {
        const postId = url.pathname.replace('/share/post/', '').trim();
        const origin = request.headers.get('Origin') ?? url.origin;
        const pageUrl = `${origin.replace(/\/$/, '')}/p/${postId}`;
        const html = shareOgHtml({
          title: `Post #${postId} on Ailurus`,
          description: 'Exclusive creator content on Sui — Walrus + Seal + USDC.',
          imageUrl: `${origin.replace(/\/$/, '')}/og-image.png`,
          pageUrl,
        });
        return new Response(html, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      }

      return json({ error: 'Not found' }, corsHeaders, 404);
    } catch (error) {
      return handleError(error, corsHeaders);
    }
  },
};

async function createSponsoredTransaction(
  request: Request,
  env: Env,
  headers: HeadersInit,
) {
  const body = createSponsoredSchema.parse(await request.json());
  const enoki = new EnokiClient({ apiKey: env.ENOKI_SECRET_KEY });
  const network = body.network ?? env.SUI_NETWORK;

  if (body.jwt) {
    const sponsored = await enoki.createSponsoredTransaction({
      network,
      transactionKindBytes: body.transactionKindBytes,
      jwt: body.jwt,
    });

    return json(sponsored, headers);
  }

  const sponsored = await enoki.createSponsoredTransaction({
    network,
    transactionKindBytes: body.transactionKindBytes,
    sender: body.sender!,
    allowedMoveCallTargets: allowedMoveCallTargets(env),
    allowedAddresses: uniqueAddresses([
      env.AILURUS_PLATFORM_ID,
      env.AILURUS_PROFILE_REGISTRY_ID,
      env.WALRUS_UPLOAD_RELAY_TIP_ADDRESS ?? DEFAULT_UPLOAD_RELAY_TIP_ADDRESS,
      ...(body.extraAllowedAddresses ?? []),
    ]),
  });

  return json(sponsored, headers);
}

async function executeSponsoredTransaction(
  request: Request,
  env: Env,
  headers: HeadersInit,
) {
  const body = executeSponsoredSchema.parse(await request.json());
  const enoki = new EnokiClient({ apiKey: env.ENOKI_SECRET_KEY });

  const result = await enoki.executeSponsoredTransaction({
    digest: body.digest,
    signature: body.signature,
  });

  return json(result, headers);
}

async function dripTestnetWal(request: Request, env: Env, headers: HeadersInit) {
  const body = testnetWalSchema.parse(await request.json());
  return dripTestnetUploadFunds(
    new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        recipient: body.recipient,
        walAmount: body.amount,
        suiAmount: '0',
      }),
    }),
    env,
    headers,
  );
}

async function dripTestnetUploadFunds(request: Request, env: Env, headers: HeadersInit) {
  if (env.SUI_NETWORK !== 'testnet') {
    return json({ error: 'Upload credits are only available on testnet.' }, headers, 400);
  }
  if (!env.WAL_FAUCET_SECRET_KEY) {
    console.error('[ailurus-worker] WAL_FAUCET_SECRET_KEY is not configured');
    return json({ error: 'Upload credits are temporarily unavailable.' }, headers, 503);
  }

  const body = testnetUploadFundsSchema.parse(await request.json());
  const walAmount = BigInt(body.walAmount ?? '0');
  const suiAmount = BigInt(body.suiAmount ?? '0');
  const client = new SuiJsonRpcClient({ url: TESTNET_RPC_URL, network: 'testnet' });
  const signer = keypairFromSecretKey(env.WAL_FAUCET_SECRET_KEY);
  const faucetAddress = signer.toSuiAddress();
  const walType = env.WAL_TYPE ?? DEFAULT_WAL_TYPE;
  const maxWalAmount = parsePositiveBigInt(env.WAL_MAX_DRIP_AMOUNT, DEFAULT_MAX_WAL_DRIP_AMOUNT);
  const maxSuiAmount = parsePositiveBigInt(env.SUI_MAX_DRIP_AMOUNT, DEFAULT_MAX_SUI_DRIP_AMOUNT);
  const recipient = normalizeAddress(body.recipient);

  if (walAmount > maxWalAmount) {
    console.error('[ailurus-worker] WAL drip exceeds limit', {
      requested: walAmount.toString(),
      maxAmount: maxWalAmount.toString(),
    });
    return json({ error: 'Requested upload credits exceed the current limit.' }, headers, 400);
  }

  if (suiAmount > maxSuiAmount) {
    console.error('[ailurus-worker] SUI drip exceeds limit', {
      requested: suiAmount.toString(),
      maxAmount: maxSuiAmount.toString(),
    });
    return json({ error: 'Requested upload credits exceed the current limit.' }, headers, 400);
  }

  if (suiAmount > 0n) {
    const suiBalance = await client.getBalance({ owner: faucetAddress, coinType: SUI_COIN_TYPE });
    if (BigInt(suiBalance.totalBalance) < suiAmount) {
      console.error('[ailurus-worker] Upload faucet insufficient SUI', {
        faucetAddress,
        required: suiAmount.toString(),
        available: suiBalance.totalBalance,
      });
      return json({ error: 'Upload credits are temporarily unavailable.' }, headers, 503);
    }
  }

  if (walAmount > 0n) {
    const walBalance = await client.getBalance({ owner: faucetAddress, coinType: walType });
    if (BigInt(walBalance.totalBalance) < walAmount) {
      console.error('[ailurus-worker] Upload faucet insufficient WAL', {
        faucetAddress,
        walType,
        required: walAmount.toString(),
        available: walBalance.totalBalance,
      });
      return json({ error: 'Upload credits are temporarily unavailable.' }, headers, 503);
    }
  }

  const tx = new Transaction();
  tx.setSender(faucetAddress);

  if (suiAmount > 0n) {
    const [suiCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(suiAmount)]);
    tx.transferObjects([suiCoin], recipient);
  }

  if (walAmount > 0n) {
    const coins = await client.getCoins({ owner: faucetAddress, coinType: walType, limit: 50 });
    const selected = selectCoins(coins.data, walAmount);
    const primary = tx.object(selected[0].coinObjectId);
    if (selected.length > 1) {
      tx.mergeCoins(
        primary,
        selected.slice(1).map((coin) => tx.object(coin.coinObjectId)),
      );
    }
    const [walCoin] = tx.splitCoins(primary, [tx.pure.u64(walAmount)]);
    tx.transferObjects([walCoin], recipient);
  }

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: {
      showEffects: true,
      showBalanceChanges: true,
    },
  });

  if (result.effects?.status.status !== 'success') {
    console.error('[ailurus-worker] Upload funding transfer failed', {
      digest: result.digest,
      status: result.effects?.status,
    });
    return json({ error: 'Upload credits could not be sent. Please try again.' }, headers, 502);
  }

  return json(
    {
      ok: true,
      digest: result.digest,
      walAmount: walAmount.toString(),
      suiAmount: suiAmount.toString(),
      walType,
      sender: faucetAddress,
      recipient,
    },
    headers,
  );
}

async function dripTestnetUsdc(request: Request, env: Env, headers: HeadersInit) {
  if (env.SUI_NETWORK !== 'testnet') {
    return json({ error: 'Testnet USDC is only available on testnet.' }, headers, 400);
  }
  if (!env.WAL_FAUCET_SECRET_KEY) {
    console.error('[ailurus-worker] WAL_FAUCET_SECRET_KEY is not configured');
    return json({ error: 'Testnet USDC is temporarily unavailable.' }, headers, 503);
  }

  const body = testnetUsdcSchema.parse(await request.json());
  const usdcAmount = BigInt(body.amount);
  const usdcType = env.USDC_TYPE ?? DEFAULT_USDC_TYPE;
  const maxUsdcAmount = parsePositiveBigInt(env.USDC_MAX_DRIP_AMOUNT, DEFAULT_MAX_USDC_DRIP_AMOUNT);
  const recipient = normalizeAddress(body.recipient);

  if (usdcAmount > maxUsdcAmount) {
    console.error('[ailurus-worker] USDC drip exceeds limit', {
      requested: usdcAmount.toString(),
      maxAmount: maxUsdcAmount.toString(),
    });
    return json({ error: 'Requested USDC exceeds the current limit (1 USDC).' }, headers, 400);
  }

  const client = new SuiJsonRpcClient({ url: TESTNET_RPC_URL, network: 'testnet' });
  const signer = keypairFromSecretKey(env.WAL_FAUCET_SECRET_KEY);
  const faucetAddress = signer.toSuiAddress();

  const usdcBalance = await client.getBalance({ owner: faucetAddress, coinType: usdcType });
  if (BigInt(usdcBalance.totalBalance) < usdcAmount) {
    console.error('[ailurus-worker] USDC faucet insufficient balance', {
      faucetAddress,
      required: usdcAmount.toString(),
      available: usdcBalance.totalBalance,
    });
    return json({ error: 'Testnet USDC is temporarily unavailable.' }, headers, 503);
  }

  const tx = new Transaction();
  tx.setSender(faucetAddress);
  const coins = await client.getCoins({ owner: faucetAddress, coinType: usdcType, limit: 50 });
  const selected = selectCoins(coins.data, usdcAmount);
  const primary = tx.object(selected[0].coinObjectId);
  if (selected.length > 1) {
    tx.mergeCoins(
      primary,
      selected.slice(1).map((coin) => tx.object(coin.coinObjectId)),
    );
  }
  const [usdcCoin] = tx.splitCoins(primary, [tx.pure.u64(usdcAmount)]);
  tx.transferObjects([usdcCoin], recipient);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: {
      showEffects: true,
      showBalanceChanges: true,
    },
  });

  if (result.effects?.status.status !== 'success') {
    console.error('[ailurus-worker] USDC drip transfer failed', {
      digest: result.digest,
      status: result.effects?.status,
    });
    return json({ error: 'Testnet USDC could not be sent. Please try again.' }, headers, 502);
  }

  return json(
    {
      ok: true,
      digest: result.digest,
      usdcAmount: usdcAmount.toString(),
      usdcType,
      sender: faucetAddress,
      recipient,
    },
    headers,
  );
}

async function requestTestnetFaucet(request: Request, env: Env, headers: HeadersInit) {
  if (env.SUI_NETWORK !== 'testnet') {
    return json({ error: 'Testnet faucet is only available on testnet.' }, headers, 400);
  }

  const body = testnetFaucetSchema.parse(await request.json());
  const faucetResponse = await fetch('https://faucet.testnet.sui.io/v2/gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      FixedAmountRequest: {
        recipient: normalizeAddress(body.recipient),
      },
    }),
  });

  const payload = await faucetResponse.json().catch(() => ({}));
  if (!faucetResponse.ok) {
    console.error('[ailurus-worker] Testnet faucet request failed', {
      status: faucetResponse.status,
      details: payload,
    });
    return json({ error: 'Testnet faucet is temporarily unavailable.' }, headers, 502);
  }

  return json(payload, headers);
}

function keypairFromSecretKey(secretKey: string) {
  const parsed = decodeSuiPrivateKey(secretKey);
  switch (parsed.scheme) {
    case 'ED25519':
      return Ed25519Keypair.fromSecretKey(parsed.secretKey);
    case 'Secp256k1':
      return Secp256k1Keypair.fromSecretKey(parsed.secretKey);
    case 'Secp256r1':
      return Secp256r1Keypair.fromSecretKey(parsed.secretKey);
    default:
      throw new Error(`Unsupported faucet key scheme: ${parsed.scheme}`);
  }
}

function parsePositiveBigInt(value: string | undefined, fallback: bigint) {
  if (!value) return fallback;
  const parsed = BigInt(value);
  if (parsed <= 0n) throw new Error('WAL_DRIP_AMOUNT must be positive');
  return parsed;
}

function selectCoins(coins: { coinObjectId: string; balance: string }[], amount: bigint) {
  const selected: { coinObjectId: string; balance: string }[] = [];
  let total = 0n;
  for (const coin of coins) {
    selected.push(coin);
    total += BigInt(coin.balance);
    if (total >= amount) return selected;
  }
  throw new Error('WAL faucet wallet does not have enough coin objects');
}

function allowedMoveCallTargets(env: Env) {
  const pkg = env.AILURUS_PACKAGE_ID;
  const walrusPkg = env.WALRUS_PACKAGE_ID ?? DEFAULT_WALRUS_PACKAGE_ID;
  return [
    `${SUI_FRAMEWORK_PKG}::coin::destroy_zero`,
    `${SUI_FRAMEWORK_PKG}::coin::split`,
    `${SUI_FRAMEWORK_PKG}::coin::redeem_funds`,
    `${SUI_FRAMEWORK_PKG}::balance::redeem_funds`,
    `${pkg}::platform::register_creator`,
    `${pkg}::platform::update_price`,
    `${pkg}::platform::publish_post`,
    `${pkg}::platform::subscribe`,
    `${pkg}::platform::update_creator_profile`,
    `${pkg}::platform::set_creator_avatar`,
    `${pkg}::profile::register_fan`,
    `${pkg}::profile::update_fan_profile`,
    `${walrusPkg}::system::reserve_space`,
    `${walrusPkg}::system::register_blob`,
    `${walrusPkg}::system::certify_blob`,
    `${walrusPkg}::metadata::new`,
    `${walrusPkg}::blob::add_metadata`,
    `${walrusPkg}::blob::insert_or_update_metadata_pair`,
    `${walrusPkg}::system::extend_blob`,
  ];
}

function uniqueAddresses(addresses: (string | undefined)[]) {
  return Array.from(
    new Set(
      addresses
        .filter((address): address is string => Boolean(address))
        .map((address) => normalizeAddress(address)),
    ),
  );
}

function normalizeAddress(address: string) {
  return `0x${address.slice(2).toLowerCase().padStart(64, '0')}`;
}

function getCorsHeaders(request: Request, env: Env) {
  const origin = request.headers.get('Origin') ?? '';
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Vary': 'Origin',
  };

  if (origin && isAllowedOrigin(origin, allowedOrigins)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

function isAllowedOrigin(origin: string, allowedOrigins: string[]) {
  if (allowedOrigins.includes(origin)) return true;
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'https:' && hostname.endsWith('.wal.app');
  } catch {
    return false;
  }
}

function json(value: unknown, headers: HeadersInit, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function handleError(error: unknown, headers: HeadersInit) {
  console.error('[ailurus-worker]', error);

  if (error instanceof z.ZodError) {
    return json({ error: 'Please check your request and try again.' }, headers, 400);
  }

  if (error instanceof EnokiClientError) {
    return json(
      { error: 'Sign-in service is temporarily unavailable. Please try again.' },
      headers,
      error.status >= 400 && error.status < 600 ? error.status : 502,
    );
  }

  return json({ error: 'Something went wrong. Please try again.' }, headers, 500);
}
