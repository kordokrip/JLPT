import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { LearningLessonCatalog, LearningProfile, StudySession } from "@nihongo-n3/shared";
import i18n from "../../i18n";
import { learningApi, readStudyLocal, writeStudyLocal } from "../../lib/learning-experience";
import { localUserIdFor } from "../../lib/db";
import { useAuthStore } from "../../stores/auth-store";
import { useSettingsStore } from "../../stores/settings-store";
import { useUiStore } from "../../stores/ui-store";
import { LearningMap } from "./LearningMap";

const profile: LearningProfile = {
  learning_track: "jlpt-ja", target_level: "N3", instruction_language: "ko",
  daily_minutes: 20, timezone: "Asia/Seoul", configured: true,
};
const catalog: LearningLessonCatalog = {
  level: "N3", next_lesson_id: "lesson-1",
  lessons: [{ id: "lesson-1", version: "v1", title: "실제 레슨 제목", ordinal: 1, completed: false, active_session_id: null }],
};
const session = (id = "accepted-session"): StudySession => ({
  id, learning_track: "jlpt-ja", level: "N3", daily_minutes: 5, mode: "quick",
  lesson_id: "lesson-1", lesson_version: "v1", status: "active",
  created_at: 1, updated_at: 1, notices: [], steps: [],
});
const motivation = (due_count: number) => ({ streak: 0, longest_streak: 0, xp: 0, level: 1, due_count, badges: [] });
const clients: QueryClient[] = [];

function setAccount(id: string) {
  useAuthStore.setState({
    status: "authenticated",
    user: { id, email: `${id}@example.test`, display_name: "Map fixture", role: "user", learning_track: "jlpt-ja" },
  });
}
function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}
function mount(mapProfile: LearningProfile = profile) {
  const client = new QueryClient({ defaultOptions: {
    queries: { retry: false, retryDelay: 0 }, mutations: { retry: false },
  } });
  clients.push(client);
  const view = render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={["/"]}>
            <LearningMap profile={mapProfile} onSetup={vi.fn()} />
            <Location />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nextProvider>
    </StrictMode>,
  );
  return { ...view, client };
}

beforeEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  onlineManager.setOnline(true);
  useUiStore.setState({ isOnline: true });
  setAccount("account-a");
  useSettingsStore.setState({ learningTrack: "jlpt-ja", language: "ko" });
  await i18n.changeLanguage("ko");
  vi.spyOn(learningApi, "current").mockResolvedValue(null);
  vi.spyOn(learningApi, "lessons").mockResolvedValue(catalog);
  vi.spyOn(learningApi, "motivation").mockResolvedValue(motivation(0));
  vi.spyOn(learningApi, "start").mockResolvedValue(session());
  vi.spyOn(learningApi, "status").mockResolvedValue({ ...session(), status: "abandoned" });
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  onlineManager.setOnline(true);
  useUiStore.setState({ isOnline: true });
});

it("reacts immediately to offline state without creating a new session", async () => {
  mount();
  await screen.findByRole('button', { name: '다음 레슨 시작' });
  act(() => { useUiStore.setState({ isOnline: false }); });
  expect(screen.queryByRole('button', { name: '다음 레슨 시작' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '20분 공부 시작' })).toBeDisabled();
  expect(learningApi.start).not.toHaveBeenCalled();
});

it("restores a scoped current session on a cold offline home without sending a start", async () => {
  const saved = { ...session("offline-session"), status: "paused" as const };
  writeStudyLocal(localUserIdFor("account-a", "jlpt-ja"), "current", saved);
  onlineManager.setOnline(false);
  useUiStore.setState({ isOnline: false });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "이어서 공부" }));
  expect(screen.getByTestId("location")).toHaveTextContent("/study/offline-session");
  expect(learningApi.start).not.toHaveBeenCalled();
  expect(learningApi.current).not.toHaveBeenCalled();
});

it.each([false, true])("keeps generic quick learning available with completed catalog=%s", async (completed) => {
  vi.mocked(learningApi.lessons).mockResolvedValue({ level: "N3", next_lesson_id: null, lessons: completed ? catalog.lessons.map(lesson => ({ ...lesson, completed: true })) : [] });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "3~5분 빠르게 시작" }));
  await waitFor(() => expect(learningApi.start).toHaveBeenCalledExactlyOnceWith(expect.any(String), "quick", undefined));
});

it("persists only the accepted current response and clears it when the server reports none", async () => {
  const key = localUserIdFor("account-a", "jlpt-ja");
  vi.mocked(learningApi.current).mockResolvedValue(session("saved-current"));
  const { client } = mount();
  await waitFor(() => expect(readStudyLocal<StudySession>(key, "current")?.id).toBe("saved-current"));
  vi.mocked(learningApi.current).mockResolvedValue(null);
  await act(async () => { await client.refetchQueries({ queryKey: ["study-current", key] }); });
  await waitFor(() => expect(readStudyLocal(key, "current")).toBeNull());
});

it("does not restore an offline completed session or another account's saved current", async () => {
  const key = localUserIdFor("account-a", "jlpt-ja");
  writeStudyLocal(key, "current", session("finished"));
  writeStudyLocal(key, "session:finished", { ...session("finished"), status: "completed" });
  writeStudyLocal(localUserIdFor("account-b", "jlpt-ja"), "current", session("private-b"));
  onlineManager.setOnline(false);
  useUiStore.setState({ isOnline: false });
  mount();
  expect(screen.queryByRole("button", { name: "이어서 공부" })).not.toBeInTheDocument();
  expect(learningApi.start).not.toHaveBeenCalled();
});

it("navigates after an accepted start under StrictMode's effect cleanup and setup", async () => {
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "다음 레슨 시작" }));
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/study/accepted-session"));
  expect(learningApi.start).toHaveBeenCalledExactlyOnceWith(expect.any(String), "quick", "lesson-1");
});

it("does not navigate when a previous account's in-flight start resolves", async () => {
  let resolve!: (value: StudySession) => void;
  vi.mocked(learningApi.start).mockImplementation(() => new Promise((done) => { resolve = done; }));
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "다음 레슨 시작" }));
  await waitFor(() => expect(learningApi.start).toHaveBeenCalledTimes(1));
  await act(async () => { setAccount("account-b"); });
  await act(async () => { resolve(session("account-a-session")); });
  expect(screen.getByTestId("location").textContent).toBe("/");
});

it.each([
  ["jlpt-ja", "/review", "N3"],
  ["topik-ko", "/track/topik-ko/review", "3"],
] as const)("routes %s due reviews ahead of the catalog without starting a lesson", async (track, to, level) => {
  useSettingsStore.setState({ learningTrack: track });
  useAuthStore.setState({ user: { ...useAuthStore.getState().user!, learning_track: track } });
  vi.mocked(learningApi.lessons).mockResolvedValue({ ...catalog, level });
  vi.mocked(learningApi.motivation).mockResolvedValue(motivation(3));
  mount({ ...profile, learning_track: track, target_level: level });
  const review = await screen.findByRole("link", { name: "복습하기" });
  expect(review).toHaveAttribute("href", to);
  expect(screen.queryByRole("button", { name: "다음 레슨 시작" })).not.toBeInTheDocument();
  fireEvent.click(review);
  expect(screen.getByTestId("location").textContent).toBe(to);
  expect(learningApi.start).not.toHaveBeenCalled();
});

it("resumes the current session ahead of due reviews even when the catalog is empty", async () => {
  vi.mocked(learningApi.current).mockResolvedValue({ ...session("paused-session"), status: "paused" });
  vi.mocked(learningApi.lessons).mockResolvedValue({ level: "N3", lessons: [], next_lesson_id: null });
  vi.mocked(learningApi.motivation).mockResolvedValue(motivation(4));
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "이어서 공부" }));
  expect(screen.getByTestId("location").textContent).toBe("/study/paused-session");
  expect(screen.queryByRole("link", { name: "복습하기" })).not.toBeInTheDocument();
  expect(learningApi.start).not.toHaveBeenCalled();
});

it.each(["start", "close"] as const)("rejects a paused %s mutation after the account changes before execution", async (operation) => {
  if (operation === "close") {
    vi.mocked(learningApi.current).mockImplementation(async () => {
      if (useAuthStore.getState().user?.id === "account-a")
        throw Object.assign(new Error("Lesson withdrawn"), { status: 410 });
      return null;
    });
  }
  const { client } = mount();
  const button = await screen.findByRole("button", { name: operation === "start" ? "다음 레슨 시작" : "세션 닫기" });
  // Simulate connectivity changing after the button rendered but before the
  // mutation executes. TanStack pauses the request independently of the DOM.
  act(() => { onlineManager.setOnline(false); });
  fireEvent.click(button);
  await waitFor(() => expect(client.getMutationCache().getAll().some((mutation) => mutation.state.isPaused)).toBe(true));
  await act(async () => { setAccount("account-b"); });
  await act(async () => {
    onlineManager.setOnline(true);
    await client.resumePausedMutations();
  });
  await waitFor(() => expect(client.getMutationCache().getAll().some((mutation) => mutation.state.status === "error")).toBe(true));
  expect(learningApi.start).not.toHaveBeenCalled();
  expect(learningApi.status).not.toHaveBeenCalled();
  expect(screen.getByTestId("location").textContent).toBe("/");
});
