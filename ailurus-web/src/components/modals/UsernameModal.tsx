import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useCurrentClient } from '@mysten/dapp-kit-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useModal } from '../../context/useModal';
import { validateUsername } from '../../lib/routes';
import { logAppError, toUserFacingMessage } from '../../lib/userFacingError';
import { isHandleTakenOnChain } from '../../sui/profileRegistry';
import type { SuiGrpcClient } from '@mysten/sui/grpc';

export function UsernameModal({ open }: { open: boolean }) {
  const client = useCurrentClient();
  const { appState, closeModal, setUsername, getProfilePath } = useModal();
  const navigate = useNavigate();
  const [value, setValue] = useState(appState.username ?? '');
  const [isPending, setIsPending] = useState(false);

  const handleSkip = () => {
    closeModal();
    if (appState.address) {
      navigate(getProfilePath(appState.address));
    }
  };

  const handleSave = async () => {
    const error = validateUsername(value);
    if (error) {
      toast.error(error);
      return;
    }
    if (
      appState.address &&
      (await isHandleTakenOnChain(client as SuiGrpcClient, value, appState.address))
    ) {
      toast.error('This username is already taken.');
      return;
    }

    setIsPending(true);
    try {
      await setUsername(value);
      closeModal();
      toast.success('Username saved on-chain!');
      navigate(getProfilePath(appState.address));
    } catch (saveError) {
      logAppError('UsernameModal', saveError);
      toast.error('Could not save username', {
        description: toUserFacingMessage(saveError, 'Please try again.'),
      });
    } finally {
      setIsPending(false);
    }
  };

  const preview = value.trim()
    ? validateUsername(value) === null
      ? value.trim().toLowerCase().replace(/^@/, '')
      : null
    : null;

  return (
    <Modal open={open} onClose={handleSkip} title="Choose your username" size="sm">
      <div className="px-5 pb-6">
        <p className="text-sm text-muted mb-5 leading-relaxed">
          Pick a short URL for your profile. This is saved on Sui testnet. Fans can visit{' '}
          <span className="font-medium text-ink">ailurus.wal.app/{preview ?? 'yourname'}</span>
        </p>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted">/</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="yourname"
            className="flex-1 h-12 px-4 rounded-2xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-panda/30"
            autoFocus
          />
        </div>
        <p className="text-[11px] text-muted mb-5">
          Skip for now — your profile will use your account address instead.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleSkip}>
            Skip
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isPending || !value.trim()}>
            {isPending ? 'Saving on-chain...' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
