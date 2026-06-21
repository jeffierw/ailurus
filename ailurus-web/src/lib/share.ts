import type { Post } from '../data/models';

export function postShareUrl(postId: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ailurus.wal.app';
  return `${origin}/p/${postId}`;
}

export function buildShareToXUrl(post: Post) {
  const url = postShareUrl(post.id);
  const text = `${post.creator.name} on Ailurus — ${post.caption.slice(0, 120)}`;
  const params = new URLSearchParams({
    text,
    url,
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function openShareToX(post: Post) {
  window.open(buildShareToXUrl(post), '_blank', 'noopener,noreferrer,width=550,height=420');
}
