import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { PostMedia } from '../feed/PostMedia';
import { PostEngagementBar } from '../feed/PostEngagementBar';
import { useModal } from '../../context/useModal';
import { useIsSubscribedTo, usePostById } from '../../hooks/usePlatformData';
import { Lock } from 'lucide-react';

export function PostModal({ open }: { open: boolean }) {
  const { modalData, closeModal, appState, openModal } = useModal();
  const post = usePostById(modalData.postId);
  const isSubscribedOnChain = useIsSubscribedTo(post?.creatorId, appState.address);

  if (!post) return null;

  const isOwnPost =
    appState.address && post.creatorId.toLowerCase() === appState.address.toLowerCase();
  const isSubscribed =
    isSubscribedOnChain ||
    isOwnPost ||
    appState.subscribedCreators.includes(post.creatorId);
  const isLocked = post.isLocked && !isSubscribed;

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
            viewerAddress={appState.address}
            canDecrypt={Boolean(isOwnPost) || isSubscribed}
            enableAlbumNav
            className="rounded-t-3xl sm:rounded-t-3xl"
          />
          {isLocked && (
            <div className="absolute inset-0 backdrop-blur-xl bg-black/20 flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                <Lock className="w-6 h-6 text-panda" />
              </div>
              <p className="text-white font-semibold text-sm drop-shadow">Subscribers only</p>
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
