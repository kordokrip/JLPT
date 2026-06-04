import { create } from 'zustand';
import { authApi, type AuthConfig, type AuthUser } from '../lib/api';

type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  config: AuthConfig | null;
  error: string | null;
  refresh: () => Promise<void>;
  loadConfig: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'checking',
  user: null,
  config: null,
  error: null,

  refresh: async () => {
    const res = await authApi.me();
    if (res.ok && res.data.authenticated && res.data.user) {
      set({ status: 'authenticated', user: res.data.user, error: null });
    } else {
      set({ status: 'anonymous', user: null });
    }
  },

  loadConfig: async () => {
    const res = await authApi.config();
    if (res.ok) set({ config: res.data });
  },

  login: async (email, password) => {
    set({ error: null });
    const res = await authApi.login(email, password);
    if (res.ok) {
      set({ status: 'authenticated', user: res.data.user, error: null });
      return true;
    }
    set({ status: 'anonymous', user: null, error: res.message });
    return false;
  },

  register: async (email, password, displayName) => {
    set({ error: null });
    const res = await authApi.register(email, password, displayName);
    if (res.ok) {
      set({ status: 'authenticated', user: res.data.user, error: null });
      return true;
    }
    set({ status: 'anonymous', user: null, error: res.message });
    return false;
  },

  logout: async () => {
    await authApi.logout().catch(() => undefined);
    set({ status: 'anonymous', user: null });
  },
}));
