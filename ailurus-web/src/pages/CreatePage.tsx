import { Image, Film, Sparkles } from 'lucide-react';
import { useModal } from '../context/useModal';
import { Button } from '../components/ui/Button';
import { CreatorStoragePanel } from '../components/CreatorStoragePanel';

export function CreatePage() {
  const { openModal, appState } = useModal();

  return (
    <div className="max-w-lg mx-auto md:max-w-xl px-4 md:px-0">
      <h1 className="text-2xl font-bold mb-1">Create</h1>
      <p className="text-sm text-muted mb-8">Share exclusive content with your subscribers</p>

      <div className="grid gap-4">
        <button
          type="button"
          onClick={() => openModal('upload')}
          className="flex items-center gap-4 p-5 bg-surface border border-border rounded-2xl hover:shadow-sm transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-2xl bg-panda-light flex items-center justify-center group-hover:scale-105 transition-transform">
            <Image className="w-6 h-6 text-panda" />
          </div>
          <div>
            <p className="font-semibold">Photo or album</p>
            <p className="text-sm text-muted">Upload a single image or a collection</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openModal('upload')}
          className="flex items-center gap-4 p-5 bg-surface border border-border rounded-2xl hover:shadow-sm transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-2xl bg-panda-light flex items-center justify-center group-hover:scale-105 transition-transform">
            <Film className="w-6 h-6 text-panda" />
          </div>
          <div>
            <p className="font-semibold">Short film</p>
            <p className="text-sm text-muted">Share a video up to 5 minutes</p>
          </div>
        </button>

        {!appState.isCreator && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-panda-light to-orange-50 border border-panda/10">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-panda shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">New to Ailurus?</p>
                <p className="text-sm text-muted mb-3 leading-relaxed">
                  Become a creator and set your monthly USDC subscription price.
                </p>
                <Button size="sm" variant="secondary" onClick={() => openModal('become-creator')}>
                  Become a creator
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CreatorStoragePanel />
    </div>
  );
}
