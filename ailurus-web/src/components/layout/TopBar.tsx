import { useNavigate } from 'react-router-dom';
import { Bell, Wallet } from 'lucide-react';
import { useModal } from '../../context/useModal';
import { Button } from '../ui/Button';

export function TopBar() {
  const navigate = useNavigate();
  const { appState, openModal } = useModal();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 h-16 border-b border-border bg-cream/90 backdrop-blur-xl md:hidden">
      <button type="button" onClick={() => navigate('/')} className="flex items-center">
        <img src="/logo.png" alt="Ailurus" className="h-11" />
      </button>

      <div className="flex items-center gap-2">
        {appState.isLoggedIn ? (
          <>
            <button
              type="button"
              onClick={() => navigate('/wallet')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-sm font-semibold"
            >
              <Wallet className="w-4 h-4 text-panda" />
              ${appState.balanceUsdc.toFixed(2)}
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
