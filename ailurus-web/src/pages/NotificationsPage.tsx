import { Bell, Upload, UserPlus } from 'lucide-react';
import { useModal } from '../context/useModal';
import { formatRelativeTime } from '../lib/format';

const ACTIVITY_ICONS = {
  subscribe: UserPlus,
  upload: Upload,
  creator: UserPlus,
  deposit: Bell,
  login: Bell,
} as const;

export function NotificationsPage() {
  const { appState } = useModal();
  const notifications = appState.activity.map((item) => ({
    id: item.id,
    icon: ACTIVITY_ICONS[item.type] ?? Bell,
    text: item.label,
    time: formatRelativeTime(Date.now()),
    unread: item.status === 'Pending' || item.status === 'On-chain',
  }));

  return (
    <div className="max-w-lg mx-auto md:max-w-xl px-4 md:px-0">
      <h1 className="text-2xl font-bold mb-5">Notifications</h1>
      {!notifications.length && (
        <div className="text-center py-12 text-muted text-sm">
          Activity from subscriptions, uploads, and deposits will appear here.
        </div>
      )}
      <div className="flex flex-col gap-1">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-center gap-3 p-4 rounded-2xl transition-colors ${
              n.unread ? 'bg-panda-light/40' : 'hover:bg-black/[0.02]'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center">
              <n.icon className="w-5 h-5 text-panda" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">{n.text}</p>
              <p className="text-xs text-muted mt-0.5">{n.time}</p>
            </div>
            {n.unread && <div className="w-2 h-2 rounded-full bg-panda shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}
