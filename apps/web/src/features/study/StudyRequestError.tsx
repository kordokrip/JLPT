import { useTranslation } from "react-i18next";

const TRACK_CHANGED =
  "Learning track changed on another device; reload before continuing";

export function isStudyTrackConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const problem = error as { status?: unknown; message?: unknown; detail?: unknown };
  return problem.status === 409 &&
    (problem.message === TRACK_CHANGED || problem.detail === TRACK_CHANGED);
}

/** Reload is an explicit learner action; never mutate auth or discard a draft here. */
export function StudyRequestError({ error }: { error: unknown }) {
  const { t } = useTranslation();
  if (!error) return null;
  const trackChanged = isStudyTrackConflict(error);
  return (
    <div role="alert" className="space-y-3">
      <p>{t(trackChanged ? "study.trackChanged" : "study.error")}</p>
      {trackChanged && (
        <button
          type="button"
          className="min-h-12 rounded-xl border border-[var(--border)] px-4 py-2 font-semibold"
          onClick={() => window.location.reload()}
        >
          {t("study.reload")}
        </button>
      )}
    </div>
  );
}
