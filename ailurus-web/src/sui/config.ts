export const SUI_NETWORKS = ['testnet', 'mainnet'] as const;

export type SuiNetwork = (typeof SUI_NETWORKS)[number];

export const GRPC_URLS: Record<SuiNetwork, string> = {
  testnet: 'https://fullnode.testnet.sui.io:443',
  mainnet: 'https://fullnode.mainnet.sui.io:443',
};

export const AILURUS_CONFIG = {
  defaultNetwork: (import.meta.env.VITE_SUI_NETWORK as SuiNetwork | undefined) ?? 'testnet',
  packageId: import.meta.env.VITE_AILURUS_PACKAGE_ID as string | undefined,
  platformId: import.meta.env.VITE_AILURUS_PLATFORM_ID as string | undefined,
  usdcType: import.meta.env.VITE_AILURUS_USDC_TYPE as string | undefined,
  enokiApiKey: import.meta.env.VITE_ENOKI_PUBLIC_API_KEY as string | undefined,
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined,
  walType:
    (import.meta.env.VITE_WALRUS_WAL_TYPE as string | undefined) ??
    '0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL',
  walrusUploadRelayUrl:
    (import.meta.env.VITE_WALRUS_UPLOAD_RELAY_URL as string | undefined) ??
    'https://upload-relay.testnet.walrus.space',
  // Max tip (MIST) the Walrus upload relay may charge per blob. SDK fetches relay tip-config.
  walrusUploadRelayTipMax: Number(import.meta.env.VITE_WALRUS_UPLOAD_RELAY_TIP_MAX ?? 10_000),
  walrusUploadRelayTipAddress:
    (import.meta.env.VITE_WALRUS_UPLOAD_RELAY_TIP_ADDRESS as string | undefined) ??
    '0x4b6a7439159cf10533147fc3d678cf10b714f2bc998f6cb1f1b0b9594cdc52b6',
  cetusAggregatorEndpoint:
    (import.meta.env.VITE_CETUS_AGGREGATOR_ENDPOINT as string | undefined) ??
    'https://api-sui.cetus.zone/router_v3',
  sealKeyServers: ((import.meta.env.VITE_SEAL_KEY_SERVERS as string | undefined) ?? '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean),
};

export function hasOnChainConfig() {
  return Boolean(AILURUS_CONFIG.packageId && AILURUS_CONFIG.platformId && AILURUS_CONFIG.usdcType);
}

export function missingConfigKeys() {
  return [
    ['VITE_AILURUS_PACKAGE_ID', AILURUS_CONFIG.packageId],
    ['VITE_AILURUS_PLATFORM_ID', AILURUS_CONFIG.platformId],
    ['VITE_AILURUS_USDC_TYPE', AILURUS_CONFIG.usdcType],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
}
