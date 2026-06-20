import { useCurrentNetwork } from '@mysten/dapp-kit-react';
import { isTestnet } from '../lib/networkConfig';
import type { SuiNetwork } from '../sui/config';

/** Hide USDC deposit on testnet — uploads use WAL faucet instead. */
export function useShowUsdcDeposit() {
  const network = (useCurrentNetwork() ?? 'testnet') as SuiNetwork;
  return !isTestnet(network);
}
