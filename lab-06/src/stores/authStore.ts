import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { queryClient } from '@/lib/queryClient';
import type { User } from '@/types/api.types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  login: (user: User, accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      login: (user, accessToken) => set({ user, accessToken }),
      // вихід: скидаємо і кеш запитів, щоб персональні дані не лишилися
      // ні в пам'яті, ні в localStorage (персистенція оновлюється сама)
      logout: () => {
        queryClient.clear();
        set({ user: null, accessToken: null });
      },
    }),
    { name: 'auth-storage' }
  )
);
