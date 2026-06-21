import { isEnokiWallet } from '@mysten/enoki';
import { Transaction } from '@mysten/sui/transactions';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { toBase64 } from '@mysten/utils';
import type { UiWallet } from '@wallet-standard/ui';
import { logAppError, toUserFacingMessage, UserFacingError } from '../lib/userFacingError';
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
      logAppError('sponsor/create', err);
      const technical =
        typeof err === 'object' && err && 'error' in err
          ? String((err as { error: string }).error)
          : `Sponsor create failed (${createRes.status})`;
      throw new UserFacingError(
        technical,
        toUserFacingMessage(err, 'Could not prepare transaction. Please try again.'),
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
      logAppError('sponsor/execute', err);
      const technical =
        typeof err === 'object' && err && 'error' in err
          ? String((err as { error: string }).error)
          : `Sponsor execute failed (${executeRes.status})`;
      throw new UserFacingError(
        technical,
        toUserFacingMessage(err, 'Could not complete transaction. Please try again.'),
      );
    }

    await client.waitForTransaction({ digest: sponsored.digest });
    return sponsored.digest;
  }

  throw new UserFacingError(
    'Sponsored execution unavailable',
    'Transaction sponsorship is unavailable. Please try again.',
  );
}
