import { useModal } from '../../context/useModal';
import { LoginModal } from './LoginModal';
import { OnboardingModal } from './OnboardingModal';
import { UsernameModal } from './UsernameModal';
import { SubscribeModal } from './SubscribeModal';
import { DepositModal } from './DepositModal';
import { UploadModal } from './UploadModal';
import { PostModal } from './PostModal';
import { BecomeCreatorModal } from './BecomeCreatorModal';

export function ModalHost() {
  const { modal } = useModal();

  return (
    <>
      <LoginModal open={modal === 'login'} />
      <OnboardingModal open={modal === 'onboarding'} />
      <UsernameModal open={modal === 'username'} />
      <SubscribeModal open={modal === 'subscribe'} />
      <DepositModal open={modal === 'deposit'} />
      <UploadModal open={modal === 'upload'} />
      <PostModal open={modal === 'post'} />
      <BecomeCreatorModal open={modal === 'become-creator'} />
    </>
  );
}
