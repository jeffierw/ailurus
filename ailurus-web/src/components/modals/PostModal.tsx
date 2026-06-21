import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { PostMedia } from '../feed/PostMedia';
import { PostEngagementBar } from '../feed/PostEngagementBar';
import { useModal } from '../../context/useModal';
import { useIsSubscribedTo, usePostById } from '../../hooks/usePlatformData';
import { SubscriberLockBadge } from '../ui/SubscriberLockBadge';

export function PostModal({ open }: { open: boolean }) {
  const account = useCurrentAccount();
  const { modalData, closeModal, openModal } = useModal();
  const post = usePostById(modalData.postId);
  const isSubscribedOnChain = useIsSubscribedTo(post?.creatorId, account?.address);

  if (!post) return null;

  const isOwnPost =
    account?.address && post.creatorId.toLowerCase() === account.address.toLowerCase();
  const canAccessLockedContent = isSubscribedOnChain || Boolean(isOwnPost);
  const isLocked = post.isLocked && !canAccessLockedContent;

  const handleUnlock = () => {
    closeModal();
    openModal('subscribe', {
      creatorId: post.creatorId,
      creatorAddress: post.creator.address,
      creatorName: post.creator.name,
      priceUsdc: post.creator.priceUsdc,
    });
  };

  return (
    <Modal open={open} onClose={closeModal} size="lg" flush>
      <div className="pb-4">
        <div className="relative overflow-hidden rounded-t-3xl sm:rounded-t-3xl">
          <PostMedia
            post={post}
            aspect="aspect-square"
            showPreview={!isLocked}
            viewerAddress={account?.address}
            canDecrypt={canAccessLockedContent}
            enableAlbumNav
            className="rounded-t-3xl sm:rounded-t-3xl"
          />
          {isLocked && (
            <div className="absolute inset-0 backdrop-blur-xl bg-black/20 flex flex-col items-center justify-center gap-3">
              <SubscriberLockBadge size="lg" showLabel />
              <Button size="sm" onClick={handleUnlock}>
                Subscribe to unlock
              </Button>
            </div>
          )}
        </div>

        <div className="px-5 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar src={post.creator.avatar} walrusMediaId={post.creator.avatarWalrusId} alt={post.creator.name} size="sm" />
            <div>
              <p className="font-semibold text-sm">{post.creator.name}</p>
              <p className="text-xs text-muted">{post.creator.handle}</p>
            </div>
          </div>

          <p className="text-sm leading-relaxed mb-4">{post.caption}</p>

          <PostEngagementBar post={post} />
        </div>
      </div>
    </Modal>
  );
}
