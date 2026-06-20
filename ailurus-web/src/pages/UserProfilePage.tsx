import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, Lock } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { PostMedia } from '../components/feed/PostMedia';
import { useModal } from '../context/useModal';
import { formatCount } from '../lib/format';
import { getAvatarWalrusId, resolveAddressBySlug } from '../lib/profileStorage';
import { isSuiAddress, RESERVED_USERNAMES } from '../lib/routes';
import {
  useCreatorModel,
  useCreatorPosts,
  useIsSubscribedTo,
  useResolvedCreator,
} from '../hooks/usePlatformData';

export function UserProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { appState, openModal, chainConfigured } = useModal();
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [loadingSlug, setLoadingSlug] = useState(true);

  const { data: onChainCreator, isLoading: loadingCreator } = useResolvedCreator(slug);
  const { creator: mappedCreator } = useCreatorModel(slug);
  const creatorAddress = onChainCreator?.owner ?? resolvedAddress;
  const { posts: creatorPosts, isLoading: loadingPosts } = useCreatorPosts(creatorAddress);
  const isSubscribedOnChain = useIsSubscribedTo(creatorAddress ?? undefined, appState.address);

  useEffect(() => {
    if (!slug) return;

    if (RESERVED_USERNAMES.has(slug.toLowerCase())) {
      setResolvedAddress(null);
      setLoadingSlug(false);
      return;
    }

    if (isSuiAddress(slug)) {
      setResolvedAddress(slug);
    } else {
      setResolvedAddress(resolveAddressBySlug(slug));
    }
    setLoadingSlug(false);
  }, [slug]);

  const creator = mappedCreator;
  const resolvedFromChain = onChainCreator?.owner ?? resolvedAddress;

  const isOwnProfile =
    resolvedFromChain &&
    appState.address &&
    resolvedFromChain.toLowerCase() === appState.address.toLowerCase();

  const loading = loadingSlug || (chainConfigured && loadingCreator);

  if (loading) {
    return <div className="text-center py-20 text-muted text-sm">Loading profile...</div>;
  }

  if (!resolvedFromChain && !creator) {
    return (
      <div className="text-center py-20 text-muted">
        <p>Profile not found</p>
        <Link to="/explore" className="text-panda text-sm font-medium mt-2 inline-block">
          Back to explore
        </Link>
      </div>
    );
  }

  if (!creator && resolvedFromChain) {
    const displayName = isOwnProfile
      ? appState.displayName ?? appState.username ?? 'Your profile'
      : `${resolvedFromChain.slice(0, 6)}...${resolvedFromChain.slice(-4)}`;
    const handle = isOwnProfile
      ? appState.username ? `@${appState.username}` : resolvedFromChain
      : resolvedFromChain;

    return (
      <div className="max-w-lg mx-auto md:max-w-xl px-4 md:px-0 py-8 text-center">
        <Avatar
          src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${resolvedFromChain}`}
          walrusMediaId={isOwnProfile ? getAvatarWalrusId(resolvedFromChain) : undefined}
          alt={displayName}
          size="xl"
          className="mx-auto mb-4"
        />
        <h1 className="text-xl font-bold">{displayName}</h1>
        <p className="text-sm text-muted mt-1">{handle}</p>
        {isOwnProfile && !appState.username && (
          <Button size="sm" className="mt-4" onClick={() => openModal('username')}>
            Choose a username
          </Button>
        )}
        {isOwnProfile && !appState.isCreator && (
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => openModal('become-creator')}>
            Become a creator
          </Button>
        )}
      </div>
    );
  }

  if (!creator) return null;

  const isSubscribed =
    isSubscribedOnChain ||
    Boolean(isOwnProfile) ||
    appState.subscribedCreators.includes(creator.id);

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

      {loadingPosts && (
        <div className="text-center py-8 text-muted text-sm border-t border-border">
          Loading posts...
        </div>
      )}

      {!loadingPosts && creatorPosts.length === 0 && (
        <div className="text-center py-8 text-muted text-sm border-t border-border">
          No posts published yet.
        </div>
      )}

      <div className="grid grid-cols-3 gap-0.5 border-t border-border">
        {creatorPosts.map((post) => {
          const locked = post.isLocked && !isSubscribed;
          return (
            <button
              key={post.id}
              type="button"
              onClick={() => openModal('post', { postId: post.id })}
              className="aspect-square relative overflow-hidden"
            >
              <PostMedia
                post={post}
                aspect="aspect-square"
                className="absolute inset-0"
                showPreview={!locked}
                viewerAddress={appState.address}
                canDecrypt={Boolean(isOwnProfile) || isSubscribed}
              />
              {locked && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
