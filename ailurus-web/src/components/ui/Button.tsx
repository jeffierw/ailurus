import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
        {
          'bg-panda text-white hover:bg-panda-dark shadow-sm': variant === 'primary',
          'bg-panda-light text-panda-dark hover:bg-panda/10': variant === 'secondary',
          'bg-transparent hover:bg-black/5 text-ink': variant === 'ghost',
          'border border-border bg-surface hover:bg-cream text-ink': variant === 'outline',
          'h-8 px-3 text-xs rounded-full': size === 'sm',
          'h-10 px-5 text-sm rounded-full': size === 'md',
          'h-12 px-6 text-base rounded-2xl': size === 'lg',
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
