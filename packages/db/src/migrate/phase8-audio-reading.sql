-- packages/db/src/migrate/phase8-audio-reading.sql
-- Phase 8: TTS 파이프라인 + 독해 시스템 마이그레이션
-- 멱등 스크립트 (실패 컬럼은 무시)

-- ─────────────────────────────────────────────────────────────────
-- A. TTS 파이프라인 보조 컬럼
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE sentences ADD COLUMN audio_generation_attempts INTEGER DEFAULT 0;
ALTER TABLE vocab     ADD COLUMN audio_generation_attempts INTEGER DEFAULT 0;
ALTER TABLE kanji     ADD COLUMN audio_generation_attempts INTEGER DEFAULT 0;
ALTER TABLE vocab     ADD COLUMN audio_r2_key TEXT;
ALTER TABLE kanji     ADD COLUMN audio_r2_key TEXT;

-- TTS 생성 로그 테이블
CREATE TABLE IF NOT EXISTS audio_generation_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  item_type  TEXT    NOT NULL CHECK(item_type IN ('sentence', 'vocab', 'kanji')),
  item_id    INTEGER NOT NULL,
  r2_key     TEXT,
  success    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audio_log_created ON audio_generation_log(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_audio_log_item ON audio_generation_log(item_type, item_id, created_at);

-- ─────────────────────────────────────────────────────────────────
-- D. 독해 시스템
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading_passages (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  level              TEXT    NOT NULL CHECK(level IN ('N5','N4','N3','N2')),
  genre              TEXT    NOT NULL CHECK(genre IN ('email','ad','essay','news','instruction','conversation','notice')),
  title_ja           TEXT    NOT NULL,
  body_ja            TEXT    NOT NULL,
  body_ko            TEXT    NOT NULL,
  word_count         INTEGER NOT NULL DEFAULT 0,
  vocab_ids          TEXT,             -- JSON array of vocab.id
  grammar_ids        TEXT,             -- JSON array of grammar.id
  audio_r2_key       TEXT,
  source_attribution TEXT,
  created_at         INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_passages_level_genre ON reading_passages(level, genre);

CREATE TABLE IF NOT EXISTS reading_questions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  passage_id     INTEGER NOT NULL REFERENCES reading_passages(id) ON DELETE CASCADE,
  question_ja    TEXT    NOT NULL,
  question_ko    TEXT    NOT NULL,
  choices_json   TEXT    NOT NULL,   -- JSON: ["...", "...", "...", "..."]
  answer_index   INTEGER NOT NULL,   -- 0-based
  explanation_ko TEXT
);
CREATE INDEX IF NOT EXISTS idx_questions_passage ON reading_questions(passage_id);

-- 독해 퀴즈 제출 시 quiz_attempts.mode = 'reading_mc' 사용 (기존 테이블 재사용)
