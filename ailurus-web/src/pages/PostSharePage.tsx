import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePostById } from '../hooks/usePlatformData';
import { PostMedia } from '../components/feed/PostMedia';
import { PostEngagementBar } from '../components/feed/PostEngagementBar';
import { Button } from '../components/ui/Button';
import { openShareToX } from '../lib/share';

function setMeta(property: string, content: string, isName = false) {
  const attr = isName ? 'name' : 'property';
  let tag = document.querySelector(`meta[${attr}="${property}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, property);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

export function PostSharePage() {
  const { postId } = useParams();
  const post = usePostById(postId);

  useEffect(() => {
    if (!post) return;
    const title = `${post.creator.name} on Ailurus`;
    const description = post.caption.slice(0, 160);
    const url = `${window.location.origin}/p/${post.id}`;
    const image = `${window.location.origin}/og-image.png`;

    document.title = title;
    setMeta('description', description, true);
    setMeta('og:title', title);
    setMeta('og:description', description);
    setMeta('og:url', url);
    setMeta('og:image', image);
    setMeta('og:type', 'website');
    setMeta('twitter:card', 'summary_large_image', true);
    setMeta('twitter:title', title, true);
    setMeta('twitter:description', description, true);
    setMeta('twitter:image', image, true);
  }, [post]);

  if (!post) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold mb-2">Post not found</h1>
        <p className="text-muted text-sm mb-6">This content may have expired or is on another network.</p>
        <Link to="/feed">
          <Button>Browse feed</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="rounded-2xl overflow-hidden border border-border bg-surface">
        <PostMedia post={post} showPreview={!post.isLocked} canDecrypt={false} />
        <div className="p-4">
          <p className="font-semibold">{post.creator.name}</p>
          <p className="text-sm text-muted mb-3">{post.creator.handle}</p>
          <p className="text-sm leading-relaxed mb-4">{post.caption}</p>
          <PostEngagementBar post={post} />
          <div className="flex gap-2 mt-4">
            <Button className="flex-1" onClick={() => openShareToX(post)}>
              Share on X
            </Button>
            <Link to="/feed" className="flex-1">
              <Button variant="secondary" className="w-full">
                Open Ailurus
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
