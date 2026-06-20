import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Cloud,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { useModal } from '../context/useModal';

const navItems = ['Product', 'Creators', 'Privacy', 'Sui Stack'];

const heroStats = [
  { value: '0 gas', label: 'for fans' },
  { value: 'USDC', label: 'native revenue' },
  { value: 'Seal', label: 'private unlocks' },
];

const features = [
  {
    icon: KeyRound,
    title: 'Enter with Google',
    text: 'No wallet setup, no seed phrase, no onboarding detour. A familiar account opens the whole product.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Earn in USDC',
    text: 'Creators price memberships in dollars and receive stable, global settlement directly on Sui.',
  },
  {
    icon: LockKeyhole,
    title: 'Unlock by subscription',
    text: 'Seal turns access into a programmable rule, so private drops open only for active supporters.',
  },
  {
    icon: Cloud,
    title: 'Store on Walrus',
    text: 'Encrypted albums and short clips live in decentralized storage instead of a platform silo.',
  },
];

const productCards = [
  {
    icon: WalletCards,
    title: 'Simple dollars in, dollars out',
    text: 'Fans see a subscription price. Creators see revenue. The Sui complexity stays behind the interface.',
  },
  {
    icon: ShieldCheck,
    title: 'Content ownership that travels',
    text: 'Profiles, posts, and access state are built for portability instead of platform lock-in.',
  },
  {
    icon: Zap,
    title: 'Built for a live demo',
    text: 'Log in, subscribe, unlock, upload, and settle through one polished product path.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { openModal, appState, authReady } = useModal();

  const enterApp = () => {
    if (!authReady) return;

    if (appState.isLoggedIn) {
      if (!appState.userIntent && !appState.isCreator) {
        openModal('onboarding');
        navigate('/feed');
        return;
      }
      navigate(appState.isCreator ? '/create' : '/feed');
      return;
    }
    openModal('login');
  };

  return (
    <div className="min-h-dvh overflow-hidden bg-[#f7f3ed] text-ink">
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3">
          <img src="/logo.png" alt="Ailurus" className="h-11" />
        </button>

        <nav className="hidden items-center gap-8 rounded-full border border-black/5 bg-white/55 px-6 py-3 text-sm font-semibold text-muted shadow-sm backdrop-blur md:flex">
          {navItems.map((item) => (
            <a key={item} href={`#${item.toLowerCase().replaceAll(' ', '-')}`} className="hover:text-ink">
              {item}
            </a>
          ))}
        </nav>

        <Button variant="outline" onClick={enterApp} disabled={!authReady} className="bg-white/70">
          Launch app
        </Button>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-10 md:grid-cols-[1.02fr_0.98fr] md:px-8 md:pb-24 md:pt-16">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-panda/10 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-panda/15 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-panda-dark shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-panda" />
            Creator ownership on Sui
          </div>

          <h1 className="max-w-4xl text-6xl font-black leading-[0.9] tracking-[-0.075em] text-ink md:text-8xl">
            Publish privately. Get paid globally.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted md:text-xl">
            Ailurus is a creator subscription layer for the next internet: Google login,
            USDC memberships, encrypted content on Walrus, and invisible gas powered by Sui.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={enterApp} disabled={!authReady} className="gap-2">
              Start with Google
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/feed')} className="bg-white/70">
              View live demo
            </Button>
          </div>

          <div className="mt-9 grid max-w-xl grid-cols-3 gap-3">
            {heroStats.map((stat) => (
              <div key={stat.value} className="rounded-3xl border border-white/80 bg-white/65 p-4 shadow-sm backdrop-blur">
                <p className="text-2xl font-black tracking-tighter">{stat.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 min-h-[520px]">
          <div className="absolute inset-0 rounded-[3rem] border border-white/70 bg-linear-to-br from-white via-[#f5e1d8] to-[#eec9b7] shadow-2xl shadow-panda/15" />
          <div className="absolute inset-5 rounded-[2.5rem] border border-white/70 bg-white/45 backdrop-blur" />

          <div className="absolute left-8 top-8 rounded-3xl border border-white/70 bg-white/75 p-4 shadow-xl backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Monthly revenue</p>
            <p className="mt-2 text-3xl font-black tracking-[-0.06em]">$12,480</p>
          </div>

          <div className="absolute right-8 top-20 rounded-3xl border border-white/70 bg-ink px-5 py-4 text-white shadow-xl">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-panda-light" />
              Content unlocked
            </p>
          </div>

          <img
            src="/panda.png"
            alt="Ailurus red panda mascot"
            className="absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2 drop-shadow-2xl"
          />

          <div className="absolute inset-x-8 bottom-8 rounded-4xl border border-white/75 bg-white/80 p-5 shadow-xl backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-ink">Ailurus Studio</p>
                <p className="text-xs text-muted">Private photo vault · $4.99 / month</p>
              </div>
              <span className="rounded-full bg-panda-light px-3 py-1 text-xs font-bold text-panda-dark">
                USDC
              </span>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                toast.success('Demo subscription selected', {
                  description: 'In production this is a USDC payment with sponsored gas.',
                });
                navigate('/explore');
              }}
            >
              Explore creators
            </Button>
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-7xl px-5 pb-16 md:px-8 md:pb-24">
        <div className="grid overflow-hidden rounded-[2.5rem] border border-white/70 bg-ink text-white shadow-2xl md:grid-cols-[0.85fr_1.15fr]">
          <div className="p-8 md:p-10">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-panda-light">Designed for trust</p>
            <h2 className="text-4xl font-black leading-[0.95] tracking-[-0.06em] md:text-6xl">
              A softer front door to onchain media.
            </h2>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2 md:p-5">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-4xl border border-white/10 bg-white/10 p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-panda text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-bold">{title}</h3>
                <p className="text-sm leading-6 text-white/65">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="creators" className="mx-auto max-w-7xl px-5 pb-20 md:px-8 md:pb-28">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-panda-dark">For creators</p>
            <h2 className="max-w-3xl text-4xl font-black leading-none tracking-[-0.06em] md:text-6xl">
              Keep the audience relationship. Own the payout path.
            </h2>
          </div>
          <Button variant="outline" onClick={() => navigate('/create')} className="bg-white/70 md:self-end">
            Start creating
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {productCards.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-4xl border border-white/80 bg-white/65 p-6 shadow-sm backdrop-blur">
              <div className="mb-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-panda-light text-panda-dark">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-3 text-2xl font-black tracking-tighter">{title}</h3>
              <p className="text-sm leading-6 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
