import { useMemo } from 'react';
import type { ActivityItem } from '../context/modalContextBase';
import { formatRelativeTime } from '../lib/format';
import { microsToUsdc } from '../sui/platform';
import { usePlatformSnapshot } from './usePlatformData';

function normalizeAddress(address: string) {
  const hex = address.slice(2).toLowerCase();
  return `0x${hex.padStart(64, '0')}`;
}

type WalletActivityItem = ActivityItem & {
  sortKey: number;
  detail?: string;
};

/** Session activity merged with on-chain subscriptions for the wallet feed. */
export function useWalletActivity(address?: string | null, localActivity: ActivityItem[] = []) {
  const { data: platform } = usePlatformSnapshot();

  return useMemo(() => {
    const items: WalletActivityItem[] = localActivity.map((item, index) => ({
      ...item,
      sortKey: localActivity.length - index,
    }));

    if (!address || !platform) {
      return items.sort((left, right) => right.sortKey - left.sortKey);
    }

    const normalized = normalizeAddress(address);
    const creatorByAddress = new Map(
      platform.creators.map((creator) => [normalizeAddress(creator.owner), creator]),
    );

    for (const subscription of platform.subscriptions) {
      if (normalizeAddress(subscription.fan) !== normalized) continue;

      const creator = creatorByAddress.get(normalizeAddress(subscription.creator));
      const creatorLabel = creator?.name ?? creator?.handle ?? subscription.creator.slice(0, 10);
      const active = subscription.expiresAtMs > Date.now();

      items.push({
        id: `sub-out-${subscription.creator}-${subscription.startedAtMs}`,
        type: 'subscribe',
        label: `Subscribed to ${creatorLabel}`,
        amount: -microsToUsdc(subscription.paidMicros),
        status: 'On-chain',
        sortKey: subscription.startedAtMs,
        detail: active
          ? `Active · expires ${formatRelativeTime(subscription.expiresAtMs)}`
          : `Expired ${formatRelativeTime(subscription.expiresAtMs)}`,
      });
    }

    for (const subscription of platform.subscriptions) {
      if (normalizeAddress(subscription.creator) !== normalized) continue;

      const active = subscription.expiresAtMs > Date.now();
      items.push({
        id: `sub-in-${subscription.fan}-${subscription.startedAtMs}`,
        type: 'subscribe',
        label: 'New subscriber',
        amount: microsToUsdc(subscription.paidMicros),
        status: 'On-chain',
        sortKey: subscription.startedAtMs,
        detail: active
          ? `${subscription.fan.slice(0, 6)}…${subscription.fan.slice(-4)} · ${formatRelativeTime(subscription.startedAtMs)}`
          : `Expired · ${subscription.fan.slice(0, 6)}…${subscription.fan.slice(-4)}`,
      });
    }

    return items.sort((left, right) => right.sortKey - left.sortKey);
  }, [address, localActivity, platform]);
}
