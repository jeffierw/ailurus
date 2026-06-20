import { useCurrentNetwork } from '@mysten/dapp-kit-react';
import { epochHint } from '../lib/walrusEpochs';
import type { SuiNetwork } from '../sui/config';

export function useEpochHint() {
  const network = (useCurrentNetwork() ?? 'testnet') as SuiNetwork;
  return epochHint(network);
}
