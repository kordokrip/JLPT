import { create } from 'zustand';
import { authApi, type AuthConfig, type AuthUser } from '../lib/api';
import { setActiveLocalUserId } from '../lib/db';

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

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'checking',
  user: null,
  config: null,
  error: null,

  refresh: async () => {
    const res = await authApi.me();
    if (res.ok && res.data.authenticated && res.data.user) {
      setActiveLocalUserId(res.data.user.id);
      set({ status: 'authenticated', user: res.data.user, error: null });
    } else if (res.ok) {
      setActiveLocalUserId(null);
      set({ status: 'anonymous', user: null });
    } else if (get().status !== 'authenticated') {
      setActiveLocalUserId(null);
      set({ status: 'anonymous', user: null, error: res.message });
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
      setActiveLocalUserId(res.data.user.id);
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
      setActiveLocalUserId(res.data.user.id);
      set({ status: 'authenticated', user: res.data.user, error: null });
      return true;
    }
    set({ status: 'anonymous', user: null, error: res.message });
    return false;
  },

  logout: async () => {
    await authApi.logout().catch(() => undefined);
    setActiveLocalUserId(null);
    set({ status: 'anonymous', user: null });
  },
}));
