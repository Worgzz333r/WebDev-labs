import { create } from 'zustand';

interface PresenceState {
  online: Set<number>;
  setOnline: (ids: number[]) => void;
  update: (userId: number, isOnline: boolean) => void;
  reset: () => void;
}

// Множина ідентифікаторів користувачів, які зараз онлайн
export const usePresenceStore = create<PresenceState>((set) => ({
  online: new Set(),
  setOnline: (ids) => set({ online: new Set(ids) }),
  update: (userId, isOnline) =>
    set((state) => {
      const next = new Set(state.online);
      if (isOnline) next.add(userId);
      else next.delete(userId);
      return { online: next };
    }),
  reset: () => set({ online: new Set() }),
}));
