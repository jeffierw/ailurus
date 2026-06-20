export type Creator = {
  id: string;
  address: string;
  name: string;
  handle: string;
  avatar: string;
  avatarWalrusId?: string;
  bio: string;
  subscribers: number;
  posts: number;
  priceUsdc: number;
  verified?: boolean;
};

export type PostContentType = 'photo' | 'album' | 'video';

export type Post = {
  id: string;
  creatorId: string;
  creator: Creator;
  caption: string;
  /** Gradient class or Walrus media URL */
  imageUrl: string;
  walrusBlobId: string;
  sealObjectId: string;
  likes: number;
  comments: number;
  isLocked: boolean;
  type: PostContentType;
  createdAt: string;
  createdAtMs: number;
};
