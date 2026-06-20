import clsx from 'clsx';
import { Loader2, Lock } from 'lucide-react';
import type { Post } from '../../data/models';
import { primaryPostMediaId } from '../../lib/postMedia';
import { useDecryptedMedia } from '../../hooks/useDecryptedMedia';
import { useAlbumMedia } from '../../hooks/useAlbumMedia';
import { AlbumViewer } from './AlbumViewer';

type PostMediaProps = {
  post: Post;
  className?: string;
  aspect?: string;
  showPreview?: boolean;
  viewerAddress?: string;
  canDecrypt?: boolean;
  /** Enable prev/next navigation for multi-image albums (e.g. in post modal) */
  enableAlbumNav?: boolean;
};

export function PostMedia({
  post,
  className,
  aspect = 'aspect-[4/5]',
  showPreview = false,
  viewerAddress,
  canDecrypt = false,
  enableAlbumNav = false,
}: PostMediaProps) {
  const mediaId = primaryPostMediaId(post.sealObjectId, post.walrusBlobId);
  const shouldLoadMedia = showPreview && Boolean(mediaId);
  const isAlbumView = enableAlbumNav && post.type === 'album';

  const album = useAlbumMedia(post, {
    enabled: shouldLoadMedia && isAlbumView,
    viewerAddress,
    canDecrypt,
  });

  const albumReady = isAlbumView && album.slides.length > 0;
  const albumFallback = isAlbumView && !album.loading && album.slides.length === 0;

  const { url, loading, error } = useDecryptedMedia(post, {
    enabled: shouldLoadMedia && (!isAlbumView || albumFallback),
    viewerAddress,
    isOwnPost: canDecrypt,
  });

  if (shouldLoadMedia && isAlbumView) {
    if (album.loading) {
      return (
        <div
          className={clsx(
            aspect,
            'relative overflow-hidden bg-black/5 flex items-center justify-center',
            className,
          )}
        >
          <Loader2 className="w-6 h-6 text-muted animate-spin" />
        </div>
      );
    }

    if (albumReady) {
      return (
        <AlbumViewer
          slides={album.slides}
          currentIndex={album.currentIndex}
          aspect={aspect}
          className={className}
          onPrev={album.goPrev}
          onNext={album.goNext}
          onGoTo={album.goTo}
        />
      );
    }
  }

  if (shouldLoadMedia && loading) {
    return (
      <div
        className={clsx(
          aspect,
          'relative overflow-hidden bg-black/5 flex items-center justify-center',
          className,
        )}
      >
        <Loader2 className="w-6 h-6 text-muted animate-spin" />
      </div>
    );
  }

  if (shouldLoadMedia && url) {
    const isVideo =
      post.type === 'video' ||
      url.includes('video') ||
      post.caption.toLowerCase().includes('video');

    return (
      <div className={clsx(aspect, 'relative overflow-hidden bg-black/5', className)}>
        {isVideo ? (
          <video
            src={url}
            className="absolute inset-0 h-full w-full object-cover"
            controls
            playsInline
          />
        ) : (
          <img
            src={url}
            alt={post.caption || 'Post media'}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>
    );
  }

  if (shouldLoadMedia && error) {
    return (
      <div
        className={clsx(
          aspect,
          'relative overflow-hidden bg-gradient-to-br flex items-center justify-center',
          post.imageUrl,
          className,
        )}
      >
        {post.isLocked ? <Lock className="w-6 h-6 text-white/80" /> : null}
      </div>
    );
  }

  return (
    <div
      className={clsx(aspect, 'bg-gradient-to-br', post.imageUrl, className)}
      aria-label={post.caption || 'Post media'}
    />
  );
}
