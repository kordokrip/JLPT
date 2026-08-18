import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

const migrationUrl = (name: string) => new URL(`../../drizzle-v2/${name}`, import.meta.url);

test('0024 keeps activity ownership server-side and idempotent per user', async () => {
  const sql = await readFile(migrationUrl('0024_learning_activity_events.sql'), 'utf8');
  assert.match(sql, /`user_id` text NOT NULL REFERENCES `users`/);
  assert.match(sql, /UNIQUE \(`user_id`, `event_id`\)/);
  assert.match(sql, /`occurred_at` integer NOT NULL/);
  assert.doesNotMatch(sql, /prompt|answer_payload|email/i);
});

test('0025 defines a multilingual reviewed JLPT bank without pronunciation objects', async () => {
  const sql = await readFile(migrationUrl('0025_jlpt_practice_questions.sql'), 'utf8');
  assert.match(sql, /json_array_length\(`choices_json`\) = 4/);
  assert.match(sql, /prompt_ko/);
  assert.match(sql, /prompt_ja/);
  assert.match(sql, /prompt_en/);
  assert.doesNotMatch(sql, /`author_reviewer` text|`adversarial_reviewer` text|`reviewed_at` text/);
  assert.doesNotMatch(sql, /content_release_quality_audit_links/);
  assert.doesNotMatch(sql, /audio_r2_key|asset_id|object_key/i);
});

test('0026 links passed audits and requires exact opted-in release coverage', async () => {
  const sql = await readFile(migrationUrl('0026_release_quality_links.sql'), 'utf8');
  assert.match(sql, /content_release_quality_requirements/);
  assert.match(sql, /content_release_quality_audit_links/);
  assert.match(sql, /published JLPT practice requires a passed independent quality audit/);
  assert.match(sql, /expected_audit_count/);
  assert.match(sql, /automated_status` = 'passed'/);
  assert.match(sql, /author_reviewer` <> a\.`adversarial_reviewer/);
  assert.match(sql, /DROP TRIGGER `content_releases_publish_gate`/);
  assert.match(sql, /topik_content_items[\s\S]*content_release_quality_audit_links/);
  assert.match(sql, /published TOPIK release requires content items or complete linked quality audits/);
});

test('0026 preserves existing audit rows while adding topik-owner', async () => {
  const ledger = await readFile(migrationUrl('0022_question_bank_quality_ledger.sql'), 'utf8');
  const bank = await readFile(migrationUrl('0025_jlpt_practice_questions.sql'), 'utf8');
  const migration = await readFile(migrationUrl('0026_release_quality_links.sql'), 'utf8');
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE topik_practice_questions (
      learning_track text, bank_version text, exam_level text, section text, prompt_ko text
    );
    CREATE UNIQUE INDEX topik_practice_prompt_uk
      ON topik_practice_questions (learning_track, exam_level, section, prompt_ko);
  `);
  db.exec(ledger.replaceAll('--> statement-breakpoint', ''));
  db.exec(bank.replaceAll('--> statement-breakpoint', ''));
  db.exec(`
    CREATE TABLE content_releases (
      id text PRIMARY KEY, learning_track text NOT NULL, content_version text NOT NULL,
      release_state text NOT NULL
    );
    CREATE TABLE topik_content_items (id text PRIMARY KEY, release_id text NOT NULL);
    CREATE TRIGGER content_releases_publish_gate
    BEFORE UPDATE OF release_state ON content_releases
    WHEN NEW.release_state = 'published' AND NEW.learning_track = 'topik-ko'
      AND NOT EXISTS (SELECT 1 FROM topik_content_items i WHERE i.release_id = NEW.id)
    BEGIN SELECT RAISE(ABORT, 'old curriculum-only gate'); END;
  `);
  const insertSql = `
    INSERT INTO content_quality_audits
      (id, learning_track, content_type, content_id, content_version, evidence_sha256,
       validator_version, automated_status, author_review_status, adversarial_review_status,
       author_reviewer, adversarial_reviewer, release_state, details_json, checked_at,
       created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const insert = db.prepare(insertSql);
  insert.run(
    'existing-audit', 'topik-ko', 'topik-practice', 'item-1', 'v2', 'a'.repeat(64),
    'validator-v1', 'passed', 'signed', 'signed', 'reviewer-a', 'reviewer-b',
    'published', '{"preserved":true}', '2026-08-17', 100, 200,
  );

  db.exec(migration.replaceAll('--> statement-breakpoint', ''));
  const preserved = db.prepare(
    'SELECT content_type, details_json, created_at, updated_at FROM content_quality_audits WHERE id = ?',
  ).get('existing-audit') as Record<string, unknown>;
  assert.deepEqual({ ...preserved }, {
    content_type: 'topik-practice', details_json: '{"preserved":true}', created_at: 100, updated_at: 200,
  });
  const insertAfter = db.prepare(insertSql);
  insertAfter.run(
    'owner-audit', 'topik-ko', 'topik-owner', 'owner-1', 'owner-v1', 'b'.repeat(64),
    'validator-v1', 'passed', 'signed', 'signed', 'reviewer-a', 'reviewer-b',
    'approved', '{}', '2026-08-19', 300, 300,
  );
  assert.equal(db.prepare("SELECT count(*) AS count FROM content_quality_audits WHERE content_type = 'topik-owner'").get()?.count, 1);
  assert.throws(() => insertAfter.run(
    'bad-owner-audit', 'topik-ko', 'topik-owner', 'owner-2', 'owner-v1', 'c'.repeat(64),
    'validator-v1', 'failed', 'signed', 'signed', 'reviewer-a', 'reviewer-b',
    'approved', '{}', '2026-08-19', 300, 300,
  ), /requires automated and two independent review passes/);
  db.close();
});

test('0027 exposes only Google browser speech and blocks legacy audio binding writes', async () => {
  const sql = await readFile(migrationUrl('0027_google_speech_contract.sql'), 'utf8');
  const table = sql.match(/CREATE TABLE `content_speech_bindings`[\s\S]*?\n\);/)?.[0] ?? '';
  assert.match(table, /`provider` text NOT NULL DEFAULT 'google-browser' CHECK \(`provider` = 'google-browser'\)/);
  assert.match(table, /`binding_state` text NOT NULL CHECK \(`binding_state` IN \('ready', 'unavailable'\)\)/);
  assert.doesNotMatch(table, /r2|asset|object|bucket/i);
  assert.match(sql, /content_audio_bindings_legacy_insert_blocked/);
});
