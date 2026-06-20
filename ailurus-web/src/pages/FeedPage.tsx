import { usePlatformPosts } from '../hooks/usePlatformData';
import { StoryRow } from '../components/feed/StoryRow';
import { PostCard } from '../components/feed/PostCard';

export function FeedPage() {
  const { posts, isLoading, isError } = usePlatformPosts();

  return (
    <div className="max-w-lg mx-auto md:max-w-xl">
      <StoryRow />
      {isLoading && (
        <div className="text-center py-12 text-muted text-sm">Loading feed...</div>
      )}
      {isError && (
        <div className="text-center py-12 text-muted text-sm px-4">
          Could not load on-chain feed. Check your network connection.
        </div>
      )}
      {!isLoading && !isError && posts.length === 0 && (
        <div className="text-center py-12 text-muted text-sm px-4">
          No public posts yet. Subscribe to creators for exclusive encrypted content on their profiles.
        </div>
      )}
      <div className="flex flex-col gap-6 px-4 md:px-0">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
