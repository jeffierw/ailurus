import { useCurrentAccount, useCurrentNetwork, useDAppKit } from '@mysten/dapp-kit-react';
import { useCallback } from 'react';
import { getStoredNetwork } from '../lib/networkConfig';

/** zkLogin / Enoki wallets require an explicit network when signing Seal session messages. */
export function useSealPersonalMessageSign() {
  const dAppKit = useDAppKit();
  const account = useCurrentAccount();
  const network = useCurrentNetwork() ?? getStoredNetwork();

  return useCallback(
    async (message: Uint8Array) => {
      if (!account?.address) {
        throw new Error('Not signed in');
      }
      const result = await dAppKit.signPersonalMessage({
        message,
        account,
        network,
      });
      if (!result?.signature) {
        throw new Error('Personal message signature was not returned');
      }
      return { signature: result.signature };
    },
    [account, dAppKit, network],
  );
}
