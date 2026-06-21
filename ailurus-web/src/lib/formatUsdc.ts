/** Format USDC for display — never show NaN. */
export function formatUsdc(amount: number | null | undefined) {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return value.toFixed(2);
}

/** Normalize getBalance from JSON-RPC (totalBalance) or gRPC (balance.coinBalance). */
export function extractBalanceMicros(response: {
  totalBalance?: string | bigint | number | null;
  balance?: {
    balance?: string;
    coinBalance?: string;
    addressBalance?: string;
  };
} | null | undefined) {
  if (!response) return undefined;
  if (response.totalBalance != null && response.totalBalance !== '') {
    return String(response.totalBalance);
  }
  const nested = response.balance;
  if (!nested) return undefined;
  try {
    const coin = BigInt(nested.coinBalance ?? nested.balance ?? '0');
    const address = BigInt(nested.addressBalance ?? '0');
    return (coin + address).toString();
  } catch {
    return nested.coinBalance ?? nested.balance;
  }
}

export function parseUsdcMicros(totalBalance: string | bigint | number | undefined | null) {
  if (totalBalance === undefined || totalBalance === null) return 0;
  try {
    const micros =
      typeof totalBalance === 'bigint'
        ? totalBalance
        : BigInt(typeof totalBalance === 'number' ? Math.trunc(totalBalance) : totalBalance);
    return Number(micros) / 1_000_000;
  } catch {
    return 0;
  }
}
