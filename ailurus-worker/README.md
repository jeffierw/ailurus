# Ailurus Sponsor Worker

Cloudflare Worker for Enoki sponsored transactions on Sui Testnet.

## Setup

```bash
npm install
```

Set the Enoki private key as a Cloudflare secret. Do not put this value in frontend env files.

```bash
npx wrangler secret put ENOKI_SECRET_KEY
```

For testnet uploads, configure a small hot wallet that holds testnet WAL. This is only for demo/testnet funding.

```bash
npx wrangler secret put WAL_FAUCET_SECRET_KEY
```

Fund that wallet with testnet WAL before deploying:

```bash
walrus get-wal --amount 1000000000
```

For local development, create `.dev.vars`:

```bash
ENOKI_SECRET_KEY=enoki_private_...
WAL_FAUCET_SECRET_KEY=suiprivkey...
```

## Development

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:8787/health
```

## API

### `POST /sponsor/create`

Create a sponsored transaction.

For zkLogin users, send `jwt`:

```json
{
  "network": "testnet",
  "transactionKindBytes": "<base64-tx-kind-bytes>",
  "jwt": "<zklogin-jwt>"
}
```

For explicit sender mode, send `sender`:

```json
{
  "network": "testnet",
  "transactionKindBytes": "<base64-tx-kind-bytes>",
  "sender": "0x...",
  "extraAllowedAddresses": ["0x..."]
}
```

Response:

```json
{
  "bytes": "<sponsored-transaction-bytes>",
  "digest": "<tx-digest>"
}
```

### `POST /sponsor/execute`

Execute a sponsored transaction after the user signs the sponsored bytes.

```json
{
  "digest": "<tx-digest-from-create>",
  "signature": "<user-signature>"
}
```

### `POST /testnet/faucet`

Request testnet SUI for a user address before the frontend exchanges SUI for testnet WAL.

```json
{
  "recipient": "0x..."
}
```

This endpoint only works when `SUI_NETWORK=testnet`.

### `POST /testnet/wal`

Transfer the dry-run estimated amount of testnet WAL from the Worker hot wallet to a user before upload.

```json
{
  "recipient": "0x...",
  "amount": "857367"
}
```

Optional vars:

```bash
WAL_TYPE=0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL
WAL_MAX_DRIP_AMOUNT=200000000
```

The frontend dry-runs the Walrus register transaction first, parses the `Required - Available` WAL amount, and passes that amount to this endpoint. The max amount is a guardrail against accidental or abusive requests.

## Deploy

```bash
npm run deploy
```

After deploy, add the Worker URL to the frontend:

```bash
VITE_SPONSOR_WORKER_URL=https://ailurus-sponsor.<your-subdomain>.workers.dev
```

`ALLOWED_ORIGINS` in `wrangler.jsonc` must include your frontend origin. The web app runs on port `3000` by default (`http://localhost:3000`).
