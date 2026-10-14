import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { CONCEPTS, ITEMS } from "../content/learning-path-2026-10-11/data.js";
import type { ConceptSpec } from "../content/learning-path-2026-10-11/concept-specs.js";
import {
  buildLearningPathQualityReport,
  LEARNING_PATH_VALIDATOR_VERSION,
} from "../ops/learning-path-quality.js";
import {
  studyContentVersionInput,
  studyRefKey,
  type StudyRef,
} from "../../../shared/src/learning-experience.js";
import { esc } from "./utils.js";

export const LEARNING_PATH_VERSION = "learning-path-v1-2026-10-11";
const VERSION = LEARNING_PATH_VERSION,
  ASSET = "learning-path-2026-10-11";
type Row = Record<string, unknown>;
type Db = { prepare(sql: string): { all(...args: unknown[]): Row[] } };
const sha = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const release = (track: string) =>
  `learning-path-${track === "jlpt-ja" ? "jlpt" : "topik"}-v1-2026-10-11`;
const version = (row: Row) => sha(studyContentVersionInput(row));
const sqlValue = (value: unknown) =>
  value == null
    ? "NULL"
    : typeof value === "number"
      ? String(value)
      : esc(String(value));
function insert(db: Db, table: string, row: Row, key = "id"): string {
  const existing = db
    .prepare(`SELECT * FROM ${table} WHERE ${key}=?`)
    .all(row[key])[0];
  if (
    existing &&
    Object.entries(row).some(([column, value]) => existing[column] !== value)
  )
    throw new Error(
      `Immutable draft collision: ${table}:${String(row[key])}; create a new version`,
    );
  return `INSERT OR IGNORE INTO ${table} (${Object.keys(row).join(",")}) VALUES (${Object.values(row).map(sqlValue).join(",")});`;
}
export function resolveLearningConcept(db: Db, concept: ConceptSpec): StudyRef {
  const tables = {
    vocab: ["vocab", "ja", "level"],
    grammar: ["grammar", "pattern", "level"],
    kanji: ["kanji", "char", "jlpt_level"],
    sentence: ["sentences", "ja", "level"],
    "topik-owner-item": [
      "topik_owner_authored_curriculum_items",
      "id",
      "target_grade",
    ],
  } as const;
  const [table, column, levelColumn] = tables[concept.lookup.type];
  const row = db
    .prepare(
      `SELECT * FROM ${table} WHERE ${column}=? AND ${levelColumn}=? ORDER BY id`,
    )
    .all(
      concept.lookup.value,
      concept.track === "topik-ko" ? Number(concept.level) : concept.level,
    )[0];
  if (!row)
    throw new Error(
      `Missing strict-level concept lookup: ${concept.key} (${concept.lookup.value})`,
    );
  return {
    track: concept.track,
    type: concept.lookup.type,
    id: String(row.id),
    version: version(row),
  };
}

/** 강성호 2026-10-11: reviewer 서명·공개를 만들지 않는 additive 로컬 초안 계획. */
export function buildLearningPathDraftPlan(
  db: Db,
  concepts: readonly ConceptSpec[] = CONCEPTS,
) {
  const quality = buildLearningPathQualityReport(ITEMS, concepts);
  if (!quality.passed)
    throw new Error(
      `Learning path structure failed: ${quality.failures[0]?.message}`,
    );
  concepts.forEach((concept) => resolveLearningConcept(db, concept));
  const source_evidence_sha256 = sha(
      readFileSync(
        new URL(
          "../content/learning-path-source-intake-2026-10-11.json",
          import.meta.url,
        ),
      ),
    ),
    draft_sha256 = quality.draft_sha256;
  const statements: string[] = [];
  for (const track of ["jlpt-ja", "topik-ko"])
    statements.push(
      insert(db, "content_releases", {
        id: release(track),
        learning_track: track,
        content_version: VERSION,
        release_state: "draft",
        manifest_sha256: draft_sha256,
        parser_version: LEARNING_PATH_VALIDATOR_VERSION,
      }),
    );
  // self-authored-fixture는 기존 schema enum 이름이며 검수나 출판 승인 의미가 아니다.
  statements.push(
    insert(db, "content_source_assets", {
      id: ASSET,
      asset_kind: "self-authored-fixture",
      source_url:
        "https://github.com/kordokrip/JLPT/tree/main/packages/db/src/content/learning-path-2026-10-11",
      license_id: "LicenseRef-self-authored",
      license_url:
        "https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md",
      attribution_text:
        "Self-authored learning-path drafts; external facts attributed separately",
      allowed_use: "self-authored personal learning; unpublished draft",
      source_sha256: draft_sha256,
      selection_reason: "Original drafts; not independently approved",
    }),
  );
  // owner의 legacy no-audit 공개 규칙을 피하도록 pending 감사부터 삽입한다.
  for (const item of ITEMS)
    statements.push(
      insert(db, "content_quality_audits", {
        id: `quality-audit:${VERSION}:${item.id}`,
        learning_track: item.track,
        content_type: item.track === "jlpt-ja" ? "jlpt-quiz" : "topik-owner",
        content_id: item.id,
        content_version: VERSION,
        evidence_sha256: source_evidence_sha256,
        validator_version: LEARNING_PATH_VALIDATOR_VERSION,
        automated_status: "passed",
        author_review_status: "pending",
        adversarial_review_status: "pending",
        author_reviewer: "pending-review-a",
        adversarial_reviewer: "pending-review-b",
        release_state: "draft",
        details_json: JSON.stringify({
          draft_sha256,
          source_evidence_sha256,
          publication: "blocked until independent reviews and G0-G4",
        }),
        checked_at: "2026-10-11",
      }),
    );
  for (const item of ITEMS) {
    const concept = concepts.find((c) => c.key === item.concept_key)!;
    if (item.track === "jlpt-ja") {
      statements.push(
        insert(db, "jlpt_practice_questions", {
          id: item.id,
          learning_track: item.track,
          level: item.level,
          mode: item.section,
          skill: item.section,
          difficulty: item.difficulty,
          prompt_ko: item.question.ko,
          prompt_ja: item.question.ja,
          prompt_en: item.question.en,
          choices_json: JSON.stringify(item.choices),
          answer_index: item.answer_index,
          explanation_ko: item.explanation.ko,
          explanation_ja: item.explanation.ja,
          explanation_en: item.explanation.en,
          audio_script_ja: item.audio_script ?? null,
          source_code: "LEARNING-PATH-2026-10-11",
          source_evidence_sha256,
          bank_version: VERSION,
          is_published: 0,
        }),
      );
      continue;
    }
    const unitId = `learning-path-unit:${item.id}`,
      stable = `topik-ko:owner-item:${item.id}:${VERSION}`;
    statements.push(
      insert(db, "topik_owner_authored_curriculum_units", {
        id: unitId,
        target_grade: Number(item.level),
        stable_ref: `topik-ko:owner-unit:${item.id}:${VERSION}`,
        section: item.section,
        title_ko: concept.title.ko,
        title_ja: concept.title.ja,
        title_en: concept.title.en,
        source_asset_id: ASSET,
      }),
    );
    const answer =
      item.section === "writing"
        ? {
            rubric_ko: item.rubric!.ko,
            rubric_ja: item.rubric!.ja,
            rubric_en: item.rubric!.en,
            sample_answer_ko: item.sample!.ko,
            sample_answer_ja: item.sample!.ja,
            sample_answer_en: item.sample!.en,
          }
        : {
            choices: item.choices!.map((c) => c.ko),
            choices_i18n: item.choices,
            answer_index: item.answer_index,
          };
    statements.push(
      insert(db, "topik_owner_authored_curriculum_items", {
        id: item.id,
        unit_id: unitId,
        target_grade: Number(item.level),
        stable_ref: stable,
        item_type: item.section,
        prompt_ko: item.question.ko,
        prompt_ja: item.question.ja,
        prompt_en: item.question.en,
        answer_json: JSON.stringify(answer),
        explanation_ko: item.explanation.ko,
        explanation_ja: item.explanation.ja,
        explanation_en: item.explanation.en,
        source_asset_id: ASSET,
        audio_required: item.section === "listening" ? 1 : 0,
        audio_text_ko: item.audio_script ?? null,
      }),
    );
    if (item.section === "listening") {
      statements.push(
        insert(
          db,
          "learning_content_stable_refs",
          {
            stable_ref: stable,
            learning_track: item.track,
            item_type: "topik-owner-item",
            item_id: item.id,
            level_tag: `grade-${item.level}`,
            source_asset_id: ASSET,
          },
          "stable_ref",
        ),
      );
      statements.push(
        insert(db, "content_speech_bindings", {
          id: `speech-binding:${stable}`,
          stable_ref: stable,
          item_type: "topik-owner-item",
          item_id: item.id,
          language: "ko",
          speech_role: "listening",
          provider: "google-browser",
          binding_state: "ready",
          text_source: "audio-script",
          unavailable_reason: null,
        }),
      );
    }
  }
  return {
    statements,
    counts: { items: 440, audits: 440 },
    draft_sha256,
    source_evidence_sha256,
  };
}

/** 강성호 2026-10-11: 실제 삽입된 row의 버전으로 연결하며 공개는 별도 gate에서만 수행한다. */
export function buildLearningPathLessonPlan(
  db: Db,
  selectedConcepts: readonly ConceptSpec[] = CONCEPTS,
) {
  const quality = buildLearningPathQualityReport(ITEMS, selectedConcepts);
  if (!quality.passed) throw new Error("Learning path structure failed");
  const sourceHash = sha(
    readFileSync(
      new URL(
        "../content/learning-path-source-intake-2026-10-11.json",
        import.meta.url,
      ),
    ),
  );
  const statements: string[] = [];
  for (const track of ["jlpt-ja", "topik-ko"] as const)
    for (const level of track === "jlpt-ja"
      ? ["N5", "N4", "N3", "N2", "N1"]
      : ["1", "2", "3", "4", "5", "6"]) {
      const concepts = selectedConcepts.filter(
        (c) => c.track === track && c.level === level,
      );
      for (let ordinal = 1; ordinal <= 20; ordinal++) {
        const pair = concepts.slice(
            ((ordinal - 1) % 10) * 2,
            ((ordinal - 1) % 10) * 2 + 2,
          ),
          variant = Math.floor((ordinal - 1) / 10);
        const id = `learning-lesson:${track}:${level}:${ordinal}`;
        const row = {
          id,
          version: VERSION,
          learning_track: track,
          level,
          ordinal,
          title_ko: pair.map((c) => c.title.ko).join(" · "),
          title_ja: pair.map((c) => c.title.ja).join("・"),
          title_en: pair.map((c) => c.title.en).join(" / "),
          release_id: release(track),
          is_published: 0,
        };
        const old = db
          .prepare("SELECT * FROM learning_lessons WHERE id=? AND version=?")
          .all(id, VERSION)[0];
        if (
          old &&
          Object.entries(row).some(([key, value]) => old[key] !== value)
        )
          throw new Error(`Lesson draft collision: ${id}`);
        statements.push(
          `INSERT OR IGNORE INTO learning_lessons(${Object.keys(row).join(",")}) VALUES(${Object.values(row).map(sqlValue).join(",")});`,
        );
        pair.forEach((concept, index) => {
          const conceptRef = resolveLearningConcept(db, concept),
            item = ITEMS.filter((q) => q.concept_key === concept.key)[variant]!;
          const questionRow = db
            .prepare(
              `SELECT * FROM ${track === "jlpt-ja" ? "jlpt_practice_questions" : "topik_owner_authored_curriculum_items"} WHERE id=?`,
            )
            .all(item.id)[0];
          if (!questionRow) throw new Error(`Question not seeded: ${item.id}`);
          const questionRef: StudyRef = {
            track,
            type: track === "jlpt-ja" ? "jlpt-practice" : "topik-owner-item",
            id: item.id,
            version: track === "jlpt-ja" ? VERSION : version(questionRow),
          };
          for (const [position, phase, ref, cue] of [
            [index, "learn", conceptRef, concept.cue],
            [index + 2, "practice", questionRef, { ko: "", ja: "", en: "" }],
          ] as const) {
            const values = [
              id,
              VERSION,
              position,
              phase,
              studyRefKey(ref),
              cue.ko,
              cue.ja,
              cue.en,
            ];
            const entry = db
              .prepare(
                "SELECT * FROM learning_lesson_entries WHERE lesson_id=? AND lesson_version=? AND ordinal=?",
              )
              .all(id, VERSION, position)[0];
            if (
              entry &&
              (entry.content_ref !== studyRefKey(ref) ||
                entry.cue_ko !== cue.ko ||
                entry.cue_ja !== cue.ja ||
                entry.cue_en !== cue.en)
            )
              throw new Error(`Entry draft collision: ${id}/${position}`);
            if (!entry)
              statements.push(
                `INSERT INTO learning_lesson_entries(lesson_id,lesson_version,ordinal,phase,content_ref,cue_ko,cue_ja,cue_en) VALUES(${values.map(sqlValue).join(",")});`,
              );
          }
          const link = db
            .prepare(
              "SELECT * FROM content_learning_links WHERE learning_track=? AND question_ref=? AND concept_ref=?",
            )
            .all(track, studyRefKey(questionRef), studyRefKey(conceptRef))[0];
          if (link && link.evidence_sha256 !== sourceHash)
            throw new Error(`Link evidence changed: ${item.id}`);
          if (!link)
            statements.push(
              `INSERT INTO content_learning_links(learning_track,question_ref,concept_ref,evidence_sha256,reviewer_a,reviewer_b,status,created_at) VALUES(${[track, studyRefKey(questionRef), studyRefKey(conceptRef), sourceHash, "pending-review-a", "pending-review-b", "draft", 0].map(sqlValue).join(",")});`,
            );
        });
      }
    }
  return {
    statements,
    counts: { lessons: 220, entries: 880, links: 440 },
    draft_sha256: quality.draft_sha256,
    source_evidence_sha256: sourceHash,
  };
}
