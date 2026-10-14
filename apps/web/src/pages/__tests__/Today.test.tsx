import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import type { LearningProfile, StudySession } from "@nihongo-n3/shared";
import i18n from "../../i18n";
import { learningApi } from "../../lib/learning-experience";
import { useAuthStore } from "../../stores/auth-store";
import { useSettingsStore } from "../../stores/settings-store";
import Today from "../Today";

vi.mock("../../lib/features", () => ({ LEARNING_MAP_ENABLED: false }));

vi.mock("../../features/study/StudyComponents", () => ({
  ProfileForm: () => null,
  studyButton: "",
  studyPrimary: "",
}));

const profile: LearningProfile = {
  learning_track: "jlpt-ja",
  target_level: "N3",
  instruction_language: "ko",
  daily_minutes: 20,
  timezone: "Asia/Seoul",
  configured: true,
};
const session = (id = "quick-session"): StudySession => ({
  id,
  learning_track: "jlpt-ja",
  level: "N3",
  mode: "quick",
  daily_minutes: 20,
  status: "active",
  created_at: 1,
  updated_at: 1,
  notices: [],
  steps: [],
});
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/study/:id" element={<p>study route</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

beforeEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  useAuthStore.setState({
    status: "authenticated",
    user: {
      id: "today-user",
      email: "today@example.test",
      display_name: "Today fixture",
      role: "user",
      learning_track: "jlpt-ja",
    },
  });
  useSettingsStore.setState({ learningTrack: "jlpt-ja", language: "ko" });
  await i18n.changeLanguage("ko");
  vi.spyOn(learningApi, "profile").mockResolvedValue(profile);
  vi.spyOn(learningApi, "motivation").mockResolvedValue({
    streak: 3,
    longest_streak: 7,
    xp: 16,
    level: 2,
    due_count: 4,
    badges: [{ id: "first_lesson", earned_at: "2026-09-25" }],
  });
});

it("starts the short lesson in quick mode and shows the learner's current motivation", async () => {
  vi.spyOn(learningApi, "current").mockResolvedValue(null);
  const start = vi.spyOn(learningApi, "start").mockResolvedValue(session());
  mount();

  await screen.findByRole("button", { name: "3~5분 빠르게 시작" });
  expect(screen.getByText("3일 연속 · 16 XP · 학습 단계 2")).toBeVisible();
  expect(screen.getByText("예정 복습 4개")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "3~5분 빠르게 시작" }));
  await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
  expect(start.mock.calls[0]?.[1]).toBe("quick");
});

it("gives an existing session precedence over starting a quick or daily lesson", async () => {
  vi.spyOn(learningApi, "current").mockResolvedValue(session("resume-session"));
  const start = vi.spyOn(learningApi, "start");
  mount();

  const resume = await screen.findByRole("button", { name: "이어서 공부" });
  expect(
    screen.queryByRole("button", { name: "3~5분 빠르게 시작" }),
  ).not.toBeInTheDocument();
  fireEvent.click(resume);
  await screen.findByText("study route");
  expect(start).not.toHaveBeenCalled();
});
