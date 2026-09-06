import type {
  LearningAnnotation,
  LearningProfile,
  LearningRecords,
  StudySession,
  StudySubmission,
} from "@nihongo-n3/shared";
import { api } from "./api";
import { useSettingsStore } from "../stores/settings-store";
export { learningExperienceEnabled } from "./learning-flag";
function scopedPath(path: string) {
  return (
    path +
    "?expected_track=" +
    encodeURIComponent(useSettingsStore.getState().learningTrack)
  );
}
async function value<T>(
  request: Promise<
    { ok: true; data: T } | { ok: false; status: number; message: string }
  >,
): Promise<T> {
  const response = await request;
  if (!response.ok)
    throw Object.assign(new Error(response.message), {
      status: response.status,
    });
  return response.data;
}
export const learningApi = {
  profile: () =>
    value(api.get<LearningProfile>(scopedPath("/learning/profile"))),
  saveProfile: (
    profile: Omit<LearningProfile, "learning_track" | "configured">,
  ) =>
    value(api.put<LearningProfile>(scopedPath("/learning/profile"), profile)),
  current: () =>
    value(api.get<StudySession | null>(scopedPath("/study/sessions"))),
  start: (request_id: string) =>
    value(
      api.post<StudySession>(scopedPath("/study/sessions"), { request_id }),
    ),
  session: (id: string) =>
    value(
      api.get<StudySession>(
        scopedPath("/study/sessions/" + encodeURIComponent(id)),
      ),
    ),
  status: (id: string, status: "active" | "paused" | "abandoned") =>
    value(
      api.patch<StudySession>(
        scopedPath("/study/sessions/" + encodeURIComponent(id)),
        {
          status,
        },
      ),
    ),
  reveal: (session: string, step: string) =>
    value(
      api.post<StudySession>(
        scopedPath("/study/sessions/" + session + "/steps/" + step + "/reveal"),
      ),
    ),
  submit: (session: string, step: string, body: StudySubmission) =>
    value(
      api.post<StudySession>(
        scopedPath("/study/sessions/" + session + "/steps/" + step + "/submit"),
        body,
      ),
    ),
  records: (window: "7d" | "30d") =>
    value(
      api.get<LearningRecords>(
        scopedPath("/learning/records") + "&window=" + window,
      ),
    ),
  notes: () =>
    value(api.get<LearningAnnotation[]>(scopedPath("/learning/annotations"))),
  saveNote: (note: LearningAnnotation) =>
    value(
      api.put<LearningAnnotation>(scopedPath("/learning/annotations"), note),
    ),
};
export function readStudyLocal<T>(scope: string, key: string): T | null {
  try {
    return JSON.parse(
      localStorage.getItem("study-v1:" + scope + ":" + key) ?? "null",
    ) as T | null;
  } catch {
    return null;
  }
}
export function writeStudyLocal(
  scope: string,
  key: string,
  value: unknown,
): boolean {
  try {
    localStorage.setItem(
      "study-v1:" + scope + ":" + key,
      JSON.stringify(value),
    );
    return true;
  } catch {
    return false;
  }
}
