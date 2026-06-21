import { useCurrentClient } from '@mysten/dapp-kit-react';
import { useQuery } from '@tanstack/react-query';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { findFanByAddress, PROFILE_REGISTRY_QUERY_KEY } from '../sui/profileRegistry';

export function useFanProfile(address?: string | null) {
  const client = useCurrentClient();
  return useQuery({
    queryKey: [...PROFILE_REGISTRY_QUERY_KEY, 'fan', address],
    enabled: Boolean(address),
    queryFn: () => findFanByAddress(client as SuiGrpcClient, address!),
  });
}
