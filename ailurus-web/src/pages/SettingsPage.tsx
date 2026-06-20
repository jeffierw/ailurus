import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronRight, Shield, Bell, Globe, LogOut, User } from 'lucide-react';
import { useModal } from '../context/useModal';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { NetworkSwitcher } from '../components/NetworkSwitcher';
import { loadProfile, getAvatarWalrusId } from '../lib/profileStorage';
import { creatorAvatar } from '../lib/format';

export function SettingsPage() {
  const { logout, appState, updateProfile } = useModal();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [priceUsdc, setPriceUsdc] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!appState.address) return;
    const profile = loadProfile(appState.address);
    setDisplayName(profile.displayName ?? appState.displayName ?? '');
    setBio(profile.bio ?? '');
    setPriceUsdc(appState.isCreator ? String(appState.creatorPriceUsdc) : '');
  }, [appState.address, appState.creatorPriceUsdc, appState.displayName, appState.isCreator]);

  const handleAvatarChange = (file: File | null) => {
    setAvatarFile(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSaveProfile = async () => {
    if (!appState.address) {
      toast.info('Sign in to update your profile');
      return;
    }

    setIsSaving(true);
    try {
      let avatarPayload;
      if (avatarFile) {
        avatarPayload = {
          name: avatarFile.name,
          type: avatarFile.type,
          size: avatarFile.size,
          bytes: new Uint8Array(await avatarFile.arrayBuffer()),
        };
      }

      const price = priceUsdc ? Number(priceUsdc) : undefined;
      if (price != null && (Number.isNaN(price) || price <= 0)) {
        toast.error('Enter a valid subscription price');
        return;
      }

      await updateProfile({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        priceUsdc: appState.isCreator ? price : undefined,
        avatarFile: avatarPayload,
      });
      toast.success('Profile updated');
      handleAvatarChange(null);
    } catch (error) {
      toast.error('Could not save profile', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const avatarFallback =
    appState.address ? creatorAvatar(appState.address) : creatorAvatar('ailurus');
  const avatarWalrusId =
    !avatarPreview && appState.address ? getAvatarWalrusId(appState.address) : undefined;

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        { icon: Shield, label: 'Privacy & security', action: () => toast.info('Coming soon') },
        { icon: Bell, label: 'Notifications', action: () => toast.info('Coming soon') },
        { icon: Globe, label: 'Language', detail: 'English', action: () => toast.info('Coming soon') },
      ],
    },
  ];

  return (
    <div className="max-w-lg mx-auto md:max-w-xl px-4 md:px-0">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="mb-6 p-4 rounded-2xl bg-surface border border-border">
        <NetworkSwitcher />
      </div>

      <div className="mb-6 bg-surface border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-panda" />
          <h2 className="font-semibold text-sm">Profile</h2>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <Avatar
            src={avatarPreview ?? avatarFallback}
            walrusMediaId={avatarWalrusId}
            alt="Your avatar"
            size="lg"
          />
          <label className="flex-1 h-11 px-4 rounded-xl border border-border bg-cream text-sm flex items-center justify-center cursor-pointer hover:bg-panda-light/40 transition-colors">
            Change avatar
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => handleAvatarChange(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="grid gap-3">
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Display name"
            className="h-11 px-4 rounded-xl border border-border bg-cream text-sm focus:outline-none focus:ring-2 focus:ring-panda/30"
          />
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Bio"
            rows={3}
            className="px-4 py-3 rounded-xl border border-border bg-cream text-sm resize-none focus:outline-none focus:ring-2 focus:ring-panda/30"
          />
          {appState.isCreator && (
            <input
              value={priceUsdc}
              onChange={(event) => setPriceUsdc(event.target.value)}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Monthly subscription (USDC)"
              className="h-11 px-4 rounded-xl border border-border bg-cream text-sm focus:outline-none focus:ring-2 focus:ring-panda/30"
            />
          )}
        </div>

        <Button className="w-full mt-4" onClick={handleSaveProfile} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save profile'}
        </Button>
      </div>

      {settingsGroups.map((group) => (
        <div key={group.title} className="mb-6">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
            {group.title}
          </h2>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {group.items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-cream transition-colors text-left"
              >
                <item.icon className="w-5 h-5 text-muted" />
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                {item.detail && <span className="text-sm text-muted">{item.detail}</span>}
                <ChevronRight className="w-4 h-4 text-muted" />
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => {
          logout();
          toast.info('Signed out');
        }}
        className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span className="text-sm font-medium">Sign out</span>
      </button>

      <p className="text-center text-xs text-muted mt-8">Ailurus v0.1.0 · Sui Overflow 2026</p>
    </div>
  );
}
