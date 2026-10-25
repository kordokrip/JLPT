import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useDataScope } from "../../hooks/useDataScope";
import { useLearningProfile } from "../../hooks/useLearningProfile";
import {
  learningApi,
  readStudyLocal,
  writeStudyLocal,
} from "../../lib/learning-experience";
import { studyButton, studyPrimary } from "../study/StudyComponents";

// 강성호 2026-10-11: 서버 카탈로그만 표시하고, 공개 전에는 가짜 레슨 수를 만들지 않는다.
export function LearnerLessonLibrary() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const scope = useDataScope();
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const profile = useLearningProfile();
  const level = profile.data?.target_level;
  const current = useQuery({
    queryKey: ["study-current", scope],
    queryFn: learningApi.current,
    retry: 1,
  });
  const catalog = useQuery({
    queryKey: ["learning-lessons", scope, level],
    queryFn: () => learningApi.lessons(level!),
    enabled: Boolean(level),
    retry: 1,
  });
  const start = useMutation({
    mutationFn: async (lessonId: string) => {
      const startedScope = scope;
      if (current.data) return { session: current.data, startedScope };
      const requestId =
        readStudyLocal<string>(scope, "start-request") ?? crypto.randomUUID();
      writeStudyLocal(scope, "start-request", requestId);
      const session = await learningApi.start(requestId, "quick", lessonId);
      writeStudyLocal(scope, "start-request", null);
      return { session, startedScope };
    },
    onSuccess: ({ session, startedScope }) => {
      if (currentScope.current === startedScope)
        navigate("/study/" + session.id);
    },
  });

  if (!level) return <p>{t("study.loading")}</p>;
  if (catalog.isLoading) return <p role="status">{t("study.loading")}</p>;
  if (catalog.isError) return <p role="alert">{t("study.error")}</p>;
  const lessons = catalog.data?.lessons ?? [];
  const currentId = current.data?.id;
  return (
    <section
      className="surface-panel space-y-4 p-5"
      aria-labelledby="lesson-library-title"
    >
      <div>
        <h2 id="lesson-library-title" className="text-xl font-bold">
          {t("study.recommendedLessons")}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {t("study.recommendedLessonsHelp", { level })}
        </p>
      </div>
      {currentId && (
        <button
          className={studyPrimary}
          onClick={() => navigate("/study/" + currentId)}
        >
          {t("study.resume")}
        </button>
      )}
      {!currentId && lessons.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("study.lessonsPending")}
        </p>
      )}
      {start.isError && <p role="alert">{t("study.error")}</p>}
      {lessons.length > 0 && (
        <div className="grid gap-3">
          {lessons.map((lesson) => (
            <article
              className="rounded-[var(--radius-md)] border border-[var(--border)] p-4"
              key={lesson.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[var(--accent)]">
                    {t("study.lessonNumber", { number: lesson.ordinal })}
                  </p>
                  <h3 className="font-bold">{lesson.title}</h3>
                </div>
                {lesson.completed ? (
                  <span className="text-sm text-[var(--success)]">
                    {t("study.completed")}
                  </span>
                ) : lesson.active_session_id ? (
                  <button
                    className={studyButton}
                    onClick={() =>
                      navigate("/study/" + lesson.active_session_id)
                    }
                  >
                    {t("study.resume")}
                  </button>
                ) : (
                  <button
                    className={studyButton}
                    disabled={start.isPending || current.isLoading}
                    onClick={() => start.mutate(lesson.id)}
                  >
                    {t(
                      lesson.id === catalog.data?.next_lesson_id
                        ? "study.startRecommended"
                        : "study.startLesson",
                    )}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
