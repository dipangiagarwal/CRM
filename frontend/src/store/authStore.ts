import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Organization } from '../types';

interface AuthStore {
  isAuthenticated: boolean;
  user: User | null;
  org: Organization | null;
  setAuth: (user: User, org?: Organization) => void;
  setOrg: (org: Organization) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      org: null,

      setAuth: (user, org) =>
        set({
          isAuthenticated: true,
          user,
          org: org ?? null,
        }),

      setOrg: (org) => set({ org }),

      logout: () =>
        set({
          isAuthenticated: false,
          user: null,
          org: null,
        }),
    }),
    {
      name: 'pixel-crm-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        org: state.org,
      }),
    }
  )
);
