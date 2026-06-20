import { AILURUS_CONFIG, GRPC_URLS, SUI_NETWORKS, type SuiNetwork } from '../sui/config';

const NETWORK_STORAGE_KEY = 'ailurus:network';

export function getStoredNetwork(): SuiNetwork {
  try {
    const stored = localStorage.getItem(NETWORK_STORAGE_KEY);
    if (stored && SUI_NETWORKS.includes(stored as SuiNetwork)) {
      return stored as SuiNetwork;
    }
  } catch {
    // ignore
  }
  return AILURUS_CONFIG.defaultNetwork;
}

export function setStoredNetwork(network: SuiNetwork) {
  localStorage.setItem(NETWORK_STORAGE_KEY, network);
}

export function getNetworkConfig(network: SuiNetwork) {
  const isMainnet = network === 'mainnet';
  return {
    network,
    grpcUrl: GRPC_URLS[network],
    packageId: isMainnet
      ? (import.meta.env.VITE_AILURUS_PACKAGE_ID_MAINNET as string | undefined) ??
        AILURUS_CONFIG.packageId
      : AILURUS_CONFIG.packageId,
    platformId: isMainnet
      ? (import.meta.env.VITE_AILURUS_PLATFORM_ID_MAINNET as string | undefined) ??
        AILURUS_CONFIG.platformId
      : AILURUS_CONFIG.platformId,
    usdcType: isMainnet
      ? (import.meta.env.VITE_AILURUS_USDC_TYPE_MAINNET as string | undefined) ??
        AILURUS_CONFIG.usdcType
      : AILURUS_CONFIG.usdcType,
    walrusUploadRelayUrl: isMainnet
      ? 'https://upload-relay.mainnet.walrus.space'
      : 'https://upload-relay.testnet.walrus.space',
    walrusAggregatorUrl: isMainnet
      ? 'https://aggregator.walrus-mainnet.walrus.space'
      : 'https://aggregator.walrus-testnet.walrus.space',
    sponsorWorkerUrl:
      (import.meta.env.VITE_SPONSOR_WORKER_URL as string | undefined) ??
      'https://ailurus-sponsor.jeffier2015.workers.dev',
  };
}

export function hasOnChainConfigForNetwork(network: SuiNetwork) {
  const cfg = getNetworkConfig(network);
  return Boolean(cfg.packageId && cfg.platformId && cfg.usdcType);
}

export function isTestnet(network: SuiNetwork) {
  return network === 'testnet';
}
