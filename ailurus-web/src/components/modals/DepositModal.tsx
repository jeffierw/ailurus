import { useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useModal } from '../../context/useModal';

const amounts = [10, 25, 50, 100];

export function DepositModal({ open }: { open: boolean }) {
  const { closeModal, addBalance, appState, openModal } = useModal();
  const [custom, setCustom] = useState('');
  const [selected, setSelected] = useState<number | null>(25);

  const amount = selected ?? (custom ? parseFloat(custom) : 0);

  const handleDeposit = () => {
    if (!appState.isLoggedIn) {
      closeModal();
      openModal('login', { loginIntent: 'deposit' });
      return;
    }
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    addBalance(amount);
    closeModal();
    toast.success(`Added $${amount.toFixed(2)} USDC`, {
      description: 'Balance updated. Ready to subscribe or upload.',
    });
    setCustom('');
    setSelected(25);
  };

  return (
    <Modal open={open} onClose={closeModal} title="Add USDC" size="md">
      <div className="px-5 pb-6">
        <p className="text-sm text-muted mb-4 leading-relaxed">
          Top up your balance on Sui. Use USDC to subscribe to creators or pay for uploads.
        </p>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {amounts.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setSelected(a);
                setCustom('');
              }}
              className={`py-3 rounded-xl text-sm font-semibold border transition-colors ${
                selected === a
                  ? 'border-panda bg-panda-light text-panda-dark'
                  : 'border-border bg-surface hover:bg-cream'
              }`}
            >
              ${a}
            </button>
          ))}
        </div>

        <div className="relative mb-5">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-medium">$</span>
          <input
            type="number"
            placeholder="Custom amount"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              setSelected(null);
            }}
            className="w-full h-12 pl-8 pr-4 rounded-2xl border border-border bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-panda/30 focus:border-panda"
          />
        </div>

        <Button size="lg" className="w-full" onClick={handleDeposit}>
          Confirm deposit
        </Button>
        <p className="text-[11px] text-center text-muted mt-3">
          Demo mode — no real transaction. Mainnet uses on-chain USDC transfer.
        </p>
      </div>
    </Modal>
  );
}
