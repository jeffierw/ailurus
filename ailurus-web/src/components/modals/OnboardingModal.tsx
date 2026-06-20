import { Compass, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { useModal } from '../../context/useModal';

export function OnboardingModal({ open }: { open: boolean }) {
  const { closeModal, completeOnboarding, openModal, appState } = useModal();
  const navigate = useNavigate();

  const chooseFan = () => {
    completeOnboarding('fan');
    closeModal();
    navigate('/feed');
    if (!appState.username && !appState.isCreator) {
      openModal('username');
    }
  };

  const chooseCreator = () => {
    completeOnboarding('creator');
    closeModal();
    openModal('become-creator');
  };

  return (
    <Modal open={open} onClose={() => undefined} title="Welcome to Ailurus" size="md" dismissible={false}>
      <div className="px-5 pb-6">
        <p className="text-sm text-muted text-center mb-6 leading-relaxed">
          How would you like to get started?
        </p>
        <div className="grid gap-3">
          <button
            type="button"
            onClick={chooseFan}
            className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-surface hover:bg-cream transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-panda-light flex items-center justify-center shrink-0">
              <Compass className="w-6 h-6 text-panda" />
            </div>
            <div>
              <p className="font-semibold mb-1">Discover creators</p>
              <p className="text-sm text-muted leading-relaxed">
                Browse exclusive content and support creators with a simple monthly fee.
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={chooseCreator}
            className="flex items-start gap-4 p-5 rounded-2xl border border-panda/20 bg-panda-light/40 hover:bg-panda-light/60 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-panda/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-panda" />
            </div>
            <div>
              <p className="font-semibold mb-1">Publish my content</p>
              <p className="text-sm text-muted leading-relaxed">
                Set up your page, choose a monthly price, and share exclusive work.
              </p>
            </div>
          </button>
        </div>
        <p className="text-[11px] text-muted text-center mt-5">
          You can change this anytime in Settings.
        </p>
      </div>
    </Modal>
  );
}
