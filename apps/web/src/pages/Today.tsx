import { useEffect, useState } from "react";
import type { LearningProfile, StudySession } from "@nihongo-n3/shared";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLearningProfile } from "../hooks/useLearningProfile";
import { useDataScope } from "../hooks/useDataScope";
import {
  learningApi,
  readStudyLocal,
  writeStudyLocal,
} from "../lib/learning-experience";
import {
  ProfileForm,
  studyButton,
  studyPrimary,
} from "../features/study/StudyComponents";
import { isStudyTrackConflict, StudyRequestError } from "../features/study/StudyRequestError";
export default function Today() {
  const { t } = useTranslation(),
    navigate = useNavigate(),
    scope = useDataScope(),
    profile = useLearningProfile();
  const [editing, setEditing] = useState(false);
  const current = useQuery({
    queryKey: ["study-current", scope],
    queryFn: learningApi.current,
    retry: 1,
  });
  const profileData =
    profile.data ??
    (!navigator.onLine
      ? readStudyLocal<LearningProfile>(scope, "profile")
      : null);
  const currentData =
    current.data ??
    (!navigator.onLine ? readStudyLocal<StudySession>(scope, "current") : null);
  useEffect(() => {
    if (profile.data) writeStudyLocal(scope, "profile", profile.data);
  }, [profile.data, scope]);
  useEffect(() => {
    if (current.isSuccess) writeStudyLocal(scope, "current", current.data);
  }, [current.data, current.isSuccess, scope]);
  const close = useMutation({
    mutationFn: () => learningApi.status("current", "abandoned"),
    onSuccess: () => void current.refetch(),
  });
  const withdrawn =
    (current.error as { status?: number } | null)?.status === 410;
  const start = useMutation({
    mutationFn: async () => {
      const id =
        readStudyLocal<string>(scope, "start-request") ?? crypto.randomUUID();
      writeStudyLocal(scope, "start-request", id);
      const session = await learningApi.start(id);
      writeStudyLocal(scope, "start-request", null);
      return session;
    },
    onSuccess: (session) => navigate("/study/" + session.id),
  });
  if (profile.isPending && !profileData)
    return (
      <div className="app-page" role="status">
        {t("study.loading")}
      </div>
    );
  if (!profileData)
    return (
      <div className="app-page">
        <StudyRequestError error={profile.error} />
        {!isStudyTrackConflict(profile.error) && (
          <button className={studyButton} onClick={() => void profile.refetch()}>
            {t("study.retry")}
          </button>
        )}
      </div>
    );
  return (
    <div className="app-page mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-semibold text-[var(--accent)]">
          {profileData.learning_track === "jlpt-ja" ? "JLPT" : "TOPIK"} ·{" "}
          {profileData.target_level}
        </p>
        <h1 className="mt-2 text-3xl font-bold">{t("study.title")}</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          {t("study.subtitle")}
        </p>
      </header>
      {profile.isError && <StudyRequestError error={profile.error} />}
      {!profileData.configured || editing ? (
        <ProfileForm
          key={scope}
          profile={profileData}
          onSaved={() => setEditing(false)}
        />
      ) : (
        <>
          <section className="surface-panel space-y-5 p-6">
            <h2 className="text-xl font-bold">{t("study.routine")}</h2>
            <p>{t("study.guidance")}</p>
            <button
              className={studyPrimary + " w-full text-lg"}
              disabled={
                start.isPending ||
                (!currentData &&
                  (current.isPending ||
                    current.isError ||
                    !navigator.onLine)) ||
                withdrawn
              }
              onClick={() =>
                currentData
                  ? navigate("/study/" + currentData.id)
                  : start.mutate()
              }
            >
              {t(
                start.isPending
                  ? "study.loading"
                  : currentData
                    ? "study.resume"
                    : "study.start",
                { minutes: profileData.daily_minutes },
              )}
            </button>
            {withdrawn && (
              <p role="alert">
                {t("study.withdrawn")}{" "}
                <button
                  disabled={close.isPending}
                  className={studyButton}
                  onClick={() => close.mutate()}
                >
                  {t("study.closeSession")}
                </button>
              </p>
            )}
            {(start.isError || current.isError || close.isError) && (
              <div className="space-y-3">
                <StudyRequestError error={start.error ?? current.error ?? close.error} />
                {!isStudyTrackConflict(start.error ?? current.error ?? close.error) && (
                  <button
                    className={studyButton}
                    onClick={() => void current.refetch()}
                  >
                    {t("study.retry")}
                  </button>
                )}
              </div>
            )}
          </section>
          <button className={studyButton} onClick={() => setEditing(true)}>
            {t("study.setup")}
          </button>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        {(["learn", "questions", "records"] as const).map((path) => (
          <Link
            className={studyButton + " flex items-center"}
            key={path}
            to={"/" + path}
          >
            {t("study." + path)}
          </Link>
        ))}
      </div>
    </div>
  );
}
