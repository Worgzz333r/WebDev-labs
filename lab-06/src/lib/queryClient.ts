import { QueryClient, type Query } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Система кешування запитів на клієнті (завдання 18).
// TanStack Query і так кешує відповіді; тут задано політику та персистенцію:
// - staleTime: 60 с — протягом хвилини дані віддаються з кешу без звернення до мережі;
// - gcTime: 10 хв — невживані записи тримаються в пам'яті 10 хвилин;
// - retry: 1 — одна повторна спроба перед показом помилки.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, gcTime: 10 * 60_000, retry: 1 },
  },
});

// Персистенція кешу в localStorage: довідкові дані (групи, предмети) доступні
// навіть після перезавантаження сторінки й офлайн разом із service worker.
// Персональні дані (користувачі, відвідуваність, сповіщення) НЕ персистуємо —
// вони не мають залишатися на пристрої після виходу з облікового запису.
export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'rq-cache',
});

export const persistOptions = {
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) => {
      const key = query.queryKey[0];
      return key === 'groups' || key === 'subjects';
    },
  },
};
