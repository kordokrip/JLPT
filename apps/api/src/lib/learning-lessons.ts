import { HTTPException } from "hono/http-exception";
import {
  studyRefSchema,
  studyRefKey,
  type LearningLessonCatalog,
  type LearningProfile,
  type StudyRef,
} from "@nihongo-n3/shared";
import {
  canonicalContent,
  ownerContent,
  jsonValue,
  type DB,
  type DraftStep,
} from "./study-content.js";
import { publishedOwnerItem } from "./owner-publication.js";
import {
  buildBalancedChoices,
  cryptoRandomIndex,
  rotatingAnswerIndex,
} from "./quiz-choice-order.js";

type LessonRow = {
  id: string;
  version: string;
  learning_track: string;
  level: string;
  ordinal: number;
  title_ko: string;
  title_ja: string;
  title_en: string;
};
type EntryRow = {
  ordinal: number;
  phase: "learn" | "practice";
  content_ref: string;
  cue_ko: string;
  cue_ja: string;
  cue_en: string;
};
const publicLesson = `l.is_published=1 AND EXISTS(SELECT 1 FROM content_releases r WHERE r.id=l.release_id AND r.learning_track=l.learning_track AND r.release_state='published')`;
const text = (row: Record<string, unknown>, key: string) =>
  typeof row[key] === "string" ? (row[key] as string) : "";
export function parseStudyRefKey(key: string): StudyRef | null {
  try {
    const fields = key.split(":").map(decodeURIComponent);
    if (fields.length !== 4) return null;
    const result = studyRefSchema.safeParse({
      track: fields[0],
      type: fields[1],
      id: fields[2],
      version: fields[3],
    });
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** 강성호 2026-10-11: 공개된 정확한 급수·버전만 조회하며 해설과 정답을 목록에 싣지 않는다. */
export async function lessonCatalog(
  db: DB,
  user: string,
  profile: LearningProfile,
  level = profile.target_level,
): Promise<LearningLessonCatalog> {
  const result = await db
    .prepare(
      `SELECT l.*,
    EXISTS(SELECT 1 FROM study_sessions s WHERE s.user_id=? AND s.learning_track=l.learning_track AND s.lesson_id=l.id AND s.lesson_version=l.version AND s.status='completed') AS completed,
    (SELECT s.id FROM study_sessions s WHERE s.user_id=? AND s.learning_track=l.learning_track AND s.lesson_id=l.id AND s.lesson_version=l.version AND s.status IN ('active','paused') LIMIT 1) AS active_session_id
    FROM learning_lessons l WHERE l.learning_track=? AND l.level=? AND ${publicLesson} ORDER BY l.ordinal`,
    )
    .bind(user, user, profile.learning_track, level)
    .all<LessonRow & { completed: number; active_session_id: string | null }>();
  const lang = profile.instruction_language;
  const lessons = (result.results ?? []).map((row) => ({
    id: row.id,
    version: row.version,
    title: row[`title_${lang}`],
    ordinal: row.ordinal,
    completed: !!row.completed,
    active_session_id: row.active_session_id ?? null,
  }));
  return {
    level,
    lessons,
    next_lesson_id:
      lessons.find((l) => l.active_session_id)?.id ??
      lessons.find((l) => !l.completed)?.id ??
      null,
  };
}

export async function lessonIsPublished(
  db: DB,
  id: string,
  version: string,
  track: string,
): Promise<boolean> {
  return !!(await db
    .prepare(
      `SELECT l.id FROM learning_lessons l WHERE l.id=? AND l.version=? AND l.learning_track=? AND ${publicLesson}`,
    )
    .bind(id, version, track)
    .first());
}

/** 단순 무작위 풀 정렬 대신 검수된 typed ref 문제를 먼저 직접 조회한다. */
export async function linkedQuestionContent(
  db: DB,
  ref: StudyRef,
  language: string,
): Promise<DraftStep | null> {
  if (ref.type === "topik-owner-item" && ref.track === "topik-ko") {
    const item = await ownerContent(db, ref.id, language);
    if (!item || item.ref.version !== ref.version) return null;
    return {
      ...item,
      phase: "practice",
      mode: item.section === "writing" ? "writing" : "choice",
    };
  }
  if (ref.type !== "jlpt-practice" || ref.track !== "jlpt-ja") return null;
  const row = await db
    .prepare(
      "SELECT * FROM jlpt_practice_questions WHERE id=? AND bank_version=? AND is_published=1",
    )
    .bind(ref.id, ref.version)
    .first<Record<string, unknown>>();
  if (!row) return null;
  const localized = jsonValue<Array<{ ko: string; ja: string; en: string }>>(
    row.choices_json,
    [],
  );
  // JLPT는 학습 언어가 일본어라도 어휘 뜻 선택지의 안내 언어를 보존한다.
  const choices = localized.map(
    (choice) => choice[language as "ko" | "ja" | "en"],
  );
  const answer = choices[Number(row.answer_index)];
  if (choices.length !== 4 || new Set(choices).size !== 4 || !answer)
    return null;
  return {
    ref,
    level: text(row, "level"),
    section: text(row, "mode"),
    phase: "practice",
    prompt: text(row, `prompt_${language}`),
    reading: null,
    choices,
    audio:
      row.mode === "listening" && text(row, "audio_script_ja")
        ? { language: "ja", text: text(row, "audio_script_ja") }
        : null,
    mode: "choice",
    solution: {
      answer,
      explanation: text(row, `explanation_${language}`),
      sample: null,
    },
  };
}

export async function buildLessonSteps(
  db: DB,
  profile: LearningProfile,
  lessonId: string,
): Promise<{
  steps: DraftStep[];
  notices: string[];
  lesson_id: string;
  lesson_version: string;
}> {
  const lesson = await db
    .prepare(
      `SELECT l.* FROM learning_lessons l WHERE l.id=? AND l.learning_track=? AND l.level=? AND ${publicLesson}`,
    )
    .bind(lessonId, profile.learning_track, profile.target_level)
    .first<LessonRow>();
  if (!lesson)
    throw new HTTPException(409, {
      message: "Lesson is not published at your target level",
    });
  const rows = await db
    .prepare(
      "SELECT * FROM learning_lesson_entries WHERE lesson_id=? AND lesson_version=? ORDER BY ordinal",
    )
    .bind(lesson.id, lesson.version)
    .all<EntryRow>();
  const entries = rows.results ?? [];
  if (
    entries.length !== 4 ||
    entries.some(
      (e, i) => e.ordinal !== i || e.phase !== (i < 2 ? "learn" : "practice"),
    )
  )
    throw new HTTPException(409, { message: "Lesson structure is incomplete" });
  const steps: DraftStep[] = [];
  for (const entry of entries) {
    const ref = parseStudyRefKey(entry.content_ref);
    if (!ref || ref.track !== profile.learning_track)
      throw new HTTPException(409, {
        message: "Invalid lesson content identity",
      });
    const item =
      entry.phase === "practice"
        ? await linkedQuestionContent(db, ref, profile.instruction_language)
        : ref.type === "topik-owner-item"
          ? await ownerContent(db, ref.id, profile.instruction_language)
          : await canonicalContent(db, ref.type, ref.id);
    if (
      !item ||
      item.level !== profile.target_level ||
      item.ref.version !== ref.version
    )
      throw new HTTPException(409, {
        message: "Lesson content version is unavailable",
      });
    const cue = entry[`cue_${profile.instruction_language}`];
    steps.push({
      ...item,
      phase: entry.phase,
      solution: {
        ...item.solution,
        explanation: [item.solution.explanation, cue]
          .filter(Boolean)
          .join("\n"),
      },
    });
  }
  for (const [index, step] of steps
    .filter((s) => s.phase === "practice")
    .entries()) {
    const concept = steps.filter((s) => s.phase === "learn")[index]!;
    const linked = await db
      .prepare(
        `SELECT 1 FROM content_learning_links WHERE learning_track=? AND question_ref=? AND concept_ref=? AND status='approved'`,
      )
      .bind(
        profile.learning_track,
        studyRefKey(step.ref),
        studyRefKey(concept.ref),
      )
      .first();
    if (!linked)
      throw new HTTPException(409, {
        message: "Lesson concept link is not approved",
      });
  }
  const offset = cryptoRandomIndex(4);
  steps
    .filter((step) => step.mode === "choice")
    .forEach((step, index) => {
      if (step.solution.answer)
        step.choices = buildBalancedChoices(
          step.solution.answer,
          step.choices.filter((c) => c !== step.solution.answer),
          rotatingAnswerIndex(offset, index),
        );
    });
  return {
    steps,
    notices: [],
    lesson_id: lesson.id,
    lesson_version: lesson.version,
  };
}

export async function hasDueAtLevel(
  db: DB,
  user: string,
  profile: LearningProfile,
): Promise<boolean> {
  if (profile.learning_track === "topik-ko")
    return !!(await db
      .prepare(
        `SELECT c.id FROM topik_owner_srs_cards c JOIN topik_owner_authored_curriculum_items i ON i.id=c.item_id WHERE c.user_id=? AND c.due_at<=unixepoch() AND i.target_grade=? AND ${publishedOwnerItem("i")} LIMIT 1`,
      )
      .bind(user, Number(profile.target_level))
      .first());
  return !!(await db
    .prepare(
      `SELECT id FROM srs_cards WHERE user_id=? AND learning_track='jlpt-ja' AND (CASE WHEN typeof(due_at)='integer' THEN due_at ELSE unixepoch(due_at) END)<=unixepoch()
    AND ((item_type='vocab' AND item_id IN (SELECT id FROM vocab WHERE level=?)) OR (item_type='grammar' AND item_id IN (SELECT id FROM grammar WHERE level=?)) OR (item_type='kanji' AND item_id IN (SELECT id FROM kanji WHERE jlpt_level=?)) OR (item_type='sentence' AND item_id IN (SELECT id FROM sentences WHERE level=?)) OR (item_type='homophone' AND item_id IN (SELECT id FROM homophone_pairs WHERE level=?))) LIMIT 1`,
    )
    .bind(user, ...Array(5).fill(profile.target_level))
    .first());
}
