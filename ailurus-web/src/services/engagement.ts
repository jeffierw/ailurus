const SPONSOR_URL =
  (import.meta.env.VITE_SPONSOR_WORKER_URL as string | undefined) ??
  'https://ailurus-sponsor.jeffier2015.workers.dev';

export type PostEngagement = {
  postId: string;
  likes: number;
  likedBy: string[];
  comments: EngagementComment[];
  savedBy: string[];
};

export type EngagementComment = {
  id: string;
  author: string;
  text: string;
  createdAtMs: number;
};

async function engagementFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SPONSOR_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof body.error === 'string' ? body.error : `Engagement request failed (${response.status})`,
    );
  }
  return body as T;
}

export async function fetchEngagement(postIds: string[]) {
  if (postIds.length === 0) return [] as PostEngagement[];
  const query = encodeURIComponent(postIds.join(','));
  const result = await engagementFetch<{ posts: PostEngagement[] }>(
    `/engagement?postIds=${query}`,
  );
  return result.posts;
}

export async function toggleLike(postId: string, address: string) {
  return engagementFetch<{ post: PostEngagement }>('/engagement/like', {
    method: 'POST',
    body: JSON.stringify({ postId, address }),
  });
}

export async function addComment(postId: string, address: string, text: string) {
  return engagementFetch<{ post: PostEngagement }>('/engagement/comment', {
    method: 'POST',
    body: JSON.stringify({ postId, address, text }),
  });
}

export async function toggleSave(postId: string, address: string) {
  return engagementFetch<{ post: PostEngagement }>('/engagement/save', {
    method: 'POST',
    body: JSON.stringify({ postId, address }),
  });
}
