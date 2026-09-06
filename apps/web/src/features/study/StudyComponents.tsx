import { useEffect, useRef, useState } from "react";
import './study.css';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type {
  LearningAnnotation,
  LearningProfile,
  StudyStep,
} from "@nihongo-n3/shared";
import { studyRefKey } from "@nihongo-n3/shared";
import {
  learningApi,
  readStudyLocal,
  writeStudyLocal,
} from "../../lib/learning-experience";
import { useDataScope } from "../../hooks/useDataScope";
import { useSettingsStore } from "../../stores/settings-store";
import { audioPlayer } from "../../lib/audio";
import { useKoreanAudio } from "../topik/useKoreanAudio";
import { recordLearningActivity } from "../../lib/activity-events";
import { SUPPORTED_LANGS } from "../../i18n";
import { isStudyTrackConflict, StudyRequestError } from "./StudyRequestError";
export const studyButton =
  "study-select min-h-12 rounded-xl border border-[var(--border)] px-4 py-2 font-semibold disabled:opacity-50";
export const studyPrimary = studyButton + " bg-[var(--accent)] text-white";
export const studyInput =
  "study-select min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3";
export function LanguageSelect() {
  const { t, i18n } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm">
      {t("study.uiLanguage")}
      <select
        className={studyButton}
        value={language}
        onChange={(e) => {
          const l = e.target.value as "ko" | "ja" | "en";
          useSettingsStore.getState().setLanguage(l);
          void i18n.changeLanguage(l);
          document.documentElement.lang = l;
        }}
      >
        {SUPPORTED_LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
          </option>
        ))}
      </select>
    </label>
  );
}
export function ProfileForm({
  profile,
  onSaved,
}: {
  profile: LearningProfile;
  onSaved?: () => void;
}) {
  const { t } = useTranslation(),
    scope = useDataScope(),
    qc = useQueryClient();
  const instruction = useSettingsStore(
    (s) => s.instructionLanguages[profile.learning_track],
  );
  const [value, setValue] = useState({
    ...profile,
    instruction_language: profile.configured
      ? profile.instruction_language
      : instruction,
  });
  const save = useMutation({
    mutationFn: () => learningApi.saveProfile(value),
    onSuccess: (p) => {
      qc.setQueryData(["learning-profile", scope], p);
      useSettingsStore
        .getState()
        .setInstructionLanguage(p.learning_track, p.instruction_language);
      onSaved?.();
    },
  });
  const levels =
    profile.learning_track === "jlpt-ja"
      ? ["N5", "N4", "N3", "N2", "N1"]
      : ["1", "2", "3", "4", "5", "6"];
  return (
    <form
      className="surface-panel space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h2 className="text-xl font-bold">{t("study.setup")}</h2>
      <label className="block">
        {t("study.target")}
        <select
          aria-label={t("study.target")}
          className={studyInput}
          value={value.target_level}
          onChange={(e) =>
            setValue({
              ...value,
              target_level: e.target.value as LearningProfile["target_level"],
            })
          }
        >
          {levels.map((level) => (
            <option key={level} value={level}>
              {level.startsWith("N") ? level : t("study.grade", { level })}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        {t("study.minutes")}
        <select
          aria-label={t("study.minutes")}
          className={studyInput}
          value={value.daily_minutes}
          onChange={(e) =>
            setValue({
              ...value,
              daily_minutes: Number(e.target.value) as 10 | 20 | 30,
            })
          }
        >
          {[10, 20, 30].map((minutes) => (
            <option key={minutes} value={minutes}>
              {t("study.daily", { minutes })}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        {t("study.instruction")}
        <select
          aria-label={t("study.instruction")}
          className={studyInput}
          value={value.instruction_language}
          onChange={(e) =>
            setValue({
              ...value,
              instruction_language: e.target.value as "ko" | "ja" | "en",
            })
          }
        >
          {SUPPORTED_LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.native}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        {t("study.timezone")}
        <input
          className={studyInput}
          required
          value={value.timezone}
          onChange={(e) => setValue({ ...value, timezone: e.target.value })}
        />
      </label>
      {save.isError && <StudyRequestError error={save.error} />}
      <button className={studyPrimary} disabled={save.isPending}>
        {t(save.isPending ? "study.saving" : "study.save")}
      </button>
    </form>
  );
}
export function StudyNote({
  noteScope,
  reference,
}: {
  noteScope: "day" | "content";
  reference: string;
}) {
  const { t } = useTranslation(),
    scope = useDataScope();
  const key = "note:" + noteScope + ":" + reference;
  const notes = useQuery({
    queryKey: ["study-notes", scope],
    queryFn: learningApi.notes,
    retry: 1,
  });
  const existing = notes.data?.find(
    (n) => n.scope === noteScope && n.ref === reference,
  );
  const [draft, setDraft] = useState<LearningAnnotation | null>(() =>
    readStudyLocal(scope, key),
  );
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [conflictingNote, setConflictingNote] =
    useState<LearningAnnotation | null>(null);
  const [storageOk, setStorageOk] = useState(true),
    [saved, setSaved] = useState(false);
  const mutation = useMutation({
    mutationFn: (n: LearningAnnotation) => learningApi.saveNote(n),
    onSuccess: (n, sent) => {
      const current = draftRef.current;
      // A late save response must never erase text typed while the request was pending.
      const next =
        current && current.text !== sent.text
          ? { ...current, revision: n.revision }
          : null;
      draftRef.current = next;
      setDraft(next);
      setSaved(!next);
      setStorageOk(writeStudyLocal(scope, key, next));
      notes.refetch();
    },
  });
  const text = draft?.text ?? existing?.text ?? "";
  const save = () => {
    if (draft && navigator.onLine && !mutation.isPending && !conflictingNote)
      mutation.mutate(draft);
  };
  useEffect(() => {
    const online = () => {
      if (draftRef.current && !mutation.isPending && !mutation.isError)
        mutation.mutate(draftRef.current);
    };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [mutation.isPending, mutation.isError]);
  const conflict =
    (mutation.error as { status?: number } | null)?.status === 409 &&
    !isStudyTrackConflict(mutation.error);
  const trackConflict =
    isStudyTrackConflict(mutation.error) || isStudyTrackConflict(notes.error);
  return (
    <section className="surface-panel space-y-3 p-4">
      <label
        className="block text-sm font-semibold"
        htmlFor={"note-" + noteScope}
      >
        {t(noteScope === "day" ? "study.journal" : "study.note")}
      </label>
      <textarea
        id={"note-" + noteScope}
        className={studyInput}
        maxLength={1000}
        rows={2}
        value={text}
        placeholder={t("study.notePlaceholder")}
        onChange={(e) => {
          const next = {
            scope: noteScope,
            ref: reference,
            text: e.target.value,
            revision: draft?.revision ?? existing?.revision ?? 0,
          };
          setSaved(false);
          draftRef.current = next;
          setDraft(next);
          setStorageOk(writeStudyLocal(scope, key, next));
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={studyButton}
          disabled={!draft || mutation.isPending || notes.isPending || conflict || trackConflict}
          onClick={save}
        >
          {t("study.save")}
        </button>
        <span role="status" className="text-sm">
          {!storageOk
            ? t("study.storageError")
            : mutation.isPending
              ? t("study.saving")
              : draft
                ? t("study.local")
                : saved
                  ? t("study.saved")
                  : ""}
        </span>
      </div>
      {mutation.isError && (conflict
        ? <p role="alert">{t("study.conflict")}</p>
        : <StudyRequestError error={mutation.error} />)}
      {!mutation.isError && notes.isError && <StudyRequestError error={notes.error} />}
      {conflict && !conflictingNote && (
        <button
          className={studyButton}
          onClick={async () => {
            const fresh = await notes.refetch();
            const n = fresh.data?.find(
              (n) => n.scope === noteScope && n.ref === reference,
            );
            if (n) setConflictingNote(n);
          }}
        >
          {t("study.latestNote")}
        </button>
      )}
      {conflictingNote && (
        <div className="space-y-3">
          <p className="whitespace-pre-wrap">{conflictingNote.text}</p>
          <button
            className={studyButton}
            onClick={() => {
              const current = draftRef.current;
              if (current) {
                const next = { ...current, revision: conflictingNote.revision };
                draftRef.current = next;
                setDraft(next);
                setStorageOk(writeStudyLocal(scope, key, next));
              }
              setConflictingNote(null);
              mutation.reset();
            }}
          >
            {t("study.keepDraft")}
          </button>
        </div>
      )}
    </section>
  );
}
export function StudySpeech({ step }: { step: StudyStep }) {
  const { t } = useTranslation(),
    korean = useKoreanAudio();
  const [playing, setPlaying] = useState(false),
    [failed, setFailed] = useState(false);
  const operation = useRef(0);
  useEffect(
    () => () => {
      operation.current++;
      audioPlayer.stop();
    },
    [],
  );
  if (!step.audio) return null;
  const isKo = step.audio.language === "ko";
  const play = () => {
    setFailed(false);
    if (isKo) {
      void korean.speakText(step.audio!.text, {
        contentType: step.ref.type,
        contentId: step.ref.id,
        levelTag: step.level,
        section: step.section,
      });
      return;
    }
    setPlaying(true);
    const current = ++operation.current;
    // Deliberately call speak synchronously in the user's click task.
    void audioPlayer
      .speakText(step.audio!.text, { lang: "ja-JP", preferGoogleVoice: true })
      .then((played) => {
        if (current !== operation.current) return;
        setPlaying(false);
        setFailed(!played);
        void recordLearningActivity({
          event_type: "speech_attempted",
          learning_track: "jlpt-ja",
          content_type: step.ref.type,
          content_id: step.ref.id,
          level_tag: step.level,
          section: step.section,
          speech_outcome: played ? "played" : "error",
        }).catch(() => undefined);
      });
  };
  const active = isKo ? korean.playing : playing;
  return (
    <div className="space-y-2">
      <button
        className={studyButton}
        onClick={
          active
            ? () => {
                if (isKo) korean.stop();
                else {
                  operation.current++;
                  audioPlayer.stop();
                  setPlaying(false);
                }
              }
            : play
        }
      >
        {t(active ? "study.stop" : "study.play")}
      </button>
      {(failed || korean.error) && (
        <p role="alert" className="text-sm">
          {t("study.speechError")}
        </p>
      )}
    </div>
  );
}
export function ContentNote({ step }: { step: StudyStep }) {
  return (
    <StudyNote
      key={studyRefKey(step.ref)}
      noteScope="content"
      reference={studyRefKey(step.ref)}
    />
  );
}
