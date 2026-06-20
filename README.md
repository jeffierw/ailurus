<p align="center">
  <img src="ailurus-web/public/logo.png" alt="Ailurus logo" width="420" />
</p>

# Ailurus

**A creator subscription platform on Sui — Google login, USDC subscriptions, Walrus storage & Seal paywalls, zero gas.**

> Sui Overflow 2026 · Walrus Track · Testnet MVP

*Ailurus* (Latin: *Ailurus fulgens*, the red panda) lets creators monetize through USDC subscriptions and fans unlock exclusive content with one click. Users only see Google sign-in and USDC — identity, storage, encryption, and settlement are handled silently by the full Sui stack.

---

## What it does

Ailurus is a decentralized creator economy platform with a Web2-grade experience:

| What users see | What happens on-chain |
|--------------|----------------------|
| Continue with Google | Enoki zkLogin identity |
| Subscribe for $X USDC / month | Move contract records subscription & settles USDC |
| Instantly unlock exclusive albums | Seal decrypts content for active subscribers |
| Zero gas fees | Enoki sponsors SUI via Cloudflare Worker |
| Upload photos & videos | Walrus stores encrypted blobs |

**End-to-end flow:** Sign up → fund USDC → upload content → set price → fans subscribe → content unlocks.

---

## Why it matters

Creator platforms charge high fees, control your content, and can deplatform you overnight. Web3 alternatives demand wallets, gas, and multiple tokens — a non-starter for mainstream fans.

Ailurus targets a proven billion-dollar model (OnlyFans / Patreon) with a different foundation:

- **Transparent settlement** — USDC paid directly on-chain via Move contracts
- **Content sovereignty** — media stored on Walrus, access gated by Seal subscription policies
- **Zero Web3 friction** — no seed phrases, no WAL concept, no gas popups

**Aha moment:** Google login → pay USDC → instantly unlock a creator's encrypted photo album.

---

## The problem

| Pain point | Today | Ailurus |
|------------|-------|---------|
| High platform fees | 20%+ cuts on centralized platforms | On-chain transparent USDC settlement |
| Web3 onboarding | Seed phrases, gas, multiple tokens | Enoki Google login + sponsored gas |
| Content ownership | Centralized storage, platform can delete | Walrus decentralized storage + Seal encryption |
| Cross-border payments | Fiat rails are limited | Global USDC on Sui |

---

## Sui stack

Built for **Walrus Track** — large media blobs are the ideal decentralized storage use case.

```
┌─────────────────────────────────────────────────────────┐
│  React + TypeScript + dApp Kit  (Web2 experience)       │
│  Google login · USDC · Feed · Upload · Subscribe        │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Enoki (zkLogin + Sponsored Gas)                        │
│  Cetus Aggregator (USDC → WAL, user-invisible)          │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Sui Move          Walrus              Seal             │
│  subscriptions     encrypted blobs     paywall + decrypt│
└─────────────────────────────────────────────────────────┘
```

| Component | Role |
|-----------|------|
| **Enoki** | OAuth identity, sponsored gas |
| **Walrus** | Photo & video blob storage |
| **Seal** | Subscription paywall & content decryption |
| **Move** | USDC subscriptions, creator profiles, post metadata |
| **Cetus Aggregator** | USDC → WAL liquidity for storage fees |

---

## Features

### For fans
- Google one-click login (Enoki zkLogin)
- Browse creator profiles and content feed
- Subscribe with **USDC** per month
- Auto-unlock encrypted content after subscribing (Seal)

### For creators
- Create a profile and set a monthly USDC price
- Upload photo albums & short videos to Walrus
- View subscribers and on-chain income
- Content encrypted at upload; only active subscribers can decrypt

---

## Architecture highlights

### Enoki — identity & gas
- **zkLogin:** Google OAuth → Sui address, no seed phrase
- **Sponsored gas:** `ailurus-worker` holds the Enoki private key server-side with an allowlist of Move call targets
- Private keys never ship to the browser or git

### Walrus + Seal — storage & privacy
- **Walrus:** `@mysten/walrus` SDK — register → upload → certify via testnet upload relay
- **Seal:** content encrypted at upload; subscription status is the decryption policy
- Move contract stores `walrus_blob_id` and `seal_policy_id` per post

### Move — `platform.move`
- **Creator:** profile, price, Seal policy, income stats
- **Post:** Walrus blob reference, Seal object, lock state
- **Subscription:** fan address, expiry, USDC payment record
- **Events:** `CreatorRegistered`, `Subscribed`, `PostPublished`

---

## Repository structure

```
ailurus/
├── ailurus-web/       # React frontend (Vite + dApp Kit + Walrus/Seal SDK)
├── ailurus-worker/    # Cloudflare Worker — Enoki gas sponsorship
├── contracts/         # Sui Move — platform.move
├── docs/              # Testnet setup & deployment notes
└── PROJECT.md         # Full project spec (Chinese)
```

---

## Getting started

### Prerequisites

- Node.js 20+
- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install) (for contracts)
- Google OAuth client ID & Enoki API keys (see below)

### Frontend

```bash
cd ailurus-web
cp .env.example .env   # fill in your keys
npm install
npm run dev
```

Open http://localhost:5173

### Sponsor worker (local)

```bash
cd ailurus-worker
cp .dev.vars.example .dev.vars   # ENOKI_SECRET_KEY, optional WAL_FAUCET_SECRET_KEY
npm install
npm run dev
```

### Contracts

```bash
cd contracts
sui move build
sui client publish --gas-budget 100000000
```

Copy published IDs into `ailurus-web/.env`. See [docs/TESTNET.md](docs/TESTNET.md) for the current testnet deployment.

### Environment variables

| File | Purpose |
|------|---------|
| `ailurus-web/.env` | Public frontend config (`VITE_*` vars) |
| `ailurus-worker/.dev.vars` | **Secrets only** — Enoki private key, faucet key |

> Never commit `.env` or `.dev.vars`. Use the `.example` templates.

---

## Testnet deployment

| Resource | ID |
|----------|-----|
| Network | Sui Testnet |
| Package | `0xe5f702358b711a236c618ed60c2e084964356e190f350f804c40396230355937` |
| Platform (shared) | `0xf6f9d588ace7dbf1f9d1739b677f6d31e412108176fb1ce50cf96d32a593cada` |
| USDC (Circle testnet) | `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC` |

Full setup: [docs/TESTNET.md](docs/TESTNET.md)

---

## Demo assets

| Asset | Path |
|-------|------|
| Overflow deck (simplified) | [docs/ailurus-overflow-demo-deck.pptx](docs/ailurus-overflow-demo-deck.pptx) |
| Demo video (Testnet walkthrough) | [demo/ailurus-overflow-demo.mp4](demo/ailurus-overflow-demo.mp4) |

Deck structure follows Overflow submission rhythm: problem overview → product demo → conclusion & vision. Regenerate the deck with `uv run scripts/generate-demo-deck.py`.

---

## Roadmap

| Phase | Status |
|-------|--------|
| **Phase 1 — Hackathon MVP (current)** | Testnet: login, subscribe, Walrus upload, Seal unlock |
| **Phase 2 — Mainnet (July 2026)** | Mainnet contracts, Enoki production config, creator onboarding |
| **Phase 3 — Growth** | Multi-OAuth, analytics, recommendation feed, Enoki Connect |

---

## Why a strong Overflow project

1. **Real business model** — subscription economics proven by Patreon & OnlyFans
2. **Full Sui stack** — Enoki + Walrus + Seal + Move + Cetus, not a bolt-on demo
3. **Web2-first UX** — judges see a usable product, not just a smart contract
4. **Walrus Track fit** — media content is the canonical large-blob use case
5. **Demo-ready aha moment** — login → pay USDC → unlock in seconds
6. **Mainnet path** — USDC, Cetus, Walrus, and Enoki all support mainnet

---

## Resources

- [Overflow 2026 Handbook](https://mystenlabs.notion.site/overflow-2026-handbook)
- [Enoki Docs](https://docs.enoki.mystenlabs.com/)
- [Walrus Docs](https://docs.wal.app)
- [Seal Docs](https://seal-docs.wal.app)
- [Project spec (中文)](PROJECT.md)

---

## License

See [LICENSE](LICENSE).
