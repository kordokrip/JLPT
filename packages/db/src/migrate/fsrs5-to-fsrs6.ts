/**
 * packages/db/src/migrate/fsrs5-to-fsrs6.ts
 *
 * Phase 7-A: FSRS v5 → v6 스키마 마이그레이션
 *
 * 멱등(idempotent) 스크립트 — 이미 존재하는 컬럼/테이블은 무시.
 * Cloudflare D1 은 ALTER TABLE ... ADD COLUMN IF NOT EXISTS 를 지원하지 않으므로
 * 시도 후 ALREADY EXISTS 에러를 무시하는 방식으로 처리.
 *
 * 사용법:
 *   npx wrangler d1 execute <DB_NAME> --file=packages/db/src/migrate/fsrs5-to-fsrs6.sql
 *
 * 또는 코드에서 직접 실행:
 *   import { runMigration } from '@nihongo-n3/db/migrate/fsrs5-to-fsrs6'
 *   await runMigration(db)
 */

export interface D1Database {
  prepare(sql: string): { bind(...args: unknown[]): { run(): Promise<unknown> } };
  exec(sql: string): Promise<unknown>;
  batch(stmts: unknown[]): Promise<unknown>;
}

const ALTER_STATEMENTS = [
  // srs_cards — 학습 단계 인덱스 (FSRS v6 short-term 학습)
  `ALTER TABLE srs_cards ADD COLUMN learning_steps_idx INTEGER DEFAULT 0`,

  // srs_cards — 사용자별 목표 유지율
  `ALTER TABLE srs_cards ADD COLUMN desired_retention REAL DEFAULT 0.9`,

  // users — 개인화 FSRS 가중치 (W 최적화 결과)
  `ALTER TABLE users ADD COLUMN fsrs_weights TEXT`,

  // users — SRS 설정 JSON
  `ALTER TABLE users ADD COLUMN srs_settings TEXT`,

  // quiz_attempts — Phase 7-D 퀴즈 시스템 컬럼
  `ALTER TABLE quiz_attempts ADD COLUMN mode TEXT`,
  `ALTER TABLE quiz_attempts ADD COLUMN level TEXT`,
  `ALTER TABLE quiz_attempts ADD COLUMN questions_json TEXT`,
  `ALTER TABLE quiz_attempts ADD COLUMN started_at TEXT`,
  `ALTER TABLE quiz_attempts ADD COLUMN finished_at TEXT`,
];

/** D1Database 인스턴스에 대해 마이그레이션 실행 */
export async function runMigration(db: D1Database): Promise<{ applied: number; skipped: number }> {
  let applied = 0;
  let skipped = 0;

  for (const sql of ALTER_STATEMENTS) {
    try {
      await db.prepare(sql).bind().run();
      applied++;
      console.log(`[migrate] ✓  ${sql.slice(0, 60)}...`);
    } catch (err) {
      // "duplicate column name" or "already exists" → skip
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already exists')) {
        skipped++;
        console.log(`[migrate] –  (skip) ${sql.slice(0, 60)}...`);
      } else {
        throw err;
      }
    }
  }

  return { applied, skipped };
}

/** quiz_question_bank 테이블 생성 (없을 때만) */
export const CREATE_QUIZ_QUESTION_BANK = `
CREATE TABLE IF NOT EXISTS quiz_question_bank (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  mode        TEXT    NOT NULL,
  level       TEXT    NOT NULL,
  item_id     INTEGER NOT NULL,
  item_type   TEXT    NOT NULL,
  prompt      TEXT    NOT NULL,
  correct     TEXT    NOT NULL,
  distractors TEXT    NOT NULL,  -- JSON array
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
)`;

export async function createQuizQuestionBank(db: D1Database): Promise<void> {
  await db.prepare(CREATE_QUIZ_QUESTION_BANK).bind().run();
}
