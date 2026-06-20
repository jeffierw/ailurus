export type EngagementComment = {
  id: string;
  author: string;
  text: string;
  createdAtMs: number;
};

export type PostEngagement = {
  postId: string;
  likes: number;
  likedBy: string[];
  comments: EngagementComment[];
  savedBy: string[];
};

const store = new Map<string, PostEngagement>();

function emptyPost(postId: string): PostEngagement {
  return { postId, likes: 0, likedBy: [], comments: [], savedBy: [] };
}

function getPost(postId: string) {
  const existing = store.get(postId);
  if (existing) return existing;
  const created = emptyPost(postId);
  store.set(postId, created);
  return created;
}

function normalizeAddress(address: string) {
  return address.toLowerCase();
}

export function getEngagement(postIds: string[]) {
  return postIds.map((postId) => getPost(postId));
}

export function toggleLike(postId: string, address: string) {
  const post = getPost(postId);
  const normalized = normalizeAddress(address);
  const index = post.likedBy.findIndex((item) => item.toLowerCase() === normalized);
  if (index >= 0) {
    post.likedBy.splice(index, 1);
  } else {
    post.likedBy.push(address);
  }
  post.likes = post.likedBy.length;
  store.set(postId, post);
  return post;
}

export function addComment(postId: string, address: string, text: string) {
  const post = getPost(postId);
  post.comments.push({
    id: crypto.randomUUID(),
    author: address,
    text: text.trim().slice(0, 500),
    createdAtMs: Date.now(),
  });
  store.set(postId, post);
  return post;
}

export function toggleSave(postId: string, address: string) {
  const post = getPost(postId);
  const normalized = normalizeAddress(address);
  const index = post.savedBy.findIndex((item) => item.toLowerCase() === normalized);
  if (index >= 0) {
    post.savedBy.splice(index, 1);
  } else {
    post.savedBy.push(address);
  }
  store.set(postId, post);
  return post;
}

export function shareOgHtml(options: {
  title: string;
  description: string;
  imageUrl: string;
  pageUrl: string;
}) {
  const esc = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(options.title)}</title>
  <meta name="description" content="${esc(options.description)}" />
  <meta property="og:title" content="${esc(options.title)}" />
  <meta property="og:description" content="${esc(options.description)}" />
  <meta property="og:image" content="${esc(options.imageUrl)}" />
  <meta property="og:url" content="${esc(options.pageUrl)}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(options.title)}" />
  <meta name="twitter:description" content="${esc(options.description)}" />
  <meta name="twitter:image" content="${esc(options.imageUrl)}" />
  <meta http-equiv="refresh" content="0;url=${esc(options.pageUrl)}" />
</head>
<body>
  <p><a href="${esc(options.pageUrl)}">Open on Ailurus</a></p>
</body>
</html>`;
}
