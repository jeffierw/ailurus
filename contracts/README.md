# Ailurus Move Contracts

## Build

```bash
sui move build
```

## First publish (one-time)

```bash
sui client publish --gas-budget 100000000
```

Save from the publish output:

- `UpgradeCap` object ID (needed for all future upgrades)
- Shared `Platform` object ID
- `AdminCap` object ID

## Upgrade (preferred — keeps Platform / posts / subscriptions)

Do **not** publish a fresh package when changing Move code. Use the `UpgradeCap` from the original publish:

```bash
# Move.toml must have published-at + addresses set to the current package ID
sui client upgrade \
  --upgrade-capability 0x73d35483a76c846f9e5c6d39b1a31ed0338776b0db1694e57ab1402581210907 \
  --gas-budget 200000000
```

After upgrade:

1. Read `UpgradeCap.package` — that is the **current package ID** for new modules (e.g. `profile`).
2. Update `published-at` and `[addresses].ailurus` in `Move.toml` to that ID.
3. Update `VITE_AILURUS_PACKAGE_ID` and worker `AILURUS_PACKAGE_ID` if the ID changed.
4. **Do not change** `VITE_AILURUS_PLATFORM_ID` — the shared Platform object stays the same.

### One-time ProfileRegistry

After the first upgrade that adds `profile.move`:

```bash
sui client call \
  --package <CURRENT_PACKAGE_ID> \
  --module profile \
  --function create_registry \
  --gas-budget 20000000
```

Set `VITE_AILURUS_PROFILE_REGISTRY_ID` to the shared `ProfileRegistry` object ID.

## Current Testnet Deployment (2026-06-21)

| Item | ID |
|------|-----|
| Package (v2, current) | `0x55bc531b35f0d0d63e4baa15cb90f693163bc6eba8040854cd27e869f28bfe0d` |
| Package (v1, legacy) | `0xe5f702358b711a236c618ed60c2e084964356e190f350f804c40396230355937` |
| Shared `Platform` | `0xf6f9d588ace7dbf1f9d1739b677f6d31e412108176fb1ce50cf96d32a593cada` |
| Shared `ProfileRegistry` | `0x701cdfec75bd4ac49def6f1e612862348a12591e73c5838284f8e08c1fc4627a` |
| `UpgradeCap` | `0x73d35483a76c846f9e5c6d39b1a31ed0338776b0db1694e57ab1402581210907` |
| `AdminCap` | `0x24c205cf8090d2f86c74b30d32e932f67dd946dcc571b4282e932536e6604fa9` |
| Upgrade digest | `3oyKoD11ypUUD5xrLZ1bxg5y9yRARxABkQK8tmhJXNcU` |
| Registry digest | `6quip3ivsHoUqu6HtGgTa9F9mPstQ31mWpiK3T4TENnr` |

## Frontend env

```bash
VITE_AILURUS_PACKAGE_ID=0x55bc531b35f0d0d63e4baa15cb90f693163bc6eba8040854cd27e869f28bfe0d
VITE_AILURUS_PLATFORM_ID=0xf6f9d588ace7dbf1f9d1739b677f6d31e412108176fb1ce50cf96d32a593cada
VITE_AILURUS_PROFILE_REGISTRY_ID=0x701cdfec75bd4ac49def6f1e612862348a12591e73c5838284f8e08c1fc4627a
VITE_AILURUS_USDC_TYPE=0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC
```

## MVP Model

The shared `Platform` stores creator profiles, post metadata, and monthly subscriptions. Fan handles live in shared `ProfileRegistry`. Media bytes are on Walrus; `seal_approve` checks active subscriptions.
