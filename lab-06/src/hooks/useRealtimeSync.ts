import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from '@/services/socket';
import { usePresenceStore } from '@/stores/presenceStore';

// Події сервера (лабораторна робота 3) → ключі кешу TanStack Query, які треба перезавантажити
const ENTITY_EVENTS: Record<string, string[]> = {
  groups: ['group:created', 'group:updated', 'group:deleted'],
  subjects: ['subject:created', 'subject:updated', 'subject:deleted'],
  lessons: ['lesson:created', 'lesson:updated', 'lesson:deleted'],
  attendance: ['attendance:created', 'attendance:updated', 'attendance:deleted'],
};

// Викликається один раз у Layout. Завдання 4 (списки в реальному часі) і завдання 3 (онлайн-статус).
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // --- Списки: на будь-яку подію зміни перезавантажуємо відповідні запити ---
    const listeners = Object.entries(ENTITY_EVENTS).flatMap(([key, events]) =>
      events.map((event) => {
        const listener = () => void queryClient.invalidateQueries({ queryKey: [key] });
        socket.on(event, listener);
        return { event, listener };
      })
    );

    // --- Онлайн-статус ---
    const { setOnline, update, reset } = usePresenceStore.getState();
    const loadOnline = () =>
      socket.emit('presence:list', (res: { ok: boolean; online?: number[] }) => {
        if (res.ok && res.online) setOnline(res.online);
      });
    const onPresence = ({ userId, online }: { userId: number; online: boolean }) =>
      update(userId, online);

    socket.on('connect', loadOnline); // після (пере)підключення беремо актуальний список
    socket.on('disconnect', reset); // без з'єднання статусам вірити не можна
    socket.on('presence:update', onPresence);
    if (socket.connected) loadOnline();

    return () => {
      listeners.forEach(({ event, listener }) => socket.off(event, listener));
      socket.off('connect', loadOnline);
      socket.off('disconnect', reset);
      socket.off('presence:update', onPresence);
    };
  }, [queryClient]);
}
