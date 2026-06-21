import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { toast } from 'sonner';
import { consumeLoginIntent, consumePendingPostLogin } from '../lib/authSession';
import { useModal } from '../context/useModal';

export function PostLoginHandler() {
  const account = useCurrentAccount();
  const location = useLocation();
  const navigate = useNavigate();
  const { modal, modalData, appState, authReady, creatorCheckReady, openModal, closeModal } =
    useModal();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!account?.address) {
      handledRef.current = null;
      return;
    }
    if (!authReady || !creatorCheckReady) return;
    if (handledRef.current === account.address) return;
    handledRef.current = account.address;

    if (modal === 'login') {
      closeModal();
    }

    const isFreshLogin = consumePendingPostLogin();
    const hasCompletedOnboarding =
      appState.onboardingCompleted || Boolean(appState.userIntent) || appState.isCreator;

    if (isFreshLogin && !hasCompletedOnboarding) {
      openModal('onboarding');
      if (location.pathname === '/') {
        navigate('/feed', { replace: true });
      }
      return;
    }

    if (!isFreshLogin) {
      return;
    }

    const intent = modalData.loginIntent ?? consumeLoginIntent() ?? 'default';

    if (intent === 'deposit') {
      openModal('deposit');
      toast.success('Signed in — add testnet USDC to subscribe');
      return;
    }

    if (intent === 'subscribe' && modalData.creatorId && modalData.creatorAddress) {
      if (!appState.username && !appState.isCreator) {
        openModal('username');
      } else {
        openModal('subscribe', {
          creatorId: modalData.creatorId,
          creatorAddress: modalData.creatorAddress,
          creatorName: modalData.creatorName,
          priceUsdc: modalData.priceUsdc,
        });
      }
      toast.success('Signed in — continue subscribing');
      return;
    }

    if (intent === 'subscribe' || intent === 'deposit' || intent === 'create') {
      if (!appState.username && !appState.isCreator) {
        openModal('username');
      }
      if (intent === 'create' && !appState.isCreator) {
        openModal('become-creator');
      }
      if (location.pathname === '/') {
        navigate(intent === 'create' ? '/create' : '/feed', { replace: true });
      }
      toast.success(appState.isCreator ? 'Welcome back, creator!' : 'Welcome back!');
      return;
    }

    if (!appState.username && !appState.isCreator) {
      openModal('username');
    }

    if (location.pathname === '/') {
      navigate(appState.isCreator ? '/create' : '/feed', { replace: true });
    }

    toast.success('Welcome back!');
  }, [
    account?.address,
    appState.isCreator,
    appState.onboardingCompleted,
    appState.username,
    appState.userIntent,
    authReady,
    creatorCheckReady,
    closeModal,
    location.pathname,
    modal,
    modalData.creatorId,
    modalData.creatorAddress,
    modalData.creatorName,
    modalData.priceUsdc,
    navigate,
    openModal,
  ]);

  return null;
}
