import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { clsx } from 'clsx';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  dismissible?: boolean;
  /** Remove default top padding when content should be flush with the modal edge */
  flush?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  dismissible = true,
  flush = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (dismissible) {
      window.addEventListener('keydown', onKey);
    }
    return () => {
      document.body.style.overflow = '';
      if (dismissible) {
        window.removeEventListener('keydown', onKey);
      }
    };
  }, [dismissible, open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in"
        onClick={dismissible ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          'relative w-full bg-surface rounded-t-3xl sm:rounded-3xl shadow-xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 overflow-hidden',
          {
            'max-w-sm': size === 'sm',
            'max-w-md': size === 'md',
            'max-w-lg': size === 'lg',
          },
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 -mr-2 rounded-full hover:bg-black/5 text-muted"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className={clsx(!title && !flush && 'pt-2')}>{children}</div>
      </div>
    </div>
  );
}
