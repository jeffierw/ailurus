import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { toast } from 'sonner';
import { consumeLoginIntent, consumePendingPostLogin } from '../lib/authSession';
import { loadProfile } from '../lib/profileStorage';
import { useModal } from '../context/useModal';

export function PostLoginHandler() {
  const account = useCurrentAccount();
  const location = useLocation();
  const navigate = useNavigate();
  const { modal, modalData, appState, authReady, openModal, closeModal } = useModal();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!account?.address) {
      handledRef.current = null;
      return;
    }
    if (!authReady) return;
    if (handledRef.current === account.address) return;
    handledRef.current = account.address;

    if (modal === 'login') {
      closeModal();
    }

    const isFreshLogin = consumePendingPostLogin();
    const profile = loadProfile(account.address);
    const hasCompletedOnboarding =
      appState.onboardingCompleted ||
      Boolean(profile.onboardingCompleted) ||
      Boolean(appState.userIntent) ||
      Boolean(profile.userIntent) ||
      appState.isCreator;

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

    if (intent === 'subscribe' || intent === 'deposit' || intent === 'create') {
      if (!appState.username && !appState.isCreator) {
        openModal('username');
      }
      if (intent === 'create') {
        openModal('become-creator');
      }
      if (location.pathname === '/') {
        navigate(intent === 'create' ? '/create' : '/feed', { replace: true });
      }
      toast.success('Welcome back!');
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
    closeModal,
    location.pathname,
    modal,
    modalData.loginIntent,
    navigate,
    openModal,
  ]);

  return null;
}
