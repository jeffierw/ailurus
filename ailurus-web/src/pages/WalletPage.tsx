import { ArrowDownLeft, ArrowUpRight, Plus, Wallet as WalletIcon } from 'lucide-react';
import { useModal } from '../context/useModal';
import { useAppNetwork } from '../hooks/useAppNetwork';
import { useUsdcBalance } from '../hooks/useUsdcBalance';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { useWalletActivity } from '../hooks/useWalletActivity';
import { formatUsdc } from '../lib/formatUsdc';
import { Button } from '../components/ui/Button';

export function WalletPage() {
  const { appState, openModal, chainConfigured } = useModal();
  const { address, isLoggedIn } = useWalletAuth();
  const { network } = useAppNetwork();
  const { balanceUsdc } = useUsdcBalance();
  const activity = useWalletActivity(address, appState.activity);

  return (
    <div className="max-w-lg mx-auto md:max-w-xl px-4 md:px-0">
      <h1 className="text-2xl font-bold mb-1">Wallet</h1>
      <p className="text-sm text-muted mb-6">Your USDC balance on Sui</p>

      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-panda via-panda to-panda-dark text-white mb-6 shadow-lg shadow-panda/25">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -right-4 bottom-0 w-24 h-24 rounded-full bg-white/5" aria-hidden="true" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <WalletIcon className="w-4 h-4 opacity-90" />
            <p className="text-sm font-medium opacity-90">Available balance</p>
          </div>
          <p className="text-4xl font-bold tracking-tight mb-5">
            ${isLoggedIn ? formatUsdc(balanceUsdc) : '0.00'}
            <span className="text-lg font-semibold opacity-80 ml-1">USDC</span>
          </p>

          <button
            type="button"
            onClick={() => openModal('deposit')}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-white text-panda-dark font-semibold text-sm shadow-md ring-2 ring-white/80 hover:bg-panda-light hover:ring-white transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Add USDC
          </button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-panda-light/50 border border-panda/15 mb-6">
        <p className="text-sm text-panda-dark leading-relaxed">
          <strong>No gas fees.</strong> All network costs are covered by Ailurus. You only pay in USDC.
        </p>
        <div className="mt-3 grid gap-1 text-xs text-panda-dark/80">
          <span>Network: Sui {network === 'mainnet' ? 'Mainnet' : 'Testnet'}</span>
          <span>Contract: {chainConfigured ? 'Connected' : 'Demo mode'}</span>
          {address && <span className="truncate">Address: {address}</span>}
        </div>
      </div>

      {!isLoggedIn && (
        <div className="mb-6 p-4 rounded-2xl bg-surface border border-border text-center">
          <p className="text-sm text-muted mb-3">Sign in to view balance and add testnet USDC.</p>
          <Button size="sm" onClick={() => openModal('login', { loginIntent: 'deposit' })}>
            Sign in
          </Button>
        </div>
      )}

      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
        Recent activity
      </h2>
      <div className="flex flex-col gap-2">
        {activity.map((txn) => {
          const isCredit = (txn.amount ?? 0) > 0;
          return (
            <div
              key={txn.id}
              className="flex items-center gap-3 p-4 rounded-2xl bg-surface border border-border"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                }`}
              >
                {isCredit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{txn.label}</p>
                <p className="text-xs text-muted">{txn.detail ?? txn.status}</p>
              </div>
              {typeof txn.amount === 'number' && (
                <span
                  className={`text-sm font-semibold ${
                    txn.amount > 0 ? 'text-emerald-600' : 'text-ink'
                  }`}
                >
                  {txn.amount > 0 ? '+' : ''}
                  {txn.amount < 0 ? '-' : ''}${Math.abs(txn.amount).toFixed(2)}
                </span>
              )}
            </div>
          );
        })}
        {!activity.length && (
          <div className="p-6 rounded-2xl bg-surface border border-border text-center text-sm text-muted">
            Subscribe or publish to see activity here.
          </div>
        )}
      </div>
    </div>
  );
}
