import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { D1_TRANSFER_TABLES } from './d1-tables.js';

interface BackupManifest {
  files: Array<{ table: string; file: string; rowCount: number; sha256: string }>;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const input = process.argv.find((arg) => arg.startsWith('--input='))?.slice('--input='.length);
if (!input) throw new Error('--input=<backup directory> is required');
const inputDir = path.resolve(root, input);
const manifest = JSON.parse(
  fs.readFileSync(path.join(inputDir, 'manifest.json'), 'utf8'),
) as BackupManifest;
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
    }) ?? '';
  } catch {
    throw new Error(`Restore drill failed while ${label}`);
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

try {
  const expectedTables = D1_TRANSFER_TABLES.map((table) => table.name).sort();
  const manifestTables = manifest.files.map((entry) => entry.table).sort();
  if (new Set(manifestTables).size !== manifestTables.length ||
      JSON.stringify(manifestTables) !== JSON.stringify(expectedTables)) {
    throw new Error('Backup manifest table allowlist does not match the canonical transfer table list');
  }

  wrangler(['d1', 'migrations', 'apply', 'DB', ...localArgs()], 'applying migrations');
  const deletes = [...D1_TRANSFER_TABLES]
    .reverse()
    .map((table) => `DELETE FROM ${table.name}`)
    .join('; ');
  wrangler(['d1', 'execute', 'DB', ...localArgs(), '--command', `PRAGMA defer_foreign_keys = true; ${deletes};`], 'clearing regular tables');

  const restoreSqlPath = path.join(persistTo, 'restore.sql');
  const restoreSql: string[] = [];
  for (const table of D1_TRANSFER_TABLES) {
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
    tables: manifest.files.length,
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
  console.log(`Restore drill passed for ${manifest.files.length} regular tables.`);
} finally {
  fs.rmSync(persistTo, { recursive: true, force: true });
}
