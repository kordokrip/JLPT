-- FILE: packages/db/drizzle/0000_init.sql
--
-- nihongo-n3 D1 초기 마이그레이션
-- drizzle-kit generate 출력 기반 + FTS5 가상 테이블 + 트리거 수동 추가
--
-- 적용: wrangler d1 migrations apply nihongo-n3-prod --local|--remote
-- 주의: D1의 외래키 강제 적용은 PRAGMA foreign_keys = ON (연결별 설정 필요)
--       Drizzle 클라이언트에서는 .pragma("foreign_keys = ON") 으로 활성화.

PRAGMA journal_mode = WAL;

-- ═══════════════════════════════════════════════════════════════════
-- 콘텐츠 계열
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `sources` (
  `id`         INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `code`       TEXT    NOT NULL,
  `title`      TEXT    NOT NULL,
  `file_path`  TEXT    NOT NULL,
  `version`    TEXT    NOT NULL DEFAULT '1.0.0',
  `created_at` INTEGER NOT NULL DEFAULT (unixepoch()),
  `updated_at` INTEGER NOT NULL DEFAULT (unixepoch()),
  CONSTRAINT sources_code_uk UNIQUE (`code`)
);

CREATE TABLE IF NOT EXISTS `categories` (
  `id`         INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `source_id`  INTEGER NOT NULL REFERENCES `sources`(`id`),
  `code`       TEXT    NOT NULL,
  `name_ko`    TEXT    NOT NULL,
  `name_ja`    TEXT,
  `order_idx`  INTEGER NOT NULL DEFAULT 0,
  `created_at` INTEGER NOT NULL DEFAULT (unixepoch()),
  `updated_at` INTEGER NOT NULL DEFAULT (unixepoch()),
  CONSTRAINT categories_source_code_uk UNIQUE (`source_id`, `code`)
);

CREATE TABLE IF NOT EXISTS `vocab` (
  `id`               INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `source_id`        INTEGER NOT NULL REFERENCES `sources`(`id`),
  `category_id`      INTEGER REFERENCES `categories`(`id`),
  `level`            TEXT    NOT NULL CHECK (`level` IN ('N5','N4','N3','N2','N1')),
  `ja`               TEXT    NOT NULL,
  `kana`             TEXT    NOT NULL DEFAULT '',
  `ko`               TEXT    NOT NULL,
  `pos`              TEXT    NOT NULL DEFAULT '',
  `kanji_hint`       TEXT,
  `trap_note`        TEXT,
  `frequency_rank`   INTEGER,
  `tags`             TEXT    NOT NULL DEFAULT '[]',
  `audio_r2_key`     TEXT,
  `created_at`       INTEGER NOT NULL DEFAULT (unixepoch()),
  `updated_at`       INTEGER NOT NULL DEFAULT (unixepoch()),
  CONSTRAINT vocab_natural_uk UNIQUE (`level`, `ja`, `kana`)
);

CREATE INDEX IF NOT EXISTS `vocab_level_idx`    ON `vocab` (`level`);
CREATE INDEX IF NOT EXISTS `vocab_category_idx` ON `vocab` (`category_id`);

CREATE TABLE IF NOT EXISTS `grammar` (
  `id`           INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `source_id`    INTEGER NOT NULL REFERENCES `sources`(`id`),
  `category_id`  INTEGER REFERENCES `categories`(`id`),
  `level`        TEXT    NOT NULL CHECK (`level` IN ('N5','N4','N3','N2','N1')),
  `pattern`      TEXT    NOT NULL,
  `connection`   TEXT,
  `meaning_ko`   TEXT    NOT NULL,
  `contrast_ko`  TEXT,
  `error_note`   TEXT,
  `examples`     TEXT    NOT NULL DEFAULT '[]',
  `created_at`   INTEGER NOT NULL DEFAULT (unixepoch()),
  `updated_at`   INTEGER NOT NULL DEFAULT (unixepoch()),
  CONSTRAINT grammar_natural_uk UNIQUE (`level`, `pattern`)
);

CREATE INDEX IF NOT EXISTS `grammar_level_idx` ON `grammar` (`level`);

CREATE TABLE IF NOT EXISTS `kanji` (
  `id`                       INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `char`                     TEXT    NOT NULL,
  `on_yomi`                  TEXT,
  `kun_yomi`                 TEXT,
  `meaning_ko`               TEXT    NOT NULL,
  `stroke_count`             INTEGER,
  `radical`                  TEXT,
  `jlpt_level`               TEXT    NOT NULL CHECK (`jlpt_level` IN ('N5','N4','N3','N2','N1')),
  `frequency_rank`           INTEGER,
  `korean_hanja_pronunciation` TEXT,
  `related_vocab_ids`        TEXT    NOT NULL DEFAULT '[]',
  `created_at`               INTEGER NOT NULL DEFAULT (unixepoch()),
  `updated_at`               INTEGER NOT NULL DEFAULT (unixepoch()),
  CONSTRAINT kanji_char_uk UNIQUE (`char`)
);

CREATE INDEX IF NOT EXISTS `kanji_jlpt_level_idx` ON `kanji` (`jlpt_level`);

CREATE TABLE IF NOT EXISTS `sentences` (
  `id`           INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `source_id`    INTEGER NOT NULL REFERENCES `sources`(`id`),
  `level`        TEXT    NOT NULL CHECK (`level` IN ('N5','N4','N3','N2','N1')),
  `register`     TEXT    NOT NULL CHECK (`register` IN ('conversation','newspaper','business')),
  `seq_no`       INTEGER NOT NULL DEFAULT 0,
  `ja`           TEXT    NOT NULL,
  `kana`         TEXT,
  `ko`           TEXT    NOT NULL,
  `audio_r2_key` TEXT,
  `vocab_ids`    TEXT    NOT NULL DEFAULT '[]',
  `grammar_ids`  TEXT    NOT NULL DEFAULT '[]',
  `created_at`   INTEGER NOT NULL DEFAULT (unixepoch()),
  `updated_at`   INTEGER NOT NULL DEFAULT (unixepoch()),
  CONSTRAINT sentences_source_seq_uk UNIQUE (`source_id`, `level`, `register`, `seq_no`)
);

CREATE INDEX IF NOT EXISTS `sentences_level_register_idx` ON `sentences` (`level`, `register`);

CREATE TABLE IF NOT EXISTS `sysprog_terms` (
  `id`            INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `category_code` TEXT    NOT NULL,
  `ja`            TEXT    NOT NULL,
  `kana`          TEXT,
  `ko`            TEXT    NOT NULL,
  `domain`        TEXT    NOT NULL CHECK (`domain` IN (
    'programming','architecture','ml',
    'semiconductor_front','semiconductor_back',
    'manufacturing','automotive','pm','business'
  )),
  `star_freq`     INTEGER NOT NULL DEFAULT 0,
  `note`          TEXT,
  `created_at`    INTEGER NOT NULL DEFAULT (unixepoch()),
  `updated_at`    INTEGER NOT NULL DEFAULT (unixepoch()),
  CONSTRAINT sysprog_natural_uk UNIQUE (`ja`, `domain`)
);

CREATE INDEX IF NOT EXISTS `sysprog_domain_idx`    ON `sysprog_terms` (`domain`);
CREATE INDEX IF NOT EXISTS `sysprog_category_idx`  ON `sysprog_terms` (`category_code`);

CREATE TABLE IF NOT EXISTS `curriculum_weeks` (
  `id`               INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `week_no`          INTEGER NOT NULL,
  `theme`            TEXT    NOT NULL,
  `vocab_target`     INTEGER NOT NULL DEFAULT 0,
  `grammar_target`   INTEGER NOT NULL DEFAULT 0,
  `kanji_target`     INTEGER NOT NULL DEFAULT 0,
  `sentence_target`  INTEGER NOT NULL DEFAULT 0,
  `milestone_test`   TEXT,
  `created_at`       INTEGER NOT NULL DEFAULT (unixepoch()),
  `updated_at`       INTEGER NOT NULL DEFAULT (unixepoch()),
  CONSTRAINT curriculum_week_no_uk UNIQUE (`week_no`)
);

CREATE TABLE IF NOT EXISTS `homophone_pairs` (
  `id`         INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `level`      TEXT    NOT NULL CHECK (`level` IN ('N5','N4','N3','N2','N1')),
  `word_a_id`  INTEGER NOT NULL REFERENCES `vocab`(`id`),
  `word_b_id`  INTEGER NOT NULL REFERENCES `vocab`(`id`),
  `note_ko`    TEXT,
  `created_at` INTEGER NOT NULL DEFAULT (unixepoch()),
  `updated_at` INTEGER NOT NULL DEFAULT (unixepoch()),
  CONSTRAINT homophone_pair_uk UNIQUE (`word_a_id`, `word_b_id`)
);

CREATE INDEX IF NOT EXISTS `homophone_level_idx` ON `homophone_pairs` (`level`);

-- ═══════════════════════════════════════════════════════════════════
-- 학습 계열
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `users` (
  `id`           TEXT    PRIMARY KEY NOT NULL,
  `email`        TEXT    NOT NULL,
  `display_name` TEXT    NOT NULL,
  `created_at`   INTEGER NOT NULL DEFAULT (unixepoch()),
  `updated_at`   INTEGER NOT NULL DEFAULT (unixepoch()),
  CONSTRAINT users_email_uk UNIQUE (`email`)
);

CREATE TABLE IF NOT EXISTS `srs_cards` (
  `id`               INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id`          TEXT    NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `item_type`        TEXT    NOT NULL CHECK (`item_type` IN (
    'vocab','grammar','kanji','sentence','sysprog','homophone'
  )),
  `item_id`          INTEGER NOT NULL,
  `state`            TEXT    NOT NULL DEFAULT 'new' CHECK (`state` IN (
    'new','learning','review','relearning'
  )),
  -- FSRS-6 파라미터
  `stability`        REAL    NOT NULL DEFAULT 0.0,
  `difficulty`       REAL    NOT NULL DEFAULT 5.0,
  `due_at`           INTEGER NOT NULL DEFAULT (unixepoch()),
  `last_reviewed_at` INTEGER,
  `lapses`           INTEGER NOT NULL DEFAULT 0,
  `reps`             INTEGER NOT NULL DEFAULT 0,
  `created_at`       INTEGER NOT NULL DEFAULT (unixepoch()),
  `updated_at`       INTEGER NOT NULL DEFAULT (unixepoch()),
  CONSTRAINT srs_cards_natural_uk UNIQUE (`user_id`, `item_type`, `item_id`)
);

-- 학습 세션 조회 최적화: user_id + due_at 복합 인덱스
CREATE INDEX IF NOT EXISTS `srs_cards_due_idx`   ON `srs_cards` (`user_id`, `due_at`);
CREATE INDEX IF NOT EXISTS `srs_cards_state_idx` ON `srs_cards` (`user_id`, `state`);

CREATE TABLE IF NOT EXISTS `review_logs` (
  `id`             INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `card_id`        INTEGER NOT NULL REFERENCES `srs_cards`(`id`) ON DELETE CASCADE,
  `reviewed_at`    INTEGER NOT NULL DEFAULT (unixepoch()),
  `rating`         TEXT    NOT NULL CHECK (`rating` IN ('again','hard','good','easy')),
  `elapsed_days`   REAL    NOT NULL DEFAULT 0,
  `scheduled_days` REAL    NOT NULL DEFAULT 0,
  `response_ms`    INTEGER
);

CREATE INDEX IF NOT EXISTS `review_logs_card_idx`        ON `review_logs` (`card_id`);
CREATE INDEX IF NOT EXISTS `review_logs_reviewed_at_idx` ON `review_logs` (`reviewed_at`);

CREATE TABLE IF NOT EXISTS `daily_logs` (
  `id`            INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id`       TEXT    NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `date`          TEXT    NOT NULL,
  `source_code`   TEXT,
  `items_new`     INTEGER NOT NULL DEFAULT 0,
  `items_review`  INTEGER NOT NULL DEFAULT 0,
  `accuracy`      REAL,
  `time_min`      REAL    NOT NULL DEFAULT 0,
  `audio_min`     REAL    NOT NULL DEFAULT 0,
  `notes`         TEXT,
  `created_at`    INTEGER NOT NULL DEFAULT (unixepoch()),
  `updated_at`    INTEGER NOT NULL DEFAULT (unixepoch()),
  CONSTRAINT daily_logs_user_date_uk UNIQUE (`user_id`, `date`)
);

CREATE TABLE IF NOT EXISTS `quiz_attempts` (
  `id`           INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id`      TEXT    NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `quiz_type`    TEXT    NOT NULL,
  `week_no`      INTEGER,
  `total`        INTEGER NOT NULL DEFAULT 0,
  `correct`      INTEGER NOT NULL DEFAULT 0,
  `duration_sec` INTEGER,
  `detail_json`  TEXT,
  `created_at`   INTEGER NOT NULL DEFAULT (unixepoch()),
  `updated_at`   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS `quiz_attempts_user_idx` ON `quiz_attempts` (`user_id`);
CREATE INDEX IF NOT EXISTS `quiz_attempts_week_idx` ON `quiz_attempts` (`user_id`, `week_no`);

CREATE TABLE IF NOT EXISTS `self_check` (
  `id`               INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id`          TEXT    NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `week_no`          INTEGER NOT NULL,
  `vocab_score`      INTEGER CHECK (`vocab_score` BETWEEN 0 AND 100),
  `grammar_score`    INTEGER CHECK (`grammar_score` BETWEEN 0 AND 100),
  `listening_score`  INTEGER CHECK (`listening_score` BETWEEN 0 AND 100),
  `writing_score`    INTEGER CHECK (`writing_score` BETWEEN 0 AND 100),
  `domain_score`     INTEGER CHECK (`domain_score` BETWEEN 0 AND 100),
  `notes`            TEXT,
  `checked_at`       INTEGER NOT NULL DEFAULT (unixepoch()),
  `created_at`       INTEGER NOT NULL DEFAULT (unixepoch()),
  `updated_at`       INTEGER NOT NULL DEFAULT (unixepoch()),
  CONSTRAINT self_check_user_week_uk UNIQUE (`user_id`, `week_no`)
);

-- ═══════════════════════════════════════════════════════════════════
-- FTS5 가상 테이블 (전문 검색)
-- content= 지정으로 외부 콘텐츠 테이블과 연동
-- ═══════════════════════════════════════════════════════════════════

CREATE VIRTUAL TABLE IF NOT EXISTS `vocab_fts` USING fts5(
  ja, kana, ko,
  content='vocab',
  content_rowid='id'
);

CREATE VIRTUAL TABLE IF NOT EXISTS `sentences_fts` USING fts5(
  ja, ko,
  content='sentences',
  content_rowid='id'
);

-- ═══════════════════════════════════════════════════════════════════
-- FTS5 동기화 트리거 (INSERT / UPDATE / DELETE 3종)
-- ═══════════════════════════════════════════════════════════════════

-- vocab_fts: INSERT
CREATE TRIGGER IF NOT EXISTS `vocab_fts_ai`
AFTER INSERT ON `vocab`
BEGIN
  INSERT INTO `vocab_fts`(rowid, ja, kana, ko)
  VALUES (NEW.id, NEW.ja, NEW.kana, NEW.ko);
END;

-- vocab_fts: DELETE
CREATE TRIGGER IF NOT EXISTS `vocab_fts_ad`
AFTER DELETE ON `vocab`
BEGIN
  INSERT INTO `vocab_fts`(`vocab_fts`, rowid, ja, kana, ko)
  VALUES ('delete', OLD.id, OLD.ja, OLD.kana, OLD.ko);
END;

-- vocab_fts: UPDATE (delete 후 insert)
CREATE TRIGGER IF NOT EXISTS `vocab_fts_au`
AFTER UPDATE ON `vocab`
BEGIN
  INSERT INTO `vocab_fts`(`vocab_fts`, rowid, ja, kana, ko)
  VALUES ('delete', OLD.id, OLD.ja, OLD.kana, OLD.ko);
  INSERT INTO `vocab_fts`(rowid, ja, kana, ko)
  VALUES (NEW.id, NEW.ja, NEW.kana, NEW.ko);
END;

-- sentences_fts: INSERT
CREATE TRIGGER IF NOT EXISTS `sentences_fts_ai`
AFTER INSERT ON `sentences`
BEGIN
  INSERT INTO `sentences_fts`(rowid, ja, ko)
  VALUES (NEW.id, NEW.ja, NEW.ko);
END;

-- sentences_fts: DELETE
CREATE TRIGGER IF NOT EXISTS `sentences_fts_ad`
AFTER DELETE ON `sentences`
BEGIN
  INSERT INTO `sentences_fts`(`sentences_fts`, rowid, ja, ko)
  VALUES ('delete', OLD.id, OLD.ja, OLD.ko);
END;

-- sentences_fts: UPDATE
CREATE TRIGGER IF NOT EXISTS `sentences_fts_au`
AFTER UPDATE ON `sentences`
BEGIN
  INSERT INTO `sentences_fts`(`sentences_fts`, rowid, ja, ko)
  VALUES ('delete', OLD.id, OLD.ja, OLD.ko);
  INSERT INTO `sentences_fts`(rowid, ja, ko)
  VALUES (NEW.id, NEW.ja, NEW.ko);
END;

-- ═══════════════════════════════════════════════════════════════════
-- 초기 데이터: 기본 사용자 (단일 사용자 1차 운영)
-- ═══════════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO `users` (id, email, display_name)
VALUES ('owner', 'owner@nihongo-n3.local', '오너');

-- ═══════════════════════════════════════════════════════════════════
-- 초기 데이터: sources (15개 마크다운 원본)
-- ═══════════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO `sources` (code, title, file_path) VALUES
('00', '전체 소스 맵', '0 — 00_source_map.md'),
('01', '학습 전략', '1 — 01_learning_strategy.md'),
('02', '발음·가나', '2 — 02_pronunciation_kana.md'),
('03', 'N5 한자', '3 — 03_jlpt_n5_kanji.md'),
('04', 'N5 어휘', '4 — 04_jlpt_n5_vocab.md'),
('05', 'N5 문법', '5 — 05_jlpt_n5_grammar.md'),
('06', 'N4 한자', '6 — 06_jlpt_n4_kanji.md'),
('07', 'N4 어휘', '7 — 07_jlpt_n4_vocab.md'),
('08', 'N4 문법', '8 — 08_jlpt_n4_grammar.md'),
('09', 'N3 한자', '9 — 09_jlpt_n3_kanji.md'),
('10A', 'N3 어휘 전반', '10 — 10A_jlpt_n3_vocab_part1.md'),
('10B', 'N3 어휘 후반', '10-B — 10B_jlpt_n3_vocab_part2.md'),
('11', 'N3 문법', '11 — 11_jlpt_n3_grammar.md'),
('12', '예문 코퍼스', '12 — 12_example_sentences.md'),
('A',  '직무 어휘 500', 'A — A_sysprog_vocab_500.md'),
('B',  '운영 가이드', 'B_ops_guide.md'),
('C',  '자가진단 16주', 'C — `C_self_check_16weeks.md');
