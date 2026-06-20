import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useModal } from '../context/useModal';
import { useAppNetwork } from '../hooks/useAppNetwork';
import { useShowUsdcDeposit } from '../hooks/useShowUsdcDeposit';
import { Button } from '../components/ui/Button';

export function WalletPage() {
  const { appState, openModal, chainConfigured } = useModal();
  const { network } = useAppNetwork();
  const showUsdcDeposit = useShowUsdcDeposit();

  return (
    <div className="max-w-lg mx-auto md:max-w-xl px-4 md:px-0">
      <h1 className="text-2xl font-bold mb-1">Wallet</h1>
      <p className="text-sm text-muted mb-6">Your USDC balance on Sui</p>

      <div className="p-6 rounded-3xl bg-gradient-to-br from-panda to-panda-dark text-white mb-6 shadow-lg shadow-panda/20">
        <p className="text-sm opacity-80 mb-1">Available balance</p>
        <p className="text-4xl font-bold mb-4">
          ${appState.isLoggedIn ? appState.balanceUsdc.toFixed(2) : '0.00'}
        </p>
        <div className="flex gap-2">
          {showUsdcDeposit && (
            <Button
              size="sm"
              className="bg-white text-panda-dark hover:bg-white/90"
              onClick={() => openModal('deposit')}
            >
              Add USDC
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-panda-light/40 border border-panda/10 mb-6">
        <p className="text-sm text-panda-dark leading-relaxed">
          <strong>No gas fees.</strong> All network costs are covered by Ailurus. You only pay in USDC.
        </p>
        <div className="mt-3 grid gap-1 text-xs text-panda-dark/80">
          <span>Network: Sui {network === 'mainnet' ? 'Mainnet' : 'Testnet'}</span>
          <span>Contract: {chainConfigured ? 'Connected' : 'Demo mode'}</span>
          {appState.address && <span className="truncate">Address: {appState.address}</span>}
        </div>
      </div>

      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
        Recent activity
      </h2>
      <div className="flex flex-col gap-2">
        {appState.activity.map((txn) => {
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
              <p className="text-sm font-medium truncate">
                {txn.label}
              </p>
              <p className="text-xs text-muted">{txn.status}</p>
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
        {!appState.activity.length && (
          <div className="p-6 rounded-2xl bg-surface border border-border text-center text-sm text-muted">
            Sign in, deposit demo USDC, subscribe, or publish to see activity here.
          </div>
        )}
      </div>
    </div>
  );
}
