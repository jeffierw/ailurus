import { useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useModal } from '../../context/useModal';
import { useAppNetwork } from '../../hooks/useAppNetwork';
import { useUsdcBalance, waitForUsdcBalance } from '../../hooks/useUsdcBalance';
import { useWalletAuth } from '../../hooks/useWalletAuth';
import { logAppError, toUserFacingMessage } from '../../lib/userFacingError';
import {
  clampTestnetUsdcAmount,
  requestTestnetUsdc,
  TESTNET_USDC_MAX,
  TESTNET_USDC_PRESETS,
} from '../../services/testnetUsdcFaucet';

export function DepositModal({ open }: { open: boolean }) {
  const { closeModal, openModal } = useModal();
  const { address, isLoggedIn, isConnecting } = useWalletAuth();
  const { isTestnet } = useAppNetwork();
  const { refetch: refetchBalance, invalidateBalance } = useUsdcBalance();
  const [custom, setCustom] = useState('');
  const [selected, setSelected] = useState<number | null>(0.2);
  const [isPending, setIsPending] = useState(false);

  const customAmount = custom ? parseFloat(custom) : 0;
  const amount = selected ?? customAmount;
  const clampedAmount = clampTestnetUsdcAmount(amount);

  const handleDeposit = async () => {
    if (isConnecting) {
      toast.info('Wallet reconnecting…');
      return;
    }
    if (!isLoggedIn || !address) {
      openModal('login', { loginIntent: 'deposit' });
      return;
    }
    if (!clampedAmount) {
      toast.error('Enter a valid amount up to $1.00 USDC');
      return;
    }

    if (!isTestnet) {
      toast.info('Mainnet USDC deposits are coming soon.');
      return;
    }

    setIsPending(true);
    try {
      await requestTestnetUsdc(address, clampedAmount);
      await invalidateBalance();
      await waitForUsdcBalance(refetchBalance, clampedAmount * 0.99);
      closeModal();
      toast.success(`Added $${clampedAmount.toFixed(2)} testnet USDC`, {
        description: 'Balance updated on-chain. Ready to subscribe or upload.',
      });
      setCustom('');
      setSelected(0.2);
    } catch (error) {
      logAppError('DepositModal', error);
      toast.error('Deposit failed', {
        description: toUserFacingMessage(error, 'Please try again with a smaller amount.'),
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal open={open} onClose={closeModal} title="Add USDC" size="md">
      <div className="px-5 pb-6">
        <p className="text-sm text-muted mb-4 leading-relaxed">
          Top up testnet USDC from the Ailurus faucet. Use it to subscribe to creators on Sui testnet.
        </p>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {TESTNET_USDC_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setSelected(preset);
                setCustom('');
              }}
              className={`py-3 rounded-xl text-sm font-semibold border transition-colors ${
                selected === preset
                  ? 'border-panda bg-panda-light text-panda-dark'
                  : 'border-border bg-surface hover:bg-cream'
              }`}
            >
              ${preset.toFixed(preset < 1 ? 1 : 0)}
            </button>
          ))}
        </div>

        <div className="relative mb-2">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-medium">$</span>
          <input
            type="number"
            min="0.01"
            max={TESTNET_USDC_MAX}
            step="0.01"
            placeholder="Custom amount (max $1)"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              setSelected(null);
            }}
            className="w-full h-12 pl-8 pr-4 rounded-2xl border border-border bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-panda/30 focus:border-panda"
          />
        </div>
        <p className="text-[11px] text-muted mb-5">Testnet faucet limit: ${TESTNET_USDC_MAX.toFixed(2)} USDC per request.</p>

        <Button size="lg" className="w-full" onClick={handleDeposit} disabled={isPending}>
          {isPending ? 'Sending testnet USDC...' : 'Confirm deposit'}
        </Button>
      </div>
    </Modal>
  );
}
