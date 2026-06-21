import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import type { Post } from '../../data/models';
import { primaryPostMediaId } from '../../lib/postMedia';
import { useDecryptedMedia } from '../../hooks/useDecryptedMedia';
import { useAlbumMedia } from '../../hooks/useAlbumMedia';
import { AlbumViewer } from './AlbumViewer';
import { MosaicBackground } from '../ui/MosaicBackground';
import { SubscriberLockBadge } from '../ui/SubscriberLockBadge';

type PostMediaProps = {
  post: Post;
  className?: string;
  aspect?: string;
  showPreview?: boolean;
  viewerAddress?: string;
  canDecrypt?: boolean;
  /** Fill parent container (profile grid cells). */
  fill?: boolean;
  /** Enable prev/next navigation for multi-image albums (e.g. in post modal) */
  enableAlbumNav?: boolean;
};

function mediaShellClass(aspect: string, fill: boolean, className?: string) {
  return clsx(
    'relative overflow-hidden bg-black/5',
    fill ? 'h-full w-full min-h-0' : aspect,
    className,
  );
}

export function PostMedia({
  post,
  className,
  aspect = 'aspect-[4/5]',
  showPreview = false,
  viewerAddress,
  canDecrypt = false,
  fill = false,
  enableAlbumNav = false,
}: PostMediaProps) {
  const mediaId = primaryPostMediaId(post.sealObjectId, post.walrusBlobId);
  const shouldLoadMedia = showPreview && Boolean(mediaId);
  const isAlbumView = enableAlbumNav && post.type === 'album';
  const fillParent = fill || Boolean(className?.includes('inset-0'));

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
    canDecrypt,
  });

  if (shouldLoadMedia && isAlbumView) {
    if (album.loading) {
      return (
        <div className={mediaShellClass(aspect, fillParent, className)}>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-muted animate-spin" />
          </div>
        </div>
      );
    }

    if (albumReady) {
      return (
        <AlbumViewer
          slides={album.slides}
          currentIndex={album.currentIndex}
          aspect={fillParent ? 'h-full w-full' : aspect}
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
      <div className={mediaShellClass(aspect, fillParent, className)}>
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-muted animate-spin" />
        </div>
      </div>
    );
  }

  if (shouldLoadMedia && url) {
    const isVideo =
      post.type === 'video' ||
      url.includes('video') ||
      post.caption.toLowerCase().includes('video');

    if (fillParent) {
      return isVideo ? (
        <video
          src={url}
          className={clsx('block h-full w-full object-cover', className)}
          controls
          playsInline
        />
      ) : (
        <img
          src={url}
          alt={post.caption || 'Post media'}
          className={clsx('block h-full w-full object-cover', className)}
          decoding="async"
        />
      );
    }

    return (
      <div className={mediaShellClass(aspect, fillParent, className)}>
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
            decoding="async"
          />
        )}
      </div>
    );
  }

  const mosaicSeed = post.walrusBlobId || post.sealObjectId || post.id;

  if (shouldLoadMedia && error) {
    return (
      <div className={mediaShellClass(aspect, fillParent, className)}>
        <MosaicBackground seed={mosaicSeed} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 px-2 text-center">
          {canDecrypt ? (
            <span className="text-[10px] font-medium text-white/90 leading-snug">
              Couldn&apos;t unlock media
            </span>
          ) : (
            <SubscriberLockBadge size="sm" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={mediaShellClass(aspect, fillParent, className)} aria-label={post.caption || 'Post media'}>
      <MosaicBackground seed={mosaicSeed} />
    </div>
  );
}
