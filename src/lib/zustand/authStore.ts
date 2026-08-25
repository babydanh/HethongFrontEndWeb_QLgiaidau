import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  roles: string[];
  role?: string;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  bio?: string | null;
  createdAt?: string | null;
  provinceCode?: string | null;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isVerified?: boolean;
  isGenderLocked?: boolean;
  allowStrangerMessages?: boolean;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  isSessionReady: boolean;
  
  setUser: (user: User) => void;
  setHasHydrated: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      isSessionReady: false,

      setUser: (user) =>
        set({ user, isAuthenticated: true, isSessionReady: true }),

      setHasHydrated: (value) => set({ hasHydrated: value }),

      logout: () =>
        set({ user: null, isAuthenticated: false, isSessionReady: false }),
    }),
    {
      name: 'auth-storage', // name of the item in the storage
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

