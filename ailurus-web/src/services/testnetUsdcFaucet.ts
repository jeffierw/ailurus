import { UserFacingError } from '../lib/userFacingError';
import { getNetworkConfig, getStoredNetwork } from '../lib/networkConfig';

export const TESTNET_USDC_MAX = 1;
export const TESTNET_USDC_PRESETS = [0.1, 0.2, 0.5, 1] as const;

export function clampTestnetUsdcAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.min(amount, TESTNET_USDC_MAX);
}

export async function requestTestnetUsdc(recipient: string, amountUsdc: number) {
  const clamped = clampTestnetUsdcAmount(amountUsdc);
  if (!clamped) {
    throw new UserFacingError('Invalid amount', 'Enter an amount between $0.01 and $1.00 USDC.');
  }

  const workerUrl =
    getNetworkConfig(getStoredNetwork()).sponsorWorkerUrl ??
    (import.meta.env.VITE_SPONSOR_WORKER_URL as string | undefined);
  if (!workerUrl) {
    throw new UserFacingError('Worker not configured', 'Testnet USDC faucet is not configured.');
  }

  const micros = Math.round(clamped * 1_000_000);
  const response = await fetch(`${workerUrl}/testnet/usdc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient,
      amount: String(micros),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    ok?: boolean;
    digest?: string;
  };

  if (!response.ok) {
    throw new UserFacingError(
      payload.error ?? `Testnet USDC faucet failed (${response.status})`,
      payload.error ?? 'Testnet USDC is temporarily unavailable. Try a smaller amount.',
    );
  }

  return payload;
}
