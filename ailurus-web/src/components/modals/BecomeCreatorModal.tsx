import { toast } from 'sonner';
import { Sparkles, Upload } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useModal } from '../../context/useModal';
import { creatorAvatar } from '../../lib/format';
import { logAppError, toUserFacingMessage } from '../../lib/userFacingError';

export function BecomeCreatorModal({ open }: { open: boolean }) {
  const { closeModal, appState, openModal, registerCreator } = useModal();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [priceUsdc, setPriceUsdc] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleAvatarChange = (file: File | null) => {
    setAvatarFile(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleStart = async () => {
    if (!appState.isLoggedIn) {
      closeModal();
      openModal('login', { loginIntent: 'create' });
      return;
    }
    const price = Number(priceUsdc);
    if (!name.trim() || !handle.trim() || !bio.trim() || !price || price <= 0) {
      toast.error('Please complete your creator profile');
      return;
    }

    setIsPending(true);
    try {
      let avatarPayload: Awaited<ReturnType<typeof fileToUploadInput>> | undefined;
      if (avatarFile) {
        avatarPayload = await fileToUploadInput(avatarFile);
      }

      const { skippedOnChainRegistration } = await registerCreator({
        name: name.trim(),
        handle: handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`,
        bio: bio.trim(),
        priceUsdc: price,
        avatarFile: avatarPayload,
      });
      closeModal();
      toast.success(
        skippedOnChainRegistration ? 'Creator profile ready' : "You're a creator now!",
        {
          description: skippedOnChainRegistration
            ? 'Your existing on-chain profile has been synced.'
            : 'Your profile is ready for Walrus uploads.',
        },
      );
      setName('');
      setHandle('');
      setBio('');
      setPriceUsdc('');
      handleAvatarChange(null);
    } catch (error) {
      logAppError('BecomeCreatorModal', error);
      toast.error('Creator registration failed', {
        description: toUserFacingMessage(error, 'Please try again.'),
      });
    } finally {
      setIsPending(false);
    }
  };

  const avatarSrc =
    avatarPreview ??
    (appState.address ? creatorAvatar(appState.address) : creatorAvatar('ailurus'));

  return (
    <Modal open={open} onClose={closeModal} title="Become a creator" size="md">
      <div className="px-5 pb-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-panda-light flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-panda" />
        </div>
        <p className="text-sm text-muted mb-6 leading-relaxed">
          Share exclusive photos and short films. Set your monthly USDC price. Fans subscribe to unlock your content.
        </p>
        <div className="grid gap-3 mb-5 text-left">
          <div className="flex items-center gap-4">
            <Avatar src={avatarSrc} alt="Avatar preview" size="lg" />
            <label className="flex-1 h-11 px-4 rounded-2xl border border-border bg-surface text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-cream transition-colors">
              <Upload className="w-4 h-4 text-muted" />
              <span>{avatarFile ? avatarFile.name : 'Upload avatar'}</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => handleAvatarChange(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-12 px-4 rounded-2xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-panda/30"
            placeholder="Creator name"
          />
          <input
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            className="h-12 px-4 rounded-2xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-panda/30"
            placeholder="@handle"
          />
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={3}
            className="px-4 py-3 rounded-2xl border border-border bg-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-panda/30"
            placeholder="Bio"
          />
          <input
            value={priceUsdc}
            onChange={(event) => setPriceUsdc(event.target.value)}
            type="number"
            min="0.01"
            step="0.01"
            className="h-12 px-4 rounded-2xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-panda/30"
            placeholder="Monthly price in USDC"
          />
        </div>
        <Button size="lg" className="w-full" onClick={handleStart} disabled={isPending}>
          {isPending ? 'Creating profile...' : 'Get started'}
        </Button>
      </div>
    </Modal>
  );
}

async function fileToUploadInput(file: File) {
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    bytes: new Uint8Array(await file.arrayBuffer()),
  };
}
