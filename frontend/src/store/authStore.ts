import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types';
import { authApi } from '@/api/client';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login:        (username: string, password: string) => Promise<void>;
  logout:       () => Promise<void>;
  setTokens:    (access: string, refresh: string) => void;
  refreshUser:  () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null as AuthUser | null,
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
      isAuthenticated: !!localStorage.getItem('accessToken'),
      isLoading: false,

      login: async (username, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login(username, password);
          const { accessToken, refreshToken, user } = data.data;

          localStorage.setItem('accessToken',  accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try { await authApi.logout(); } catch { /* ignore */ }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      setTokens: (access, refresh) => {
        localStorage.setItem('accessToken',  access);
        localStorage.setItem('refreshToken', refresh);
        set({ accessToken: access, refreshToken: refresh });
      },

      refreshUser: async () => {
        try {
          const { data } = await authApi.me();
          set({ user: data.data });
        } catch { /* token geçersizse sessizce geç */ }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user:            state.user,
        accessToken:     state.accessToken,
        refreshToken:    state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
