import { toast } from 'sonner';
import { Settings, Wallet, LogOut, Sparkles, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useModal } from '../context/useModal';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { useActiveSubscriptionCount } from '../hooks/usePlatformData';
import { useOwnAvatarWalrusId } from '../hooks/useOwnAvatarWalrusId';
import { useUsdcBalance } from '../hooks/useUsdcBalance';
import { formatUsdc } from '../lib/formatUsdc';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';

export function ProfilePage() {
  const { appState, openModal, logout, getProfilePath } = useModal();
  const { address, isLoggedIn, isConnecting, isAuthLoading } = useWalletAuth();
  const { balanceUsdc } = useUsdcBalance();
  const avatarWalrusId = useOwnAvatarWalrusId(address);
  const subscriptionCount = useActiveSubscriptionCount(address);

  if (isConnecting || isAuthLoading) {
    return (
      <div className="max-w-lg mx-auto md:max-w-xl px-4 md:px-0 text-center py-16 text-muted text-sm">
        Loading your profile…
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-lg mx-auto md:max-w-xl px-4 md:px-0 text-center py-16">
        <img src="/logo.png" alt="Ailurus" className="h-24 mx-auto mb-6 opacity-90" />
        <h1 className="text-xl font-bold mb-2">Your profile</h1>
        <p className="text-sm text-muted mb-6 leading-relaxed">
          Sign in to manage subscriptions, balance, and creator settings.
        </p>
        <Button size="lg" onClick={() => openModal('login')}>
          Sign in with Google
        </Button>
      </div>
    );
  }

  const displayName = appState.displayName ?? appState.username ?? 'Your profile';
  const handle = appState.username ? `@${appState.username}` : address;
  const avatarSeed = address ?? 'guest';

  return (
    <div className="max-w-lg mx-auto md:max-w-xl px-4 md:px-0">
      <div className="flex flex-col items-center text-center mb-8">
        <Avatar
          src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${avatarSeed}`}
          walrusMediaId={avatarWalrusId}
          alt={displayName}
          size="xl"
          className="mb-4"
        />
        <h1 className="text-xl font-bold">{displayName}</h1>
        <p className="text-sm text-muted">{handle}</p>
        <Link
          to={getProfilePath()}
          className="inline-flex items-center gap-1 text-xs text-panda font-medium mt-2 hover:underline"
        >
          View public page
          <ExternalLink className="w-3 h-3" />
        </Link>
        <p className="text-2xl font-bold mt-4">${formatUsdc(balanceUsdc)}</p>
        <p className="text-xs text-muted">Balance</p>
        <Button size="sm" className="mt-3" onClick={() => openModal('deposit')}>
          Add funds
        </Button>
        {!appState.username && (
          <Button size="sm" variant="outline" className="mt-2" onClick={() => openModal('username')}>
            Choose username
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <ProfileLink
          to="/wallet"
          icon={Wallet}
          label="Wallet"
          detail={`$${formatUsdc(balanceUsdc)}`}
        />
        <ProfileLink to="/settings" icon={Settings} label="Settings" />
        {!appState.isCreator && (
          <button
            type="button"
            onClick={() => openModal('become-creator')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-surface border border-border hover:bg-cream transition-colors text-left"
          >
            <Sparkles className="w-5 h-5 text-panda" />
            <span className="font-medium text-sm">Become a creator</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            logout();
            toast.info('Signed out');
          }}
          className="flex items-center gap-3 p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-colors text-left mt-2"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Sign out</span>
        </button>
      </div>

      {subscriptionCount > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
            Subscriptions
          </h2>
          <p className="text-sm text-ink">
            {subscriptionCount} active subscription
            {subscriptionCount > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}

function ProfileLink({
  to,
  icon: Icon,
  label,
  detail,
}: {
  to: string;
  icon: typeof Wallet;
  label: string;
  detail?: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-4 rounded-2xl bg-surface border border-border hover:bg-cream transition-colors"
    >
      <Icon className="w-5 h-5 text-muted" />
      <span className="font-medium text-sm flex-1">{label}</span>
      {detail && <span className="text-sm text-panda font-semibold">{detail}</span>}
    </Link>
  );
}
