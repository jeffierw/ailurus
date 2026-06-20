import { useCurrentNetwork, useDAppKit } from '@mysten/dapp-kit-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  getNetworkConfig,
  getStoredNetwork,
  hasOnChainConfigForNetwork,
  isTestnet,
  setStoredNetwork,
} from '../lib/networkConfig';
import type { SuiNetwork } from '../sui/config';
import { PLATFORM_QUERY_KEY } from '../sui/platform';
import { ENGAGEMENT_QUERY_KEY } from './useEngagement';

export function useAppNetwork() {
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();
  const network = (useCurrentNetwork() ?? getStoredNetwork()) as SuiNetwork;
  const config = getNetworkConfig(network);

  const switchNetwork = useCallback(
    async (next: SuiNetwork) => {
      if (next === network) return;
      setStoredNetwork(next);
      await dAppKit.switchNetwork(next);
      await queryClient.invalidateQueries({ queryKey: PLATFORM_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ENGAGEMENT_QUERY_KEY });
      toast.success(`Switched to ${next === 'testnet' ? 'Testnet' : 'Mainnet'}`);
    },
    [dAppKit, network, queryClient],
  );

  return {
    network,
    config,
    isTestnet: isTestnet(network),
    chainConfigured: hasOnChainConfigForNetwork(network),
    switchNetwork,
  };
}
