import { clsx } from 'clsx';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ModalHost } from '../modals/ModalHost';

export function AppShell() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <div className="flex min-h-dvh bg-cream">
      {!isLandingPage && <Sidebar />}
      <div
        className={clsx(
          'flex-1 flex flex-col min-w-0 w-full',
          isLandingPage ? 'max-w-none' : 'max-w-2xl md:max-w-none mx-auto md:mx-0',
        )}
      >
        {!isLandingPage && <TopBar />}
        <main className={clsx('flex-1', isLandingPage ? 'pb-0' : 'pb-20 md:pb-8 md:px-8 md:pt-6')}>
          <Outlet />
        </main>
        {!isLandingPage && <BottomNav />}
      </div>
      <ModalHost />
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast:
              'bg-surface border border-border shadow-lg rounded-2xl text-ink font-medium',
            success: 'border-emerald-200',
            error: 'border-red-200',
          },
        }}
        richColors
        closeButton
      />
    </div>
  );
}
