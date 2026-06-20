import { SealClient } from '@mysten/seal';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { AILURUS_CONFIG } from '../sui/config';

let cachedSeal: SealClient | null = null;

export function getSealThreshold() {
  const count = AILURUS_CONFIG.sealKeyServers.length;
  if (count === 0) return 0;
  return Math.min(2, count);
}

export function hasSealConfig() {
  return Boolean(AILURUS_CONFIG.packageId && AILURUS_CONFIG.sealKeyServers.length > 0);
}

export function getSealClient(suiClient: SuiGrpcClient) {
  if (!hasSealConfig()) {
    throw new Error('Seal key servers are not configured');
  }
  if (!cachedSeal) {
    cachedSeal = new SealClient({
      suiClient,
      serverConfigs: AILURUS_CONFIG.sealKeyServers.map((objectId) => ({ objectId, weight: 1 })),
      verifyKeyServers: false,
    });
  }
  return cachedSeal;
}

export function sealKeyIdBytes(sealKeyId: string) {
  return new TextEncoder().encode(sealKeyId);
}
