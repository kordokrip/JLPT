import { create } from "zustand";
import { authApi, type AuthConfig, type AuthUser } from "../lib/api";
import { setActiveLocalUserId } from "../lib/db";
import { setActiveLearningTrack } from "../lib/db";
import { useSettingsStore } from "./settings-store";
import type { LearningTrackId } from "@nihongo-n3/shared";

type AuthStatus = "checking" | "authenticated" | "anonymous";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  config: AuthConfig | null;
  error: string | null;
  refresh: () => Promise<void>;
  loadConfig: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  switchTrack: (track: LearningTrackId) => Promise<boolean>;
}

function activateUser(user: AuthUser): void {
  useSettingsStore.getState().setLearningTrack(user.learning_track);
  setActiveLearningTrack(user.learning_track);
  setActiveLocalUserId(user.id);
}

// Session probes are asynchronous while login, registration, and logout are
// explicit auth mutations. A response started before a mutation must never
// overwrite the state established by that mutation.
let authMutationVersion = 0;

function invalidateOlderSessionProbes(): void {
  authMutationVersion += 1;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "checking",
  user: null,
  config: null,
  error: null,

  refresh: async () => {
    const probeVersion = authMutationVersion;
    const res = await authApi.me();
    if (probeVersion !== authMutationVersion) return;

    if (res.ok && res.data.authenticated && res.data.user) {
      activateUser(res.data.user);
      set({ status: "authenticated", user: res.data.user, error: null });
    } else if (res.ok) {
      setActiveLocalUserId(null);
      set({ status: "anonymous", user: null });
    } else if (get().status !== "authenticated") {
      setActiveLocalUserId(null);
      set({ status: "anonymous", user: null, error: res.message });
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
      const desiredTrack = useSettingsStore.getState().learningTrack;
      const user = { ...res.data.user };
      let error: string | null = null;
      if (user.learning_track !== desiredTrack) {
        const trackResult = await authApi.setTrack(desiredTrack);
        if (trackResult.ok) user.learning_track = trackResult.data.track;
        else error = trackResult.message;
      }
      invalidateOlderSessionProbes();
      activateUser(user);
      set({ status: "authenticated", user, error });
      return true;
    }
    set({ status: "anonymous", user: null, error: res.message });
    return false;
  },

  register: async (email, password, displayName) => {
    set({ error: null });
    const res = await authApi.register(email, password, displayName);
    if (res.ok) {
      const desiredTrack = useSettingsStore.getState().learningTrack;
      const user = { ...res.data.user };
      let error: string | null = null;
      if (user.learning_track !== desiredTrack) {
        const trackResult = await authApi.setTrack(desiredTrack);
        if (trackResult.ok) user.learning_track = trackResult.data.track;
        else error = trackResult.message;
      }
      invalidateOlderSessionProbes();
      activateUser(user);
      set({ status: "authenticated", user, error });
      return true;
    }
    set({ status: "anonymous", user: null, error: res.message });
    return false;
  },

  logout: async () => {
    invalidateOlderSessionProbes();
    await authApi.logout().catch(() => undefined);
    setActiveLocalUserId(null);
    set({ status: "anonymous", user: null });
  },

  switchTrack: async (track) => {
    const res = await authApi.setTrack(track);
    if (!res.ok) {
      set({ error: res.message });
      return false;
    }
    useSettingsStore.getState().setLearningTrack(track);
    setActiveLearningTrack(track);
    const user = get().user;
    set({
      user: user ? { ...user, learning_track: track } : null,
      error: null,
    });
    return true;
  },
}));
