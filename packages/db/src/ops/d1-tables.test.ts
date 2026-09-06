import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import { D1_BACKUP_SCHEMA_QUERY, D1_TRANSFER_TABLES, D1_LEARNING_TRANSFER_TABLES, EXCLUDED_TRANSIENT_TABLES, detectD1BackupSchemaProfile, parseD1SchemaTableNames, tablesForPhase } from './d1-tables.js';

test('0028 backup profile includes all five additive learning tables', () => {
  const tables = tablesForPhase('all', '0028');
  const names = tables.map((table) => table.name);
  assert.equal(names.length, 70, 'an 0028 backup must not silently retain the legacy 65-table list');
  for (const name of ['learning_profiles', 'study_sessions', 'study_steps', 'learning_annotations', 'content_learning_links']) {
    assert.ok(names.includes(name), name);
  }
});

test('schema profiles reject partial, missing, unknown, and duplicate regular tables', () => {
  const legacy = tablesForPhase('all', '0027').map((table) => table.name);
  const current = tablesForPhase('all', '0028').map((table) => table.name);
  assert.equal(detectD1BackupSchemaProfile(legacy), '0027');
  assert.equal(detectD1BackupSchemaProfile(current), '0028');
  for (let count = 1; count < 5; count += 1) {
    assert.throws(() => detectD1BackupSchemaProfile([...legacy, ...D1_LEARNING_TRANSFER_TABLES.slice(0, count).map((table) => table.name)]), /Partial 0028/u);
  }
  assert.throws(() => detectD1BackupSchemaProfile(legacy.slice(1)), /missing or unknown/u);
  assert.throws(() => detectD1BackupSchemaProfile([...current, 'unreviewed_table']), /missing or unknown/u);
  assert.throws(() => detectD1BackupSchemaProfile([...current, 'users']), /duplicate/u);
});

test('actual Miniflare generated _cf_METADATA does not turn a complete backup profile into an unknown schema', () => {
  const current = tablesForPhase('all', '0028').map((table) => table.name);
  assert.equal(detectD1BackupSchemaProfile([...current, '_cf_METADATA']), '0028');
  assert.throws(() => detectD1BackupSchemaProfile([...current, '_cf_application_rows']), /unknown/u);
});

test('schema mismatch diagnostics name missing and unknown tables without including row data', () => {
  const current = tablesForPhase('all', '0028').map((table) => table.name);
  assert.throws(() => detectD1BackupSchemaProfile(current.filter((name) => name !== 'study_steps')), /missing=.*study_steps/u);
  assert.throws(() => detectD1BackupSchemaProfile([...current.filter((name) => name !== 'users'), 'unreviewed_table']), /missing=\["users"\].*unknown=\["unreviewed_table"\]/u);
});

test('schema metadata requires one successful typed D1 result set', () => {
  assert.deepEqual(parseD1SchemaTableNames(JSON.stringify([{ success: true, results: [{ name: 'users' }] }])), ['users']);
  for (const invalid of [[], [{ success: false, results: [] }], [{ success: true }], [{ success: true, results: [null] }], [{ success: true, results: [{ name: 1 }] }]]) {
    assert.throws(() => parseD1SchemaTableNames(JSON.stringify(invalid)), /invalid response/u);
  }
});

test('actual migrated metadata selects 65 then 70 tables and learning FK order is parent-first', () => {
  const db = new DatabaseSync(':memory:');
  const directory = new URL('../../drizzle-v2/', import.meta.url);
  try {
    for (const name of readdirSync(directory).filter((name) => /^00\d\d_.*\.sql$/u.test(name) && name < '0028').sort()) {
      db.exec(readFileSync(new URL(name, directory), 'utf8').replaceAll('--> statement-breakpoint', ''));
    }
    const names = () => db.prepare(D1_BACKUP_SCHEMA_QUERY).all().map((row) => row.name as string);
    assert.equal(detectD1BackupSchemaProfile(names()), '0027');
    db.exec(readFileSync(new URL('0028_learning_experience.sql', directory), 'utf8'));
    assert.equal(detectD1BackupSchemaProfile(names()), '0028');
    const order = new Map(tablesForPhase('all', '0028').map((table, index) => [table.name, index]));
    for (const table of D1_LEARNING_TRANSFER_TABLES) {
      for (const fk of db.prepare(`PRAGMA foreign_key_list(${table.name})`).all()) {
        assert.ok(order.get(fk.table as string)! < order.get(table.name)!, `${String(fk.table)} before ${table.name}`);
      }
    }
    assert.deepEqual(db.prepare('PRAGMA foreign_key_list(content_learning_links)').all(), []);
    assert.equal(tablesForPhase('content', '0028').some((table) => table.name === 'content_learning_links'), true);
    db.exec('CREATE TABLE sqlitex_unreviewed(id TEXT)');
    assert.throws(() => detectD1BackupSchemaProfile(names()), /missing or unknown/u);
  } finally {
    db.close();
  }
});

test('D1 backup allowlist covers release, practice, owner, activity, speech, and FSRS tables', () => {
  const names = D1_TRANSFER_TABLES.map((table) => table.name);
  assert.equal(names.length, 65);
  assert.equal(new Set(names).size, names.length);
  for (const required of [
    'content_releases',
    'content_quality_audits',
    'content_release_quality_audit_links',
    'jlpt_practice_questions',
    'topik_owner_authored_curriculum_items',
    'content_speech_bindings',
    'learning_activity_events',
    'topik_owner_srs_cards',
    'topik_owner_review_logs',
  ]) assert.ok(names.includes(required), required);
  assert.deepEqual(EXCLUDED_TRANSIENT_TABLES, ['_cf_KV', 'd1_migrations', 'oauth_states', 'oauth_login_tokens']);
});

test('D1 restore order keeps known FK parents before their children', () => {
  const position = new Map(D1_TRANSFER_TABLES.map((table, index) => [table.name, index]));
  for (const [parent, child] of [
    ['content_releases', 'content_release_sources'],
    ['content_quality_audits', 'content_release_quality_audit_links'],
    ['topik_owner_authored_curriculum_units', 'topik_owner_authored_curriculum_items'],
    ['learning_content_stable_refs', 'content_speech_bindings'],
    ['users', 'learning_activity_events'],
    ['topik_owner_srs_cards', 'topik_owner_review_logs'],
    ['topik_placement_attempts', 'topik_placement_responses'],
  ] as const) assert.ok(position.get(parent)! < position.get(child)!, `${parent} before ${child}`);
});
