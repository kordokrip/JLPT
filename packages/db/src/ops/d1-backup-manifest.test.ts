import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import test from 'node:test';

import { validateD1BackupManifest, validateD1BackupManifestForSchema } from './d1-backup-manifest.js';
import { D1_LEARNING_TRANSFER_TABLES, tablesForPhase, type D1BackupSchemaProfile } from './d1-tables.js';

const jpeg = createRequire(new URL('../../../../apps/api/package.json', import.meta.url))('jpeg-js') as {
  encode(image: { width: number; height: number; data: Uint8Array }, quality: number): { data: Uint8Array };
  decode(bytes: Uint8Array, options: { useTArray: true }): { width: number; height: number; data: Uint8Array };
};

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
  assert.throws(() => validateD1BackupManifest({ schemaProfile: '0099', files: files('0028') }), /Unknown/u);
});

test('0030 backup manifests include all 72 regular tables and older profiles cannot cover them', () => {
  const schema = tablesForPhase('all', '0030').map((table) => table.name);
  assert.equal(validateD1BackupManifestForSchema({ schemaProfile: '0030', files: files('0030') }, schema).files.length, 72);
  for (const older of ['0027', '0028', '0029'] as const) {
    assert.throws(() => validateD1BackupManifestForSchema({ schemaProfile: older, files: files(older) }, schema), /does not cover/u);
  }
});

test('0031 requires all 74 tables and does not mistake a 0030 backup for complete coverage',()=>{
  const schema=tablesForPhase('all','0031').map(table=>table.name);
  assert.equal(validateD1BackupManifestForSchema({schemaProfile:'0031',files:files('0031')},schema).files.length,74);
  assert.throws(()=>validateD1BackupManifestForSchema({schemaProfile:'0030',files:files('0030')},schema),/does not cover/u);
  assert.throws(()=>validateD1BackupManifest({schemaProfile:'0031',files:files('0030')}),/allowlist/u);
});

test('0033 manifests require all 77 tables and reject any partial account-data backup', () => {
  const schema = tablesForPhase('all', '0033').map((table) => table.name);
  assert.equal(validateD1BackupManifestForSchema({ schemaProfile: '0033', files: files('0033') }, schema).files.length, 77);
  for (const missing of ['account_preferences', 'account_avatars', 'custom_reminder_deliveries']) {
    assert.throws(() => validateD1BackupManifest({ schemaProfile: '0033', files: files('0033').filter((file) => file.table !== missing) }), /allowlist/u);
  }
  assert.throws(() => validateD1BackupManifestForSchema({ schemaProfile: '0031', files: files('0031') }, schema), /does not cover/u);
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

test('0033 transfer preserves an actual JPEG BLOB and all account-personalization rows', () => {
  const source = migrate('0033');
  const target = migrate('0033');
  try {
    const rgba = new Uint8Array(256 * 256 * 4);
    rgba.fill(255);
    const jpegBytes = new Uint8Array(jpeg.encode({ width: 256, height: 256, data: rgba }, 85).data);
    const decoded = jpeg.decode(jpegBytes, { useTArray: true });
    assert.deepEqual([decoded.width, decoded.height], [256, 256]);
    const jpegHash = createHash('sha256').update(jpegBytes).digest('hex');
    source.exec("INSERT INTO users(id,email,display_name) VALUES('avatar-fixture','avatar@example.invalid','Avatar');");
    source.exec("INSERT INTO account_preferences(user_id,theme,accent,reminder_enabled,reminder_time,timezone,custom_reminder_configured,updated_at) VALUES('avatar-fixture','dark','sea',1,'07:15','Asia/Seoul',1,1);");
    source.prepare('INSERT INTO account_avatars(user_id,jpeg,updated_at) VALUES(?,?,?)').run('avatar-fixture', jpegBytes, 1);
    source.exec("INSERT INTO custom_reminder_deliveries(endpoint,local_date,user_id,status,claimed_at,sent_at) VALUES('https://push.invalid/e','2026-10-14','avatar-fixture','sent',1,2);");
    const triggers = target.prepare("SELECT name,sql FROM sqlite_schema WHERE type='trigger'").all();
    for (const trigger of triggers) target.exec(`DROP TRIGGER \"${String(trigger.name)}\"`);
    for (const table of tablesForPhase('all', '0033').reverse()) target.exec(`DELETE FROM \"${table.name}\"`);
    for (const table of tablesForPhase('all', '0033')) {
      const rows = source.prepare(`SELECT * FROM \"${table.name}\"`).all();
      for (const row of rows) {
        const columns = Object.keys(row);
        target.prepare(`INSERT INTO \"${table.name}\" (${columns.map((column) => `\"${column}\"`).join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(...Object.values(row) as SQLInputValue[]);
      }
    }
    for (const trigger of triggers) target.exec(String(trigger.sql));
    const restored = target.prepare('SELECT jpeg FROM account_avatars WHERE user_id=?').get('avatar-fixture') as { jpeg: Uint8Array };
    const restoredBytes = new Uint8Array(restored.jpeg);
    assert.deepEqual(restoredBytes, jpegBytes);
    assert.equal(createHash('sha256').update(restoredBytes).digest('hex'), jpegHash);
    assert.equal(target.prepare('SELECT count(*) AS count FROM account_preferences').get()?.count, 1);
    assert.equal(target.prepare('SELECT count(*) AS count FROM custom_reminder_deliveries').get()?.count, 1);
    assert.deepEqual(target.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    source.close();
    target.close();
  }
});

test('local Wrangler D1 export and import preserve a decoded 256px JPEG BLOB', () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
  const temp = mkdtempSync(path.join(os.tmpdir(), 'nihongo-0033-blob-'));
  const sourceWorkspace = path.join(temp, 'source');
  const targetWorkspace = path.join(temp, 'target');
  const exported = path.join(temp, 'account_avatars.sql');
  const rgba = new Uint8Array(256 * 256 * 4);
  rgba.fill(255);
  const bytes = new Uint8Array(jpeg.encode({ width: 256, height: 256, data: rgba }, 85).data);
  const expectedHash = createHash('sha256').update(bytes).digest('hex');
  const run = (workspace: string, args: string[]) => execFileSync('pnpm', ['-C', root, 'exec', 'wrangler', ...args, '--local', '--cwd', workspace, '--config', path.join(workspace, 'wrangler.json')], { cwd: root, encoding: 'utf8', stdio: 'pipe', env: { ...process.env, CI: 'true', WRANGLER_WRITE_LOGS: '0' } });
  try {
    mkdirSync(sourceWorkspace);
    mkdirSync(targetWorkspace);
    const localConfig = JSON.stringify({ name: 'owned-0033-blob-test', compatibility_date: '2026-06-17', d1_databases: [{ binding: 'DB', database_name: 'owned-0033-blob-test', database_id: '11111111-1111-4111-8111-111111111111', migrations_dir: path.join(root, 'packages/db/drizzle-v2') }] });
    writeFileSync(path.join(sourceWorkspace, 'wrangler.json'), localConfig);
    writeFileSync(path.join(targetWorkspace, 'wrangler.json'), localConfig);
    run(sourceWorkspace, ['d1', 'migrations', 'apply', 'DB']);
    run(sourceWorkspace, ['d1', 'execute', 'DB', '--command', `INSERT INTO users(id,email,display_name) VALUES('blob-fixture','blob@example.invalid','Blob'); INSERT INTO account_avatars(user_id,jpeg,updated_at) VALUES('blob-fixture',X'${Buffer.from(bytes).toString('hex')}',1);`]);
    run(sourceWorkspace, ['d1', 'export', 'DB', '--table=account_avatars', '--no-schema', '--skip-confirmation', `--output=${exported}`]);
    run(targetWorkspace, ['d1', 'migrations', 'apply', 'DB']);
    run(targetWorkspace, ['d1', 'execute', 'DB', '--command', "INSERT INTO users(id,email,display_name) VALUES('blob-fixture','blob@example.invalid','Blob');"]);
    run(targetWorkspace, ['d1', 'execute', 'DB', `--file=${exported}`]);
    const output = run(targetWorkspace, ['d1', 'execute', 'DB', '--json', "--command=SELECT hex(jpeg) AS jpeg FROM account_avatars WHERE user_id='blob-fixture'"]);
    const result = JSON.parse(output) as Array<{ results?: Array<{ jpeg?: string }> }>;
    const restored = new Uint8Array(Buffer.from(result[0]?.results?.[0]?.jpeg ?? '', 'hex'));
    assert.deepEqual(restored, bytes);
    assert.equal(createHash('sha256').update(restored).digest('hex'), expectedHash);
    assert.deepEqual([jpeg.decode(restored, { useTArray: true }).width, jpeg.decode(restored, { useTArray: true }).height], [256, 256]);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
