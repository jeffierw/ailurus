import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Image, Film, Upload, Lock, Globe } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { logAppError, toUserFacingMessage } from '../../lib/userFacingError';
import { useModal } from '../../context/useModal';
import { useAppNetwork } from '../../hooks/useAppNetwork';
import { useEpochHint } from '../../hooks/useEpochHint';
import { useUsdcBalance } from '../../hooks/useUsdcBalance';
import { DEFAULT_WALRUS_EPOCHS, MAX_WALRUS_EPOCHS, clampEpochs, storageDays } from '../../lib/walrusEpochs';
import { UploadProgressPanel } from './UploadProgressPanel';
import {
  uploadProgressSteps,
  type UploadProgressState,
} from '../../services/chainPipeline';

type ContentType = 'photo' | 'album' | 'video';

export function UploadModal({ open }: { open: boolean }) {
  const { closeModal, appState, openModal, publishPost } = useModal();
  const { network } = useAppNetwork();
  const epochHint = useEpochHint();
  const { balanceUsdc } = useUsdcBalance();
  const [type, setType] = useState<ContentType>('photo');
  const [caption, setCaption] = useState('');
  const [encrypted, setEncrypted] = useState(true);
  const [epochs, setEpochs] = useState(DEFAULT_WALRUS_EPOCHS);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState>({
    stepIndex: 0,
    steps: uploadProgressSteps(true),
  });

  const handleUploadProgress = useCallback((progress: UploadProgressState) => {
    setUploadProgress((prev) => ({
      ...progress,
      stepIndex: Math.max(prev.stepIndex, progress.stepIndex),
    }));
  }, []);

  const estimatedCost = type === 'video' ? 0.48 : type === 'album' ? 0.22 : 0.08;
  const selectedLabel =
    selectedFiles.length === 0
      ? 'No file selected'
      : selectedFiles.length === 1
        ? selectedFiles[0].name
        : `${selectedFiles.length} files selected`;

  const setContentType = (nextType: ContentType) => {
    setType(nextType);
    setSelectedFiles([]);
  };

  const handleUpload = async () => {
    if (!appState.isLoggedIn) {
      closeModal();
      openModal('login', { loginIntent: 'create' });
      toast.info('Sign in to upload content');
      return;
    }
    if (!appState.isCreator) {
      closeModal();
      openModal('become-creator');
      toast.info('Create your creator profile first');
      return;
    }
    if (network === 'mainnet' && balanceUsdc < estimatedCost) {
      closeModal();
      openModal('deposit');
      toast.error('Insufficient USDC', {
        description: `Estimated upload cost: $${estimatedCost.toFixed(2)} USDC`,
      });
      return;
    }
    if (selectedFiles.length === 0) {
      toast.error('Choose a file to upload');
      return;
    }
    if (type !== 'album' && selectedFiles.length > 1) {
      toast.error('Only albums can include multiple files');
      return;
    }

    const steps = uploadProgressSteps(encrypted);
    setIsPending(true);
    setUploadProgress({ stepIndex: 0, steps });
    try {
      const files = await Promise.all(
        selectedFiles.map(async (file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          bytes: new Uint8Array(await file.arrayBuffer()),
        })),
      );

      await publishPost(
        {
          fileName: selectedFiles[0]?.name ?? `${type}-drop`,
          caption: caption || (encrypted ? 'Subscriber-only drop' : 'Public drop'),
          contentType: type,
          estimatedCostUsdc: estimatedCost,
          encrypted,
          epochs: clampEpochs(epochs),
          files,
        },
        { onProgress: handleUploadProgress },
      );
      closeModal();
      toast.success(encrypted ? 'Encrypted post published!' : 'Public post published!', {
        description: encrypted
          ? 'Only subscribers can view this content. It will not appear in the public feed.'
          : 'Your post is live in the feed for everyone to see.',
        duration: 5000,
      });
      setCaption('');
      setSelectedFiles([]);
      setEncrypted(true);
    } catch (error) {
      logAppError('UploadModal', error);
      const message = toUserFacingMessage(error);
      if (message.includes('Set up your creator profile')) {
        closeModal();
        openModal('become-creator');
        toast.error('Register as creator first', { description: message });
        return;
      }
      toast.error('Upload failed', { description: message });
    } finally {
      setIsPending(false);
      setUploadProgress({ stepIndex: 0, steps: uploadProgressSteps(true) });
    }
  };

  return (
    <Modal open={open} onClose={isPending ? () => {} : closeModal} title="New post" size="lg">
      <div className="px-5 pb-6">
        {isPending ? (
          <UploadProgressPanel progress={uploadProgress} />
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              {(
                [
                  { id: 'photo' as const, icon: Image, label: 'Photo' },
                  { id: 'album' as const, icon: Image, label: 'Album' },
                  { id: 'video' as const, icon: Film, label: 'Short' },
                ] as const
              ).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setContentType(id)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border text-sm font-medium transition-colors ${
                    type === id
                      ? 'border-panda bg-panda-light text-panda-dark'
                      : 'border-border hover:bg-cream'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center bg-cream/50 mb-4 hover:border-panda/40 transition-colors">
              <Upload className="w-8 h-8 text-muted mb-2" />
              <p className="text-sm font-medium text-ink mb-3">Content asset</p>
              <label className="w-full h-11 px-4 rounded-xl border border-border bg-surface text-sm text-center focus-within:ring-2 focus-within:ring-panda/30 flex items-center justify-center cursor-pointer">
                <span className="truncate">{selectedLabel}</span>
                <input
                  type="file"
                  multiple={type === 'album'}
                  accept={type === 'video' ? 'video/*' : 'image/*'}
                  onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                  className="sr-only"
                />
              </label>
              <p className="text-xs text-muted mt-2">JPG, PNG, MP4 up to 500MB · Walrus + Seal pipeline</p>
            </div>

            <textarea
              placeholder="Write a caption…"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-panda/30 focus:border-panda mb-4"
            />

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setEncrypted(true)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm transition-colors ${
                  encrypted
                    ? 'border-panda bg-panda-light text-panda-dark'
                    : 'border-border hover:bg-cream'
                }`}
              >
                <Lock className="w-4 h-4 shrink-0" />
                <div>
                  <p className="font-medium">Encrypted</p>
                  <p className="text-xs text-muted">Subscribers only</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setEncrypted(false)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm transition-colors ${
                  !encrypted
                    ? 'border-panda bg-panda-light text-panda-dark'
                    : 'border-border hover:bg-cream'
                }`}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <div>
                  <p className="font-medium">Public</p>
                  <p className="text-xs text-muted">Shows in feed</p>
                </div>
              </button>
            </div>

            <div className="mb-4 p-3 rounded-xl bg-cream border border-border">
              <label htmlFor="storage-epochs" className="text-sm font-medium block mb-2">
                Storage duration
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="storage-epochs"
                  type="number"
                  min={1}
                  max={MAX_WALRUS_EPOCHS}
                  value={epochs}
                  onChange={(event) => setEpochs(clampEpochs(Number(event.target.value)))}
                  className="w-24 h-10 px-3 rounded-lg border border-border bg-surface text-sm"
                />
                <span className="text-sm text-muted">epoch(s)</span>
                <span className="text-xs text-muted ml-auto">
                  ≈ {storageDays(clampEpochs(epochs), network)} day(s)
                </span>
              </div>
              <p className="text-[11px] text-muted mt-2">{epochHint}</p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-panda-light/50 mb-4 text-sm">
              <span className="text-muted">Estimated cost</span>
              <span className="font-semibold text-panda-dark">~${estimatedCost.toFixed(2)} USDC</span>
            </div>

            <Button size="lg" className="w-full" onClick={handleUpload}>
              Publish
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
