import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Lock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { logAppError, toUserFacingMessage } from '../../lib/userFacingError';
import { useModal } from '../../context/useModal';
import { useWalletAuth } from '../../hooks/useWalletAuth';
import { formatUsdc } from '../../lib/formatUsdc';
import { useUsdcBalance } from '../../hooks/useUsdcBalance';

const perks = [
  'Unlimited access to all posts',
  'Full-resolution photo albums',
  'Behind-the-scenes content',
  'Cancel anytime',
];

export function SubscribeModal({ open }: { open: boolean }) {
  const { modalData, closeModal, openModal, subscribe } = useModal();
  const { isLoggedIn, isConnecting } = useWalletAuth();
  const { balanceUsdc, invalidateBalance } = useUsdcBalance();
  const [isPending, setIsPending] = useState(false);
  const price = modalData.priceUsdc ?? 4.99;
  const creatorName = modalData.creatorName ?? 'Creator';

  useEffect(() => {
    if (open && isLoggedIn) {
      void invalidateBalance();
    }
  }, [open, isLoggedIn, invalidateBalance]);

  const handleSubscribe = async () => {
    if (isConnecting) {
      toast.info('Wallet reconnecting…');
      return;
    }
    if (!isLoggedIn) {
      openModal('login', {
        loginIntent: 'subscribe',
        creatorId: modalData.creatorId,
        creatorAddress: modalData.creatorAddress,
        creatorName: modalData.creatorName,
        priceUsdc: modalData.priceUsdc,
      });
      toast.info('Please sign in first');
      return;
    }
    if (balanceUsdc < price) {
      closeModal();
      openModal('deposit');
      toast.error('Insufficient USDC balance', {
        description: `You need $${price.toFixed(2)} to subscribe. Current balance: $${formatUsdc(balanceUsdc)}.`,
      });
      return;
    }
    if (!modalData.creatorId || !modalData.creatorAddress) return;

    setIsPending(true);
    try {
      await subscribe(modalData.creatorId, modalData.creatorAddress, price);
      await invalidateBalance();
      closeModal();
      toast.success(`Subscribed to ${creatorName}!`, {
        description: `Charged $${price.toFixed(2)} USDC / month. Content unlocked.`,
      });
    } catch (error) {
      logAppError('SubscribeModal', error);
      toast.error('Subscription failed', {
        description: toUserFacingMessage(error, 'Please try again.'),
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal open={open} onClose={closeModal} title="Subscribe" size="md">
      <div className="px-5 pb-6">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-panda-light/60 mb-5">
          <div className="w-12 h-12 rounded-full bg-panda/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-panda" />
          </div>
          <div>
            <p className="font-semibold text-ink">{creatorName}</p>
            <p className="text-sm text-muted">Exclusive subscriber content</p>
          </div>
        </div>

        <div className="text-center mb-5">
          <span className="text-4xl font-bold text-ink">${price.toFixed(2)}</span>
          <span className="text-muted ml-1">/ month</span>
          <p className="text-xs text-muted mt-1">Paid in USDC · No gas fees</p>
          {isLoggedIn && (
            <p className="text-xs text-muted mt-2">Your balance: ${formatUsdc(balanceUsdc)} USDC</p>
          )}
        </div>

        <ul className="space-y-2.5 mb-6">
          {perks.map((perk) => (
            <li key={perk} className="flex items-center gap-2.5 text-sm text-ink">
              <Check className="w-4 h-4 text-panda shrink-0" />
              {perk}
            </li>
          ))}
        </ul>

        <Button size="lg" className="w-full" onClick={handleSubscribe} disabled={isPending || isConnecting}>
          {isPending ? 'Waiting for signature...' : isConnecting ? 'Reconnecting wallet...' : 'Subscribe now'}
        </Button>
      </div>
    </Modal>
  );
}
