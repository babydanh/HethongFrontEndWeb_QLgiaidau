import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  roles: string[];
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  bio?: string | null;
  provinceCode?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) =>
        set({ user, isAuthenticated: true }),

      logout: () =>
        set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage', // name of the item in the storage
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
