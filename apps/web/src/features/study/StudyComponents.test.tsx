import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LearningAnnotation } from "@nihongo-n3/shared";
import i18n from "../../i18n";
import { learningApi, readStudyLocal } from "../../lib/learning-experience";
import { StudyNote } from "./StudyComponents";
import { isStudyTrackConflict } from "./StudyRequestError";

vi.mock("../../hooks/useDataScope", () => ({
  useDataScope: () => "note-test:jlpt-ja",
}));
function renderNote() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <StudyNote noteScope="day" reference="2026-09-06" />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}
describe("study note persistence", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    await i18n.changeLanguage("ko");
    vi.spyOn(learningApi, "notes").mockResolvedValue([]);
  });
  it("recognizes only the exact track-change conflict, not revision or network errors", () => {
    const message = "Learning track changed on another device; reload before continuing";
    expect(isStudyTrackConflict(Object.assign(new Error(message), { status: 409 }))).toBe(true);
    expect(isStudyTrackConflict({ status: 409, detail: message })).toBe(true);
    expect(isStudyTrackConflict({ status: 500, message })).toBe(false);
    expect(isStudyTrackConflict({ status: 409, message: "The note changed on another device; reload before saving" })).toBe(false);
    expect(isStudyTrackConflict(null)).toBe(false);
  });
  it("keeps text typed while an earlier save is in flight and advances its revision", async () => {
    let resolve!: (note: LearningAnnotation) => void;
    vi.spyOn(learningApi, "saveNote").mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    renderNote();
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "first draft" } });
    const button = screen.getByRole("button", { name: "저장" });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    await waitFor(() => expect(learningApi.saveNote).toHaveBeenCalledTimes(1));
    fireEvent.change(input, { target: { value: "newer draft" } });
    await act(async () =>
      resolve({
        scope: "day",
        ref: "2026-09-06",
        text: "first draft",
        revision: 1,
      }),
    );
    expect(input).toHaveValue("newer draft");
    expect(
      readStudyLocal<LearningAnnotation>(
        "note-test:jlpt-ja",
        "note:day:2026-09-06",
      ),
    ).toMatchObject({ text: "newer draft", revision: 1 });
  });
  it("shows the remote conflict before allowing a preserved draft to be saved", async () => {
    vi.spyOn(learningApi, "saveNote").mockRejectedValue(
      Object.assign(new Error("Conflict"), { status: 409 }),
    );
    renderNote();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "my draft" },
    });
    const button = screen.getByRole("button", { name: "저장" });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    await screen.findByRole("alert");
    expect(button).toBeDisabled();
    vi.mocked(learningApi.notes).mockResolvedValue([
      {
        scope: "day",
        ref: "2026-09-06",
        text: "other device text",
        revision: 2,
      },
    ]);
    fireEvent.click(
      screen.getByRole("button", { name: "서버의 최신 메모 확인" }),
    );
    await screen.findByText("other device text");
    expect(screen.getByRole("textbox")).toHaveValue("my draft");
    expect(learningApi.saveNote).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole("button", { name: "확인했습니다 · 내 초안 유지" }),
    );
    await waitFor(() => expect(button).not.toBeDisabled());
    expect(
      readStudyLocal<LearningAnnotation>(
        "note-test:jlpt-ja",
        "note:day:2026-09-06",
      ),
    ).toMatchObject({ text: "my draft", revision: 2 });
  });
  it.each([
    ["ko", "새로고침", "다른 기기에서 학습 대상이 변경되었습니다. 새로고침하여 현재 학습 대상을 확인하세요."],
    ["ja", "再読み込み", "別の端末で学習対象が変更されました。再読み込みして現在の学習対象を確認してください。"],
    ["en", "Reload", "Your learning track changed on another device. Reload to check the current track."],
  ])("shows actionable %s track guidance without treating a draft as a revision conflict", async (language, reloadLabel, message) => {
    await i18n.changeLanguage(language);
    vi.spyOn(learningApi, "saveNote").mockRejectedValue(
      Object.assign(new Error("Learning track changed on another device; reload before continuing"), { status: 409 }),
    );
    renderNote();
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "preserved original-track draft" } });
    const saveButton = screen.getByRole("button", { name: i18n.t("study.save") });
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    fireEvent.click(saveButton);
    expect(await screen.findByRole("button", { name: reloadLabel })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByRole("button", { name: i18n.t("study.latestNote") })).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t("study.conflict"))).not.toBeInTheDocument();
    expect(input).toHaveValue("preserved original-track draft");
    expect(readStudyLocal<LearningAnnotation>("note-test:jlpt-ja", "note:day:2026-09-06"))
      .toMatchObject({ text: "preserved original-track draft", revision: 0 });
    expect(learningApi.saveNote).toHaveBeenCalledTimes(1);
  });
});
