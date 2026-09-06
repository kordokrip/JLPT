import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import test from 'node:test';

import { validateD1BackupManifest, validateD1BackupManifestForSchema } from './d1-backup-manifest.js';
import { D1_LEARNING_TRANSFER_TABLES, tablesForPhase, type D1BackupSchemaProfile } from './d1-tables.js';

function files(profile: D1BackupSchemaProfile) {
  return tablesForPhase('all', profile).map(({ name }) => ({ table: name, file: `${name}.sql`, rowCount: 0, sha256: '0'.repeat(64) }));
}

test('profileless historical manifests infer only the exact legacy 65-table profile', () => {
  const legacy = validateD1BackupManifest({ files: files('0027') });
  assert.equal(legacy.schemaProfile, '0027');
  assert.equal(legacy.legacyProfileInferred, true);
  assert.equal(legacy.files.length, 65);
  assert.throws(() => validateD1BackupManifest({ files: files('0028') }), /allowlist/u);
  assert.throws(() => validateD1BackupManifest({ schemaProfile: '0028', files: files('0027') }), /allowlist/u);
});

test('explicit 0028 manifests require all 70 tables and a 65-table backup cannot cover 0028', () => {
  const schema = tablesForPhase('all', '0028').map((table) => table.name);
  const current = validateD1BackupManifestForSchema({ schemaProfile: '0028', files: files('0028') }, schema);
  assert.equal(current.files.length, 70);
  assert.equal(current.legacyProfileInferred, false);
  assert.throws(() => validateD1BackupManifestForSchema({ files: files('0027') }, schema), /does not cover/u);
  assert.throws(() => validateD1BackupManifest({ schemaProfile: '0027', files: files('0028') }), /allowlist/u);
  assert.throws(() => validateD1BackupManifest({ schemaProfile: '0029', files: files('0028') }), /Unknown/u);
});

test('manifest validation fails closed for duplicate, unknown, missing, and unsafe file metadata', () => {
  const legacy = files('0027');
  const first = legacy[0]!;
  for (const entries of [
    [...legacy.slice(1), first, first],
    [...legacy.slice(1), { ...first, table: 'unknown_table' }],
    legacy.slice(1),
    [...legacy.slice(1), { ...first, file: legacy[1]!.file }],
    [...legacy.slice(1), { ...first, file: '../users.sql' }],
    [...legacy.slice(1), { ...first, rowCount: -1 }],
    [...legacy.slice(1), { ...first, rowCount: 1.5 }],
    [...legacy.slice(1), { ...first, sha256: 'invalid' }],
  ]) assert.throws(() => validateD1BackupManifest({ files: entries }), /manifest/u);
  assert.throws(() => validateD1BackupManifest(null), /Invalid/u);
});

function migrate(profile: D1BackupSchemaProfile): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  const directory = new URL('../../drizzle-v2/', import.meta.url);
  for (const name of readdirSync(directory).filter((name) => /^00\d\d_.*\.sql$/u.test(name) && name.slice(0, 4) <= profile).sort()) {
    db.exec(readFileSync(new URL(name, directory), 'utf8').replaceAll('--> statement-breakpoint', ''));
  }
  db.exec('PRAGMA foreign_keys=ON');
  return db;
}

for (const schemaProfile of ['0027', '0028'] as const) {
  test(`local ${schemaProfile} transfer restores its exact table set into 0028 without losing learning rows`, () => {
    const source = migrate(schemaProfile);
    const target = migrate('0028');
    try {
      source.exec("INSERT INTO users(id,email,display_name) VALUES('backup-fixture','fixture@example.invalid','Fixture');");
      source.exec("INSERT INTO daily_logs(user_id,date,notes) VALUES('backup-fixture','2026-09-06','preserved');");
      if (schemaProfile === '0028') {
        source.exec("INSERT INTO learning_profiles VALUES('backup-fixture','jlpt-ja','N3','ko',20,'Asia/Seoul',1);");
        source.exec("INSERT INTO study_sessions VALUES('backup-session','backup-fixture','jlpt-ja','N3',20,'active','request','[]',1,1);");
        source.exec("INSERT INTO study_steps(id,session_id,ordinal,phase,content_ref,content_type,content_id,section,level,public_json,solution_json) VALUES('backup-step','backup-session',0,'learn','jlpt-ja:vocab:1:v1','vocab','1','vocab','N3','{}','{}');");
        source.exec("INSERT INTO learning_annotations VALUES('backup-fixture','jlpt-ja','day','2026-09-06','keep this note',1,1);");
        source.prepare('INSERT INTO content_learning_links VALUES(?,?,?,?,?,?,?,?)').run('jlpt-ja', 'question', 'concept', 'a'.repeat(64), 'reviewer-a', 'reviewer-b', 'approved', 1);
      }
      // Match the local drill: migrate current schema, suspend exact runtime
      // trigger DDL for replay, clear child-first, and import profile parent-first.
      const triggers = target.prepare("SELECT name,sql FROM sqlite_schema WHERE type='trigger'").all();
      for (const trigger of triggers) target.exec(`DROP TRIGGER "${String(trigger.name)}"`);
      for (const table of tablesForPhase('all', '0028').reverse()) target.exec(`DELETE FROM "${table.name}"`);
      const manifest = validateD1BackupManifest({ ...(schemaProfile === '0028' ? { schemaProfile } : {}), files: files(schemaProfile) });
      for (const table of tablesForPhase('all', manifest.schemaProfile)) {
        const rows = source.prepare(`SELECT * FROM "${table.name}"`).all();
        for (const row of rows) {
          const columns = Object.keys(row);
          target.prepare(`INSERT INTO "${table.name}" (${columns.map((column) => `"${column}"`).join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(...Object.values(row) as SQLInputValue[]);
        }
        assert.deepEqual(target.prepare(`SELECT * FROM "${table.name}"`).all(), rows, table.name);
      }
      for (const trigger of triggers) target.exec(String(trigger.sql));
      assert.deepEqual(target.prepare('PRAGMA foreign_key_check').all(), []);
      for (const table of D1_LEARNING_TRANSFER_TABLES) {
        const count = target.prepare(`SELECT count(*) AS count FROM ${table.name}`).get()?.count;
        assert.equal(count, schemaProfile === '0028' ? 1 : 0, table.name);
      }
      assert.equal(manifest.schemaProfile === '0028', schemaProfile === '0028', 'a successful legacy drill is not a full 0028 backup');
    } finally {
      source.close();
      target.close();
    }
  });
}
