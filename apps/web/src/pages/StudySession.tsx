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
import { homePathForTrack } from "../lib/track-registry";
import {
  StudyRequestError,
  isStudyTrackConflict,
} from "../features/study/StudyRequestError";
type Pending = { step: string; body: StudySubmission };
export default function StudySession() {
  const scope = useDataScope(),
    { id = "" } = useParams();
  return <SessionView key={scope + id} scope={scope} id={id} />;
}
function SessionView({ scope, id }: { scope: string; id: string }) {
  const { t } = useTranslation(),
    qc = useQueryClient(),
    navigate = useNavigate();
  const home = homePathForTrack(useSettingsStore((s) => s.learningTrack));
  const query = useQuery({
    queryKey: ["study-session", scope, id],
    queryFn: () => learningApi.session(id),
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
  const accept = (s: Session) => {
    qc.setQueryData(["study-session", scope, id], s);
    setCache(s);
    setStorageOk(writeStudyLocal(scope, "session:" + id, s));
    void qc.invalidateQueries({ queryKey: ["study-current", scope] });
    void qc.invalidateQueries({ queryKey: ["study-records", scope] });
  };
  useEffect(() => {
    if (query.data) {
      setCache(query.data);
      setStorageOk(writeStudyLocal(scope, "session:" + id, query.data));
    }
  }, [query.data]);
  const submit = useMutation({
    mutationFn: (p: Pending) => learningApi.submit(id, p.step, p.body),
    onSuccess: (s) => {
      accept(s);
      setPending(null);
      writeStudyLocal(scope, "pending:" + id, null);
    },
    onError: async (error, p) => {
      if ((error as { status?: number }).status !== 409) return;
      if (isStudyTrackConflict(error)) return;
      const latest = await query.refetch();
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
      if (pending && !submissionConflict) submit.mutate(pending);
    };
    window.addEventListener("online", sync);
    if (navigator.onLine && pending && !submissionConflict) sync();
    return () => window.removeEventListener("online", sync);
  }, [pending, submissionConflict]);
  const reveal = useMutation({
    mutationFn: (step: string) => learningApi.reveal(id, step),
    onSuccess: accept,
  });
  const pause = useMutation({
    mutationFn: () => learningApi.status(id, "paused"),
    onSuccess: (s) => {
      accept(s);
      navigate(home);
    },
  });
  const abandon = useMutation({
    mutationFn: () => learningApi.status(id, "abandoned"),
    onSuccess: (s) => {
      accept(s);
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
    setCursor(s?.id ?? null);
    writeStudyLocal(scope, "cursor:" + id, s?.id ?? null);
  };
  const submitStep = (body: Omit<StudySubmission, "request_id">) => {
    if (!step || pending) return;
    const p = {
      step: step.id,
      body: { ...body, request_id: crypto.randomUUID() },
    };
    setPending(p);
    setStorageOk(writeStudyLocal(scope, "pending:" + id, p));
    move(step);
  };
  return (
    <div className="app-page mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t("study.resume")}</h1>
        <button
          className={studyButton}
          disabled={pause.isPending || !!pending}
          onClick={() => (navigator.onLine ? pause.mutate() : navigate(home))}
        >
          {t("study.pause")}
        </button>
      </header>
      <p role="status">
        {t("study.step", {
          done: session.steps.filter((s) => s.submitted).length,
          total: session.steps.length,
        })}{" "}
        · {session.level}
      </p>
      <progress
        className="h-2 w-full"
        value={session.steps.filter((s) => s.submitted).length}
        max={session.steps.length}
      />
      {session.notices.map((n) => (
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
            <button
              className={studyPrimary + " w-full"}
              onClick={() => move(next)}
            >
              {t(next ? "study.next" : "study.done")}
            </button>
          )}
          <ContentNote step={step} />
        </>
      ) : (
        <section className="surface-panel space-y-4 p-6">
          <h2 className="text-2xl font-bold">{t("study.done")}</h2>
          <p>{t("study.summary")}</p>
          <Link
            className={studyPrimary + " inline-flex items-center"}
            to="/records"
          >
            {t("study.records")}
          </Link>
          <Link
            className={studyButton + " ml-3 inline-flex items-center"}
            to={home}
          >
            {t("study.back")}
          </Link>
        </section>
      )}
    </div>
  );
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
      <p className="text-sm font-semibold text-[var(--accent)]">
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
            className={studyPrimary + " w-full"}
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
        <button className={studyPrimary} disabled={busy} onClick={onReveal}>
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
            <div className="grid grid-cols-2 gap-3">
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
