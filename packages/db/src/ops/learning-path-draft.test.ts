import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { buildContentSeedPlan } from "../seed/content-manifest.js";
import {
  buildLearningPathDraftPlan,
  buildLearningPathLessonPlan,
  resolveLearningConcept,
  LEARNING_PATH_VERSION,
} from "../seed/learning-path-draft.js";
import { CONCEPTS } from "../content/learning-path-2026-10-11/data.js";
import {
  detectD1BackupSchemaProfile,
  tablesForPhase,
  D1_BACKUP_SCHEMA_QUERY,
} from "./d1-tables.js";
import { learningPathReadiness } from "./learning-path-readiness.js";

function database(profile = "0031") {
  const db = new DatabaseSync(":memory:");
  const directory = new URL("../../drizzle-v2/", import.meta.url);
  for (const name of readdirSync(directory)
    .filter((n) => /^00\d\d_.*\.sql$/.test(n) && n.slice(0, 4) <= profile)
    .sort())
    db.exec(
      readFileSync(new URL(name, directory), "utf8").replaceAll(
        "--> statement-breakpoint",
        "",
      ),
    );
  db.exec(buildContentSeedPlan().statements.join("\n"));
  return db;
}
function execute(db: DatabaseSync, statements: string[]) {
  db.exec("BEGIN");
  try {
    for (const sql of statements) db.exec(sql);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
// 강성호 2026-10-11: 아래 lookup 교체는 저장 계약 테스트 전용이다. 문항 의미 연결/검수 증명이 아니다.
function syntheticStorageConcepts(db: DatabaseSync) {
  const positions = new Map<string, number>();
  return CONCEPTS.map((concept) => {
    if (concept.track === "topik-ko") return concept;
    const tables = {
      vocab: ["vocab", "ja", "level"],
      grammar: ["grammar", "pattern", "level"],
      kanji: ["kanji", "char", "jlpt_level"],
      sentence: ["sentences", "ja", "level"],
    } as const;
    const type = concept.lookup.type as keyof typeof tables,
      [table, column, levelColumn] = tables[type];
    const key = concept.level + ":" + type,
      index = positions.get(key) ?? 0;
    positions.set(key, index + 1);
    const rows = db
      .prepare(
        `SELECT ${column} value FROM ${table} WHERE ${levelColumn}=? ORDER BY id LIMIT 5`,
      )
      .all(concept.level);
    return {
      ...concept,
      lookup: { ...concept.lookup, value: String(rows[index]!.value) },
    };
  });
}
test("actual content lookups fail closed before any write (not a content approval)", () => {
  const db = database();
  try {
    const missing = CONCEPTS.filter((concept) => {
      try {
        resolveLearningConcept(db, concept);
        return false;
      } catch {
        return true;
      }
    });
    assert.equal(missing.length, 31);
    const readiness = learningPathReadiness(db);
    assert.equal(readiness.content_ready, false);
    assert.equal(readiness.lookup_failures.length, 31);
    assert.equal(readiness.independent_reviews.length, 2);
    assert.ok(readiness.independent_reviews.every((r) => !r.passed));
    assert.throws(() => buildLearningPathDraftPlan(db), /Missing strict-level/);
    assert.equal(
      db.prepare("SELECT count(*) n FROM learning_lessons").get()?.n,
      0,
    );
    assert.equal(
      db
        .prepare(
          "SELECT count(*) n FROM content_quality_audits WHERE content_version=?",
        )
        .get(LEARNING_PATH_VERSION)?.n,
      0,
    );
  } finally {
    db.close();
  }
});
test("0030 records survive additive 0031 without inferred history or reward changes", () => {
  const db = database("0030");
  try {
    db.exec(
      "INSERT INTO users(id,email,display_name) VALUES('upgrade-test','upgrade@example.invalid','Fixture');",
    );
    db.exec(
      "INSERT INTO daily_logs(user_id,date,notes) VALUES('upgrade-test','2026-10-10','preserve');",
    );
    db.exec(
      "INSERT INTO learning_profiles(user_id,learning_track,target_level,instruction_language,daily_minutes,timezone,updated_at) VALUES('upgrade-test','jlpt-ja','N3','ko',20,'Asia/Seoul',1);",
    );
    db.exec(
      "INSERT INTO study_sessions(id,user_id,learning_track,level,daily_minutes,status,request_id,mode,created_at,updated_at) VALUES('old-session','upgrade-test','jlpt-ja','N3',20,'paused','old-request','quick',1,1);",
    );
    db.exec(
      "INSERT INTO study_steps(id,session_id,ordinal,phase,content_ref,content_type,content_id,section,level,public_json,solution_json) VALUES('old-step','old-session',0,'learn','jlpt-ja:vocab:1:old-version','vocab','1','vocab','N3','{}','{}');",
    );
    db.exec(
      "INSERT INTO learning_annotations(user_id,learning_track,scope,ref,text,revision,updated_at) VALUES('upgrade-test','jlpt-ja','day','2026-10-10','memo',2,1);",
    );
    db.exec(
      "INSERT INTO srs_cards(user_id,learning_track,item_type,item_id,due_at,reps) VALUES('upgrade-test','jlpt-ja','vocab',1,'2026-10-12T01:00:00Z',7);",
    );
    const baseline = new Map(
      tablesForPhase("all", "0030").map((t) => [
        t.name,
        db
          .prepare(`SELECT * FROM ${t.name}`)
          .all()
          .map((row) => ({ ...row })),
      ]),
    );
    db.exec(
      readFileSync(
        new URL("../../drizzle-v2/0031_learning_lessons.sql", import.meta.url),
        "utf8",
      ),
    );
    for (const [table, rows] of baseline) {
      const after = db
        .prepare(`SELECT * FROM ${table}`)
        .all()
        .map((row) => {
          if (table === "study_sessions") {
            assert.equal(row.lesson_id, null);
            assert.equal(row.lesson_version, null);
            const { lesson_id, lesson_version, ...old } = row;
            return old;
          }
          return { ...row };
        });
      assert.deepEqual(after, rows, table);
    }
    assert.equal(
      db.prepare("SELECT count(*) n FROM learning_lessons").get()?.n,
      0,
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    assert.equal(
      detectD1BackupSchemaProfile(
        db
          .prepare(D1_BACKUP_SCHEMA_QUERY)
          .all()
          .map((r) => String(r.name)),
      ),
      "0031",
    );
  } finally {
    db.close();
  }
});
test("0031 synthetic storage contract: 440 hidden items, 220 lessons, 880 entries and 440 draft links", () => {
  const db = database();
  try {
    const concepts = syntheticStorageConcepts(db);
    const baseline = db
      .prepare(
        "SELECT (SELECT count(*) FROM vocab) vocab,(SELECT count(*) FROM grammar) grammar,(SELECT count(*) FROM topik_owner_authored_curriculum_items) owner",
      )
      .get();
    execute(db, buildLearningPathDraftPlan(db, concepts).statements);
    execute(db, buildLearningPathLessonPlan(db, concepts).statements);
    assert.equal(
      db
        .prepare(
          "SELECT count(*) n FROM jlpt_practice_questions WHERE bank_version=? AND is_published=0",
        )
        .get(LEARNING_PATH_VERSION)?.n,
      200,
    );
    assert.equal(
      db
        .prepare(
          "SELECT count(*) n FROM content_quality_audits WHERE content_version=? AND release_state=? AND author_review_status=? AND adversarial_review_status=?",
        )
        .get(LEARNING_PATH_VERSION, "draft", "pending", "pending")?.n,
      440,
    );
    assert.equal(
      db
        .prepare("SELECT count(*) n FROM learning_lessons WHERE is_published=0")
        .get()?.n,
      220,
    );
    assert.equal(
      db.prepare("SELECT count(*) n FROM learning_lesson_entries").get()?.n,
      880,
    );
    assert.equal(
      db
        .prepare("SELECT count(*) n FROM content_learning_links WHERE status=?")
        .get("draft")?.n,
      440,
    );
    assert.equal(
      db
        .prepare(
          "SELECT count(*) n FROM content_speech_bindings WHERE item_id IN (SELECT content_id FROM content_quality_audits WHERE content_version=?)",
        )
        .get(LEARNING_PATH_VERSION)?.n,
      48,
    );
    const after = db
      .prepare(
        "SELECT (SELECT count(*) FROM vocab) vocab,(SELECT count(*) FROM grammar) grammar,(SELECT count(*) FROM topik_owner_authored_curriculum_items) owner",
      )
      .get()!;
    assert.equal(after.vocab, baseline!.vocab);
    assert.equal(after.grammar, baseline!.grammar);
    assert.equal(Number(after.owner), Number(baseline!.owner) + 240);
    assert.equal(
      db
        .prepare("SELECT count(*) n FROM learning_lessons WHERE is_published=1")
        .get()?.n,
      0,
    );
    execute(db, buildLearningPathDraftPlan(db, concepts).statements);
    execute(db, buildLearningPathLessonPlan(db, concepts).statements);
    assert.equal(
      db.prepare("SELECT count(*) n FROM learning_lessons").get()?.n,
      220,
    );
    assert.equal(
      db.prepare("SELECT count(*) n FROM learning_lesson_entries").get()?.n,
      880,
    );
    assert.equal(
      db.prepare("SELECT count(*) n FROM content_learning_links").get()?.n,
      440,
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    const names = db
      .prepare(D1_BACKUP_SCHEMA_QUERY)
      .all()
      .map((row) => String(row.name));
    assert.equal(detectD1BackupSchemaProfile(names), "0031");
    assert.equal(tablesForPhase("all", "0031").length, 74);
    assert.throws(
      () => db.prepare("UPDATE learning_lessons SET is_published=1").run(),
      /lesson release\/link gate failed/,
    );
  } finally {
    db.close();
  }
});
test("strict lookup, immutable collisions and partial backup fail closed", () => {
  const db = database();
  try {
    const concept = CONCEPTS.find(
      (c) => c.track === "jlpt-ja" && c.level === "N3",
    )!;
    assert.throws(
      () =>
        resolveLearningConcept(db, {
          ...concept,
          lookup: { ...concept.lookup, value: "missing-test-only" },
        }),
      /Missing strict-level/,
    );
    const concepts = syntheticStorageConcepts(db);
    execute(db, buildLearningPathDraftPlan(db, concepts).statements);
    db.prepare(
      "UPDATE jlpt_practice_questions SET explanation_ko=? WHERE id=(SELECT id FROM jlpt_practice_questions WHERE bank_version=? LIMIT 1)",
    ).run("changed synthetic collision", LEARNING_PATH_VERSION);
    assert.throws(
      () => buildLearningPathDraftPlan(db, concepts),
      /Immutable draft collision/,
    );
    const names = tablesForPhase("all", "0030").map((t) => t.name);
    assert.throws(
      () => detectD1BackupSchemaProfile([...names, "learning_lessons"]),
      /Partial 0031/,
    );
  } finally {
    db.close();
  }
});
