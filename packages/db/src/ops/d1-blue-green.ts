import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXCLUDED_TRANSIENT_TABLES,
  REBUILT_VIRTUAL_TABLES,
  tablesForPhase,
  type D1TableSpec,
} from './d1-tables.js';

type Phase = 'content' | 'mutable' | 'all';
type Options = {
  source: string;
  target: string;
  phase: Phase;
  config: string;
  outputDir: string;
  execute: boolean;
  replaceTarget: boolean;
};

type TableResult = {
  table: string;
  sourceCount: number;
  targetCount: number | null;
  sourceChecksum: string | null;
  targetChecksum: string | null;
  verified: boolean;
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function parseOptions(): Options {
  const source = argument('source') ?? '';
  const target = argument('target') ?? '';
  const phase = (argument('phase') ?? 'all') as Phase;
  const execute = process.argv.includes('--execute');
  const replaceTarget = process.argv.includes('--replace-target');
  if (!source || !target) throw new Error('--source=<database> and --target=<database> are required');
  if (!['content', 'mutable', 'all'].includes(phase)) throw new Error('--phase must be content, mutable, or all');
  if (source === target) throw new Error('source and target databases must be different');
  if (execute && process.env['ALLOW_PRODUCTION_CHANGE'] !== 'blue-green') {
    throw new Error('set ALLOW_PRODUCTION_CHANGE=blue-green to perform remote writes');
  }
  return {
    source,
    target,
    phase,
    execute,
    replaceTarget,
    config: path.resolve(root, argument('config') ?? 'apps/api/wrangler.toml'),
    outputDir: path.resolve(root, argument('out') ?? `.artifacts/d1-blue-green/${Date.now()}`),
  };
}

function wrangler(args: string[], capture = false): string {
  const output = execFileSync('pnpm', ['exec', 'wrangler', ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  return output ?? '';
}

function exportTable(database: string, table: string, output: string, config: string): void {
  fs.rmSync(output, { force: true });
  wrangler([
    'd1', 'export', database, '--remote', `--table=${table}`,
    '--no-schema', `--output=${output}`, `--config=${config}`,
  ]);
}

function normalizedChecksum(file: string): string {
  const normalized = fs.readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('INSERT INTO'))
    .sort()
    .join('\n');
  return createHash('sha256').update(normalized).digest('hex');
}

function queryJson(database: string, sql: string, config: string): unknown {
  const raw = wrangler([
    'd1', 'execute', database, '--remote', '--json', `--command=${sql}`, `--config=${config}`,
  ], true);
  return JSON.parse(raw) as unknown;
}

function firstResult(value: unknown): Record<string, unknown> {
  if (!Array.isArray(value)) return {};
  const first = value[0] as { results?: unknown[] } | undefined;
  const row = first?.results?.[0];
  return row && typeof row === 'object' ? row as Record<string, unknown> : {};
}

function count(database: string, table: D1TableSpec, config: string): number {
  const where = table.verifyWhere ? ` WHERE ${table.verifyWhere}` : '';
  const row = firstResult(queryJson(database, `SELECT COUNT(*) AS row_count FROM ${table.name}${where}`, config));
  return Number(row['row_count'] ?? 0);
}

function deleteTargetRows(options: Options, tables: D1TableSpec[]): void {
  const statements = [...tables].reverse().map((table) => `DELETE FROM ${table.name}`).join('; ');
  wrangler([
    'd1', 'execute', options.target, '--remote', `--command=PRAGMA defer_foreign_keys = true; ${statements};`,
    `--config=${options.config}`, '--yes',
  ]);
}

function importTable(options: Options, file: string): void {
  wrangler([
    'd1', 'execute', options.target, '--remote', `--file=${file}`,
    `--config=${options.config}`, '--yes',
  ]);
}

function pruneSessions(options: Options): void {
  wrangler([
    'd1', 'execute', options.target, '--remote',
    '--command=DELETE FROM auth_sessions WHERE revoked_at IS NOT NULL OR expires_at <= unixepoch()',
    `--config=${options.config}`, '--yes',
  ]);
}

function rebuildFts(options: Options): void {
  wrangler([
    'd1', 'execute', options.target, '--remote',
    "--command=INSERT INTO vocab_fts(vocab_fts) VALUES('rebuild'); INSERT INTO sentences_fts(sentences_fts) VALUES('rebuild');",
    `--config=${options.config}`, '--yes',
  ]);
}

function verifyChecksum(options: Options, table: D1TableSpec, sourceFile: string): string | null {
  if (!table.checksum) return null;
  const targetFile = path.join(options.outputDir, `${table.name}.target.sql`);
  exportTable(options.target, table.name, targetFile, options.config);
  return normalizedChecksum(targetFile);
}

function main(): void {
  const options = parseOptions();
  const tables = tablesForPhase(options.phase);
  fs.mkdirSync(options.outputDir, { recursive: true });

  if (!options.execute) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      ...options,
      tables: tables.map((table) => table.name),
      excludedTransientTables: EXCLUDED_TRANSIENT_TABLES,
      rebuiltVirtualTables: REBUILT_VIRTUAL_TABLES,
    }, null, 2));
    return;
  }
  if (!options.replaceTarget) throw new Error('--replace-target is required for deterministic transfer');

  const sourceFiles = new Map<string, string>();
  for (const table of tables) {
    const file = path.join(options.outputDir, `${table.name}.source.sql`);
    exportTable(options.source, table.name, file, options.config);
    sourceFiles.set(table.name, file);
  }

  deleteTargetRows(options, tables);
  for (const table of tables) importTable(options, sourceFiles.get(table.name)!);
  if (tables.some((table) => table.name === 'auth_sessions')) pruneSessions(options);
  if (options.phase === 'content' || options.phase === 'all') rebuildFts(options);

  const results: TableResult[] = tables.map((table) => {
    const sourceFile = sourceFiles.get(table.name)!;
    const sourceCount = count(options.source, table, options.config);
    const targetCount = count(options.target, table, options.config);
    const sourceChecksum = table.checksum ? normalizedChecksum(sourceFile) : null;
    const targetChecksum = verifyChecksum(options, table, sourceFile);
    return {
      table: table.name,
      sourceCount,
      targetCount,
      sourceChecksum,
      targetChecksum,
      verified: sourceCount === targetCount && (!table.checksum || sourceChecksum === targetChecksum),
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    source: options.source,
    target: options.target,
    phase: options.phase,
    results,
  };
  fs.writeFileSync(path.join(options.outputDir, 'verification.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (results.some((result) => !result.verified)) process.exitCode = 1;
}

main();
