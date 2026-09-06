import type { LearningProfile, StudyRef, StudyStep } from "@nihongo-n3/shared";
import { studyRefKey } from "@nihongo-n3/shared";
import type { AppEnv } from "../types.js";
import { publishedOwnerItem } from "./owner-publication.js";
import { generateQuizQuestions, QuizPoolError } from "./quiz-questions.js";
import {
  buildBalancedChoices,
  cryptoRandomIndex,
  rotatingAnswerIndex,
} from "./quiz-choice-order.js";

export type DB = AppEnv["Bindings"]["DB"];
export type DraftStep = {
  ref: StudyRef;
  section: string;
  level: string;
  phase: StudyStep["phase"];
  prompt: string;
  reading: string | null;
  choices: string[];
  audio: StudyStep["audio"];
  mode: StudyStep["mode"];
  solution: NonNullable<StudyStep["solution"]>;
  card_id?: number;
};
type Row = Record<string, unknown>;
const str = (value: unknown) => (typeof value === "string" ? value : "");
export function jsonValue<T>(value: unknown, fallback: T): T {
  try {
    return JSON.parse(str(value)) as T;
  } catch {
    return fallback;
  }
}
const localized = (row: Row, field: string, language: string) =>
  str(row[`${field}_${language}`]);
async function versionOf(row: Row): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(row)),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function canonicalContent(
  db: DB,
  type: StudyRef["type"],
  id: string,
): Promise<DraftStep | null> {
  const tables: Record<string, string> = {
    vocab: "vocab",
    grammar: "grammar",
    kanji: "kanji",
    sentence: "sentences",
    sysprog: "sysprog_terms",
    homophone: "homophone_pairs",
  };
  const table = tables[type];
  if (!table || !/^\d+$/.test(id)) return null;
  const row = await db
    .prepare(`SELECT * FROM ${table} WHERE id=?`)
    .bind(Number(id))
    .first<Row>();
  if (!row) return null;
  let prompt = str(row.ja),
    reading = str(row.kana),
    meaning = str(row.ko),
    extra = "";
  if (type === "grammar") {
    prompt = str(row.pattern);
    meaning = str(row.meaning_ko);
    const examples = jsonValue<Array<Row>>(row.examples, []);
    extra = examples
      .map((e) => [e.ja ?? e.jp, e.ko].filter(Boolean).join(" — "))
      .join("\n");
    reading = str(row.connection);
  }
  if (type === "kanji") {
    prompt = str(row.char);
    reading = [row.on_yomi, row.kun_yomi].filter(Boolean).join(" / ");
    meaning = str(row.meaning_ko);
    extra = str(row.radical);
  }
  if (type === "vocab")
    extra = [row.kanji_hint, row.trap_note].filter(Boolean).join("\n");
  if (type === "homophone") {
    const words = await db
      .prepare("SELECT id,ja,kana,ko FROM vocab WHERE id IN (?,?)")
      .bind(row.word_a_id, row.word_b_id)
      .all<Row>();
    if (words.results?.length !== 2) return null;
    prompt = words.results.map((w) => str(w.ja)).join(" / ");
    reading = words.results.map((w) => str(w.kana)).join(" / ");
    meaning = words.results.map((w) => [w.ja, w.ko].join(" — ")).join("\n");
    extra = str(row.note_ko);
  }
  if (!prompt || !meaning) return null;
  const level = str(row.level ?? row.jlpt_level);
  return {
    ref: { track: "jlpt-ja", type, id, version: await versionOf(row) },
    section: type,
    level,
    phase: "learn",
    prompt,
    reading: reading || null,
    choices: [],
    audio: { language: "ja", text: prompt },
    mode: "recall",
    solution: {
      explanation: [meaning, extra].filter(Boolean).join("\n"),
      answer: meaning,
      sample: null,
    },
  };
}
export async function ownerContent(
  db: DB,
  id: string,
  language: string,
): Promise<DraftStep | null> {
  const row = await db
    .prepare(
      `SELECT i.*,b.binding_state FROM topik_owner_authored_curriculum_items i
    LEFT JOIN content_speech_bindings b ON b.item_type='topik-owner-item' AND b.item_id=i.id AND b.language='ko'
    AND b.speech_role=CASE WHEN i.item_type='listening' THEN 'listening' ELSE 'pronunciation' END AND b.provider='google-browser'
    WHERE i.id=? AND ${publishedOwnerItem("i")}`,
    )
    .bind(id)
    .first<Row>();
  if (!row) return null;
  const payload = jsonValue<{
    choices?: string[];
    answer_index?: number;
    sample_answer_ko?: string;
    rubric_ko?: string;
    rubric_ja?: string;
    rubric_en?: string;
  }>(row.answer_json, {});
  const choices = payload.choices ?? [];
  const section = str(row.item_type);
  return {
    ref: {
      track: "topik-ko",
      type: "topik-owner-item",
      id,
      version: await versionOf(row),
    },
    section,
    level: String(row.target_grade),
    phase: "learn",
    prompt: localized(row, "prompt", language),
    reading: null,
    choices,
    audio:
      row.audio_required === 1 &&
      row.binding_state === "ready" &&
      str(row.audio_text_ko)
        ? { language: "ko", text: str(row.audio_text_ko) }
        : null,
    mode: section === "writing" ? "writing" : "recall",
    solution: {
      explanation: [
        localized(row, "explanation", language),
        localized(payload as Row, "rubric", language),
      ]
        .filter(Boolean)
        .join("\n"),
      answer:
        payload.answer_index === undefined
          ? null
          : (choices[payload.answer_index] ?? null),
      sample: payload.sample_answer_ko ?? null,
    },
  };
}
export async function contentStillPublished(
  db: DB,
  ref: StudyRef,
): Promise<boolean> {
  if (ref.type === "jlpt-practice")
    return !!(await db
      .prepare(
        "SELECT id FROM jlpt_practice_questions WHERE id=? AND bank_version=? AND is_published=1",
      )
      .bind(ref.id, ref.version)
      .first());
  if (ref.type === "topik-practice")
    return !!(await db
      .prepare(
        "SELECT id FROM topik_practice_questions WHERE id=? AND bank_version=? AND is_published=1",
      )
      .bind(ref.id, ref.version)
      .first());
  if (ref.type === "topik-owner-item")
    return !!(await db
      .prepare(
        `SELECT id FROM topik_owner_authored_curriculum_items i WHERE id=? AND ${publishedOwnerItem("i")}`,
      )
      .bind(ref.id)
      .first());
  return !!(await canonicalContent(db, ref.type, ref.id));
}
export async function buildStudySteps(
  db: DB,
  userId: string,
  profile: LearningProfile,
): Promise<{ steps: DraftStep[]; notices: string[] }> {
  const topik = profile.learning_track === "topik-ko",
    level = profile.target_level,
    lang = profile.instruction_language;
  const steps: DraftStep[] = [],
    notices: string[] = [];
  const count = profile.daily_minutes === 10 ? 3 : 5;
  const dueRows = topik
    ? await db
        .prepare(
          `SELECT c.id,c.item_id FROM topik_owner_srs_cards c JOIN topik_owner_authored_curriculum_items i ON i.id=c.item_id
       WHERE c.user_id=? AND c.due_at<=unixepoch() AND i.target_grade=? AND ${publishedOwnerItem("i")} ORDER BY c.due_at LIMIT 20`,
        )
        .bind(userId, Number(level))
        .all<Row>()
    : await db
        .prepare(
          `SELECT id,item_id,item_type FROM srs_cards WHERE user_id=? AND learning_track='jlpt-ja'
       AND (CASE WHEN typeof(due_at)='integer' THEN due_at ELSE unixepoch(due_at) END)<=unixepoch()
       AND ((item_type='vocab' AND item_id IN (SELECT id FROM vocab WHERE level=?))
         OR (item_type='grammar' AND item_id IN (SELECT id FROM grammar WHERE level=?))
         OR (item_type='kanji' AND item_id IN (SELECT id FROM kanji WHERE jlpt_level=?))
         OR (item_type='sentence' AND item_id IN (SELECT id FROM sentences WHERE level=?))
         OR (item_type='homophone' AND item_id IN (SELECT id FROM homophone_pairs WHERE level=?)))
       ORDER BY due_at LIMIT ?`,
        )
        .bind(userId, level, level, level, level, level, count)
        .all<Row>();
  for (const row of dueRows.results ?? []) {
    if (steps.length >= count) break;
    const item = topik
      ? await ownerContent(db, String(row.item_id), lang)
      : await canonicalContent(
          db,
          str(row.item_type) as StudyRef["type"],
          String(row.item_id),
        );
    if (item && item.level === level && steps.length < count)
      steps.push({ ...item, phase: "review", card_id: Number(row.id) });
  }
  const backlog = steps.length >= count;
  const newLimit = backlog ? Math.min(2, count) : count;
  if (backlog) notices.push("review-priority");
  if (topik) {
    const rows = await db
      .prepare(
        `SELECT i.id FROM topik_owner_authored_curriculum_items i WHERE i.target_grade=? AND ${publishedOwnerItem("i")}
      AND NOT EXISTS(SELECT 1 FROM topik_owner_curriculum_progress p WHERE p.user_id=? AND p.item_id=i.id AND p.status='completed')
      ORDER BY i.id LIMIT ?`,
      )
      .bind(Number(level), userId, newLimit)
      .all<{ id: string }>();
    for (const row of rows.results ?? []) {
      const item = await ownerContent(db, row.id, lang);
      if (item) steps.push(item);
    }
  } else {
    const pools: DraftStep[][] = [];
    for (const [type, table, column] of [
      ["vocab", "vocab", "level"],
      ["grammar", "grammar", "level"],
      ["kanji", "kanji", "jlpt_level"],
      ["sentence", "sentences", "level"],
    ] as const) {
      const rows = await db
        .prepare(
          `SELECT id FROM ${table} WHERE ${column}=? AND NOT EXISTS
        (SELECT 1 FROM srs_cards c WHERE c.user_id=? AND c.learning_track='jlpt-ja' AND c.item_type=? AND c.item_id=${table}.id) ORDER BY id LIMIT ?`,
        )
        .bind(level, userId, type, Math.ceil(newLimit / 4))
        .all<{ id: number }>();
      const items: DraftStep[] = [];
      for (const row of rows.results ?? []) {
        const item = await canonicalContent(db, type, String(row.id));
        if (item) items.push(item);
      }
      pools.push(items);
    }
    let added = 0;
    for (let round = 0; round < newLimit; round++)
      for (const pool of pools)
        if (pool[round] && added < newLimit) {
          steps.push(pool[round]!);
          added++;
        }
  }
  // Previously failed questions are separate retries; never counted as new first attempts.
  const failed = await db
    .prepare(
      `SELECT st.public_json,st.solution_json FROM study_steps st JOIN study_sessions s ON s.id=st.session_id
    WHERE s.user_id=? AND s.learning_track=? AND s.level=? AND st.phase='practice' AND st.correct=0
    AND NOT EXISTS(SELECT 1 FROM study_steps done JOIN study_sessions ds ON ds.id=done.session_id
      WHERE ds.user_id=s.user_id AND done.content_ref=st.content_ref AND done.correct=1 AND done.submitted_at>st.submitted_at)
    GROUP BY st.content_ref ORDER BY max(st.submitted_at) DESC LIMIT 2`,
    )
    .bind(userId, profile.learning_track, level)
    .all<{ public_json: string; solution_json: string }>();
  for (const row of failed.results ?? []) {
    const saved = jsonValue<DraftStep | null>(row.public_json, null);
    if (saved && (await contentStillPublished(db, saved.ref)))
      steps.push({
        ...saved,
        phase: "retry",
        solution: JSON.parse(row.solution_json),
      });
  }
  const practice: DraftStep[] = [];
  if (topik) {
    const band = Number(level) <= 2 ? "TOPIK-I" : "TOPIK-II";
    const rows = await db
      .prepare(
        `SELECT * FROM topik_practice_questions WHERE bank_version='v2' AND is_published=1 AND exam_level=?
      ORDER BY RANDOM() LIMIT ?`,
      )
      .bind(band, count)
      .all<Row>();
    for (const row of rows.results ?? []) {
      const choices = jsonValue<string[]>(row.choices_json, []),
        section = str(row.section);
      const answer =
        typeof row.answer_index === "number"
          ? (choices[row.answer_index] ?? null)
          : null;
      practice.push({
        ref: {
          track: "topik-ko",
          type: "topik-practice",
          id: str(row.id),
          version: "v2",
        },
        phase: "practice",
        section,
        level: band,
        prompt: localized(row, "prompt", lang),
        reading: null,
        choices,
        audio:
          section === "listening" && str(row.audio_script_ko)
            ? { language: "ko", text: str(row.audio_script_ko) }
            : null,
        mode: row.question_type === "writing" ? "writing" : "choice",
        solution: {
          answer,
          explanation: localized(row, "explanation", lang),
          sample: localized(row, "sample_answer", "ko") || null,
        },
      });
    }
    notices.push("topik-exam-band");
  } else {
    const pools: DraftStep[][] = [];
    for (const mode of [
      "vocab_mc",
      "kanji_reading",
      "listening",
      "grammar_fill",
    ] as const) {
      try {
        const questions = await generateQuizQuestions(db, userId, {
          level: level as "N1",
          mode,
          count: 3,
          strategy: "weakest",
        });
        const pool: DraftStep[] = [];
        for (const q of questions) {
          const type =
            typeof q.item_id === "string"
              ? "jlpt-practice"
              : (
                  {
                    vocab_mc: "vocab",
                    kanji_reading: "kanji",
                    listening: "sentence",
                    grammar_fill: "grammar",
                  } as const
                )[mode];
          const source =
            type === "jlpt-practice"
              ? await db
                  .prepare(
                    "SELECT * FROM jlpt_practice_questions WHERE id=? AND is_published=1",
                  )
                  .bind(q.item_id)
                  .first<Row>()
              : null;
          const concept =
            type !== "jlpt-practice"
              ? await canonicalContent(db, type, String(q.item_id))
              : null;
          pool.push({
            ref: {
              track: "jlpt-ja",
              type,
              id: String(q.item_id),
              version: source
                ? str(source.bank_version)
                : (concept?.ref.version ?? "canonical"),
            },
            phase: "practice",
            section: mode,
            level,
            prompt: q.prompt,
            reading: null,
            choices: q.choices,
            mode: "choice",
            audio: q.script_ja ? { language: "ja", text: q.script_ja } : null,
            solution: {
              answer: q.answer,
              explanation: source
                ? localized(source, "explanation", lang)
                : (concept?.solution.explanation ?? q.answer),
              sample: null,
            },
          });
        }
        pools.push(pool);
      } catch (error) {
        if (!(error instanceof QuizPoolError)) throw error;
        notices.push(`unavailable:${mode}`);
      }
    }
    for (let round = 0; round < 3; round++)
      for (const pool of pools)
        if (pool[round] && practice.length < count) practice.push(pool[round]!);
  }
  // Approved links influence order only; drafts never create a pedagogical claim.
  const learned = new Set(
    steps.filter((s) => s.phase === "learn").map((s) => studyRefKey(s.ref)),
  );
  const links = await db
    .prepare(
      "SELECT question_ref,concept_ref FROM content_learning_links WHERE learning_track=? AND status='approved'",
    )
    .bind(profile.learning_track)
    .all<{ question_ref: string; concept_ref: string }>();
  const linked = new Set(
    (links.results ?? [])
      .filter((l) => learned.has(l.concept_ref))
      .map((l) => l.question_ref),
  );
  practice.sort(
    (a, b) =>
      Number(linked.has(studyRefKey(b.ref))) -
      Number(linked.has(studyRefKey(a.ref))),
  );
  const offset = cryptoRandomIndex(4);
  practice.forEach((step, i) => {
    if (step.mode === "choice" && step.solution.answer)
      step.choices = buildBalancedChoices(
        step.solution.answer,
        step.choices.filter((c) => c !== step.solution.answer),
        rotatingAnswerIndex(offset, i),
      );
  });
  const previousRefs = new Set(
    steps.filter((s) => s.phase === "retry").map((s) => studyRefKey(s.ref)),
  );
  steps.push(...practice.filter((s) => !previousRefs.has(studyRefKey(s.ref))));
  if (!practice.length) notices.push("no-practice");
  else if (!linked.size) notices.push("no-links");
  return { steps, notices };
}
