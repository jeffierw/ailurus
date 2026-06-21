import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useModal } from '../context/useModal';
import { useAppNetwork } from '../hooks/useAppNetwork';
import { useCreatorPosts } from '../hooks/usePlatformData';
import { clampEpochs, storageDays } from '../lib/walrusEpochs';
import { fetchCreatorWalrusStorageItems } from '../services/walrusBlobObjects';
import { logAppError, toUserFacingMessage } from '../lib/userFacingError';
import { Button } from './ui/Button';

export function CreatorStoragePanel() {
  const { appState, extendWalrusStorage } = useModal();
  const { network } = useAppNetwork();
  const { posts } = useCreatorPosts(appState.address);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [epochInputs, setEpochInputs] = useState<Record<string, number>>({});
  const [refreshToken, setRefreshToken] = useState(0);
  const canLoadStorageItems = Boolean(appState.address && posts.length > 0);
  const storagePostKey = useMemo(
    () => posts.map((post) => `${post.id}:${post.walrusBlobId}`).join('|'),
    [posts],
  );
  const storageItemsQuery = useQuery({
    queryKey: ['creator-walrus-storage-items', appState.address, network, storagePostKey, refreshToken],
    queryFn: () => fetchCreatorWalrusStorageItems(appState.address!, posts, network),
    enabled: canLoadStorageItems,
    staleTime: 30_000,
  });
  const isLoadingStorageItems = canLoadStorageItems && storageItemsQuery.isFetching;
  const items = storageItemsQuery.data ?? [];
  const visibleItems = canLoadStorageItems ? items : [];

  if (!appState.isCreator) return null;

  const handleExtend = async (blobObjectId: string) => {
    const epochs = clampEpochs(epochInputs[blobObjectId] ?? 1);
    setExtendingId(blobObjectId);
    try {
      await extendWalrusStorage({ blobObjectId, epochs });
      setRefreshToken((value) => value + 1);
      toast.success(`Storage extended by ${epochs} epoch(s)`, {
        description: `≈ ${storageDays(epochs, network)} more day(s) on ${network}`,
      });
    } catch (error) {
      logAppError('CreatorStoragePanel', error);
      toast.error('Extend failed', {
        description: toUserFacingMessage(error, 'Please try again.'),
      });
    } finally {
      setExtendingId(null);
    }
  };

  return (
    <div className="mt-8 p-5 rounded-2xl bg-surface border border-border">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-5 h-5 text-panda" />
        <h2 className="font-semibold">Walrus storage</h2>
      </div>
      <p className="text-sm text-muted mb-4 leading-relaxed">
        Extend content before it expires. Items are recovered from your on-chain Walrus Blob
        objects, so they work across devices.
      </p>
      {isLoadingStorageItems && (
        <p className="text-sm text-muted">Loading Walrus objects…</p>
      )}
      {(!canLoadStorageItems || !isLoadingStorageItems) && visibleItems.length === 0 && (
        <p className="text-sm text-muted">
          No extendable Walrus Blob objects found for your current wallet yet.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {visibleItems.map((blob) => (
          <div key={blob.blobObjectId} className="p-4 rounded-xl bg-cream border border-border">
            <p className="text-sm font-medium truncate mb-1">{blob.caption || `Post #${blob.postId}`}</p>
            <p className="text-xs text-muted mb-3">
              {blob.endEpoch != null
                ? `Current end epoch: ${blob.endEpoch}`
                : 'Current end epoch unavailable'}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={53}
                value={epochInputs[blob.blobObjectId] ?? 1}
                onChange={(event) =>
                  setEpochInputs((prev) => ({
                    ...prev,
                    [blob.blobObjectId]: clampEpochs(Number(event.target.value)),
                  }))
                }
                className="w-20 h-9 px-3 rounded-lg border border-border bg-surface text-sm"
                aria-label="Epochs to extend"
              />
              <span className="text-xs text-muted">epoch(s) to add</span>
              <Button
                size="sm"
                className="ml-auto"
                disabled={extendingId === blob.blobObjectId}
                onClick={() => void handleExtend(blob.blobObjectId)}
              >
                {extendingId === blob.blobObjectId ? (
                  'Extending…'
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Extend
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
