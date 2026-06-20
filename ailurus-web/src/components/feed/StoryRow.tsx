import { Link } from 'react-router-dom';
import { usePlatformCreators } from '../../hooks/usePlatformData';
import { Avatar } from '../ui/Avatar';

export function StoryRow() {
  const { creators, isLoading } = usePlatformCreators();

  if (isLoading) {
    return (
      <div className="px-4 py-4 -mx-4 md:mx-0 md:px-0 text-sm text-muted">
        Loading stories...
      </div>
    );
  }

  if (!creators.length) return null;

  return (
    <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 py-4 -mx-4 md:mx-0 md:px-0">
      {creators.map((creator) => (
        <Link
          key={creator.id}
          to={`/${creator.handle.replace(/^@/, '')}`}
          className="flex flex-col items-center gap-1.5 shrink-0"
        >
          <Avatar src={creator.avatar} walrusMediaId={creator.avatarWalrusId} alt={creator.name} size="lg" ring />
          <span className="text-xs text-ink font-medium max-w-[72px] truncate">
            {creator.name.split(' ')[0]}
          </span>
        </Link>
      ))}
    </div>
  );
}
