# Ailurus Move Contracts

## Build

```bash
sui move build
```

## Publish

```bash
sui client publish --gas-budget 100000000
```

After publishing, copy these values into `ailurus-web/.env`:

- `VITE_AILURUS_PACKAGE_ID`: the published package ID.
- `VITE_AILURUS_PLATFORM_ID`: the shared `Platform` object created by `init`.
- `VITE_AILURUS_USDC_TYPE`: the USDC coin type used for subscriptions.

## Current Testnet Deployment

- Package ID: `0x8a16ba37720b931cd149b66e6728b1d345bdb411428d4046c491cc84fc0fec1c`
- Shared `Platform`: `0x36210b1855a297e597e5211790d0d135b74e40c2a4e5001e22a89c1092ee71cc`
- AdminCap: `0xee48a098b47deedf4901795d884c4ca4f1f9e7550547716093ed0444f25c8783`
- Publish digest: `FfxHEQdZ2TAVfVbsSrqaQNw4dXn5CnysFMH7HDBUf5Dk`

## MVP Model

The shared `Platform` stores creator profiles, post metadata, and monthly subscriptions. Media bytes are not stored on-chain; posts keep the Walrus blob ID and Seal object/policy pointers, while `seal_approve` checks whether a subscriber has an active subscription.
