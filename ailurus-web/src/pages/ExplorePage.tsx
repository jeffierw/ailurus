import { usePlatformCreators } from '../hooks/usePlatformData';
import { CreatorCard } from '../components/feed/CreatorCard';

const categories = ['All', 'Photography', 'Film', 'Illustration', 'Travel'];

export function ExplorePage() {
  const { creators, isLoading, isError } = usePlatformCreators();

  return (
    <div className="max-w-lg mx-auto md:max-w-xl px-4 md:px-0">
      <h1 className="text-2xl font-bold mb-1 hidden md:block">Explore</h1>
      <p className="text-sm text-muted mb-5 hidden md:block">
        Discover creators from around the world
      </p>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {categories.map((cat, i) => (
          <button
            key={cat}
            type="button"
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              i === 0
                ? 'bg-ink text-white'
                : 'bg-surface border border-border text-ink hover:bg-cream'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted text-sm">Loading creators...</div>
      )}
      {isError && (
        <div className="text-center py-12 text-muted text-sm">
          Could not load creators from chain.
        </div>
      )}
      {!isLoading && !isError && creators.length === 0 && (
        <div className="text-center py-12 text-muted text-sm">
          No creators registered yet. Be the first to publish.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {creators.map((creator) => (
          <CreatorCard key={creator.id} creator={creator} />
        ))}
      </div>
    </div>
  );
}
