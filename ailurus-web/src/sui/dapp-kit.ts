import { createDAppKit } from '@mysten/dapp-kit-react';
import { enokiWalletsInitializer } from '@mysten/enoki';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { AILURUS_CONFIG, GRPC_URLS, SUI_NETWORKS, type SuiNetwork } from './config';
import { getStoredNetwork } from '../lib/networkConfig';

const redirectUrl =
  typeof window === 'undefined' ? undefined : `${window.location.origin}/`;

const initializers =
  AILURUS_CONFIG.enokiApiKey && AILURUS_CONFIG.googleClientId
    ? [
        enokiWalletsInitializer({
          apiKey: AILURUS_CONFIG.enokiApiKey,
          providers: {
            google: {
              clientId: AILURUS_CONFIG.googleClientId,
              redirectUrl,
            },
          },
        }),
      ]
    : [];

export const dAppKit = createDAppKit({
  networks: [...SUI_NETWORKS],
  defaultNetwork: getStoredNetwork() ?? AILURUS_CONFIG.defaultNetwork,
  createClient: (network) =>
    new SuiGrpcClient({
      network: network as SuiNetwork,
      baseUrl: GRPC_URLS[network as SuiNetwork],
    }),
  autoConnect: true,
  storage: globalThis.localStorage,
  storageKey: 'ailurus_dappkit',
  walletInitializers: initializers,
});

declare module '@mysten/dapp-kit-react' {
  interface Register {
    dAppKit: typeof dAppKit;
  }
}
