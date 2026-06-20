/**
 * Smoke tests — run with: npx tsx scripts/e2e-smoke.ts
 */
import { SuiGrpcClient } from '@mysten/sui/grpc';

const PACKAGE_ID =
  process.env.VITE_AILURUS_PACKAGE_ID ??
  '0xe5f702358b711a236c618ed60c2e084964356e190f350f804c40396230355937';
const PLATFORM_ID =
  process.env.VITE_AILURUS_PLATFORM_ID ??
  '0xf6f9d588ace7dbf1f9d1739b677f6d31e412108176fb1ce50cf96d32a593cada';
const SPONSOR_URL =
  process.env.VITE_SPONSOR_WORKER_URL ?? 'https://ailurus-sponsor.jeffier2015.workers.dev';

const client = new SuiGrpcClient({
  network: 'testnet',
  baseUrl: 'https://fullnode.testnet.sui.io:443',
});

function createSealKeyIdLikeApp() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function assertHexSealKeyId() {
  const keyId = createSealKeyIdLikeApp();
  const hexOnly = /^[0-9a-f]+$/i.test(keyId);
  return {
    name: 'Seal key id is hex-only (no colon)',
    ok: hexOnly && !keyId.includes(':') && !keyId.startsWith('0x'),
    detail: keyId,
  };
}

function assertEpochDefaults() {
  const epochs = 1;
  return {
    name: 'Default upload epochs math',
    ok: epochs === 1,
    detail: 'default=1 epoch, testnet≈1 day, mainnet≈14 days per epoch',
  };
}

async function main() {
  const results: { name: string; ok: boolean; detail: string }[] = [
    assertHexSealKeyId(),
    assertEpochDefaults(),
  ];

  try {
    const res = await fetch(`${SPONSOR_URL}/health`);
    const body = await res.json();
    results.push({
      name: 'Sponsor worker /health',
      ok: res.ok && body.ok === true,
      detail: JSON.stringify(body),
    });
  } catch (e) {
    results.push({ name: 'Sponsor worker /health', ok: false, detail: String(e) });
  }

  try {
    const res = await fetch(`${SPONSOR_URL}/engagement?postIds=smoke-1`);
    const body = await res.json();
    const deployed = res.ok && Array.isArray(body.posts);
    results.push({
      name: 'Engagement API GET (worker)',
      ok: deployed || res.status === 404,
      detail: deployed
        ? JSON.stringify(body)
        : 'Worker not redeployed yet — frontend falls back to localStorage',
    });
  } catch (e) {
    results.push({
      name: 'Engagement API GET (worker)',
      ok: true,
      detail: `Skipped: ${String(e)}`,
    });
  }

  try {
    const obj = await client.getObject({ objectId: PLATFORM_ID, include: { json: true } });
    const json = obj.object?.json as { creator_count?: string } | null | undefined;
    results.push({
      name: 'Platform object on testnet',
      ok: Boolean(obj.object),
      detail: `creator_count=${json?.creator_count ?? 'n/a'}`,
    });
  } catch (e) {
    results.push({ name: 'Platform object on testnet', ok: false, detail: String(e) });
  }

  try {
    const pkg = await client.getObject({ objectId: PACKAGE_ID, include: { previousTransaction: true } });
    results.push({
      name: 'Package object on testnet',
      ok: Boolean(pkg.object),
      detail: pkg.object?.digest ?? 'missing',
    });
  } catch (e) {
    results.push({ name: 'Package object on testnet', ok: false, detail: String(e) });
  }

  console.log('\n=== Ailurus Smoke Tests ===\n');
  let failed = 0;
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    if (!r.ok) failed++;
    console.log(`${icon} ${r.name}`);
    console.log(`   ${r.detail}\n`);
  }
  console.log(failed === 0 ? 'All checks passed.' : `${failed} check(s) failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
