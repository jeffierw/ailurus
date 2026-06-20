import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { AlbumSlide } from '../../hooks/useAlbumMedia';

type AlbumViewerProps = {
  slides: AlbumSlide[];
  currentIndex: number;
  aspect?: string;
  className?: string;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (index: number) => void;
};

function isVideoSlide(slide: AlbumSlide) {
  return (
    slide.contentType.startsWith('video/') ||
    slide.identifier.toLowerCase().match(/\.(mp4|webm|mov|m4v)$/) != null
  );
}

export function AlbumViewer({
  slides,
  currentIndex,
  aspect = 'aspect-square',
  className,
  onPrev,
  onNext,
  onGoTo,
}: AlbumViewerProps) {
  const slide = slides[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < slides.length - 1;

  if (!slide) {
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

  return (
    <div className={clsx(aspect, 'relative overflow-hidden bg-black/5 group', className)}>
      {slide.loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/5">
          <Loader2 className="w-6 h-6 text-muted animate-spin" />
        </div>
      )}

      {slide.url && isVideoSlide(slide) ? (
        <video
          key={slide.mediaKey}
          src={slide.url}
          className="absolute inset-0 h-full w-full object-cover"
          controls
          playsInline
        />
      ) : slide.url ? (
        <img
          key={slide.mediaKey}
          src={slide.url}
          alt={slide.identifier || `Album item ${currentIndex + 1}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : slide.error ? (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted">
          {slide.error}
        </div>
      ) : null}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(event) => {
              event.stopPropagation();
              onPrev();
            }}
            disabled={!hasPrev}
            className={clsx(
              'absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/45 text-white backdrop-blur-sm transition-opacity',
              hasPrev ? 'opacity-100 hover:bg-black/60' : 'opacity-0 pointer-events-none',
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            aria-label="Next image"
            onClick={(event) => {
              event.stopPropagation();
              onNext();
            }}
            disabled={!hasNext}
            className={clsx(
              'absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/45 text-white backdrop-blur-sm transition-opacity',
              hasNext ? 'opacity-100 hover:bg-black/60' : 'opacity-0 pointer-events-none',
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/45 backdrop-blur-sm">
            {slides.map((item, index) => (
              <button
                key={item.mediaKey}
                type="button"
                aria-label={`Go to image ${index + 1}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onGoTo(index);
                }}
                className={clsx(
                  'rounded-full transition-all',
                  index === currentIndex
                    ? 'w-2 h-2 bg-white'
                    : 'w-1.5 h-1.5 bg-white/45 hover:bg-white/70',
                )}
              />
            ))}
          </div>

          <span className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-black/45 text-white text-xs font-medium backdrop-blur-sm">
            {currentIndex + 1} / {slides.length}
          </span>
        </>
      )}
    </div>
  );
}
