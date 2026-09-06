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
type ContentIdentity = Pick<StudyRef, "type" | "id">;
const canonicalTables: Partial<Record<StudyRef["type"], string>> = {
  vocab: "vocab",
  grammar: "grammar",
  kanji: "kanji",
  sentence: "sentences",
  sysprog: "sysprog_terms",
  homophone: "homophone_pairs",
};
const identityKey = (ref: ContentIdentity) => `${ref.type}:${ref.id}`;
const publicationKey = (type: StudyRef["type"], id: string, version: string) =>
  JSON.stringify([type, id, type === "topik-owner-item" ? "" : version]);
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
  const table = canonicalTables[type];
  if (!table || !/^\d+$/.test(id)) return null;
  const row = await db
    .prepare(`SELECT * FROM ${table} WHERE id=?`)
    .bind(Number(id))
    .first<Row>();
  if (!row) return null;
  return canonicalRowContent(db, type, id, row);
}

async function canonicalRowContent(
  db: DB,
  type: StudyRef["type"],
  id: string,
  row: Row,
): Promise<DraftStep | null> {
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

/** One D1 batch for all represented canonical types; retain full-row hashes. */
async function canonicalContents(
  db: DB,
  refs: readonly ContentIdentity[],
): Promise<Map<string, DraftStep>> {
  const groups = new Map<StudyRef["type"], Set<string>>();
  for (const ref of refs) {
    if (!canonicalTables[ref.type] || !/^\d+$/.test(ref.id)) continue;
    if (!groups.has(ref.type)) groups.set(ref.type, new Set());
    groups.get(ref.type)!.add(ref.id);
  }
  const entries = [...groups];
  if (!entries.length) return new Map();
  const results = await db.batch<Row>(
    entries.map(([type, ids]) =>
      db
        .prepare(
          `SELECT * FROM ${canonicalTables[type]} WHERE id IN (${[...ids].map(() => "?").join(",")})`,
        )
        .bind(...[...ids].map(Number)),
    ),
  );
  const loaded = new Map<string, DraftStep>();
  await Promise.all(
    entries.flatMap(([type, ids], index) =>
      (results[index]?.results ?? []).map(async (row) => {
        const item = await canonicalRowContent(db, type, String(row.id), row);
        if (item)
          for (const id of ids) {
            if (Number(id) === Number(row.id))
              loaded.set(identityKey({ type, id }), {
                ...item,
                ref: { ...item.ref, id },
              });
          }
      }),
    ),
  );
  return loaded;
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
  return ownerRowContent(row, id, language);
}

async function ownerRowContent(
  row: Row,
  id: string,
  language: string,
): Promise<DraftStep> {
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

async function ownerContents(
  db: DB,
  ids: readonly string[],
  language: string,
): Promise<Map<string, DraftStep>> {
  if (!ids.length) return new Map();
  const result = await db
    .prepare(
      `SELECT i.*,b.binding_state FROM topik_owner_authored_curriculum_items i
    LEFT JOIN content_speech_bindings b ON b.item_type='topik-owner-item' AND b.item_id=i.id AND b.language='ko'
    AND b.speech_role=CASE WHEN i.item_type='listening' THEN 'listening' ELSE 'pronunciation' END AND b.provider='google-browser'
    WHERE i.id IN (${ids.map(() => "?").join(",")}) AND ${publishedOwnerItem("i")}`,
    )
    .bind(...ids)
    .all<Row>();
  const items = await Promise.all(
    (result.results ?? []).map((row) =>
      ownerRowContent(row, String(row.id), language),
    ),
  );
  return new Map(items.map((item) => [item.ref.id, item]));
}

/** Preserve every publication predicate, with bounded batches instead of one RTT per step. */
export async function contentsStillPublished(
  db: DB,
  refs: readonly StudyRef[],
): Promise<boolean[]> {
  const canonical = refs.filter((ref) => canonicalTables[ref.type]);
  const groups = new Map<StudyRef["type"], Set<string>>();
  for (const ref of refs.filter((ref) =>
    ["jlpt-practice", "topik-practice", "topik-owner-item"].includes(ref.type),
  )) {
    if (!groups.has(ref.type)) groups.set(ref.type, new Set());
    groups.get(ref.type)!.add(ref.id);
  }
  const entries = [...groups];
  const statements = entries.map(([type, ids]) => {
    const placeholders = [...ids].map(() => "?").join(",");
    if (type === "topik-owner-item")
      return db
        .prepare(
          `SELECT i.id FROM topik_owner_authored_curriculum_items i WHERE i.id IN (${placeholders}) AND ${publishedOwnerItem("i")}`,
        )
        .bind(...ids);
    const table =
      type === "jlpt-practice"
        ? "jlpt_practice_questions"
        : "topik_practice_questions";
    return db
      .prepare(
        `SELECT id,bank_version FROM ${table} WHERE id IN (${placeholders}) AND is_published=1`,
      )
      .bind(...ids);
  });
  const [canonicalRows, published] = await Promise.all([
    canonicalContents(db, canonical),
    statements.length ? db.batch<Row>(statements) : Promise.resolve([]),
  ]);
  const available = new Set<string>();
  entries.forEach(([type], index) => {
    for (const row of published[index]?.results ?? [])
      available.add(
        publicationKey(type, String(row.id), String(row.bank_version)),
      );
  });
  return refs.map((ref) =>
    canonicalTables[ref.type]
      ? canonicalRows.has(identityKey(ref))
      : available.has(publicationKey(ref.type, ref.id, ref.version)),
  );
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
  const due = (dueRows.results ?? []).slice(0, topik ? 20 : count);
  const dueContent = topik
    ? await ownerContents(
        db,
        due.map((row) => String(row.item_id)),
        lang,
      )
    : await canonicalContents(
        db,
        due.map((row) => ({
          type: str(row.item_type) as StudyRef["type"],
          id: String(row.item_id),
        })),
      );
  for (const row of due) {
    if (steps.length >= count) break;
    const item = topik
      ? dueContent.get(String(row.item_id))
      : dueContent.get(
          identityKey({
            type: str(row.item_type) as StudyRef["type"],
            id: String(row.item_id),
          }),
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
    const selected = rows.results ?? [];
    const items = await ownerContents(
      db,
      selected.map((row) => row.id),
      lang,
    );
    for (const row of selected) {
      const item = items.get(row.id);
      if (item) steps.push(item);
    }
  } else {
    const types = [
      ["vocab", "vocab", "level"],
      ["grammar", "grammar", "level"],
      ["kanji", "kanji", "jlpt_level"],
      ["sentence", "sentences", "level"],
    ] as const;
    const rowsByType = await db.batch<Row>(
      types.map(([type, table, column]) =>
        db
          .prepare(
            `SELECT * FROM ${table} WHERE ${column}=? AND NOT EXISTS
        (SELECT 1 FROM srs_cards c WHERE c.user_id=? AND c.learning_track='jlpt-ja' AND c.item_type=? AND c.item_id=${table}.id) ORDER BY id LIMIT ?`,
          )
          .bind(level, userId, type, Math.ceil(newLimit / 4)),
      ),
    );
    const pools = await Promise.all(
      types.map(async ([type], index) => {
        const items = await Promise.all(
          (rowsByType[index]?.results ?? []).map((row) =>
            canonicalRowContent(db, type, String(row.id), row),
          ),
        );
        return items.filter((item): item is DraftStep => item !== null);
      }),
    );
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
    const modes = [
      "vocab_mc",
      "kanji_reading",
      "listening",
      "grammar_fill",
    ] as const;
    const generated = await Promise.all(
      modes.map(async (mode) => {
        try {
          const questions = await generateQuizQuestions(db, userId, {
            level: level as "N1",
            mode,
            count: 3,
            strategy: "weakest",
          });
          return { mode, questions };
        } catch (error) {
          if (!(error instanceof QuizPoolError)) throw error;
          return { mode, questions: [], unavailable: true };
        }
      }),
    );
    // Keep mode/round order, but hydrate only the five (or three) chosen
    // questions, not all twelve candidates discarded by the old loop.
    const pools = generated.map(({ mode, questions, unavailable }) => {
      if (unavailable) notices.push(`unavailable:${mode}`);
      return questions.map((q) => {
        const type: StudyRef["type"] =
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
        return { mode, q, type };
      });
    });
    const selected: Array<(typeof pools)[number][number]> = [];
    for (let round = 0; round < 3; round++)
      for (const pool of pools)
        if (pool[round] && selected.length < count) selected.push(pool[round]!);
    const staticIds = [
      ...new Set(
        selected
          .filter((item) => item.type === "jlpt-practice")
          .map((item) => String(item.q.item_id)),
      ),
    ];
    const [concepts, staticRows] = await Promise.all([
      canonicalContents(
        db,
        selected.map(({ type, q }) => ({ type, id: String(q.item_id) })),
      ),
      staticIds.length
        ? db
            .prepare(
              `SELECT * FROM jlpt_practice_questions WHERE id IN (${staticIds.map(() => "?").join(",")}) AND is_published=1`,
            )
            .bind(...staticIds)
            .all<Row>()
        : Promise.resolve({ results: [] as Row[] }),
    ]);
    const sources = new Map(
      (staticRows.results ?? []).map((row) => [String(row.id), row]),
    );
    for (const { mode, q, type } of selected) {
      const source =
        type === "jlpt-practice" ? sources.get(String(q.item_id)) : undefined;
      const concept = concepts.get(
        identityKey({ type, id: String(q.item_id) }),
      );
      practice.push({
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
