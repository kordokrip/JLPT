-- packages/db/src/migrate/fsrs5-to-fsrs6.sql
-- Phase 7-A: FSRS v5 → v6 스키마 마이그레이션
-- 멱등 스크립트 — D1에서 직접 실행 가능
-- Usage: npx wrangler d1 execute <DB_NAME> --file=packages/db/src/migrate/fsrs5-to-fsrs6.sql

-- srs_cards: FSRS v6 short-term 학습 단계 인덱스
ALTER TABLE srs_cards ADD COLUMN learning_steps_idx INTEGER DEFAULT 0;

-- srs_cards: 사용자별 목표 유지율
ALTER TABLE srs_cards ADD COLUMN desired_retention REAL DEFAULT 0.9;

-- users: 개인화 FSRS 가중치 (W 최적화 결과, JSON array)
ALTER TABLE users ADD COLUMN fsrs_weights TEXT;

-- users: SRS 설정 (JSON)
ALTER TABLE users ADD COLUMN srs_settings TEXT;

-- quiz_attempts: Phase 7-D 퀴즈 시스템 컬럼
ALTER TABLE quiz_attempts ADD COLUMN mode TEXT;
ALTER TABLE quiz_attempts ADD COLUMN level TEXT;
ALTER TABLE quiz_attempts ADD COLUMN questions_json TEXT;
ALTER TABLE quiz_attempts ADD COLUMN started_at TEXT;
ALTER TABLE quiz_attempts ADD COLUMN finished_at TEXT;

-- quiz_question_bank: 사전 생성 문제 캐시 (선택)
CREATE TABLE IF NOT EXISTS quiz_question_bank (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  mode        TEXT    NOT NULL,
  level       TEXT    NOT NULL,
  item_id     INTEGER NOT NULL,
  item_type   TEXT    NOT NULL,
  prompt      TEXT    NOT NULL,
  correct     TEXT    NOT NULL,
  distractors TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
