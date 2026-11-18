import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface NotificationsState {
  notifications: AppNotification[];
  add: (n: Pick<AppNotification, 'type' | 'title' | 'message'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [
    {
      id: 'demo-1',
      type: 'info',
      title: 'Нове заняття додано',
      message: 'Заняття «Розробка на React» заплановано для групи ІПЗ-42',
      timestamp: Date.now() - 3600000,
      read: false,
    },
    {
      id: 'demo-2',
      type: 'warning',
      title: 'Журнал відвідуваності',
      message: 'Викладач оновив відмітки присутності для групи ІПЗ-41',
      timestamp: Date.now() - 7200000,
      read: false,
    },
  ],

  add: (n) =>
    set((state) => ({
      // зберігаємо не більше 50 останніх, щоб список не ріс безмежно
      notifications: [
        { ...n, id: crypto.randomUUID(), timestamp: Date.now(), read: false },
        ...state.notifications,
      ].slice(0, 50),
    })),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),

  markAllAsRead: () =>
    set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, read: true })) })),

  clearAll: () => set({ notifications: [] }),
}));

// Похідне значення обчислюємо в селекторі: компонент перемальовується лише при зміні числа
export const selectUnreadCount = (state: NotificationsState) =>
  state.notifications.filter((n) => !n.read).length;
