import { useMemo } from 'react';
import { useFanProfile } from './useFanProfile';
import { usePlatformSnapshot } from './usePlatformData';

function normalizeAddress(address: string) {
  const hex = address.slice(2).toLowerCase();
  return `0x${hex.padStart(64, '0')}`;
}

/** Walrus media id for the signed-in user's avatar (creator dynamic field or fan profile). */
export function useOwnAvatarWalrusId(address?: string | null) {
  const { data: fanProfile } = useFanProfile(address);
  const { data: platform } = usePlatformSnapshot();

  return useMemo(() => {
    if (!address) return undefined;
    const normalized = normalizeAddress(address);
    return (
      platform?.creatorAvatars[normalized] ||
      fanProfile?.avatarWalrusId ||
      undefined
    );
  }, [address, fanProfile?.avatarWalrusId, platform?.creatorAvatars]);
}
