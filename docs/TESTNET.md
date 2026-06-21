# Ailurus Testnet Setup

## Contract (upgrade, not republish)

| Item | ID |
|------|-----|
| Package (v2) | `0x55bc531b35f0d0d63e4baa15cb90f693163bc6eba8040854cd27e869f28bfe0d` |
| Shared Platform | `0xf6f9d588ace7dbf1f9d1739b677f6d31e412108176fb1ce50cf96d32a593cada` |
| ProfileRegistry | `0x701cdfec75bd4ac49def6f1e612862348a12591e73c5838284f8e08c1fc4627a` |
| UpgradeCap | `0x73d35483a76c846f9e5c6d39b1a31ed0338776b0db1694e57ab1402581210907` |

Use `sui client upgrade --upgrade-capability 0x73d35483...` for future Move changes. Platform / posts / subscriptions stay on the same shared object. See `contracts/README.md`.

## Coin Types

- Circle USDC Testnet: `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC`
- Walrus Testnet WAL: `0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL`

## Sponsor Worker

```bash
cd ailurus-worker
npm install
npx wrangler secret put ENOKI_SECRET_KEY
npx wrangler secret put WAL_FAUCET_SECRET_KEY   # optional, for tWAL drip
npm run deploy
```

Frontend:

```bash
VITE_SPONSOR_WORKER_URL=https://your-sponsor-worker.workers.dev
```

The worker passes `allowedMoveCallTargets` and `allowedAddresses` on every sponsored tx (sender mode). Portal allowlist below is a fallback / audit copy — keep in sync with `docs/enoki-allowlist.txt`.

### Enoki Portal Allowlist

Portal: configure allowlists in [Enoki Portal](https://portal.enoki.mystenlabs.com/) for your app.

**Allowed move call targets** — copy from `docs/enoki-allowlist.txt` or:

```text
0x55bc531b35f0d0d63e4baa15cb90f693163bc6eba8040854cd27e869f28bfe0d::platform::register_creator
0x55bc531b35f0d0d63e4baa15cb90f693163bc6eba8040854cd27e869f28bfe0d::platform::update_price
0x55bc531b35f0d0d63e4baa15cb90f693163bc6eba8040854cd27e869f28bfe0d::platform::publish_post
0x55bc531b35f0d0d63e4baa15cb90f693163bc6eba8040854cd27e869f28bfe0d::platform::subscribe
0x55bc531b35f0d0d63e4baa15cb90f693163bc6eba8040854cd27e869f28bfe0d::platform::update_creator_profile
0x55bc531b35f0d0d63e4baa15cb90f693163bc6eba8040854cd27e869f28bfe0d::platform::set_creator_avatar
0x55bc531b35f0d0d63e4baa15cb90f693163bc6eba8040854cd27e869f28bfe0d::profile::register_fan
0x55bc531b35f0d0d63e4baa15cb90f693163bc6eba8040854cd27e869f28bfe0d::profile::update_fan_profile
```

**Allowed addresses:**

```text
0xf6f9d588ace7dbf1f9d1739b677f6d31e412108176fb1ce50cf96d32a593cada
0x701cdfec75bd4ac49def6f1e612862348a12591e73c5838284f8e08c1fc4627a
0x4b6a7439159cf10533147fc3d678cf10b714f2bc998f6cb1f1b0b9594cdc52b6
```

### Google zkLogin

```bash
VITE_ENOKI_PUBLIC_API_KEY=enoki_public_...
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

## Seal Key Servers

```bash
VITE_SEAL_KEY_SERVERS=0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75,0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8
```

## Walrus SDK Upload

```bash
VITE_WALRUS_UPLOAD_RELAY_URL=https://upload-relay.testnet.walrus.space
```
