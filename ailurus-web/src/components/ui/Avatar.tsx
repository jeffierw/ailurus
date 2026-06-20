import { clsx } from 'clsx';
import { useWalrusImageUrl } from '../../hooks/useWalrusImageUrl';

type AvatarProps = {
  src: string;
  walrusMediaId?: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  ring?: boolean;
  className?: string;
};

const sizes = {
  xs: 'w-7 h-7',
  sm: 'w-9 h-9',
  md: 'w-11 h-11',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

export function Avatar({ src, walrusMediaId, alt, size = 'md', ring, className }: AvatarProps) {
  const resolvedSrc = useWalrusImageUrl(walrusMediaId, src);

  return (
    <div
      className={clsx(
        'rounded-full overflow-hidden shrink-0 bg-panda-light',
        sizes[size],
        ring && 'ring-2 ring-panda ring-offset-2 ring-offset-cream',
        className,
      )}
    >
      <img src={resolvedSrc} alt={alt} className="w-full h-full object-cover" />
    </div>
  );
}
