import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import type { StudySession as Session } from "@nihongo-n3/shared";
import i18n from "../../i18n";
import {
  learningApi,
  readStudyLocal,
  writeStudyLocal,
} from "../../lib/learning-experience";
import StudySession from "../StudySession";

const scope = "session-test:jlpt-ja";
vi.mock("../../hooks/useDataScope", () => ({
  useDataScope: () => "session-test:jlpt-ja",
}));
vi.mock("../../features/study/StudyComponents", () => ({
  ContentNote: () => null,
  StudySpeech: () => null,
  studyButton: "",
  studyPrimary: "",
  studyInput: "",
}));
const session = (): Session => ({
  id: "session-test",
  learning_track: "jlpt-ja",
  level: "N3",
  daily_minutes: 20,
  status: "active",
  created_at: 1,
  updated_at: 2,
  notices: [],
  steps: [0, 1].map((ordinal) => ({
    id: "step-" + ordinal,
    ordinal,
    phase: "practice",
    ref: {
      track: "jlpt-ja",
      type: "jlpt-practice",
      id: "question-" + ordinal,
      version: "v1",
    },
    level: "N3",
    section: "vocab",
    mode: "choice",
    prompt: "Question " + ordinal,
    reading: null,
    choices: ["local answer", "server answer", "third", "fourth"],
    audio: null,
    revealed: false,
    submitted: false,
    correct: null,
    answer: null,
    rating: null,
    solution: null,
  })),
});
const pending = {
  step: "step-0",
  body: {
    request_id: "123e4567-e89b-42d3-a456-426614174000",
    answer: "local answer",
    active_ms: 1000,
  },
};
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/study/session-test"]}>
          <Routes>
            <Route path="/study/:id" element={<StudySession />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}
beforeEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  await i18n.changeLanguage("ko");
  writeStudyLocal(scope, "session:session-test", session());
  writeStudyLocal(scope, "pending:session-test", pending);
});

it("reconciles a different device's accepted step without discarding the local response or blocking the next step", async () => {
  const server = session();
  server.steps[0] = {
    ...server.steps[0]!,
    submitted: true,
    answer: "server answer",
    correct: true,
    solution: {
      answer: "server answer",
      explanation: "Server explanation",
      sample: null,
    },
  };
  vi.spyOn(learningApi, "session").mockResolvedValue(server);
  vi.spyOn(learningApi, "submit").mockRejectedValue(
    Object.assign(new Error("Already accepted"), { status: 409 }),
  );
  mount();
  await waitFor(() => expect(learningApi.submit).toHaveBeenCalledTimes(1));
  const acknowledge = await screen.findByRole("button", {
    name: "서버 기록으로 이어서 공부",
  });
  expect(screen.getByText("local answer")).toBeVisible();
  expect(readStudyLocal(scope, "pending:session-test")).toEqual(pending);
  fireEvent.click(acknowledge);
  await waitFor(() =>
    expect(readStudyLocal(scope, "pending:session-test")).toBeNull(),
  );
  expect(readStudyLocal(scope, "unaccepted:session-test:step-0")).toEqual(
    pending.body,
  );
  expect(screen.getByRole("button", { name: "저장하고 중단" })).toBeEnabled();
  expect(screen.getByRole("radio", { name: "1. local answer" })).toBeEnabled();
  expect(learningApi.submit).toHaveBeenCalledTimes(1);
});

it("keeps an unaccepted pending response when the server fails", async () => {
  vi.spyOn(learningApi, "session").mockResolvedValue(session());
  vi.spyOn(learningApi, "submit").mockRejectedValue(
    Object.assign(new Error("Unavailable"), { status: 500 }),
  );
  mount();
  await screen.findByRole("alert");
  expect(readStudyLocal(scope, "pending:session-test")).toEqual(pending);
  expect(
    screen.queryByRole("button", { name: "서버 기록으로 이어서 공부" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "저장하고 중단" })).toBeDisabled();
});

it("does not reconcile a stale track rejection as a successful submission", async () => {
  vi.spyOn(learningApi, "session").mockResolvedValue(session());
  vi.spyOn(learningApi, "submit").mockRejectedValue(
    Object.assign(
      new Error(
        "Learning track changed on another device; reload before continuing",
      ),
      { status: 409 },
    ),
  );
  mount();
  await screen.findByRole("alert");
  expect(readStudyLocal(scope, "pending:session-test")).toEqual(pending);
  expect(
    screen.queryByRole("button", { name: "서버 기록으로 이어서 공부" }),
  ).not.toBeInTheDocument();
});
