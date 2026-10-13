import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { D1_BACKUP_SCHEMA_QUERY, detectD1BackupSchemaProfile, parseD1SchemaTableNames, tablesForPhase } from './d1-tables.js';
import { validateD1BackupManifest } from './d1-backup-manifest.js';

interface SqliteTrigger {
  name: string;
  sql: string;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const input = process.argv.find((arg) => arg.startsWith('--input='))?.slice('--input='.length);
if (!input) throw new Error('--input=<backup directory> is required');
const inputDir = path.resolve(root, input);
const manifest = validateD1BackupManifest(JSON.parse(
  fs.readFileSync(path.join(inputDir, 'manifest.json'), 'utf8'),
));
const restoreTables = tablesForPhase('all', manifest.schemaProfile);
const persistTo = fs.mkdtempSync(path.join(os.tmpdir(), 'nihongo-n3-restore-'));
// 강성호 2026-10-13: 운영 schema 그대로 복원한 뒤 additive upgrade를 검증하는 별도 경로를 제공한다.
const exactSchemaUpgrade = process.argv.includes('--exact-schema-upgrade');
let config = path.join(root, 'apps/api/wrangler.toml');
if (exactSchemaUpgrade) {
  const migrationDirectory = path.join(persistTo,'migrations');
  fs.mkdirSync(migrationDirectory,{mode:0o700});
  const backupMigration = Number(manifest.schemaProfile);
  const canonicalDirectory = path.join(root,'packages/db/drizzle-v2');
  for (const file of fs.readdirSync(canonicalDirectory).filter(file=>/^\d{4}_.*\.sql$/.test(file) && Number(file.slice(0,4))<=backupMigration))
    fs.copyFileSync(path.join(canonicalDirectory,file),path.join(migrationDirectory,file));
  config=path.join(persistTo,'restore-only.json');
  fs.writeFileSync(config,JSON.stringify({name:'owned-local-restore-only',compatibility_date:'2026-06-17',
    d1_databases:[{binding:'DB',database_name:'owned-local-restore-only',database_id:'11111111-1111-4111-8111-111111111111',migrations_dir:migrationDirectory}]}),{flag:'wx',mode:0o600});
}
const reportArg = process.argv.find((arg) => arg.startsWith('--out='))?.slice('--out='.length);
const reportPath = reportArg
  ? (path.isAbsolute(reportArg) ? reportArg : path.resolve(root, reportArg))
  : path.join(root, '.artifacts/d1-restore-drill.json');

function wrangler(args: string[], label: string): string {
  try {
    return execFileSync('pnpm', ['exec', 'wrangler', ...args], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: 'true', WRANGLER_WRITE_LOGS: '0' },
      // A full D1 import returns one JSON result per statement. Production
      // backups legitimately exceed Node's 1 MiB execFileSync default.
      maxBuffer: 64 * 1024 * 1024,
    }) ?? '';
  } catch (error) {
    const stdout = typeof error === 'object' && error !== null && 'stdout' in error
      ? String((error as { stdout?: unknown }).stdout ?? '')
      : '';
    const stderr = typeof error === 'object' && error !== null && 'stderr' in error
      ? String((error as { stderr?: unknown }).stderr ?? '')
      : '';
    let stdoutDiagnostic = stdout;
    try {
      const jsonStart = stdout.indexOf('[');
      const parsed = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as Array<{
        success?: boolean;
        error?: string;
      }>;
      stdoutDiagnostic = JSON.stringify(parsed.filter((entry) => entry.success === false || entry.error));
    } catch {
      stdoutDiagnostic = stdout.slice(-2_000);
    }
    const sanitized = `${stdoutDiagnostic}\n${stderr}`
      .replace(/https?:\/\/\S+/gu, '[url]')
      .replace(/Bearer\s+\S+/giu, 'Bearer [redacted]')
      .trim()
      .slice(-2_000);
    throw new Error(`Restore drill failed while ${label}${sanitized ? `: ${sanitized}` : ''}`);
  }
}

function localArgs(): string[] {
  return ['--local', '--persist-to', persistTo, '--config', config];
}

function queryCount(table: string): number | undefined {
  const raw = wrangler([
    'd1', 'execute', 'DB', ...localArgs(), '--json',
    '--command', `SELECT count(*) AS count FROM ${table}`,
  ], `counting ${table}`);
  const parsed = JSON.parse(raw) as Array<{ results?: Array<{ count?: number }> }>;
  return parsed[0]?.results?.[0]?.count;
}

function queryCounts(): Record<string, number> {
  const sql = `SELECT ${manifest.files
    .map((entry) => `(SELECT count(*) FROM \`${entry.table}\`) AS \`${entry.table}\``)
    .join(', ')}`;
  const raw = wrangler([
    'd1', 'execute', 'DB', ...localArgs(), '--json', '--command', sql,
  ], 'collecting row counts');
  const parsed = JSON.parse(raw) as Array<{ results?: Array<Record<string, number>> }>;
  return parsed[0]?.results?.[0] ?? {};
}

function quoteIdentifier(value: string): string {
  return `\`${value.replaceAll('`', '``')}\``;
}

function readTriggers(): SqliteTrigger[] {
  const raw = wrangler([
    'd1', 'execute', 'DB', ...localArgs(), '--json', '--command',
    "SELECT name, sql FROM sqlite_schema WHERE type = 'trigger' AND sql IS NOT NULL ORDER BY name",
  ], 'reading trigger definitions');
  const parsed = JSON.parse(raw) as Array<{ results?: SqliteTrigger[] }>;
  return parsed[0]?.results ?? [];
}

try {
  wrangler(['d1', 'migrations', 'apply', 'DB', ...localArgs()], 'applying migrations');
  const localSchemaTables = parseD1SchemaTableNames(wrangler([
    'd1', 'execute', 'DB', ...localArgs(), '--json', '--command', D1_BACKUP_SCHEMA_QUERY,
  ], 'reading local schema metadata'));
  const localSchemaProfile = detectD1BackupSchemaProfile(localSchemaTables);
  const currentTables = tablesForPhase('all', localSchemaProfile);
  if (restoreTables.some((table) => !currentTables.some((current) => current.name === table.name))) {
    throw new Error('Backup schema profile is newer than the local restore schema');
  }
  const omittedTables = currentTables.filter((table) => !restoreTables.some((restored) => restored.name === table.name));
  // A backup contains already-validated immutable and published rows. Runtime
  // insert/delete gates intentionally reject replaying those rows into a fresh
  // schema (for example legacy audio bindings and published JLPT questions).
  // Preserve the exact migrated trigger DDL, suspend it only for the local
  // restore transaction, then restore every trigger before verification.
  const triggers = readTriggers();
  const dropTriggersPath = path.join(persistTo, 'drop-triggers.sql');
  fs.writeFileSync(
    dropTriggersPath,
    `${triggers.map((trigger) => `DROP TRIGGER IF EXISTS ${quoteIdentifier(trigger.name)};`).join('\n')}\n`,
    'utf8',
  );
  wrangler(['d1', 'execute', 'DB', ...localArgs(), '--file', dropTriggersPath], 'suspending restore-time triggers');
  const deletes = [...currentTables]
    .reverse()
    .map((table) => `DELETE FROM ${table.name}`)
    .join('; ');
  wrangler(['d1', 'execute', 'DB', ...localArgs(), '--command', `PRAGMA defer_foreign_keys = true; ${deletes};`], 'clearing regular tables');

  const restoreSqlPath = path.join(persistTo, 'restore.sql');
  const restoreSql: string[] = [];
  for (const table of restoreTables) {
    const entry = manifest.files.find((file) => file.table === table.name);
    if (!entry) throw new Error(`Backup manifest is missing table ${table.name}`);
    const filePath = path.join(inputDir, entry.file);
    if (!fs.existsSync(filePath)) throw new Error(`Backup file is missing: ${filePath}`);
    const actualSha256 = createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    if (actualSha256 !== entry.sha256) {
      throw new Error(`Backup checksum mismatch for ${table.name}`);
    }
    restoreSql.push(fs.readFileSync(filePath, 'utf8'));
  }
  fs.writeFileSync(restoreSqlPath, `${restoreSql.join('\n')}\n`, 'utf8');
  wrangler(['d1', 'execute', 'DB', ...localArgs(), '--file', restoreSqlPath], 'importing backup SQL');

  const restoreTriggersPath = path.join(persistTo, 'restore-triggers.sql');
  fs.writeFileSync(
    restoreTriggersPath,
    `${triggers.map((trigger) => `${trigger.sql.replace(/;\s*$/, '')};`).join('\n')}\n`,
    'utf8',
  );
  wrangler(['d1', 'execute', 'DB', ...localArgs(), '--file', restoreTriggersPath], 'restoring runtime triggers');

  wrangler([
    'd1', 'execute', 'DB', ...localArgs(), '--command',
    "INSERT INTO vocab_fts(vocab_fts) VALUES('rebuild'); INSERT INTO sentences_fts(sentences_fts) VALUES('rebuild');",
  ], 'rebuilding FTS');

  const failures: string[] = [];
  const counts = queryCounts();
  for (const entry of manifest.files) {
    const actual = counts[entry.table];
    if (actual !== entry.rowCount) {
      failures.push(`${entry.table}: expected=${entry.rowCount} actual=${String(actual)}`);
    }
  }

  const omittedTableCounts: Record<string, number | undefined> = {};
  for (const table of omittedTables) {
    const count = queryCount(table.name);
    omittedTableCounts[table.name] = count;
    if (count !== 0) failures.push(`${table.name}: legacy backup must leave the new table empty`);
  }

  for (const [source, fts] of [['vocab', 'vocab_fts'], ['sentences', 'sentences_fts']] as const) {
    const sourceCount = queryCount(source);
    const ftsCount = queryCount(fts);
    if (sourceCount !== ftsCount) {
      failures.push(`${fts}: expected=${String(sourceCount)} actual=${String(ftsCount)}`);
    }
  }

  const fkRaw = wrangler([
    'd1', 'execute', 'DB', ...localArgs(), '--json', '--command', 'PRAGMA foreign_key_check',
  ], 'checking foreign keys');
  const fk = JSON.parse(fkRaw) as Array<{ results?: unknown[] }>;
  if ((fk[0]?.results?.length ?? 0) > 0) failures.push('foreign_key_check failed');
  let upgrade: Record<string,unknown> | null = null;
  if (exactSchemaUpgrade) {
    if(localSchemaProfile!==manifest.schemaProfile || omittedTables.length) throw new Error('Exact backup-schema restore required before upgrade');
    if(failures.length) throw new Error('Restore failed; upgrade not attempted');
    const legacySnapshots = new Map<string,{columns:string[];sha256:string}>();
    const rowsHash = (table:string,columns:string[]) => {
      const raw=wrangler(['d1','execute','DB',...localArgs(),'--json','--command',`SELECT ${columns.map(quoteIdentifier).join(',')} FROM ${quoteIdentifier(table)}`], 'hashing protected local legacy rows');
      const rows=(JSON.parse(raw) as Array<{results:Record<string,unknown>[]}>)[0]!.results;
      return createHash('sha256').update(JSON.stringify(rows.map(row=>JSON.stringify(row)).sort())).digest('hex');
    };
    for(const table of restoreTables) {
      const raw=wrangler(['d1','execute','DB',...localArgs(),'--json','--command',`PRAGMA table_info(${quoteIdentifier(table.name)})`],'reading local legacy columns');
      const columns=(JSON.parse(raw) as Array<{results:{name:string}[]}>)[0]!.results.map(row=>row.name);
      legacySnapshots.set(table.name,{columns,sha256:rowsHash(table.name,columns)});
    }
    const canonicalDirectory=path.join(root,'packages/db/drizzle-v2');
    const pending=fs.readdirSync(canonicalDirectory).filter(file=>/^\d{4}_.*\.sql$/.test(file) && Number(file.slice(0,4))>Number(manifest.schemaProfile)).sort();
    // 강성호 2026-10-13: 승인된 레슨0031 + 철회 보호0032만 포함한다.0032는 trigger-only이며74-table coverage는 동일하다.
    const approved=['0031_learning_lessons.sql','0032_quiz_publication_guards.sql'].filter(file=>Number(file.slice(0,4))>Number(manifest.schemaProfile));
    if(JSON.stringify(pending)!==JSON.stringify(approved)) throw new Error('Exact approved upgrade set [0031,0032] required');
    for(const file of pending)fs.copyFileSync(path.join(canonicalDirectory,file),path.join(persistTo,'migrations',file));
    wrangler(['d1','migrations','apply','DB',...localArgs()],'upgrading restored local schema');
    for(const [table,before] of legacySnapshots)
      if(rowsHash(table,before.columns)!==before.sha256) failures.push(`upgrade changed legacy rows: ${table}`);
    const upgradedTables=parseD1SchemaTableNames(wrangler(['d1','execute','DB',...localArgs(),'--json','--command',D1_BACKUP_SCHEMA_QUERY],'reading upgraded local schema'));
    const profile=detectD1BackupSchemaProfile(upgradedTables);
    if(profile!=='0031') failures.push('Upgraded schema is not 0031');
    const afterFk=JSON.parse(wrangler(['d1','execute','DB',...localArgs(),'--json','--command','PRAGMA foreign_key_check'],'checking upgraded foreign keys'));
    if(afterFk[0]?.results?.length) failures.push('upgrade foreign_key_check failed');
    const guardTriggers=JSON.parse(wrangler(['d1','execute','DB',...localArgs(),'--json','--command',"SELECT name FROM sqlite_schema WHERE type='trigger' AND name IN ('quiz_attempts_no_replace','quiz_attempts_snapshot_immutable','quiz_attempts_finished_immutable','quiz_attempts_publication_insert','quiz_attempts_publication_grade')"],'checking approved quiz guard triggers'));
    if(guardTriggers[0]?.results?.length!==5)failures.push('0032 quiz guard triggers incomplete');
    upgrade={migration:pending,migrationLedgerTarget:'0032',schemaProfile:profile,regularTables:tablesForPhase('all',profile).length,
      legacyTablesCompared:legacySnapshots.size,legacyRowsUnchanged:!failures.length,
      foreignKeyViolations:afterFk[0]?.results?.length??0};
  }
  const report = {
    generatedAt: new Date().toISOString(),
    backup: inputDir,
    schemaProfile: manifest.schemaProfile,
    legacyProfileInferred: manifest.legacyProfileInferred,
    localSchemaProfile,
    coversLocalSchema: manifest.schemaProfile === localSchemaProfile,
    omittedTableCounts,
    tables: manifest.files.length,
    restoredTriggers: triggers.length,
    counts,
    fts: {
      vocab: { source: queryCount('vocab'), index: queryCount('vocab_fts') },
      sentences: { source: queryCount('sentences'), index: queryCount('sentences_fts') },
    },
    foreignKeyViolations: fk[0]?.results?.length ?? 0,
    failures,
    exactSchemaUpgrade,
    upgrade,
    passed: failures.length === 0,
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (failures.length > 0) throw new Error(`Restore drill failed:\n${failures.join('\n')}`);
  console.log(`Restore drill passed for profile ${manifest.schemaProfile}: ${manifest.files.length} regular tables${omittedTables.length ? `; ${omittedTables.length} newer tables remain empty, not a full ${localSchemaProfile} backup` : ''}.`);
} finally {
  fs.rmSync(persistTo, { recursive: true, force: true });
}
