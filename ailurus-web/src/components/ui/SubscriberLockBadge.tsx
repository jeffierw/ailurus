import clsx from 'clsx';

type SubscriberLockBadgeProps = {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
};

const sizes = {
  sm: { shell: 'w-11 h-11', lock: 'text-[22px]', label: 'text-[10px]' },
  md: { shell: 'w-14 h-14', lock: 'text-[28px]', label: 'text-xs' },
  lg: { shell: 'w-16 h-16', lock: 'text-[32px]', label: 'text-sm' },
};

/** Subscriber-only overlay badge — large lock emoji on frosted circle. */
export function SubscriberLockBadge({
  size = 'md',
  showLabel = false,
  className,
}: SubscriberLockBadgeProps) {
  const dim = sizes[size];

  return (
    <div className={clsx('flex flex-col items-center gap-1.5', className)}>
      <div
        className={clsx(
          dim.shell,
          'rounded-full bg-white/95 shadow-lg ring-1 ring-black/10 flex items-center justify-center',
        )}
        aria-hidden="true"
      >
        <span className={clsx(dim.lock, 'leading-none select-none')} role="img" aria-label="Locked">
          🔒
        </span>
      </div>
      {showLabel ? (
        <span className={clsx(dim.label, 'font-semibold text-white drop-shadow-sm tracking-wide')}>
          Subscribers only
        </span>
      ) : null}
    </div>
  );
}
