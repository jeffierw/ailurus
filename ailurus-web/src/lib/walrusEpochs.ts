import type { SuiNetwork } from '../sui/config';

export const MAX_WALRUS_EPOCHS = 53;
export const DEFAULT_WALRUS_EPOCHS = 1;

/** Walrus epoch duration by network (see docs.wal.app). */
export const EPOCH_DAYS: Record<SuiNetwork, number> = {
  testnet: 1,
  mainnet: 14,
};

export function epochDaysForNetwork(network: SuiNetwork) {
  return EPOCH_DAYS[network];
}

export function storageDays(epochs: number, network: SuiNetwork) {
  return epochs * epochDaysForNetwork(network);
}

export function clampEpochs(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_WALRUS_EPOCHS;
  return Math.min(MAX_WALRUS_EPOCHS, Math.max(1, Math.round(value)));
}

export function epochHint(network: SuiNetwork) {
  const days = epochDaysForNetwork(network);
  return network === 'testnet'
    ? `Testnet: 1 epoch = ${days} day`
    : `Mainnet: 1 epoch = ${days} days`;
}
