import type { LearningLessonCatalog, LearningMotivation, StudySession } from "@nihongo-n3/shared";

export type LearningMapAction =
  | { kind: "resume"; sessionId: string }
  | { kind: "review"; to: string }
  | { kind: "lesson"; lessonId: string; version: string }
  | { kind: "unavailable" };

type QueryState = "pending" | "error" | "success";

/** The map only promotes actions backed by completed, scoped API queries. */
export function selectLearningMapAction(input: {
  track: "jlpt-ja" | "topik-ko";
  current: StudySession | null | undefined;
  motivation: LearningMotivation | undefined;
  catalog: LearningLessonCatalog | undefined;
  currentState: QueryState;
  motivationState: QueryState;
  catalogState: QueryState;
  online: boolean;
}): LearningMapAction {
  if (input.currentState !== "success") return { kind: "unavailable" };
  if (input.current?.status === "active" || input.current?.status === "paused")
    return { kind: "resume", sessionId: input.current.id };
  if (input.current) return { kind: "unavailable" };
  if (input.motivationState !== "success" || !input.motivation)
    return { kind: "unavailable" };
  if (input.motivation.due_count > 0)
    return { kind: "review", to: input.track === "jlpt-ja" ? "/review" : "/track/topik-ko/review" };
  if (
    !input.online ||
    input.catalogState !== "success" ||
    !input.catalog?.next_lesson_id
  )
    return { kind: "unavailable" };
  const lesson = input.catalog.lessons.find((item) => item.id === input.catalog?.next_lesson_id);
  return lesson ? { kind: "lesson", lessonId: lesson.id, version: lesson.version } : { kind: "unavailable" };
}

export function lessonStartRequestKey(mode: "quick" | "daily", level: string, lessonId: string, version: string) {
  return `map-start:${mode}:${level}:${lessonId}:${version}`;
}

export function requestIdForIntent(scope: string, key: string): string {
  const saved = localStorage.getItem(`study-v1:${scope}:${key}`);
  if (saved) return saved;
  const id = crypto.randomUUID();
  localStorage.setItem(`study-v1:${scope}:${key}`, id);
  return id;
}

export function clearIntentRequest(scope: string, key: string, requestId: string): void {
  const storageKey = `study-v1:${scope}:${key}`;
  if (localStorage.getItem(storageKey) === requestId) localStorage.removeItem(storageKey);
}

/** A mutation is only valid for the account-and-track scope captured at click time. */
export function matchesExpectedScope(expectedScope: string, actualScope: string): boolean {
  return expectedScope === actualScope;
}
