import { useNavigate } from 'react-router-dom';
import { Bell, Wallet } from 'lucide-react';
import { useModal } from '../../context/useModal';
import { useWalletAuth } from '../../hooks/useWalletAuth';
import { formatUsdc } from '../../lib/formatUsdc';
import { useUsdcBalance } from '../../hooks/useUsdcBalance';
import { Button } from '../ui/Button';

export function TopBar() {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const { isLoggedIn, isConnecting } = useWalletAuth();
  const { balanceUsdc } = useUsdcBalance();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 h-16 border-b border-border bg-cream/90 backdrop-blur-xl md:hidden">
      <button type="button" onClick={() => navigate('/')} className="flex items-center">
        <img src="/logo.png" alt="Ailurus" className="h-11" />
      </button>

      <div className="flex items-center gap-2">
        {isConnecting ? (
          <span className="text-xs text-muted px-2">Connecting…</span>
        ) : isLoggedIn ? (
          <>
            <button
              type="button"
              onClick={() => navigate('/wallet')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-sm font-semibold"
            >
              <Wallet className="w-4 h-4 text-panda" />
              ${formatUsdc(balanceUsdc)}
            </button>
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="p-2 rounded-full hover:bg-black/5"
            >
              <Bell className="w-5 h-5" />
            </button>
          </>
        ) : (
          <Button size="sm" onClick={() => openModal('login')}>
            Log in
          </Button>
        )}
      </div>
    </header>
  );
}
