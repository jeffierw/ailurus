import { useState } from 'react';
import { Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Post } from '../../data/models';
import type { EngagementComment } from '../../services/engagement';
import { formatCount } from '../../lib/format';
import { openShareToX } from '../../lib/share';
import { usePostEngagement } from '../../hooks/useEngagement';
import { useModal } from '../../context/useModal';
import { logAppError, toUserFacingMessage } from '../../lib/userFacingError';

type PostEngagementBarProps = {
  post: Post;
  onCommentClick?: () => void;
  compact?: boolean;
};

export function PostEngagementBar({ post, onCommentClick, compact = false }: PostEngagementBarProps) {
  const { appState, openModal } = useModal();
  const { engagement, isLiked, isSaved, toggleLike, toggleSave, addComment } = usePostEngagement(
    post.id,
    appState.address,
  );
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

  const requireAuth = (action: () => Promise<unknown>) => {
    if (!appState.isLoggedIn) {
      openModal('login');
      toast.info('Sign in to interact with posts');
      return;
    }
    void action().catch((error) => {
      logAppError('PostEngagementBar', error);
      toast.error(toUserFacingMessage(error, 'Action failed'));
    });
  };

  const handleComment = () => {
    if (onCommentClick) {
      onCommentClick();
      return;
    }
    setCommentOpen((open) => !open);
  };

  const submitComment = () => {
    const text = commentText.trim();
    if (!text) return;
    requireAuth(async () => {
      await addComment(text);
      setCommentText('');
      toast.success('Comment posted');
    });
  };

  return (
    <div>
      <div className={`flex items-center ${compact ? 'gap-4' : 'gap-5'} text-muted`}>
        <button
          type="button"
          onClick={() => requireAuth(toggleLike)}
          className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-panda' : 'hover:text-panda'}`}
          aria-pressed={isLiked}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          {(engagement?.likes ?? 0) > 0 && (
            <span className="text-sm">{formatCount(engagement!.likes)}</span>
          )}
        </button>
        <button
          type="button"
          onClick={handleComment}
          className="flex items-center gap-1.5 hover:text-panda transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          {(engagement?.comments.length ?? 0) > 0 && (
            <span className="text-sm">{engagement!.comments.length}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => requireAuth(toggleSave)}
          className={`flex items-center gap-1.5 transition-colors ${isSaved ? 'text-panda' : 'hover:text-panda'}`}
          aria-pressed={isSaved}
        >
          <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
        </button>
        <button
          type="button"
          onClick={() => openShareToX(post)}
          className={`${compact ? '' : 'ml-auto '}hover:text-panda transition-colors`}
          aria-label="Share on X"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {commentOpen && (
        <div className="mt-3 flex gap-2">
          <input
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Add a comment…"
            className="flex-1 h-10 px-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-panda/30"
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitComment();
            }}
          />
          <button
            type="button"
            onClick={submitComment}
            className="px-4 h-10 rounded-xl bg-panda text-white text-sm font-medium hover:bg-panda-dark transition-colors"
          >
            Post
          </button>
        </div>
      )}

      {!compact && (engagement?.comments.length ?? 0) > 0 && (
        <ul className="mt-3 space-y-2">
          {engagement!.comments.slice(-3).map((comment: EngagementComment) => (
            <li key={comment.id} className="text-sm">
              <span className="font-semibold mr-1">{comment.author.slice(0, 8)}…</span>
              {comment.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
