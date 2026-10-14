import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type {
  StudySession as Session,
  StudyStep,
  StudySubmission,
} from "@nihongo-n3/shared";
import { useDataScope } from "../hooks/useDataScope";
import {
  learningApi,
  readStudyLocal,
  writeStudyLocal,
} from "../lib/learning-experience";
import {
  ContentNote,
  StudySpeech,
  studyButton,
  studyInput,
  studyPrimary,
} from "../features/study/StudyComponents";
import { useSettingsStore } from "../stores/settings-store";
import { useAuthStore } from "../stores/auth-store";
import { useLearningProfile } from "../hooks/useLearningProfile";
import { homePathForTrack } from "../lib/track-registry";
import { localUserIdFor } from "../lib/db";
import {
  StudyRequestError,
  isStudyTrackConflict,
} from "../features/study/StudyRequestError";
import { LEARNING_MAP_ENABLED } from "../lib/features";
import "../features/study/learning-session.css";
type Pending = { step: string; body: StudySubmission };
export default function StudySession() {
  const scope = useDataScope(),
    { id = "" } = useParams();
  return <SessionView key={scope + id} scope={scope} id={id} />;
}
function SessionView({ scope, id }: { scope: string; id: string }) {
  const { t, i18n } = useTranslation(),
    qc = useQueryClient(),
    navigate = useNavigate();
  const profile = useLearningProfile();
  const learningTrack = useSettingsStore((s) => s.learningTrack);
  const home = homePathForTrack(learningTrack);
  const scopeIsCurrent = () =>
    scope ===
    localUserIdFor(
      useAuthStore.getState().user?.id ?? null,
      useSettingsStore.getState().learningTrack,
    );
  const requireCurrentScope = () => {
    if (!scopeIsCurrent()) throw new Error("Learning scope changed");
  };
  const query = useQuery({
    queryKey: ["study-session", scope, id],
    queryFn: async () => {
      requireCurrentScope();
      const result = await learningApi.session(id);
      requireCurrentScope();
      return result;
    },
    retry: 1,
  });
  const [cache, setCache] = useState<Session | null>(() =>
    readStudyLocal(scope, "session:" + id),
  );
  const [pending, setPending] = useState<Pending | null>(() =>
    readStudyLocal(scope, "pending:" + id),
  );
  const [submissionConflict, setSubmissionConflict] = useState<Pending | null>(
    null,
  );
  const [storageOk, setStorageOk] = useState(true);
  const [cursor, setCursor] = useState<string | null>(() =>
    readStudyLocal(scope, "cursor:" + id),
  );
  const serverStatus = (query.error as { status?: number } | null)?.status;
  const denied = !!serverStatus && serverStatus >= 400 && serverStatus < 500;
  const session = denied ? null : (query.data ?? cache);
  // Lesson titles are display-only. They are never inferred from the learner's
  // current profile: an open session is bound to its own level and version.
  const lessonCatalog = useQuery({
    queryKey: [
      "learning-lessons",
      scope,
      session?.level,
      profile.data?.instruction_language,
    ],
    queryFn: async () => {
      requireCurrentScope();
      const result = await learningApi.lessons(session!.level);
      requireCurrentScope();
      return result;
    },
    enabled:
      LEARNING_MAP_ENABLED &&
      Boolean(session?.lesson_id) &&
      Boolean(profile.data?.instruction_language) &&
      session?.learning_track === learningTrack &&
      scopeIsCurrent(),
    retry: 1,
  });
  const lesson = lessonCatalog.data?.lessons.find(
    (candidate) =>
      candidate.id === session?.lesson_id &&
      candidate.version === session?.lesson_version,
  );
  const completedRecords = useQuery({
    queryKey: ["study-records", scope, "7d"],
    queryFn: async () => {
      requireCurrentScope();
      const result = await learningApi.records("7d");
      requireCurrentScope();
      return result;
    },
    enabled:
      session?.status === "completed" &&
      !pending &&
      !submissionConflict &&
      scopeIsCurrent(),
    retry: 1,
  });
  const accept = (s: Session) => {
    if (!scopeIsCurrent()) return false;
    qc.setQueryData(["study-session", scope, id], s);
    setCache(s);
    setStorageOk(writeStudyLocal(scope, "session:" + id, s));
    void qc.invalidateQueries({ queryKey: ["study-current", scope] });
    void qc.invalidateQueries({ queryKey: ["study-records", scope] });
    void qc.invalidateQueries({ queryKey: ["learning-lessons", scope] });
    void qc.invalidateQueries({ queryKey: ["learning-motivation", scope] });
    return true;
  };
  useEffect(() => {
    if (query.data && scopeIsCurrent()) {
      setCache(query.data);
      setStorageOk(writeStudyLocal(scope, "session:" + id, query.data));
    }
  }, [query.data]);
  const submit = useMutation({
    mutationFn: async (p: Pending) => {
      requireCurrentScope();
      const result = await learningApi.submit(id, p.step, p.body);
      requireCurrentScope();
      return result;
    },
    onSuccess: (s) => {
      if (!accept(s)) return;
      setPending(null);
      writeStudyLocal(scope, "pending:" + id, null);
    },
    onError: async (error, p) => {
      if (!scopeIsCurrent()) return;
      if ((error as { status?: number }).status !== 409) return;
      if (isStudyTrackConflict(error)) return;
      const latest = await query.refetch();
      if (!scopeIsCurrent()) return;
      if (latest.error || !latest.data) return;
      // A different accepted request must never be overwritten or counted again.
      // Keep the unaccepted local response until the learner acknowledges it.
      if (
        latest.data.steps.find((s) => s.id === p.step)?.submitted ||
        latest.data.status === "completed" ||
        latest.data.status === "abandoned"
      ) {
        setSubmissionConflict(p);
      }
    },
  });
  useEffect(() => {
    const sync = () => {
      if (scopeIsCurrent() && pending && !submissionConflict) submit.mutate(pending);
    };
    window.addEventListener("online", sync);
    if (navigator.onLine && pending && !submissionConflict) sync();
    return () => window.removeEventListener("online", sync);
  }, [pending, submissionConflict]);
  const reveal = useMutation({
    mutationFn: async (step: string) => {
      requireCurrentScope();
      const result = await learningApi.reveal(id, step);
      requireCurrentScope();
      return result;
    },
    onSuccess: (s) => {
      accept(s);
    },
  });
  const pause = useMutation({
    mutationFn: async () => {
      requireCurrentScope();
      const result = await learningApi.status(id, "paused");
      requireCurrentScope();
      return result;
    },
    onSuccess: (s) => {
      if (!accept(s)) return;
      navigate(home);
    },
  });
  const abandon = useMutation({
    mutationFn: async () => {
      requireCurrentScope();
      const result = await learningApi.status(id, "abandoned");
      requireCurrentScope();
      return result;
    },
    onSuccess: (s) => {
      if (!accept(s)) return;
      writeStudyLocal(scope, "pending:" + id, null);
      navigate(home);
    },
  });
  if (!session)
    return (
      <div className="app-page space-y-4">
        {query.isError && serverStatus !== 410 ? (
          <StudyRequestError error={query.error} />
        ) : (
          <p role={query.isError ? "alert" : "status"}>
            {t(
              serverStatus === 410
                ? "study.withdrawn"
                : query.isError
                  ? "study.error"
                  : "study.loading",
            )}
          </p>
        )}
        {serverStatus === 410 ? (
          <button
            disabled={abandon.isPending}
            className={studyButton}
            onClick={() => abandon.mutate()}
          >
            {t("study.closeSession")}
          </button>
        ) : (
          <button className={studyButton} onClick={() => void query.refetch()}>
            {t("study.retry")}
          </button>
        )}
        <Link className={studyButton} to={home}>
          {t("study.back")}
        </Link>
      </div>
    );
  if (session.status === "abandoned")
    return (
      <div className="app-page space-y-4">
        <p>{t("study.withdrawn")}</p>
        <Link className={studyButton} to={home}>
          {t("study.back")}
        </Link>
      </div>
    );
  const next = session.steps.find((s) => !s.submitted);
  const selected = session.steps.find((s) => s.id === cursor);
  // Only the first pending step or a just-submitted explanation can be shown.
  const step =
    selected && (selected.submitted || selected.id === next?.id)
      ? selected
      : next;
  const move = (s: StudyStep | undefined) => {
    if (!scopeIsCurrent()) return;
    setCursor(s?.id ?? null);
    writeStudyLocal(scope, "cursor:" + id, s?.id ?? null);
  };
  const submitStep = (body: Omit<StudySubmission, "request_id">) => {
    if (!scopeIsCurrent() || !step || pending) return;
    const p = {
      step: step.id,
      body: { ...body, request_id: crypto.randomUUID() },
    };
    setPending(p);
    setStorageOk(writeStudyLocal(scope, "pending:" + id, p));
    move(step);
  };
  const done = session.steps.filter((s) => s.submitted).length;
  const isCompleted =
    session.status === "completed" && !pending && !submissionConflict;
  const copy = sessionCopy(i18n.language);
  return (
    <div
      data-learning-track={LEARNING_MAP_ENABLED ? session.learning_track : undefined}
      className={
        LEARNING_MAP_ENABLED
          ? "app-page learning-session mx-auto max-w-3xl space-y-5"
          : "app-page mx-auto max-w-3xl space-y-5"
      }
    >
      <header
        className={
          LEARNING_MAP_ENABLED
            ? "learning-session__header"
            : "flex flex-wrap items-center justify-between gap-3"
        }
      >
        <div className={LEARNING_MAP_ENABLED ? "learning-session__heading" : ""}>
          {!(LEARNING_MAP_ENABLED && isCompleted) && <p className="text-sm font-semibold text-[var(--accent)]">
            {t(session.mode === "quick" ? "study.quickLesson" : "study.dailyLesson")}
          </p>}
          <h1 className="text-xl font-bold">
            {LEARNING_MAP_ENABLED && lesson ? lesson.title : LEARNING_MAP_ENABLED && isCompleted ? t(session.mode === "quick" ? "study.quickLesson" : "study.dailyLesson") : t("study.resume")}
          </h1>
        </div>
        {!(LEARNING_MAP_ENABLED && isCompleted) && <button
          className={LEARNING_MAP_ENABLED ? studyButton + " learning-session__pause" : studyButton}
          disabled={pause.isPending || !!pending}
          onClick={() => {
            if (!scopeIsCurrent()) return;
            navigator.onLine ? pause.mutate() : navigate(home);
          }}
        >
          {t("study.pause")}
        </button>}
      </header>
      {!(LEARNING_MAP_ENABLED && isCompleted) && <div className={LEARNING_MAP_ENABLED ? "learning-session__progress" : ""} aria-label={LEARNING_MAP_ENABLED ? t("study.step", { done, total: session.steps.length }) : undefined}>
        <p role="status">
          {t("study.step", { done, total: session.steps.length })} · {session.level}
        </p>
        <progress
          className={LEARNING_MAP_ENABLED ? "learning-session__progress-bar" : "h-2 w-full"}
          value={done}
          max={session.steps.length}
        />
      </div>}
      {!(LEARNING_MAP_ENABLED && isCompleted) && session.notices.map((n) => (
        <p className="text-sm text-[var(--text-secondary)]" key={n}>
          {t(
            n.startsWith("unavailable:")
              ? "study.unavailable"
              : "study.notice." + n,
          )}
        </p>
      ))}
      {!storageOk && <p role="alert">{t("study.storageError")}</p>}
      {submissionConflict && (
        <section role="alert" className="surface-panel space-y-3 p-4">
          <p>{t("study.submissionConflict")}</p>
          <p className="whitespace-pre-wrap break-words">
            {submissionConflict.body.answer ??
              t("study." + submissionConflict.body.rating)}
          </p>
          <button
            className={studyButton}
            onClick={() => {
              if (!scopeIsCurrent()) return;
              const stored = writeStudyLocal(
                scope,
                "unaccepted:" + id + ":" + submissionConflict.step,
                submissionConflict.body,
              );
              const cleared =
                stored && writeStudyLocal(scope, "pending:" + id, null);
              setStorageOk(cleared);
              if (!cleared) return;
              setPending(null);
              setSubmissionConflict(null);
              move(next);
              submit.reset();
            }}
          >
            {t("study.useServerRecord")}
          </button>
        </section>
      )}
      {pending && !submissionConflict && (
        <p role="status">
          {t("study.pending")}{" "}
          <button
            className={studyButton}
            disabled={submit.isPending}
            onClick={() => submit.mutate(pending)}
          >
            {t("study.retry")}
          </button>
        </p>
      )}
      {(query.isError || submit.isError || reveal.isError || pause.isError) && (
        <StudyRequestError
          error={query.error ?? submit.error ?? reveal.error ?? pause.error}
        />
      )}
      {step ? (
        <>
          <StepCard
            key={step.id}
            step={step}
            busy={!!pending || submit.isPending || reveal.isPending}
            onReveal={() => reveal.mutate(step.id)}
            onSubmit={submitStep}
          />
          {step.submitted && (
            <div className={LEARNING_MAP_ENABLED ? "learning-session__action-dock" : ""}>
            <button
              className={studyPrimary + " w-full"}
              onClick={() => move(next)}
            >
              {t(next ? "study.next" : "study.done")}
            </button>
            </div>
          )}
          {LEARNING_MAP_ENABLED ? (
            <details className="learning-session__note">
              <summary>{copy.note}</summary>
              <ContentNote step={step} />
            </details>
          ) : (
            <ContentNote step={step} />
          )}
        </>
      ) : isCompleted ? (
        <section
          className={
            LEARNING_MAP_ENABLED
              ? "learning-session__completion"
              : "surface-panel space-y-4 p-6"
          }
        >
          {LEARNING_MAP_ENABLED && <div className="learning-session__check" aria-hidden="true">✓</div>}
          <h2 className="text-2xl font-bold">{t("study.done")}</h2>
          {LEARNING_MAP_ENABLED && <p className="learning-session__warm-copy">{copy.complete}</p>}
          <p>
            {t("study.completionSummary", {
              done,
              total: session.steps.length,
            })}
          </p>
          <div className={LEARNING_MAP_ENABLED ? "learning-session__metrics" : ""}>
            <p>
              {t("study.first")}: {session.steps.filter((s) => s.phase === "practice" && s.correct === true).length}/
              {session.steps.filter((s) => s.phase === "practice" && s.correct !== null).length}
            </p>
            <p>
              {t("study.retryMetric")}: {session.steps.filter((s) => s.phase === "retry" && s.correct === true).length}/
              {session.steps.filter((s) => s.phase === "retry" && s.correct !== null).length}
            </p>
          </div>
          <p className={LEARNING_MAP_ENABLED ? "learning-session__review" : ""}>
            {t("study.nextReview")}: {completedRecords.data?.next_review_at
              ? new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short", timeZone: profile.data?.timezone ?? (session.learning_track === "topik-ko" ? "Asia/Tokyo" : "Asia/Seoul") }).format(new Date(completedRecords.data.next_review_at * 1000))
              : completedRecords.isPending ? t("study.loading")
                : completedRecords.isError ? t("study.error")
                  : t("study.noReview")}
          </p>
          {!LEARNING_MAP_ENABLED && <p>{t("study.summary")}</p>}
          <Link
            className={LEARNING_MAP_ENABLED ? "learning-session__primary-action" : studyPrimary + " inline-flex items-center"}
            to={LEARNING_MAP_ENABLED ? home : "/records"}
          >
            {LEARNING_MAP_ENABLED ? copy.backToMap : t("study.records")}
          </Link>
          <Link
            className={LEARNING_MAP_ENABLED ? "learning-session__secondary-action" : studyButton + " ml-3 inline-flex items-center"}
            to={LEARNING_MAP_ENABLED ? "/records" : home}
          >
            {LEARNING_MAP_ENABLED ? copy.records : t("study.back")}
          </Link>
          {LEARNING_MAP_ENABLED && session.steps.some((s) => s.phase === "learn" && s.submitted) && (
            <details className="learning-session__concepts">
              <summary>{copy.concepts} ({session.steps.filter((s) => s.phase === "learn" && s.submitted).length})</summary>
              <ul>{session.steps.filter((s) => s.phase === "learn" && s.submitted).map((s) => <li key={s.id}>{s.prompt}</li>)}</ul>
            </details>
          )}
        </section>
      ) : (
        <section className="surface-panel space-y-4 p-6" role="status">
          <p>{t("study.pending")}</p>
          <button className={studyButton} onClick={() => void query.refetch()}>
            {t("study.retry")}
          </button>
        </section>
      )}
    </div>
  );
}
function sessionCopy(language: string) {
  if (language.startsWith("ja"))
    return {
      note: "メモを開く",
      complete: "お疲れ様でした！",
      concepts: "学習した内容",
      backToMap: "学習マップに戻る",
      records: "学習記録を見る",
    };
  if (language.startsWith("ko"))
    return {
      note: "메모 열기",
      complete: "참 잘했어요!",
      concepts: "학습한 내용",
      backToMap: "학습 지도로 돌아가기",
      records: "학습 기록 보기",
    };
  return {
    note: "Open notes",
    complete: "Well done!",
    concepts: "What you studied",
    backToMap: "Back to learning map",
    records: "View learning records",
  };
}
function StepCard({
  step,
  busy,
  onReveal,
  onSubmit,
}: {
  step: StudyStep;
  busy: boolean;
  onReveal: () => void;
  onSubmit: (body: Omit<StudySubmission, "request_id">) => void;
}) {
  const { t } = useTranslation(),
    scope = useDataScope();
  const [answer, setAnswer] = useState(
    () =>
      readStudyLocal<string>(scope, "answer:" + step.id) ?? step.answer ?? "",
  );
  const [hidden, setHidden] = useState(false),
    [recalled, setRecalled] = useState(false);
  const active = useRef(0),
    last = useRef(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (document.visibilityState === "visible")
        active.current += Math.min(1000, now - last.current);
      last.current = now;
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const question = step.phase === "practice" || step.phase === "retry";
  const writingRecall = !question && step.mode === "writing";
  const listening = question && step.section === "listening";
  const saveAnswer = (v: string) => {
    setAnswer(v);
    writeStudyLocal(scope, "answer:" + step.id, v);
  };
  return (
    <article className="surface-panel space-y-5 p-5 sm:p-7">
      <p
        className={
          LEARNING_MAP_ENABLED
            ? "learning-session__phase-guide"
            : "text-sm font-semibold text-[var(--accent)]"
        }
      >
        {t("study.phase." + step.phase)}
      </p>
      <h2
        className="whitespace-pre-wrap break-words text-2xl leading-relaxed"
        lang={step.ref.track === "topik-ko" ? "ko" : "ja"}
      >
        {step.prompt}
      </h2>
      {listening && <p>{t("study.listening")}</p>}
      {!listening && step.reading && <p lang="ja">{step.reading}</p>}
      <StudySpeech step={step} />
      {writingRecall && !step.submitted && (
        <label className="block">
          {t("topik.practice.writingLabel")}
          <textarea
            className={studyInput}
            rows={5}
            maxLength={5000}
            value={answer}
            onChange={(e) => saveAnswer(e.target.value)}
          />
        </label>
      )}
      {question && !step.submitted && (
        <fieldset disabled={busy} className="space-y-3">
          <legend className="sr-only">{t("study.answer")}</legend>
          {step.mode === "choice" ? (
            step.choices.map((choice, i) => (
              <label
                key={choice}
                className={
                  studyButton +
                  " flex cursor-pointer items-center gap-3 " +
                  (answer === choice ? "bg-[var(--accent-soft)]" : "")
                }
              >
                <input
                  type="radio"
                  name={step.id}
                  value={choice}
                  checked={answer === choice}
                  onChange={() => saveAnswer(choice)}
                />
                <span>
                  {i + 1}. {choice}
                </span>
              </label>
            ))
          ) : (
            <textarea
              className={studyInput}
              rows={5}
              maxLength={5000}
              value={answer}
              onChange={(e) => saveAnswer(e.target.value)}
            />
          )}
          <button
            className={
              studyPrimary +
              " w-full" +
              (LEARNING_MAP_ENABLED ? " learning-session__action-dock" : "")
            }
            disabled={!answer.trim() || busy}
            onClick={() =>
              onSubmit({ answer, active_ms: Math.min(active.current, 1800000) })
            }
          >
            {t("study.submit")}
          </button>
        </fieldset>
      )}
      {!question && !step.revealed && (
        <button
          className={
            studyPrimary + (LEARNING_MAP_ENABLED ? " learning-session__action-dock" : "")
          }
          disabled={busy}
          onClick={onReveal}
        >
          {t("study.reveal")}
        </button>
      )}
      {step.solution && (
        <>
          {!question && !step.submitted && (
            <>
              <p>{t("study.recall")}</p>
              <button
                className={studyButton}
                onClick={() => {
                  setHidden(!hidden);
                  setRecalled(true);
                }}
              >
                {t(hidden ? "study.show" : "study.hide")}
              </button>
            </>
          )}
          {(!hidden || step.submitted) && (
            <div className="space-y-3 whitespace-pre-wrap border-t border-[var(--border)] pt-4">
              {step.correct !== null && (
                <p role="status" className="font-bold">
                  {t(step.correct ? "study.correct" : "study.incorrect")}
                </p>
              )}
              {listening && step.audio && (
                <details>
                  <summary className={studyButton}>
                    {t("study.transcript")}
                  </summary>
                  <p lang={step.audio.language}>{step.audio.text}</p>
                </details>
              )}
              {step.mode === "writing" && question && (
                <p>{t("study.writing")}</p>
              )}
              {step.answer && <p>{step.answer}</p>}
              {step.solution.answer && (
                <p>
                  {t("study.answer")}: {step.solution.answer}
                </p>
              )}
              <p>{step.solution.explanation}</p>
              {step.solution.sample && <p>{step.solution.sample}</p>}
            </div>
          )}
          {!question && !step.submitted && (
            <div
              className={
                "grid grid-cols-2 gap-3" +
                (LEARNING_MAP_ENABLED ? " learning-session__rating-dock" : "")
              }
            >
              {(["again", "hard", "good", "easy"] as const).map((rating) => (
                <button
                  key={rating}
                  disabled={
                    busy || !recalled || (writingRecall && !answer.trim())
                  }
                  className={studyButton}
                  onClick={() =>
                    onSubmit({
                      rating,
                      ...(writingRecall ? { answer } : {}),
                      active_ms: Math.min(active.current, 1800000),
                    })
                  }
                >
                  {t("study." + rating)}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </article>
  );
}
