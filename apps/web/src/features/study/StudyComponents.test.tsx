import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LearningAnnotation, LearningProfile } from "@nihongo-n3/shared";
import i18n from "../../i18n";
import { learningApi, readStudyLocal } from "../../lib/learning-experience";
import { ProfileForm, StudyNote } from "./StudyComponents";
import { isStudyTrackConflict } from "./StudyRequestError";
import { useAuthStore } from "../../stores/auth-store";
import { useSettingsStore } from "../../stores/settings-store";

const noteScope = "user:note-test|track:jlpt-ja";
const profile: LearningProfile = { learning_track: "jlpt-ja", target_level: "N3", instruction_language: "ko", daily_minutes: 20, timezone: "Asia/Seoul", configured: true };
const clients: QueryClient[] = [];
function changeAccount(id: string) {
  useAuthStore.setState({ status: "authenticated", user: { id, email: `${id}@example.test`, display_name: "Fixture", role: "user", learning_track: "jlpt-ja" } });
}
function renderNote(onSaved?: () => void) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  const view = render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        {onSaved ? <ProfileForm profile={profile} onSaved={onSaved} /> : <StudyNote noteScope="day" reference="2026-09-06" />}
      </QueryClientProvider>
    </I18nextProvider>,
  );
  return { ...view, client };
}
describe("study note persistence", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    onlineManager.setOnline(true);
    changeAccount("note-test");
    useSettingsStore.setState({ learningTrack: "jlpt-ja", instructionLanguages: { "jlpt-ja": "ko", "topik-ko": "ja" } });
    await i18n.changeLanguage("ko");
    vi.spyOn(learningApi, "notes").mockResolvedValue([]);
  });
  afterEach(() => {
    cleanup();
    clients.splice(0).forEach((client) => client.clear());
    onlineManager.setOnline(true);
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
        noteScope,
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
        noteScope,
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
    expect(readStudyLocal<LearningAnnotation>(noteScope, "note:day:2026-09-06"))
      .toMatchObject({ text: "preserved original-track draft", revision: 0 });
    expect(learningApi.saveNote).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["note", "account"], ["note", "track"],
    ["profile", "account"], ["profile", "track"],
  ] as const)("rejects a paused %s save after %s changes, including after unmount", async (kind, change) => {
    const saveNote = vi.spyOn(learningApi, "saveNote").mockImplementation(async (note) => ({ ...note, revision: 1 }));
    const saveProfile = vi.spyOn(learningApi, "saveProfile").mockResolvedValue(profile);
    const onSaved = vi.fn();
    const { client, unmount } = renderNote(kind === "profile" ? onSaved : undefined);
    if (kind === "note") fireEvent.change(screen.getByRole("textbox"), { target: { value: "private A draft" } });
    const button = screen.getByRole("button", { name: "저장" });
    await waitFor(() => expect(button).toBeEnabled());
    act(() => onlineManager.setOnline(false));
    fireEvent.click(button);
    await waitFor(() => expect(client.getMutationCache().getAll().some((mutation) => mutation.state.isPaused)).toBe(true));
    unmount();
    act(() => {
      if (change === "account") changeAccount("account-b");
      else useSettingsStore.setState({ learningTrack: "topik-ko" });
    });
    await act(async () => { onlineManager.setOnline(true); await client.resumePausedMutations(); });
    expect(saveNote).not.toHaveBeenCalled();
    expect(saveProfile).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    if (kind === "note") expect(readStudyLocal(noteScope, "note:day:2026-09-06")).toMatchObject({ text: "private A draft", revision: 0 });
  });

  it("does not clear a saved-note draft when its response arrives in a different account", async () => {
    let resolve!: (note: LearningAnnotation) => void;
    vi.spyOn(learningApi, "saveNote").mockImplementation(() => new Promise((done) => { resolve = done; }));
    const { unmount } = renderNote();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "original A draft" } });
    const button = screen.getByRole("button", { name: "저장" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(learningApi.saveNote).toHaveBeenCalledTimes(1));
    unmount();
    changeAccount("account-b");
    await act(async () => { resolve({ scope: "day", ref: "2026-09-06", text: "original A draft", revision: 1 }); });
    expect(readStudyLocal(noteScope, "note:day:2026-09-06")).toMatchObject({ text: "original A draft", revision: 0 });
  });

  it("does not apply a previous account's late profile response to settings or cache", async () => {
    let resolve!: (value: LearningProfile) => void;
    vi.spyOn(learningApi, "saveProfile").mockImplementation(() => new Promise((done) => { resolve = done; }));
    const onSaved = vi.fn();
    const { client, unmount } = renderNote(onSaved);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(learningApi.saveProfile).toHaveBeenCalledTimes(1));
    unmount();
    changeAccount("account-b");
    useSettingsStore.getState().setInstructionLanguage("jlpt-ja", "en");
    await act(async () => { resolve(profile); });
    expect(useSettingsStore.getState().instructionLanguages["jlpt-ja"]).toBe("en");
    expect(client.getQueryData(["learning-profile", noteScope])).toBeUndefined();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("still saves and applies the current account's learning profile", async () => {
    const saved: LearningProfile = { ...profile, target_level: "N2" };
    vi.spyOn(learningApi, "saveProfile").mockResolvedValue(saved);
    const onSaved = vi.fn();
    const { client } = renderNote(onSaved);
    fireEvent.change(screen.getByRole("combobox", { name: "목표 급수" }), { target: { value: "N2" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(learningApi.saveProfile).toHaveBeenCalledExactlyOnceWith(saved);
    expect(client.getQueryData(["learning-profile", noteScope])).toEqual(saved);
  });
});
