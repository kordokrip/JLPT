import { afterEach, describe, expect, it, vi } from "vitest";
import type { LearningLessonCatalog, LearningMotivation, StudySession } from "@nihongo-n3/shared";
import { clearIntentRequest, lessonStartRequestKey, matchesExpectedScope, requestIdForIntent, selectLearningMapAction } from "./LearningMap.helpers";

const motivation = (due_count: number): LearningMotivation => ({ streak: 0, longest_streak: 0, xp: 0, level: 1, due_count, badges: [], rules: { xp_scope: "guided-sessions", daily_cap: 100, cap_scope: "track-local-day", level_step: 100 } });
const catalog = (level: LearningLessonCatalog["level"]): LearningLessonCatalog => ({ level, next_lesson_id: `${level}-1`, lessons: [{ id: `${level}-1`, version: "v1", title: "Real returned title", ordinal: 1, completed: false, active_session_id: null }] });
const session = (status: StudySession["status"]): StudySession => ({ id: "s1", learning_track: "jlpt-ja", level: "N3", daily_minutes: 20, mode: "quick", status, created_at: 1, updated_at: 1, notices: [], steps: [] });
const base = { track: "jlpt-ja" as const, current: null, motivation: motivation(0), catalog: catalog("N3"), currentState: "success" as const, motivationState: "success" as const, catalogState: "success" as const, online: true };

describe("selectLearningMapAction", () => {
  it.each(["N5", "N4", "N3", "N2", "N1", "1", "2", "3", "4", "5", "6"])('selects only the returned next lesson for level %s', (level) => {
    expect(selectLearningMapAction({ ...base, catalog: catalog(level as LearningLessonCatalog["level"]) })).toMatchObject({ kind: "lesson", lessonId: `${level}-1`, version: "v1" });
  });

  it("strictly resumes active and paused sessions", () => {
    expect(selectLearningMapAction({ ...base, current: session("active") })).toEqual({ kind: "resume", sessionId: "s1" });
    expect(selectLearningMapAction({ ...base, current: session("paused") })).toEqual({ kind: "resume", sessionId: "s1" });
  });

  it("sends due JLPT and TOPIK work to their existing review routes", () => {
    expect(selectLearningMapAction({ ...base, motivation: motivation(2) })).toEqual({ kind: "review", to: "/review" });
    expect(selectLearningMapAction({ ...base, track: "topik-ko", motivation: motivation(2) })).toEqual({ kind: "review", to: "/track/topik-ko/review" });
  });

  it.each(["pending", "error"] as const)("does not treat a %s query as zero or null", (state) => {
    expect(selectLearningMapAction({ ...base, currentState: state })).toEqual({ kind: "unavailable" });
    expect(selectLearningMapAction({ ...base, motivationState: state })).toEqual({ kind: "unavailable" });
    expect(selectLearningMapAction({ ...base, catalogState: state })).toEqual({ kind: "unavailable" });
  });

  it("never starts a new session while offline or when catalog lacks the returned next id", () => {
    expect(selectLearningMapAction({ ...base, online: false })).toEqual({ kind: "unavailable" });
    expect(selectLearningMapAction({ ...base, catalog: { ...catalog("N3"), next_lesson_id: null } })).toEqual({ kind: "unavailable" });
  });
});

describe("map start idempotency", () => {
  afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); });

  it("uses an intent-specific UUID and keeps it after failure", () => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "request-a") });
    const key = lessonStartRequestKey("quick", "N3", "lesson-1", "v1");
    expect(requestIdForIntent("user:a|track:jlpt-ja", key)).toBe("request-a");
    expect(requestIdForIntent("user:a|track:jlpt-ja", key)).toBe("request-a");
  });

  it("clears only a matching successful request", () => {
    const scope = "user:a|track:jlpt-ja";
    const key = lessonStartRequestKey("quick", "N3", "lesson-1", "v1");
    localStorage.setItem(`study-v1:${scope}:${key}`, "request-a");
    clearIntentRequest(scope, key, "request-b");
    expect(localStorage.getItem(`study-v1:${scope}:${key}`)).toBe("request-a");
    clearIntentRequest(scope, key, "request-a");
    expect(localStorage.getItem(`study-v1:${scope}:${key}`)).toBeNull();
  });

  it("rejects a delayed action when the account or track scope has changed", () => {
    expect(matchesExpectedScope("user:a|track:jlpt-ja", "user:a|track:jlpt-ja")).toBe(true);
    expect(matchesExpectedScope("user:a|track:jlpt-ja", "user:b|track:jlpt-ja")).toBe(false);
    expect(matchesExpectedScope("user:a|track:jlpt-ja", "user:a|track:topik-ko")).toBe(false);
  });
});
