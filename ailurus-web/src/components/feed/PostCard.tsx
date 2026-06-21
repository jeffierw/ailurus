import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { Link } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import type { Post } from '../../data/models';
import { formatCount } from '../../lib/format';
import { useIsSubscribedTo } from '../../hooks/usePlatformData';
import { usePostEngagement } from '../../hooks/useEngagement';
import { Avatar } from '../ui/Avatar';
import { SubscriberLockBadge } from '../ui/SubscriberLockBadge';
import { PostMedia } from './PostMedia';
import { PostEngagementBar } from './PostEngagementBar';
import { useModal } from '../../context/useModal';

type PostCardProps = {
  post: Post;
};

export function PostCard({ post }: PostCardProps) {
  const account = useCurrentAccount();
  const { openModal } = useModal();
  const isSubscribedOnChain = useIsSubscribedTo(post.creatorId, account?.address);
  const { engagement } = usePostEngagement(post.id, account?.address);
  const isOwnPost =
    account?.address && post.creatorId.toLowerCase() === account.address.toLowerCase();
  const canAccessLockedContent = isSubscribedOnChain || Boolean(isOwnPost);
  const isLocked = post.isLocked && !canAccessLockedContent;

  const openPost = () => openModal('post', { postId: post.id });

  return (
    <article className="bg-surface border border-border rounded-2xl overflow-hidden md:shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link to={`/${post.creator.handle.replace(/^@/, '')}`}>
          <Avatar src={post.creator.avatar} walrusMediaId={post.creator.avatarWalrusId} alt={post.creator.name} size="sm" ring />
        </Link>
        <Link to={`/${post.creator.handle.replace(/^@/, '')}`} className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{post.creator.name}</p>
          <p className="text-xs text-muted">{post.createdAt}</p>
        </Link>
        <button type="button" className="p-2 text-muted hover:text-ink rounded-full hover:bg-black/5">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <button type="button" onClick={openPost} className="w-full relative block">
        <PostMedia
          post={post}
          showPreview={!isLocked}
          viewerAddress={account?.address}
          canDecrypt={canAccessLockedContent}
        />
        {isLocked && (
          <div className="absolute inset-0 backdrop-blur-md bg-black/10 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <SubscriberLockBadge size="md" showLabel />
            <span className="text-white text-sm font-semibold drop-shadow">Subscribe to unlock</span>
          </div>
        )}
        {post.type === 'album' && !isLocked && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-medium backdrop-blur-sm">
            Album
          </span>
        )}
      </button>

      <div className="px-4 py-3">
        <PostEngagementBar post={post} compact />
        {(engagement?.likes ?? 0) > 0 && (
          <p className="text-sm font-semibold mt-2 mb-1">{formatCount(engagement!.likes)} likes</p>
        )}
        <p className="text-sm leading-relaxed mt-2">
          <span className="font-semibold mr-1.5">{post.creator.handle}</span>
          {post.caption}
        </p>
      </div>
    </article>
  );
}
