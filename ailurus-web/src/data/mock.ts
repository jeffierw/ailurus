export type { Creator, Post, PostContentType } from './models';
export { formatCount } from '../lib/format';

export const currentUser = {
  name: 'You',
  handle: '@guest',
  avatar: 'https://api.dicebear.com/9.x/thumbs/svg?seed=guest',
  isLoggedIn: false,
  isCreator: false,
};

/** @deprecated Use usePlatformCreators() — kept for type re-exports only */
export const creators: never[] = [];

/** @deprecated Use usePlatformPosts() — kept for type re-exports only */
export const posts: never[] = [];
