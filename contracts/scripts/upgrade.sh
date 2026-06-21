#!/usr/bin/env bash
# Upgrade Ailurus Move package in-place (keeps Platform / posts / subscriptions).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACTS="$ROOT/contracts"
UPGRADE_CAP="${1:-0x73d35483a76c846f9e5c6d39b1a31ed0338776b0db1694e57ab1402581210907}"

echo "==> Building..."
(cd "$CONTRACTS" && sui move build)

echo "==> Upgrading with UpgradeCap $UPGRADE_CAP ..."
OUTPUT=$(cd "$CONTRACTS" && sui client upgrade --upgrade-capability "$UPGRADE_CAP" --gas-budget 200000000 2>&1)
echo "$OUTPUT"

NEW_PKG=$(echo "$OUTPUT" | grep -oE '0x[a-fA-F0-9]{64}' | head -1 || true)
if [[ -z "$NEW_PKG" ]]; then
  NEW_PKG=$(sui client object "$UPGRADE_CAP" --json | python3 -c "import json,sys; print(json.load(sys.stdin)['content']['package'])")
fi

echo ""
echo "==> New package ID: $NEW_PKG"
echo "    Update Move.toml published-at + ailurus address"
echo "    Update VITE_AILURUS_PACKAGE_ID and worker AILURUS_PACKAGE_ID"
echo "    Update docs/enoki-allowlist.txt move call targets"
echo "    Platform ID does NOT change."
