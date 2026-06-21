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
import { clearAuthSessionFlags, markPendingPostLogin, saveLoginIntent } from '../lib/authSession';
import { getProfilePath as buildProfilePath } from '../lib/routes';
import { normalizeUsername } from '../lib/routes';
import { logAppError, toUserFacingMessage, UserFacingError } from '../lib/userFacingError';
import {
  contentTypeToMove,
  prepareEncryptedUpload,
  reportUploadProgress,
  uploadContentWithWalrusSdk,
  extendWalrusBlob,
  uploadAvatarToWalrus,
  uploadProgressSteps,
  EXTEND_STORAGE_PROGRESS_STEPS,
  usdcToMicros,
  type UploadPipelineInput,
  type UploadProgressHandler,
} from '../services/chainPipeline';
import { hasOnChainConfig, AILURUS_CONFIG } from '../sui/config';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { findCreatorByAddress, PLATFORM_QUERY_KEY } from '../sui/platform';
import {
  findFanByAddress,
  PROFILE_REGISTRY_QUERY_KEY,
} from '../sui/profileRegistry';
import { clearDecryptedMediaCaches } from '../lib/decryptedMediaCache';
import { clearAllSealSessionKeys } from '../services/sealMedia';
import { signAndExecuteWithSponsor } from '../sui/sponsored';
import {
  buildPublishPostTx,
  buildRegisterCreatorTx,
  buildRegisterFanTx,
  buildSetCreatorAvatarTx,
  buildSubscribeTx,
  buildUpdateCreatorProfileTx,
  buildUpdateFanProfileTx,
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
  const [creatorCheckReady, setCreatorCheckReady] = useState(false);
  const hydratedAddress = useRef<string | null>(null);

  const chainConfigured = hasOnChainConfig();

  const appState = useMemo(
    () => ({
      ...localState,
      isLoggedIn: Boolean(account?.address),
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

    void Promise.all([
      chainConfigured ? findCreatorByAddress(client as SuiGrpcClient, address) : Promise.resolve(null),
      chainConfigured ? findFanByAddress(client as SuiGrpcClient, address) : Promise.resolve(null),
    ])
      .then(([creator, fan]) => {
        setLocalState((prev) => ({
          ...prev,
          isLoggedIn: true,
          address,
          isCreator: Boolean(creator),
          username: fan?.handle ?? creator?.handle.replace(/^@/, '') ?? null,
          displayName: fan?.displayName ?? creator?.name ?? null,
          onboardingCompleted: Boolean(creator || fan),
          userIntent: creator ? 'creator' : fan ? 'fan' : prev.userIntent,
          ...(creator
            ? { creatorPriceUsdc: Number(creator.priceMicros) / 1_000_000 }
            : {}),
        }));
      })
      .catch((error) => {
        logAppError('hydrateAccountProfile', error);
        setLocalState((prev) => ({ ...prev, isLoggedIn: true, address }));
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, [account?.address, chainConfigured, client, walletConnection.isConnecting, walletConnection.isReconnecting]);

  useEffect(() => {
    const address = account?.address;
    if (!address || !chainConfigured) {
      setCreatorCheckReady(true);
      return;
    }

    setCreatorCheckReady(false);
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
                onboardingCompleted: prev.onboardingCompleted || true,
                userIntent: prev.userIntent ?? 'creator',
              }
            : {}),
        }));
      })
      .catch((error) => {
        logAppError('findCreatorByAddress', error);
      })
      .finally(() => {
        setCreatorCheckReady(true);
      });
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
    clearAllSealSessionKeys();
    clearDecryptedMediaCaches();
    if (!account) {
      await dAppKit.connectWallet({ wallet: googleWallet });
    }
  }, [account, dAppKit, wallets]);

  const logout = useCallback(() => {
    clearAuthSessionFlags();
    clearAllSealSessionKeys();
    clearDecryptedMediaCaches();
    void dAppKit.disconnectWallet().catch(() => undefined);
    hydratedAddress.current = null;
    setLocalState(createInitialState());
  }, [dAppKit]);

  const completeOnboarding = useCallback((intent: UserIntent) => {
    setLocalState((s) => ({
      ...s,
      onboardingCompleted: true,
      userIntent: intent,
    }));
  }, []);

  const executeTx = useCallback(
    async (
      tx: ReturnType<typeof buildRegisterCreatorTx>,
      options: { extraAllowedAddresses?: string[] } = {},
    ) => {
      if (!account) throw new Error('Not signed in');

      const fail = (error: unknown, context: string) => {
        logAppError(context, error);
        const technical =
          error instanceof Error ? error.message : typeof error === 'string' ? error : 'Transaction failed';
        throw new UserFacingError(
          technical,
          toUserFacingMessage(error, 'Transaction failed. Please try again.'),
          { cause: error },
        );
      };

      try {
        return await signAndExecuteWithSponsor({
          transaction: tx,
          sender: account.address,
          client: client as SuiGrpcClient,
          wallet,
          signTransaction: ({ transaction }) => dAppKit.signTransaction({ transaction }),
          extraAllowedAddresses: options.extraAllowedAddresses,
        });
      } catch (sponsorError) {
        logAppError('executeTx/sponsor', sponsorError);
        try {
          const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
          if (
            result &&
            typeof result === 'object' &&
            '$kind' in result &&
            result.$kind === 'FailedTransaction'
          ) {
            const technical =
              result.FailedTransaction.status.error?.message ?? 'Transaction failed';
            throw new UserFacingError(
              technical,
              toUserFacingMessage(technical, 'Transaction failed. Please try again.'),
            );
          }
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
        } catch (directError) {
          if (directError instanceof UserFacingError) throw directError;
          fail(directError, 'executeTx/direct');
        }
      }
    },
    [account, client, dAppKit, wallet],
  );

  const setUsername = useCallback(
    async (username: string) => {
      const address = account?.address ?? localState.address;
      if (!address) throw new Error('Not signed in');
      if (!account || !chainConfigured) {
        throw new UserFacingError(
          'Profile registry unavailable',
          'Connect to testnet to register your username on-chain.',
        );
      }

      const handle = normalizeUsername(username);
      await executeTx(buildRegisterFanTx({ handle, displayName: handle }, account.address));
      await queryClient.invalidateQueries({ queryKey: PROFILE_REGISTRY_QUERY_KEY });

      setLocalState((s) => ({
        ...s,
        username: handle,
        displayName: s.displayName ?? handle,
        onboardingCompleted: true,
        userIntent: s.userIntent ?? 'fan',
      }));
    },
    [account, chainConfigured, executeTx, localState.address, queryClient],
  );

  const subscribe = useCallback(
    async (creatorId: string, creatorAddress: string, priceUsdc: number) => {
      if (account && chainConfigured) {
        const tx = buildSubscribeTx(creatorAddress, usdcToMicros(priceUsdc), account.address);
        await executeTx(tx, { extraAllowedAddresses: [creatorAddress] });
        await queryClient.invalidateQueries({ queryKey: ['ailurus', account.address] });
        await queryClient.invalidateQueries({ queryKey: PLATFORM_QUERY_KEY });
        await queryClient.invalidateQueries({
          queryKey: ['ailurus', 'usdc-balance', account.address],
        });
        clearAllSealSessionKeys();
        clearDecryptedMediaCaches();
      }

      setLocalState((s) => ({
        ...s,
        activity: [
          {
            id: crypto.randomUUID(),
            type: 'subscribe',
            label: `Subscription ${creatorId}`,
            amount: -priceUsdc,
            status: 'On-chain',
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

      let skippedOnChainRegistration = false;
      if (account && chainConfigured) {
        const existingCreator = await findCreatorByAddress(client as SuiGrpcClient, account.address);
        skippedOnChainRegistration = Boolean(existingCreator);
      }

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

      if (account && chainConfigured && !skippedOnChainRegistration) {
        try {
          await executeTx(buildRegisterCreatorTx(payload, account.address));
          await queryClient.invalidateQueries({ queryKey: ['ailurus', account.address] });
          await queryClient.invalidateQueries({ queryKey: PLATFORM_QUERY_KEY });
        } catch (error) {
          const technical = error instanceof Error ? error.message : String(error);
          if (/ECreatorAlreadyExists|Creator profile already exists/i.test(technical)) {
            logAppError('registerCreator/already-exists', error);
            skippedOnChainRegistration = true;
          } else {
            throw error;
          }
        }
      }

      const username = handle.replace(/^@/, '');

      if (avatarWalrusId && account && chainConfigured) {
        await executeTx(buildSetCreatorAvatarTx(avatarWalrusId, account.address));
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
            status: 'On-chain',
          },
          ...s.activity,
        ],
      }));

      return { skippedOnChainRegistration };
    },
    [account, chainConfigured, client, dAppKit, executeTx, queryClient],
  );

  const publishPost = useCallback(
    async (input: UploadPipelineInput, options: { onProgress?: UploadProgressHandler } = {}) => {
      const { onProgress } = options;
      const steps = uploadProgressSteps(input.encrypted);

      const signAndExecute = async ({
        transaction,
      }: {
        transaction: unknown;
        label?: string;
      }) => {
        if (!account) throw new Error('Not signed in');
        return dAppKit.signAndExecuteTransaction({ transaction: transaction as never });
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
          throw new UserFacingError(
            'Creator profile not found on-chain',
            'Set up your creator profile before publishing content.',
          );
        }

        reportUploadProgress(onProgress, steps, 'publish', 'Publish post — approve in your wallet');
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

      const signAndExecute = async ({ transaction }: { transaction: unknown; label?: string }) => {
        reportUploadProgress(
          options.onProgress,
          EXTEND_STORAGE_PROGRESS_STEPS,
          'sign',
          'Extend Walrus storage — approve in wallet',
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

      if (!account || !chainConfigured) {
        throw new Error('On-chain profile updates require a connected wallet');
      }

      let avatarWalrusId = input.avatarWalrusId;
      if (input.avatarFile) {
        const signAndExecute = async ({ transaction }: { transaction: unknown }) => {
          return dAppKit.signAndExecuteTransaction({ transaction: transaction as never });
        };
        avatarWalrusId = await uploadAvatarToWalrus(input.avatarFile, {
          address: account.address,
          client,
          signAndExecute,
        });
      }

      const onChainCreator = await findCreatorByAddress(client as SuiGrpcClient, account.address);

      if (onChainCreator) {
        const hasProfileFields =
          input.displayName !== undefined || input.bio !== undefined || input.priceUsdc != null;

        if (hasProfileFields) {
          await executeTx(
            buildUpdateCreatorProfileTx(
              {
                name:
                  input.displayName ??
                  onChainCreator.name ??
                  appState.displayName ??
                  appState.username ??
                  '',
                bio: input.bio ?? onChainCreator.bio ?? '',
              },
              account.address,
            ),
          );
        }

        if (avatarWalrusId) {
          await executeTx(buildSetCreatorAvatarTx(avatarWalrusId, account.address));
        }
        if (input.priceUsdc != null) {
          await executeTx(buildUpdatePriceTx(usdcToMicros(input.priceUsdc), account.address));
        }
        await queryClient.invalidateQueries({ queryKey: PLATFORM_QUERY_KEY });

        setLocalState((s) => ({
          ...s,
          isCreator: true,
          displayName: input.displayName ?? s.displayName ?? onChainCreator.name,
          creatorPriceUsdc: input.priceUsdc ?? s.creatorPriceUsdc,
        }));
      } else {
        let fan = await findFanByAddress(client as SuiGrpcClient, account.address);
        if (!fan) {
          const handle = appState.username ?? normalizeUsername(input.displayName ?? '');
          if (!handle) {
            throw new UserFacingError(
              'Fan profile not registered',
              'Choose a username before updating your profile.',
            );
          }
          await executeTx(
            buildRegisterFanTx(
              { handle, displayName: input.displayName ?? handle },
              account.address,
            ),
          );
          await queryClient.invalidateQueries({ queryKey: PROFILE_REGISTRY_QUERY_KEY });
          fan = await findFanByAddress(client as SuiGrpcClient, account.address);
        }

        await executeTx(
          buildUpdateFanProfileTx(
            {
              displayName: input.displayName ?? fan?.displayName ?? appState.username ?? '',
              bio: input.bio ?? fan?.bio ?? '',
              avatarWalrusId: avatarWalrusId ?? fan?.avatarWalrusId ?? '',
            },
            account.address,
          ),
        );
        await queryClient.invalidateQueries({ queryKey: PROFILE_REGISTRY_QUERY_KEY });

        setLocalState((s) => ({
          ...s,
          displayName: input.displayName ?? s.displayName,
          creatorPriceUsdc: input.priceUsdc ?? s.creatorPriceUsdc,
        }));
      }
    },
    [
      account,
      appState.displayName,
      appState.isCreator,
      appState.username,
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
        creatorCheckReady,
        chainConfigured,
        openModal,
        closeModal,
        login,
        logout,
        setUsername,
        completeOnboarding,
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
