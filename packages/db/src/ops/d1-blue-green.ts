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
  targetCount: number;
  countDelta: number;
  sourceChecksum: string | null;
  targetChecksum: string | null;
  checksumMatches: boolean | null;
  verified: boolean;
};

type FtsParityResult = {
  sourceTable: 'vocab' | 'sentences';
  ftsTable: 'vocab_fts' | 'sentences_fts';
  expectedCount: number;
  actualCount: number;
  baselineCount: number;
  parityMatches: boolean;
  baselineMatches: boolean;
  verified: boolean;
};

type ReportMode = 'dry-run' | 'before' | 'after';

type VerificationReport = {
  generatedAt: string;
  mode: ReportMode;
  source: string;
  target: string;
  phase: Phase;
  results: TableResult[];
  ftsParity: FtsParityResult[];
  summary: {
    tableCount: number;
    verifiedTables: number;
    mismatchedTables: number;
    verifiedFtsPairs: number;
    mismatchedFtsPairs: number;
    verified: boolean;
  };
};

const FTS_BASELINES = {
  vocab: 3_300,
  sentences: 1_112,
} as const;

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
  return countTable(database, table.name, config, where);
}

function countTable(database: string, table: string, config: string, where = ''): number {
  const row = firstResult(queryJson(database, `SELECT COUNT(*) AS row_count FROM ${table}${where}`, config));
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

function collectFtsParity(options: Options): FtsParityResult[] {
  if (options.phase === 'mutable') return [];

  return ([
    ['vocab', 'vocab_fts'],
    ['sentences', 'sentences_fts'],
  ] as const).map(([sourceTable, ftsTable]) => {
    const expectedCount = countTable(options.target, sourceTable, options.config);
    const actualCount = countTable(options.target, ftsTable, options.config);
    const baselineCount = FTS_BASELINES[sourceTable];
    const parityMatches = expectedCount === actualCount;
    const baselineMatches = expectedCount === baselineCount;
    return {
      sourceTable,
      ftsTable,
      expectedCount,
      actualCount,
      baselineCount,
      parityMatches,
      baselineMatches,
      verified: parityMatches && baselineMatches,
    };
  });
}

function collectVerification(
  options: Options,
  tables: D1TableSpec[],
  mode: ReportMode,
): { report: VerificationReport; sourceFiles: Map<string, string> } {
  const sourceFiles = new Map<string, string>();
  const results = tables.map((table) => {
    const sourceFile = path.join(options.outputDir, `${table.name}.source.${mode}.sql`);
    const targetFile = path.join(options.outputDir, `${table.name}.target.${mode}.sql`);
    exportTable(options.source, table.name, sourceFile, options.config);
    exportTable(options.target, table.name, targetFile, options.config);
    sourceFiles.set(table.name, sourceFile);

    const sourceCount = count(options.source, table, options.config);
    const targetCount = count(options.target, table, options.config);
    const sourceChecksum = table.checksum ? normalizedChecksum(sourceFile) : null;
    const targetChecksum = table.checksum ? normalizedChecksum(targetFile) : null;
    const checksumMatches = table.checksum ? sourceChecksum === targetChecksum : null;
    return {
      table: table.name,
      sourceCount,
      targetCount,
      countDelta: targetCount - sourceCount,
      sourceChecksum,
      targetChecksum,
      checksumMatches,
      verified: sourceCount === targetCount && checksumMatches !== false,
    };
  });
  const ftsParity = collectFtsParity(options);
  const mismatchedTables = results.filter((result) => !result.verified).length;
  const mismatchedFtsPairs = ftsParity.filter((result) => !result.verified).length;
  const report: VerificationReport = {
    generatedAt: new Date().toISOString(),
    mode,
    source: options.source,
    target: options.target,
    phase: options.phase,
    results,
    ftsParity,
    summary: {
      tableCount: results.length,
      verifiedTables: results.length - mismatchedTables,
      mismatchedTables,
      verifiedFtsPairs: ftsParity.length - mismatchedFtsPairs,
      mismatchedFtsPairs,
      verified: mismatchedTables === 0 && mismatchedFtsPairs === 0,
    },
  };
  return { report, sourceFiles };
}

function writeReport(options: Options, report: VerificationReport, fileName: string): void {
  fs.writeFileSync(path.join(options.outputDir, fileName), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

function main(): void {
  const options = parseOptions();
  const tables = tablesForPhase(options.phase);
  fs.mkdirSync(options.outputDir, { recursive: true });

  if (!options.execute) {
    const { report } = collectVerification(options, tables, 'dry-run');
    writeReport(options, report, 'verification-before.json');
    console.log(JSON.stringify({
      excludedTransientTables: EXCLUDED_TRANSIENT_TABLES,
      rebuiltVirtualTables: REBUILT_VIRTUAL_TABLES,
      note: 'Dry-run is read-only. Mismatches are reported but do not change either database.',
    }, null, 2));
    return;
  }
  if (!options.replaceTarget) throw new Error('--replace-target is required for deterministic transfer');

  const before = collectVerification(options, tables, 'before');
  writeReport(options, before.report, 'verification-before.json');

  deleteTargetRows(options, tables);
  for (const table of tables) importTable(options, before.sourceFiles.get(table.name)!);
  if (tables.some((table) => table.name === 'auth_sessions')) pruneSessions(options);
  if (options.phase === 'content' || options.phase === 'all') rebuildFts(options);

  const after = collectVerification(options, tables, 'after');
  writeReport(options, after.report, 'verification-after.json');
  fs.copyFileSync(
    path.join(options.outputDir, 'verification-after.json'),
    path.join(options.outputDir, 'verification.json'),
  );
  if (!after.report.summary.verified) process.exitCode = 1;
}

main();
