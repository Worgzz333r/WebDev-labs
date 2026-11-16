import { usePresenceStore } from '@/stores/presenceStore';

interface OnlineStatusProps {
  userId: number;
  showLabel?: boolean;
}

// Індикатор «онлайн/офлайн». Перемальовується лише коли змінився статус саме цього користувача.
export default function OnlineStatus({ userId, showLabel = true }: OnlineStatusProps) {
  const isOnline = usePresenceStore((state) => state.online.has(userId));

  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
      />
      {showLabel ? (
        <span className="text-gray-600 dark:text-gray-400">{isOnline ? 'Онлайн' : 'Офлайн'}</span>
      ) : (
        <span className="sr-only">{isOnline ? 'Онлайн' : 'Офлайн'}</span>
      )}
    </span>
  );
}
