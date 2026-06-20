import {
  useCurrentAccount,
  useCurrentClient,
  useCurrentWallet,
  useDAppKit,
  useWalletConnection,
  useWallets,
} from '@mysten/dapp-kit-react';
import { isGoogleWallet } from '@mysten/enoki';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadPersistedState, savePersistedState, toPersisted } from '../lib/appStorage';
import { clearAuthSessionFlags, markPendingPostLogin, saveLoginIntent } from '../lib/authSession';
import { getProfilePath as buildProfilePath } from '../lib/routes';
import { loadProfile, saveProfile, setUsername as persistUsername } from '../lib/profileStorage';
import {
  contentTypeToMove,
  prepareEncryptedUpload,
  reportUploadProgress,
  uploadContentWithWalrusSdk,
  extendWalrusBlob,
  uploadAvatarToWalrus,
  uploadProgressSteps,
  usdcToMicros,
  type UploadPipelineInput,
  type UploadProgressHandler,
} from '../services/chainPipeline';
import { hasOnChainConfig, AILURUS_CONFIG } from '../sui/config';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { findCreatorByAddress, PLATFORM_QUERY_KEY } from '../sui/platform';
import { signAndExecuteWithSponsor } from '../sui/sponsored';
import {
  buildPublishPostTx,
  buildRegisterCreatorTx,
  buildSubscribeTx,
  buildUpdatePriceTx,
  type RegisterCreatorInput,
} from '../sui/transactions';
import {
  ModalContext,
  type AppState,
  type CreatorRegistration,
  type ModalData,
  type ModalType,
  type ProfileUpdate,
  type UserIntent,
} from './modalContextBase';

function createInitialState(): AppState {
  return {
    isLoggedIn: false,
    balanceUsdc: 0,
    subscribedCreators: [],
    isCreator: false,
    creatorPriceUsdc: 4.99,
    username: null,
    displayName: null,
    onboardingCompleted: false,
    userIntent: null,
    activity: [],
  };
}

async function waitForDigest(client: unknown, digest: string) {
  const maybeClient = client as { waitForTransaction?: (options: { digest: string }) => Promise<unknown> };
  await maybeClient.waitForTransaction?.({ digest });
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const dAppKit = useDAppKit();
  const wallets = useWallets();
  const walletConnection = useWalletConnection();
  const wallet = useCurrentWallet();
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<ModalData>({});
  const [localState, setLocalState] = useState<AppState>(createInitialState);
  const [authReady, setAuthReady] = useState(false);
  const hydratedAddress = useRef<string | null>(null);

  const chainConfigured = hasOnChainConfig();

  const appState = useMemo(
    () => ({
      ...localState,
      isLoggedIn: Boolean(account?.address) || localState.isLoggedIn,
      address: account?.address ?? localState.address,
    }),
    [account, localState],
  );

  useEffect(() => {
    if (walletConnection.isConnecting || walletConnection.isReconnecting) {
      setAuthReady(false);
      return;
    }

    const address = account?.address;
    if (!address) {
      hydratedAddress.current = null;
      setAuthReady(true);
      return;
    }

    if (hydratedAddress.current === address) return;
    hydratedAddress.current = address;

    const persisted = loadPersistedState(address);
    const profile = loadProfile(address);

    setLocalState((prev) => ({
      ...prev,
      ...persisted,
      isLoggedIn: true,
      address,
      username: profile.username ?? persisted.username ?? null,
      displayName: profile.displayName ?? persisted.displayName ?? null,
      onboardingCompleted: persisted.onboardingCompleted || Boolean(profile.onboardingCompleted),
      userIntent: persisted.userIntent ?? profile.userIntent ?? null,
    }));
    setAuthReady(true);
  }, [account?.address, walletConnection.isConnecting, walletConnection.isReconnecting]);

  useEffect(() => {
    const address = account?.address;
    if (!address) return;
    savePersistedState(address, toPersisted({ ...localState, isLoggedIn: true, address }));
  }, [account?.address, localState]);

  useEffect(() => {
    const address = account?.address;
    if (!address || !chainConfigured) return;

    void findCreatorByAddress(client as SuiGrpcClient, address)
      .then((creator) => {
        setLocalState((prev) => ({
          ...prev,
          isCreator: Boolean(creator),
          ...(creator
            ? {
                creatorPriceUsdc: Number(creator.priceMicros) / 1_000_000,
                displayName: prev.displayName ?? creator.name,
                username: prev.username ?? creator.handle.replace(/^@/, ''),
              }
            : {}),
        }));
      })
      .catch(() => undefined);
  }, [account?.address, chainConfigured, client, AILURUS_CONFIG.platformId]);

  const openModal = useCallback((type: ModalType, data: ModalData = {}) => {
    if (type === 'login' && data.loginIntent) {
      saveLoginIntent(data.loginIntent);
    }
    setModal(type);
    setModalData(data);
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
    setModalData({});
  }, []);

  const login = useCallback(async () => {
    const googleWallet = wallets.find((w) => isGoogleWallet(w));
    if (!googleWallet) {
      throw new Error('Google sign-in is not configured.');
    }
    markPendingPostLogin();
    if (!account) {
      await dAppKit.connectWallet({ wallet: googleWallet });
    }
    setLocalState((s) => ({
      ...s,
      isLoggedIn: true,
      address: account?.address,
    }));
  }, [account, dAppKit, wallets]);

  const logout = useCallback(() => {
    clearAuthSessionFlags();
    void dAppKit.disconnectWallet().catch(() => undefined);
    hydratedAddress.current = null;
    setLocalState(createInitialState());
  }, [dAppKit]);

  const setUsername = useCallback(
    (username: string) => {
      const address = account?.address ?? localState.address;
      if (!address) return;
      persistUsername(address, username);
      setLocalState((s) => ({
        ...s,
        username,
        displayName: s.displayName ?? username,
      }));
    },
    [account?.address, localState.address],
  );

  const completeOnboarding = useCallback(
    (intent: UserIntent) => {
      setLocalState((s) => ({
        ...s,
        onboardingCompleted: true,
        userIntent: intent,
      }));
      const address = account?.address ?? localState.address;
      if (address) {
        const profile = loadProfile(address);
        saveProfile(address, { ...profile, onboardingCompleted: true, userIntent: intent ?? undefined });
      }
    },
    [account?.address, localState.address],
  );

  const addBalance = useCallback((amount: number) => {
    setLocalState((s) => ({
      ...s,
      balanceUsdc: s.balanceUsdc + amount,
      activity: [
        {
          id: crypto.randomUUID(),
          type: 'deposit',
          label: 'Balance top-up',
          amount,
          status: 'Demo',
        },
        ...s.activity,
      ],
    }));
  }, []);

  const executeTx = useCallback(
    async (
      tx: ReturnType<typeof buildRegisterCreatorTx>,
      options: { extraAllowedAddresses?: string[] } = {},
    ) => {
      if (!account) throw new Error('Not signed in');

      try {
        return await signAndExecuteWithSponsor({
          transaction: tx,
          sender: account.address,
          client: client as SuiGrpcClient,
          wallet,
          signTransaction: ({ transaction }) => dAppKit.signTransaction({ transaction }),
          extraAllowedAddresses: options.extraAllowedAddresses,
        });
      } catch {
        const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
        const digest =
          result &&
          typeof result === 'object' &&
          'Transaction' in result &&
          result.Transaction &&
          'digest' in result.Transaction
            ? result.Transaction.digest
            : undefined;
        if (digest) await waitForDigest(client, digest);
        return digest;
      }
    },
    [account, client, dAppKit, wallet],
  );

  const subscribe = useCallback(
    async (creatorId: string, creatorAddress: string, priceUsdc: number) => {
      if (account && chainConfigured) {
        const tx = buildSubscribeTx(creatorAddress, usdcToMicros(priceUsdc), account.address);
        await executeTx(tx, { extraAllowedAddresses: [creatorAddress] });
        await queryClient.invalidateQueries({ queryKey: ['ailurus', account.address] });
        await queryClient.invalidateQueries({ queryKey: PLATFORM_QUERY_KEY });
      }

      setLocalState((s) => ({
        ...s,
        balanceUsdc: account && chainConfigured ? s.balanceUsdc : s.balanceUsdc - priceUsdc,
        subscribedCreators: s.subscribedCreators.includes(creatorId)
          ? s.subscribedCreators
          : [...s.subscribedCreators, creatorId],
        activity: [
          {
            id: crypto.randomUUID(),
            type: 'subscribe',
            label: `Subscription ${creatorId}`,
            amount: -priceUsdc,
            status: account && chainConfigured ? 'On-chain' : 'Demo',
          },
          ...s.activity,
        ],
      }));
    },
    [account, chainConfigured, executeTx, queryClient],
  );

  const registerCreator = useCallback(
    async (input: CreatorRegistration) => {
      const handle = input.handle.trim().startsWith('@') ? input.handle.trim() : `@${input.handle.trim()}`;

      let avatarWalrusId = input.avatarWalrusId;
      if (!avatarWalrusId && input.avatarFile && account && chainConfigured) {
        const signAndExecute = async ({ transaction }: { transaction: unknown; label?: string }) => {
          if (!account) throw new Error('Not signed in');
          return dAppKit.signAndExecuteTransaction({ transaction: transaction as never });
        };
        avatarWalrusId = await uploadAvatarToWalrus(input.avatarFile, {
          address: account.address,
          client,
          signAndExecute,
        });
      }

      const payload: RegisterCreatorInput = {
        name: input.name,
        handle,
        bio: input.bio,
        priceMicros: usdcToMicros(input.priceUsdc),
        sealPolicyId: `policy:${handle}`,
      };

      if (account && chainConfigured) {
        await executeTx(buildRegisterCreatorTx(payload, account.address));
        await queryClient.invalidateQueries({ queryKey: ['ailurus', account.address] });
        await queryClient.invalidateQueries({ queryKey: PLATFORM_QUERY_KEY });
      }

      const username = handle.replace(/^@/, '');
      if (account?.address) {
        persistUsername(account.address, username);
        const existing = loadProfile(account.address);
        saveProfile(account.address, {
          ...existing,
          username,
          displayName: input.name,
          bio: input.bio,
          avatarWalrusId,
        });
      }

      setLocalState((s) => ({
        ...s,
        isCreator: true,
        onboardingCompleted: true,
        userIntent: 'creator',
        creatorPriceUsdc: input.priceUsdc,
        username,
        displayName: input.name,
        activity: [
          {
            id: crypto.randomUUID(),
            type: 'creator',
            label: `Creator profile ${handle}`,
            status: account && chainConfigured ? 'On-chain' : 'Demo',
          },
          ...s.activity,
        ],
      }));
    },
    [account, chainConfigured, client, dAppKit, executeTx, queryClient],
  );

  const publishPost = useCallback(
    async (input: UploadPipelineInput, options: { onProgress?: UploadProgressHandler } = {}) => {
      const { onProgress } = options;
      const steps = uploadProgressSteps(input.encrypted);

      const signAndExecute = async ({
        transaction,
        label,
      }: {
        transaction: unknown;
        label?: string;
      }) => {
        if (!account) throw new Error('Not signed in');
        reportUploadProgress(
          onProgress,
          steps,
          'sign',
          label ? `${label} — approve in your wallet` : 'Approve in your wallet',
        );
        const result = await dAppKit.signAndExecuteTransaction({ transaction: transaction as never });
        reportUploadProgress(onProgress, steps, 'broadcast', label ?? 'Sending transaction to Sui');
        return result;
      };

      const pipeline =
        account && chainConfigured
          ? await uploadContentWithWalrusSdk(input, {
              address: account.address,
              client,
              signAndExecute,
              onProgress,
            })
          : await prepareEncryptedUpload(input);

      if (account && chainConfigured) {
        const onChainCreator = await findCreatorByAddress(client as SuiGrpcClient, account.address);
        if (!onChainCreator) {
          setLocalState((s) => ({ ...s, isCreator: false }));
          throw new Error(
            'Creator profile not found on-chain. Open Create and complete "Become a creator" again.',
          );
        }

        reportUploadProgress(onProgress, steps, 'sign', 'Publish post — approve in your wallet');
        await executeTx(
          buildPublishPostTx(
            {
              caption: input.caption,
              contentType: contentTypeToMove(input.contentType),
              walrusBlobId: pipeline.walrusBlobId,
              sealObjectId: pipeline.sealObjectId,
              isLocked: input.encrypted,
            },
            account.address,
          ),
        );
        reportUploadProgress(onProgress, steps, 'confirm', 'Post confirmed on-chain');
        await queryClient.invalidateQueries({ queryKey: ['ailurus', account.address] });
        await queryClient.invalidateQueries({ queryKey: PLATFORM_QUERY_KEY });

      }

      setLocalState((s) => ({
        ...s,
        balanceUsdc:
          account && chainConfigured ? s.balanceUsdc : s.balanceUsdc - input.estimatedCostUsdc,
        activity: [
          {
            id: crypto.randomUUID(),
            type: 'upload',
            label: `${input.contentType} -> ${pipeline.walrusBlobId}`,
            amount: -input.estimatedCostUsdc,
            status: account && chainConfigured ? 'On-chain' : 'Demo',
          },
          ...s.activity,
        ],
      }));
    },
    [account, chainConfigured, client, dAppKit, executeTx, queryClient, wallet],
  );

  const extendWalrusStorage = useCallback(
    async (
      input: { blobObjectId: string; epochs: number; postId?: string },
      options: { onProgress?: UploadProgressHandler } = {},
    ) => {
      if (!account || !chainConfigured) {
        throw new Error('Sign in and connect to chain to extend storage');
      }

      const signAndExecute = async ({
        transaction,
        label,
      }: {
        transaction: unknown;
        label?: string;
      }) => {
        reportUploadProgress(
          options.onProgress,
          uploadProgressSteps(false),
          'sign',
          label ? `${label} — approve in your wallet` : 'Approve in your wallet',
        );
        return dAppKit.signAndExecuteTransaction({ transaction: transaction as never });
      };

      const result = await extendWalrusBlob({
        address: account.address,
        client,
        blobObjectId: input.blobObjectId,
        epochs: input.epochs,
        signAndExecute,
        onProgress: options.onProgress,
      });

      setLocalState((s) => ({
        ...s,
        activity: [
          {
            id: crypto.randomUUID(),
            type: 'upload',
            label: `Extended Walrus storage +${input.epochs} epoch(s)`,
            status: 'On-chain',
          },
          ...s.activity,
        ],
      }));

      return result;
    },
    [account, chainConfigured, client, dAppKit],
  );

  const updateProfile = useCallback(
    async (input: ProfileUpdate) => {
      const address = account?.address ?? localState.address;
      if (!address) throw new Error('Not signed in');

      let avatarWalrusId = input.avatarWalrusId;
      if (input.avatarFile && account && chainConfigured) {
        const signAndExecute = async ({ transaction }: { transaction: unknown }) => {
          return dAppKit.signAndExecuteTransaction({ transaction: transaction as never });
        };
        avatarWalrusId = await uploadAvatarToWalrus(input.avatarFile, {
          address: account.address,
          client,
          signAndExecute,
        });
      }

      const existing = loadProfile(address);
      saveProfile(address, {
        ...existing,
        displayName: input.displayName ?? existing.displayName,
        bio: input.bio ?? existing.bio,
        avatarWalrusId: avatarWalrusId ?? existing.avatarWalrusId,
      });

      if (input.username) {
        persistUsername(address, input.username);
      }

      if (input.priceUsdc != null && appState.isCreator && account && chainConfigured) {
        await executeTx(buildUpdatePriceTx(usdcToMicros(input.priceUsdc), account.address));
        await queryClient.invalidateQueries({ queryKey: PLATFORM_QUERY_KEY });
      }

      setLocalState((s) => ({
        ...s,
        username: input.username ?? s.username,
        displayName: input.displayName ?? s.displayName,
        creatorPriceUsdc: input.priceUsdc ?? s.creatorPriceUsdc,
      }));
    },
    [
      account,
      appState.isCreator,
      chainConfigured,
      client,
      dAppKit,
      executeTx,
      localState.address,
      queryClient,
    ],
  );

  const getProfilePath = useCallback(
    (address?: string) => {
      const resolved = address ?? appState.address;
      if (!resolved) return '/profile';
      return buildProfilePath(resolved, appState.username);
    },
    [appState.address, appState.username],
  );

  return (
    <ModalContext.Provider
      value={{
        modal,
        modalData,
        appState,
        authReady,
        chainConfigured,
        openModal,
        closeModal,
        login,
        logout,
        setUsername,
        completeOnboarding,
        addBalance,
        subscribe,
        registerCreator,
        publishPost,
        extendWalrusStorage,
        updateProfile,
        getProfilePath,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}
