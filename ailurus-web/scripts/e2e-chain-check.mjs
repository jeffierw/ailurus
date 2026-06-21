const PLATFORM = '0xf6f9d588ace7dbf1f9d1739b677f6d31e412108176fb1ce50cf96d32a593cada';
const PKG = '0xe5f702358b711a236c618ed60c2e084964356e190f350f804c40396230355937';
const CREATOR = '0x1df7e48ed9d373a209e6daa4205f5fc16f7d17d82e1a2368ee1b0bb265955a85';
const RPC = 'https://fullnode.testnet.sui.io:443';
const WORKER = 'https://ailurus-sponsor.jeffier2015.workers.dev';

async function rpc(method, params) {
  const response = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message ?? method);
  return payload.result;
}

async function devInspectSealApprove(sender, fan, creator, sealKeyId) {
  const { fromHex } = await import('@mysten/bcs');
  const { Transaction } = await import('@mysten/sui/transactions');
  const { SuiGrpcClient } = await import('@mysten/sui/grpc');
  const client = new SuiGrpcClient({ network: 'testnet', baseUrl: RPC });
  const tx = new Transaction();
  tx.moveCall({
    target: `${PKG}::platform::seal_approve`,
    arguments: [
      tx.pure.vector('u8', Array.from(fromHex(sealKeyId))),
      tx.object(PLATFORM),
      tx.pure.address(fan),
      tx.pure.address(creator),
      tx.object.clock(),
    ],
  });
  const built = await tx.build({ client, onlyTransactionKind: true });
  const b64 = Buffer.from(built).toString('base64');
  const result = await rpc('sui_devInspectTransactionBlock', [sender, b64]);
  return result.effects?.status;
}

async function main() {
  const platform = await rpc('sui_getObject', [PLATFORM, { showContent: true }]);
  const fields = platform.data.content.fields;
  const subscriptions = fields.subscriptions ?? [];
  console.log('On-chain subscriptions:', subscriptions.length);
  console.log('Creator price micros:', fields.creators[0].fields.price_micros);
  console.log('Locked posts:', fields.posts.filter((p) => p.fields.is_locked).length);

  const sealKeyId = '5e8b307ca13731242c102e62494446d6';
  const creatorApprove = await devInspectSealApprove(CREATOR, CREATOR, CREATOR, sealKeyId);
  console.log('seal_approve (creator views own post):', creatorApprove);

  const fan = '0x91e6aab493ef6f5a2421221b7ff763714117f38320cc397289c097650e41a849';
  const fanApprove = await devInspectSealApprove(fan, fan, CREATOR, sealKeyId);
  console.log('seal_approve (non-subscriber):', fanApprove);

  const workerHealth = await fetch(`${WORKER}/health`).then((r) => r.json()).catch((e) => ({ error: e.message }));
  console.log('Worker health:', workerHealth);

  const corsProbe = await fetch(WORKER, { method: 'OPTIONS', headers: { Origin: 'https://ailurus.wal.app' } });
  console.log('Worker CORS preflight:', corsProbe.status, corsProbe.headers.get('access-control-allow-origin'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
