import { createContext } from 'react';
import type { UploadPipelineInput, UploadProgressHandler } from '../services/chainPipeline';

export type ModalType =
  | 'login'
  | 'onboarding'
  | 'username'
  | 'subscribe'
  | 'deposit'
  | 'upload'
  | 'post'
  | 'become-creator'
  | null;

export type LoginIntent = 'default' | 'subscribe' | 'create' | 'deposit';

export type ModalData = {
  creatorId?: string;
  creatorAddress?: string;
  creatorName?: string;
  priceUsdc?: number;
  postId?: string;
  loginIntent?: LoginIntent;
};

export type ActivityItem = {
  id: string;
  type: 'login' | 'deposit' | 'subscribe' | 'upload' | 'creator';
  label: string;
  amount?: number;
  status: 'Demo' | 'On-chain' | 'Pending';
};

export type UserIntent = 'fan' | 'creator' | null;

export type AppState = {
  isLoggedIn: boolean;
  address?: string;
  username: string | null;
  displayName: string | null;
  balanceUsdc: number;
  subscribedCreators: string[];
  isCreator: boolean;
  creatorPriceUsdc: number;
  onboardingCompleted: boolean;
  userIntent: UserIntent;
  activity: ActivityItem[];
};

export type CreatorRegistration = {
  name: string;
  handle: string;
  bio: string;
  priceUsdc: number;
  avatarWalrusId?: string;
  avatarFile?: {
    name: string;
    type: string;
    size: number;
    bytes: Uint8Array;
  };
};

export type ProfileUpdate = {
  displayName?: string;
  username?: string;
  bio?: string;
  priceUsdc?: number;
  avatarWalrusId?: string;
  avatarFile?: {
    name: string;
    type: string;
    size: number;
    bytes: Uint8Array;
  };
};

export type ModalContextValue = {
  modal: ModalType;
  modalData: ModalData;
  appState: AppState;
  authReady: boolean;
  chainConfigured: boolean;
  openModal: (type: ModalType, data?: ModalData) => void;
  closeModal: () => void;
  login: () => Promise<void>;
  logout: () => void;
  setUsername: (username: string) => void;
  completeOnboarding: (intent: UserIntent) => void;
  addBalance: (amount: number) => void;
  subscribe: (creatorId: string, creatorAddress: string, priceUsdc: number) => Promise<void>;
  registerCreator: (input: CreatorRegistration) => Promise<void>;
  publishPost: (input: UploadPipelineInput, options?: { onProgress?: UploadProgressHandler }) => Promise<void>;
  extendWalrusStorage: (
    input: { blobObjectId: string; epochs: number; postId?: string },
    options?: { onProgress?: UploadProgressHandler },
  ) => Promise<{ digest: string; epochs: number }>;
  updateProfile: (input: ProfileUpdate) => Promise<void>;
  getProfilePath: (address?: string) => string;
};

export const ModalContext = createContext<ModalContextValue | null>(null);
