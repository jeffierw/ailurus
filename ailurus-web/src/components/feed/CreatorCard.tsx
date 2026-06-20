import { Link } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import type { Creator } from '../../data/models';
import { formatCount } from '../../lib/format';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useModal } from '../../context/useModal';

type CreatorCardProps = {
  creator: Creator;
};

export function CreatorCard({ creator }: CreatorCardProps) {
  const { openModal } = useModal();

  return (
    <div className="flex items-center gap-4 p-4 bg-surface border border-border rounded-2xl hover:shadow-sm transition-shadow">
      <Link to={`/${creator.handle.replace(/^@/, '')}`}>
        <Avatar src={creator.avatar} walrusMediaId={creator.avatarWalrusId} alt={creator.name} size="lg" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/${creator.handle.replace(/^@/, '')}`} className="flex items-center gap-1">
          <span className="font-semibold text-sm truncate">{creator.name}</span>
          {creator.verified && <BadgeCheck className="w-4 h-4 text-sky-500 shrink-0" />}
        </Link>
        <p className="text-xs text-muted">{creator.handle}</p>
        <p className="text-xs text-muted mt-0.5">
          {formatCount(creator.subscribers)} subscribers · ${creator.priceUsdc.toFixed(2)}/mo
        </p>
      </div>
      <Button
        size="sm"
        onClick={() =>
          openModal('subscribe', {
            creatorId: creator.id,
            creatorAddress: creator.address,
            creatorName: creator.name,
            priceUsdc: creator.priceUsdc,
          })
        }
      >
        Subscribe
      </Button>
    </div>
  );
}
