import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountApi, type AccountPreferenceUpdate } from "../lib/account-api";
import { useAuthStore } from "../stores/auth-store";
import { useSettingsStore } from "../stores/settings-store";

const legacyOwnerKey = "nihongo-n3-account-theme-owner";
let legacyTheme:
  | { theme: "light" | "dark" | "system"; explicit: boolean }
  | undefined;
export function applyAccountTheme(theme: "light" | "dark" | "system") {
  document.documentElement.classList.toggle(
    "dark",
    theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches),
  );
}
export function useAccountPreferences(enabled = true) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const client = useQueryClient();
  const key = useMemo(() => ["account-preferences", userId] as const, [userId]);
  if (!legacyTheme) {
    const local = useSettingsStore.getState();
    legacyTheme = { theme: local.theme, explicit: local.themeExplicit };
  }
  useEffect(() => {
    if (enabled) {
      useSettingsStore.getState().setRemoteTheme("system");
      useSettingsStore.getState().setAccent("track");
      applyAccountTheme("system");
    }
  }, [enabled, userId]);
  const query = useQuery({
    queryKey: key,
    enabled: enabled && !!userId,
    queryFn: async ({ signal }) => {
      const prefs = await accountApi.preferences(userId!, signal);
      const owner = localStorage.getItem(legacyOwnerKey);
      if (
        !prefs.theme &&
        legacyTheme?.explicit &&
        (owner === null || owner === userId)
      ) {
        if (signal.aborted || useAuthStore.getState().user?.id !== userId)
          throw new Error("Account changed");
        localStorage.setItem(legacyOwnerKey, userId!);
        return accountApi.savePreferences(userId!, {
          initialize_theme: legacyTheme.theme,
        });
      }
      return prefs;
    },
    staleTime: 60_000,
  });
  useEffect(() => {
    if (!enabled || !userId || !query.data) return;
    const settings = useSettingsStore.getState(),
      prefs = query.data;
    if (prefs.theme) {
      settings.setRemoteTheme(prefs.theme);
      applyAccountTheme(prefs.theme);
    } else {
      settings.setRemoteTheme("system");
      applyAccountTheme("system");
    }
    settings.setAccent(prefs.accent ?? "track");
  }, [client, enabled, key, query.data, userId]);
  const mutation = useMutation({
    mutationFn: async (changes: AccountPreferenceUpdate) => {
      if (!enabled || !userId || useAuthStore.getState().user?.id !== userId)
        throw new Error("Account personalization is unavailable");
      await client.cancelQueries({ queryKey: key });
      if (useAuthStore.getState().user?.id !== userId)
        throw new Error("Account changed before saving");
      const saved = await accountApi.savePreferences(userId, changes);
      if (useAuthStore.getState().user?.id !== userId)
        throw new Error("Account changed while saving preferences");
      return saved;
    },
    onSuccess: (saved) => client.setQueryData(key, saved),
  });
  return {
    preferences: query.data ?? null,
    loading: query.isLoading,
    error: query.error
      ? "Unable to load account preferences"
      : mutation.error
        ? "Unable to save account preferences"
        : null,
    save: mutation.mutateAsync,
  };
}
