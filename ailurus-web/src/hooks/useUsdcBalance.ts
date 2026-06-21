import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { parseUsdcMicros, extractBalanceMicros } from '../lib/formatUsdc';
import { AILURUS_CONFIG } from '../sui/config';

export const USDC_BALANCE_QUERY_KEY = ['ailurus', 'usdc-balance'] as const;

export function useUsdcBalance() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const queryClient = useQueryClient();
  const usdcType = AILURUS_CONFIG.usdcType;

  const query = useQuery({
    queryKey: [...USDC_BALANCE_QUERY_KEY, account?.address, usdcType],
    enabled: Boolean(account?.address && usdcType),
    queryFn: async () => {
      const response = await client.getBalance({
        owner: account!.address,
        coinType: usdcType!,
      });
      return parseUsdcMicros(extractBalanceMicros(response));
    },
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  const balanceUsdc =
    typeof query.data === 'number' && Number.isFinite(query.data) ? query.data : 0;

  const invalidateBalance = async () => {
    await queryClient.invalidateQueries({ queryKey: USDC_BALANCE_QUERY_KEY });
    return query.refetch();
  };

  return {
    balanceUsdc,
    isLoading: query.isLoading,
    refetch: query.refetch,
    invalidateBalance,
  };
}

/** Poll chain balance after faucet transfer — testnet indexer can lag briefly. */
export async function waitForUsdcBalance(
  refetch: () => Promise<{ data?: number }>,
  minUsdc: number,
  attempts = 8,
) {
  for (let index = 0; index < attempts; index += 1) {
    const result = await refetch();
    if (typeof result.data === 'number' && result.data >= minUsdc) {
      return result.data;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return (await refetch()).data ?? 0;
}
