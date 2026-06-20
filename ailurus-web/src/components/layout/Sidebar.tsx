import { NavLink, useNavigate } from 'react-router-dom';
import {
  Compass,
  Images,
  Home,
  PlusSquare,
  User,
  Bell,
  Settings,
  Wallet,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useModal } from '../../context/useModal';
import { useShowUsdcDeposit } from '../../hooks/useShowUsdcDeposit';
import { Button } from '../ui/Button';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/feed', icon: Images, label: 'Feed' },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/create', icon: PlusSquare, label: 'Create' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { appState, openModal } = useModal();
  const showUsdcDeposit = useShowUsdcDeposit();

  return (
    <aside className="hidden md:flex flex-col w-64 xl:w-72 shrink-0 border-r border-border bg-surface h-dvh sticky top-0 px-4 py-6">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="flex items-center gap-2 px-2 mb-8 hover:opacity-80 transition-opacity"
      >
        <img src="/logo.png" alt="Ailurus" className="h-12" />
      </button>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-medium transition-colors',
                isActive
                  ? 'bg-panda-light text-panda-dark'
                  : 'text-ink hover:bg-black/3',
              )
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 flex flex-col gap-1">
        <NavLink
          to="/wallet"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-medium transition-colors',
              isActive ? 'bg-panda-light text-panda-dark' : 'text-ink hover:bg-black/3',
            )
          }
        >
          <Wallet className="w-5 h-5" />
          Wallet
          {appState.isLoggedIn && (
            <span className="ml-auto text-xs font-semibold text-panda">
              ${appState.balanceUsdc.toFixed(2)}
            </span>
          )}
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-medium transition-colors',
              isActive ? 'bg-panda-light text-panda-dark' : 'text-ink hover:bg-black/3',
            )
          }
        >
          <Settings className="w-5 h-5" />
          Settings
        </NavLink>
      </div>

      <div className="mt-auto pt-6">
        {appState.isLoggedIn ? (
          <div className="p-4 rounded-2xl bg-cream border border-border">
            <p className="text-xs text-muted mb-1">USDC balance</p>
            <p className="text-2xl font-bold text-ink">${appState.balanceUsdc.toFixed(2)}</p>
            {showUsdcDeposit && (
              <Button
                size="sm"
                className="w-full mt-3"
                onClick={() => openModal('deposit')}
              >
                Add funds
              </Button>
            )}
            {!showUsdcDeposit && (
              <p className="text-xs text-muted mt-3 leading-relaxed">
                Testnet mode — uploads use WAL faucet. USDC deposit is mainnet only.
              </p>
            )}
          </div>
        ) : (
          <Button size="lg" className="w-full" onClick={() => openModal('login')}>
            Sign in with Google
          </Button>
        )}
      </div>
    </aside>
  );
}
