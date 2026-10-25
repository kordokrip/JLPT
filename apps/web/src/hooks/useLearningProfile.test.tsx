import type { ReactNode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { LearningProfile } from "@nihongo-n3/shared";
import { learningApi } from "../lib/learning-experience";
import { useAuthStore } from "../stores/auth-store";
import { useSettingsStore } from "../stores/settings-store";
import { useLearningProfile } from "./useLearningProfile";

const profile: LearningProfile = { learning_track: "jlpt-ja", target_level: "N3", instruction_language: "ko", daily_minutes: 20, timezone: "Asia/Seoul", configured: true };
const clients: QueryClient[] = [];
function setAccount(id: string) {
  useAuthStore.setState({ status: "authenticated", user: { id, email: `${id}@example.test`, display_name: "Fixture", role: "user", learning_track: "jlpt-ja" } });
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  clients.push(client);
  const view = renderHook(useLearningProfile, { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
  return { ...view, client };
}
beforeEach(() => {
  vi.restoreAllMocks();
  setAccount("profile-a");
  useSettingsStore.setState({ learningTrack: "jlpt-ja", instructionLanguages: { "jlpt-ja": "en", "topik-ko": "ja" } });
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
});

it("applies a configured profile for the current account and track", async () => {
  vi.spyOn(learningApi, "profile").mockResolvedValue(profile);
  const { result } = mount();
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(useSettingsStore.getState().instructionLanguages["jlpt-ja"]).toBe("ko");
});

it("blocks an old scope's retained query function before it can use a new account", async () => {
  vi.spyOn(learningApi, "profile").mockResolvedValue(profile);
  const { result, client } = mount();
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  const retained = client.getQueryCache().find({ queryKey: ["learning-profile", "user:profile-a|track:jlpt-ja"], exact: true })!.options.queryFn as () => Promise<LearningProfile>;
  await act(async () => { setAccount("profile-b"); });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  vi.mocked(learningApi.profile).mockClear();
  await expect(retained()).rejects.toThrow("Learning scope changed");
  expect(learningApi.profile).not.toHaveBeenCalled();
});

it("does not cache or apply a profile response arriving after an account change", async () => {
  let resolve!: (value: LearningProfile) => void;
  vi.spyOn(learningApi, "profile")
    .mockImplementationOnce(() => new Promise((done) => { resolve = done; }))
    .mockResolvedValue({ ...profile, instruction_language: "en" });
  const { result, client } = mount();
  await waitFor(() => expect(learningApi.profile).toHaveBeenCalledTimes(1));
  await act(async () => { setAccount("profile-b"); });
  await waitFor(() => expect(result.current.data?.instruction_language).toBe("en"));
  await act(async () => { resolve(profile); });
  expect(client.getQueryData(["learning-profile", "user:profile-a|track:jlpt-ja"])).toBeUndefined();
  expect(useSettingsStore.getState().instructionLanguages["jlpt-ja"]).toBe("en");
});
