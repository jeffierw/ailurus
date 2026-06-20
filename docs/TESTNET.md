# Ailurus Testnet Setup

## Published Contract

- Network: Sui Testnet
- Package ID: `0xe5f702358b711a236c618ed60c2e084964356e190f350f804c40396230355937`
- Shared `Platform`: `0xf6f9d588ace7dbf1f9d1739b677f6d31e412108176fb1ce50cf96d32a593cada`
- AdminCap: `0x24c205cf8090d2f86c74b30d32e932f67dd946dcc571b4282e932536e6604fa9`
- Publish digest: `Aaewk6DRJEiXNeYaHs27S6A2nbdBi5beHZ42cpMGy6oo`

## Coin Types

- Circle USDC Testnet: `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC`
- Walrus Testnet WAL: `0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL`

Cetus Aggregator SDK was checked with Circle testnet USDC -> SUI, SUI -> USDC, USDC -> WAL, and SUI -> WAL on Testnet; all currently returned zero routes. For the testnet build, subscriptions use Circle USDC, while Walrus SDK uploads require the uploading wallet to hold tWAL. Get testnet SUI from the official faucet first:

```bash
curl --location --request POST "https://faucet.testnet.sui.io/v2/gas" \
  --header "Content-Type: application/json" \
  --data-raw '{"FixedAmountRequest":{"recipient":"0xYOUR_ADDRESS"}}'
```

Then exchange part of that testnet SUI for tWAL with:

```bash
walrus get-wal
```

The underlying Walrus testnet exchange call is `0x82593828ed3fcb8c6a235eac9abd0adbe9c5f9bbffa9b1e7a45cdd884481ef9f::wal_exchange::exchange_all_for_wal`, using one of the shared exchange objects from the Walrus network config.

## Enoki Private Key

Do not put the Enoki private key in Vite env vars or browser code. Anything prefixed with `VITE_` is shipped to users.

Use it only in a backend or serverless function:

```bash
ENOKI_SECRET_KEY=enoki_private_...
```

Server-side pattern:

```ts
import { EnokiClient } from '@mysten/enoki';

const enoki = new EnokiClient({
  apiKey: process.env.ENOKI_SECRET_KEY!,
});

const sponsored = await enoki.createSponsoredTransaction({
  network: 'testnet',
  transactionKindBytes,
  sender,
  allowedMoveCallTargets: [
    '0xe5f702358b711a236c618ed60c2e084964356e190f350f804c40396230355937::platform::register_creator',
    '0xe5f702358b711a236c618ed60c2e084964356e190f350f804c40396230355937::platform::subscribe',
    '0xe5f702358b711a236c618ed60c2e084964356e190f350f804c40396230355937::platform::publish_post',
  ],
  allowedAddresses: [
    '0xf6f9d588ace7dbf1f9d1739b677f6d31e412108176fb1ce50cf96d32a593cada',
  ],
});
```

Portal allowlist should match the same Move targets and shared objects. Keep separate keys for testnet and mainnet.

### Sponsor Worker

The backend sponsor API lives in `ailurus-worker/`.

```bash
cd ailurus-worker
npm install
npx wrangler secret put ENOKI_SECRET_KEY
npm run deploy
```

For local development:

```bash
cd ailurus-worker
printf 'ENOKI_SECRET_KEY=enoki_private_...\n' > .dev.vars
npm run dev
```

Endpoints:

- `GET /health`
- `POST /sponsor/create`
- `POST /sponsor/execute`

After deploy, set the frontend Worker URL:

```bash
VITE_SPONSOR_WORKER_URL=https://ailurus-sponsor.<your-subdomain>.workers.dev
```

### Enoki Portal Allowlist

Allowed move call targets:

```text
0xe5f702358b711a236c618ed60c2e084964356e190f350f804c40396230355937::platform::register_creator
0xe5f702358b711a236c618ed60c2e084964356e190f350f804c40396230355937::platform::update_price
0xe5f702358b711a236c618ed60c2e084964356e190f350f804c40396230355937::platform::publish_post
0xe5f702358b711a236c618ed60c2e084964356e190f350f804c40396230355937::platform::subscribe
```

Allowed addresses:

```text
0xf6f9d588ace7dbf1f9d1739b677f6d31e412108176fb1ce50cf96d32a593cada
```

If you later sponsor Walrus `register` / `certify` transactions, add the Walrus package targets separately. The current frontend signs Walrus SDK transactions directly, because Enoki only sponsors SUI gas and does not pay WAL storage fees.

### Google zkLogin

Frontend zkLogin wallet registration requires both:

```bash
VITE_ENOKI_PUBLIC_API_KEY=enoki_public_...
VITE_GOOGLE_CLIENT_ID=944974081005-ovfo9jsdu1ovfn9kkvm7hle46jbr80po.apps.googleusercontent.com
```

The Enoki private key is not enough for login; it is only for backend gas sponsorship.

## Seal Key Servers

Pick verified key servers from the Seal Pricing / provider page:

<https://seal-docs.wal.app/Pricing/>

For each provider, copy the on-chain KeyServer object ID. Current testnet config:

```bash
VITE_SEAL_KEY_SERVERS=0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75,0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8
```

- `mysten-testnet-1`: `https://seal-key-server-testnet-1.mystenlabs.com`
- `mysten-testnet-2`: `https://seal-key-server-testnet-2.mystenlabs.com`

Use a threshold such as 2-of-3 for demo availability. Changing key servers later requires re-wrapping the DEK or re-encrypting the Seal object.

## Walrus SDK Upload

The frontend uses `@mysten/walrus` with upload relay:

```bash
VITE_WALRUS_UPLOAD_RELAY_URL=https://upload-relay.testnet.walrus.space
```

Flow:

1. Encode encrypted payload as a Walrus file.
2. User signs `register`.
3. SDK uploads slivers through the relay.
4. User signs `certify`.
5. The resulting blob ID is written to Ailurus `publish_post`.

This does not use publisher / aggregator upload APIs.
