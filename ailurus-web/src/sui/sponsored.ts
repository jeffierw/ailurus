import { isEnokiWallet } from '@mysten/enoki';
import { Transaction } from '@mysten/sui/transactions';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { toBase64 } from '@mysten/utils';
import type { UiWallet } from '@wallet-standard/ui';
import { AILURUS_CONFIG } from './config';

type SignTransactionFn = (args: { transaction: string | Transaction }) => Promise<{ signature: string }>;

export async function signAndExecuteWithSponsor(input: {
  transaction: Transaction;
  sender: string;
  client: SuiGrpcClient;
  wallet: UiWallet | null;
  signTransaction: SignTransactionFn;
  extraAllowedAddresses?: string[];
}) {
  const { transaction, sender, client, wallet, signTransaction, extraAllowedAddresses } = input;
  transaction.setSender(sender);

  const sponsorUrl = import.meta.env.VITE_SPONSOR_WORKER_URL as string | undefined;
  if (sponsorUrl && wallet && isEnokiWallet(wallet)) {
    const kindBytes = await transaction.build({ client, onlyTransactionKind: true });
    const createRes = await fetch(`${sponsorUrl}/sponsor/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network: AILURUS_CONFIG.defaultNetwork,
        transactionKindBytes: toBase64(kindBytes),
        sender,
        extraAllowedAddresses,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(
        typeof err === 'object' && err && 'error' in err
          ? String((err as { error: string }).error)
          : `Sponsor create failed (${createRes.status})`,
      );
    }

    const sponsored = (await createRes.json()) as { bytes: string; digest: string };
    const signed = await signTransaction({ transaction: sponsored.bytes });
    const executeRes = await fetch(`${sponsorUrl}/sponsor/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ digest: sponsored.digest, signature: signed.signature }),
    });

    if (!executeRes.ok) {
      const err = await executeRes.json().catch(() => ({}));
      throw new Error(
        typeof err === 'object' && err && 'error' in err
          ? String((err as { error: string }).error)
          : `Sponsor execute failed (${executeRes.status})`,
      );
    }

    await client.waitForTransaction({ digest: sponsored.digest });
    return sponsored.digest;
  }

  throw new Error('Sponsored execution unavailable');
}
