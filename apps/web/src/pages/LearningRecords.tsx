import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { learningApi } from "../lib/learning-experience";
import { useDataScope } from "../hooks/useDataScope";
import { useLearningProfile } from "../hooks/useLearningProfile";
import { useLearningActivitySummary } from "../hooks/useLearningActivity";
import { useSettingsStore } from "../stores/settings-store";
import { StudyNote, studyButton } from "../features/study/StudyComponents";
import { isStudyTrackConflict, StudyRequestError } from "../features/study/StudyRequestError";
export default function LearningRecords() {
  const { t } = useTranslation(),
    scope = useDataScope(),
    profile = useLearningProfile();
  const track = useSettingsStore((s) => s.learningTrack);
  const [window, setWindow] = useState<"7d" | "30d">("7d");
  const activity = useLearningActivitySummary(window);
  const query = useQuery({
    queryKey: ["study-records", scope, window],
    queryFn: () => learningApi.records(window),
    retry: 1,
  });
  const notes = useQuery({
    queryKey: ["study-notes", scope],
    queryFn: learningApi.notes,
    retry: 1,
  });
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: profile.data?.timezone ?? "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const data = query.data;
  const today = data?.days.find((day) => day.date === date);
  return (
    <div className="app-page mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">{t("study.records")}</h1>
      <div className="flex gap-3">
        {(["7d", "30d"] as const).map((w) => (
          <button
            className={studyButton}
            aria-pressed={window === w}
            key={w}
            onClick={() => setWindow(w)}
          >
            {t("study.period", { days: w === "7d" ? 7 : 30 })}
          </button>
        ))}
      </div>
      {query.isError ? (
        <div className="space-y-3">
          <StudyRequestError error={query.error} />
          {!isStudyTrackConflict(query.error) && (
            <button className={studyButton} onClick={() => void query.refetch()}>
              {t("study.retry")}
            </button>
          )}
        </div>
      ) : !data ? (
        <p>{t("study.loading")}</p>
      ) : (
        <>
          <p className="text-sm">{t("study.newRecords")}</p>
          <section className="surface-panel space-y-2 p-4">
            <h2 className="font-bold">{t("study.today")}</h2>
            <p>
              {t("study.learnedMetric")}: {today?.completed ?? 0} ·{" "}
              {t("study.reviewMetric")}: {today?.reviews ?? 0} ·{" "}
              {t("study.count")}: {today?.answers ?? 0}
            </p>
            <p>
              {t("study.minutesMetric")}:{" "}
              {t("study.daily", {
                minutes: Math.round((today?.active_ms ?? 0) / 60000),
              })}
            </p>
          </section>
          <div className="grid grid-cols-2 gap-3">
            {[
              [
                "first",
                data.totals.first_correct + "/" + data.totals.first_answers,
              ],
              [
                "retryMetric",
                data.totals.retry_correct + "/" + data.totals.retry_answers,
              ],
              ["learnedMetric", data.totals.learned],
              ["reviewMetric", data.totals.reviews],
            ].map(([label, value]) => (
              <div key={label} className="surface-panel p-4">
                <h2 className="text-sm">{t("study." + label)}</h2>
                <p className="mt-2 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <section className="surface-panel space-y-2 p-4">
            <h2 className="font-bold">{t("study.nextReview")}</h2>
            <p>
              {data.next_review_at
                ? new Date(data.next_review_at * 1000).toLocaleString()
                : t("study.noReview")}
            </p>
            <Link
              className={studyButton + " inline-flex items-center"}
              to={track === "jlpt-ja" ? "/review" : "/track/topik-ko/review"}
            >
              {t("study.returnReview")}
            </Link>
          </section>
          {data.groups.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <caption className="text-left font-bold">
                  {t("study.accuracy")}
                </caption>
                <thead>
                  <tr>
                    <th>{t("study.target")}</th>
                    <th>{t("study.count")}</th>
                    <th>{t("study.accuracy")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groups.map((g) => (
                    <tr key={g.level + g.section}>
                      <td className="py-3">
                        {g.level} · {t("study.sections." + g.section)}
                      </td>
                      <td>{g.answered}</td>
                      <td>
                        {Math.round((g.correct / g.answered) * 100)}%{" "}
                        {g.answered < 10 && (
                          <small>{t("study.insufficient")}</small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <section className="space-y-3">
            <h2 className="text-xl font-bold">{t("study.history")}</h2>
            {data.sessions.length === 0 && <p>{t("study.empty")}</p>}
            {data.sessions.map((s) => (
              <Link
                className={
                  studyButton + " flex flex-wrap justify-between gap-3"
                }
                key={s.id}
                to={"/study/" + s.id}
              >
                <span>
                  {s.level} ·{" "}
                  {new Date(s.created_at * 1000).toLocaleDateString()}
                </span>
                <span>
                  {s.done}/{s.total} ·{" "}
                  {t(
                    s.status === "completed" ? "study.learned" : s.status==='abandoned'?'study.closeSession':"study.resume",
                  )}
                </span>
              </Link>
            ))}
          </section>
        </>
      )}
      <StudyNote key={scope + date} noteScope="day" reference={date} />
      <section className="surface-panel space-y-3 p-4">
        <h2 className="text-xl font-bold">{t("study.allActivity")}</h2>
        <p className="text-sm">{t("study.allActivityHelp")}</p>
        {activity.isError ? (
          <p role="alert">{t("study.error")}</p>
        ) : activity.data ? (
          <p>
            {t("study.learnedMetric")}: {activity.data.totals.completed} ·{" "}
            {t("study.count")}: {activity.data.totals.quiz_answered} ·{" "}
            {t("study.reviewMetric")}: {activity.data.totals.reviews}
          </p>
        ) : (
          <p>{t("study.loading")}</p>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t("study.memoranda")}</h2>
        {notes.isError && <StudyRequestError error={notes.error} />}
        {notes.data
          ?.filter((n) => n.scope === "content" && n.text)
          .map((n) => (
            <p className="surface-panel whitespace-pre-wrap p-4" key={n.ref}>
              {n.text}
            </p>
          ))}
      </section>
      <Link
        className={studyButton + " inline-flex items-center"}
        to={track === "jlpt-ja" ? "/stats" : "/track/topik-ko/progress"}
      >
        {t("study.legacy")}
      </Link>
    </div>
  );
}
