import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { SubscriberLockBadge } from '../components/ui/SubscriberLockBadge';
import { PostMedia } from '../components/feed/PostMedia';
import { useModal } from '../context/useModal';
import { formatCount } from '../lib/format';
import {
  useCreatorModel,
  useCreatorPosts,
  useIsSubscribedTo,
  useResolvedCreator,
} from '../hooks/usePlatformData';
import { isSuiAddress } from '../lib/routes';

export function CreatorPage() {
  const { id } = useParams();
  const account = useCurrentAccount();
  const { openModal, chainConfigured } = useModal();
  const slug = id ?? '';
  const { data: onChainCreator, isLoading } = useResolvedCreator(slug);
  const { creator } = useCreatorModel(slug);
  const creatorAddress = onChainCreator?.owner ?? (isSuiAddress(slug) ? slug : null);
  const { posts: creatorPosts } = useCreatorPosts(creatorAddress);
  const isSubscribedOnChain = useIsSubscribedTo(creatorAddress ?? undefined, account?.address);

  if (creator && creator.handle) {
    const handleSlug = creator.handle.replace(/^@/, '');
    if (handleSlug !== slug) {
      return <Navigate to={`/${handleSlug}`} replace />;
    }
  }

  if (chainConfigured && isLoading) {
    return <div className="text-center py-20 text-muted text-sm">Loading creator...</div>;
  }

  if (!creator) {
    return (
      <div className="text-center py-20 text-muted">
        <p>Creator not found</p>
        <Link to="/explore" className="text-panda text-sm font-medium mt-2 inline-block">
          Back to explore
        </Link>
      </div>
    );
  }

  const isOwnProfile =
    account?.address &&
    creator.address.toLowerCase() === account.address.toLowerCase();

  const isSubscribed = isSubscribedOnChain || Boolean(isOwnProfile);
  const canAccessLockedContent = isSubscribedOnChain || Boolean(isOwnProfile);

  return (
    <div className="max-w-lg mx-auto md:max-w-xl">
      <div className="px-4 md:px-0 pb-6">
        <div className="flex items-center gap-5 mb-4">
          <Avatar src={creator.avatar} walrusMediaId={creator.avatarWalrusId} alt={creator.name} size="xl" ring />
          <div className="flex-1">
            <div className="flex gap-6 text-center">
              <div>
                <p className="font-bold text-lg">{creator.posts}</p>
                <p className="text-xs text-muted">posts</p>
              </div>
              <div>
                <p className="font-bold text-lg">{formatCount(creator.subscribers)}</p>
                <p className="text-xs text-muted">subscribers</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-lg">{creator.name}</h1>
            {creator.verified && <BadgeCheck className="w-5 h-5 text-sky-500" />}
          </div>
          <p className="text-sm text-muted">{creator.handle}</p>
          {creator.bio && <p className="text-sm mt-2 leading-relaxed">{creator.bio}</p>}
        </div>

        {isOwnProfile ? (
          <Button variant="secondary" className="w-full" disabled>
            This is your page
          </Button>
        ) : isSubscribed ? (
          <Button variant="secondary" className="w-full" disabled>
            Subscribed · ${creator.priceUsdc.toFixed(2)}/mo
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() =>
              openModal('subscribe', {
                creatorId: creator.id,
                creatorAddress: creator.address,
                creatorName: creator.name,
                priceUsdc: creator.priceUsdc,
              })
            }
          >
            Subscribe · ${creator.priceUsdc.toFixed(2)}/mo
          </Button>
        )}
      </div>

      {creatorPosts.length === 0 && (
        <div className="text-center py-8 text-muted text-sm border-t border-border">
          No posts published yet.
        </div>
      )}

      <div className="grid grid-cols-3 gap-0.5 border-t border-border">
        {creatorPosts.map((post) => {
          const locked = post.isLocked && !canAccessLockedContent;
          return (
            <button
              key={post.id}
              type="button"
              onClick={() => openModal('post', { postId: post.id })}
              className="aspect-square relative overflow-hidden"
            >
              <PostMedia
                post={post}
                fill
                className="absolute inset-0"
                showPreview={!locked}
                viewerAddress={account?.address}
                canDecrypt={canAccessLockedContent}
              />
              {locked && (
                <div className="absolute inset-0 bg-black/35 flex items-center justify-center pointer-events-none">
                  <SubscriberLockBadge size="sm" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
