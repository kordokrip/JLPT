import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import i18n from "../../i18n";
import { learningApi } from "../../lib/learning-experience";
import { LearnerLessonLibrary } from "./LearnerLessonLibrary";

vi.mock("../../hooks/useLearningProfile", () => ({
  useLearningProfile: () => ({ data: { target_level: "N3" } }),
}));
const scope = vi.hoisted(() => ({ value: "lesson-library-test" }));
vi.mock("../../hooks/useDataScope", () => ({
  useDataScope: () => scope.value,
}));
vi.mock("../study/StudyComponents", () => ({
  studyButton: "",
  studyPrimary: "",
}));

beforeEach(async () => {
  vi.restoreAllMocks();
  scope.value = "lesson-library-test";
  await i18n.changeLanguage("en");
  vi.spyOn(learningApi, "current").mockResolvedValue(null);
});

it("starts in quick mode and ignores a late response after scope changes", async () => {
  vi.spyOn(learningApi, "lessons").mockResolvedValue({
    level: "N3",
    next_lesson_id: "n3-1",
    lessons: [
      {
        id: "n3-1",
        version: "1",
        title: "N3 starter",
        ordinal: 1,
        completed: false,
        active_session_id: null,
      },
    ],
  });
  let resolve!: (value: import("@nihongo-n3/shared").StudySession) => void;
  const started = vi.spyOn(learningApi, "start").mockImplementation(
    () =>
      new Promise((yes) => {
        resolve = yes;
      }),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Location() {
    return <output data-testid="location">{useLocation().pathname}</output>;
  }
  const element = (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <LearnerLessonLibrary />
          <Location />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
  const rendered = render(element);
  fireEvent.click(
    await screen.findByRole("button", {
      name: /Start recommended|Start lesson/i,
    }),
  );
  await waitFor(() =>
    expect(started).toHaveBeenCalledWith(expect.any(String), "quick", "n3-1"),
  );
  scope.value = "different-account-topik";
  rendered.rerender(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <LearnerLessonLibrary />
          <Location />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
  await act(async () =>
    resolve({
      id: "old-account-session",
    } as import("@nihongo-n3/shared").StudySession),
  );
  expect(screen.getByTestId("location")).not.toHaveTextContent(
    "old-account-session",
  );
});

it("loads only the returned catalog lessons instead of inventing a lesson list", async () => {
  const lessons = vi.spyOn(learningApi, "lessons").mockResolvedValue({
    level: "N3",
    next_lesson_id: "n3-1",
    lessons: [
      {
        id: "n3-1",
        version: "1",
        title: "N3 starter",
        ordinal: 1,
        completed: false,
        active_session_id: null,
      },
    ],
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <LearnerLessonLibrary />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
  expect(await screen.findByText("N3 starter")).toBeVisible();
  expect(lessons).toHaveBeenCalledWith("N3");
  expect(screen.queryByText(/Lesson 2/)).not.toBeInTheDocument();
});
