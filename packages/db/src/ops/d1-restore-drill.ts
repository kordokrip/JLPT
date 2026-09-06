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
const config = path.join(root, 'apps/api/wrangler.toml');
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
    passed: failures.length === 0,
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (failures.length > 0) throw new Error(`Restore drill failed:\n${failures.join('\n')}`);
  console.log(`Restore drill passed for profile ${manifest.schemaProfile}: ${manifest.files.length} regular tables${omittedTables.length ? '; five 0028 tables remain empty, not a full 0028 backup' : ''}.`);
} finally {
  fs.rmSync(persistTo, { recursive: true, force: true });
}
