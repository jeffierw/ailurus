import { useCurrentClient, useCurrentNetwork } from '@mysten/dapp-kit-react';
import { registerEnokiWallets } from '@mysten/enoki';
import { useEffect, useRef } from 'react';
import { AILURUS_CONFIG } from './config';

const redirectUrl =
  typeof window === 'undefined' ? undefined : `${window.location.origin}/`;

export function RegisterEnokiWallets() {
  const client = useCurrentClient();
  const network = useCurrentNetwork();
  const registeredNetwork = useRef<string | null>(null);

  useEffect(() => {
    if (!AILURUS_CONFIG.enokiApiKey || !AILURUS_CONFIG.googleClientId) return;
    if (network !== 'testnet' && network !== 'mainnet' && network !== 'devnet') return;
    if (registeredNetwork.current === network) return;

    const { unregister } = registerEnokiWallets({
      apiKey: AILURUS_CONFIG.enokiApiKey,
      providers: {
        google: {
          clientId: AILURUS_CONFIG.googleClientId,
          redirectUrl,
        },
      },
      client,
      network,
    });

    registeredNetwork.current = network;
    return () => {
      unregister();
      registeredNetwork.current = null;
    };
  }, [client, network]);

  return null;
}
