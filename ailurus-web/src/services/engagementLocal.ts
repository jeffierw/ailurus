import type { EngagementComment, PostEngagement } from './engagement';

const STORAGE_KEY = 'ailurus:engagement:local';

type Store = Record<string, PostEngagement>;

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function emptyPost(postId: string): PostEngagement {
  return { postId, likes: 0, likedBy: [], comments: [], savedBy: [] };
}

function getPost(store: Store, postId: string) {
  return store[postId] ?? emptyPost(postId);
}

export function localGetEngagement(postIds: string[]) {
  const store = readStore();
  return postIds.map((postId) => getPost(store, postId));
}

export function localToggleLike(postId: string, address: string) {
  const store = readStore();
  const post = getPost(store, postId);
  const normalized = address.toLowerCase();
  const index = post.likedBy.findIndex((item) => item.toLowerCase() === normalized);
  if (index >= 0) post.likedBy.splice(index, 1);
  else post.likedBy.push(address);
  post.likes = post.likedBy.length;
  store[postId] = post;
  writeStore(store);
  return post;
}

export function localAddComment(postId: string, address: string, text: string) {
  const store = readStore();
  const post = getPost(store, postId);
  const comment: EngagementComment = {
    id: crypto.randomUUID(),
    author: address,
    text: text.trim().slice(0, 500),
    createdAtMs: Date.now(),
  };
  post.comments.push(comment);
  store[postId] = post;
  writeStore(store);
  return post;
}

export function localToggleSave(postId: string, address: string) {
  const store = readStore();
  const post = getPost(store, postId);
  const normalized = address.toLowerCase();
  const index = post.savedBy.findIndex((item) => item.toLowerCase() === normalized);
  if (index >= 0) post.savedBy.splice(index, 1);
  else post.savedBy.push(address);
  store[postId] = post;
  writeStore(store);
  return post;
}

export function localUpsertEngagement(post: PostEngagement) {
  const store = readStore();
  store[post.postId] = post;
  writeStore(store);
}
