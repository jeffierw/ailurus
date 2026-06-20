import { NavLink } from 'react-router-dom';
import { Compass, Home, PlusSquare, User, Images } from 'lucide-react';
import { clsx } from 'clsx';

const items = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/feed', icon: Images, label: 'Feed' },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/create', icon: PlusSquare, label: 'Create' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center justify-center gap-0.5 px-4 py-2 transition-colors',
                isActive ? 'text-ink' : 'text-muted',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={clsx('w-6 h-6', isActive && 'stroke-[2.5px]')} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
