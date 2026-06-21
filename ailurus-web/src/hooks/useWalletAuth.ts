import { useCurrentAccount, useWalletConnection } from '@mysten/dapp-kit-react';
import { useModal } from '../context/useModal';

/** Wallet-connected auth — use instead of appState.isLoggedIn for gating UI. */
export function useWalletAuth() {
  const account = useCurrentAccount();
  const walletConnection = useWalletConnection();
  const { authReady } = useModal();

  const isConnecting = walletConnection.isConnecting || walletConnection.isReconnecting;
  const address = account?.address;
  const isLoggedIn = Boolean(address);
  const isAuthLoading = isConnecting || (isLoggedIn && !authReady);

  return {
    account,
    address,
    isLoggedIn,
    isConnecting,
    isAuthLoading,
  };
}
