import fs from 'node:fs';
import path from 'node:path';

import {
  buildContentSeedPlan,
  type ContentManifest,
  type ContentManifestEntry,
} from './content-manifest.js';
import { argValue, countSql, parseD1Target, querySql } from './d1-cli.js';
import { REPO_ROOT } from './constants.js';

interface VerificationCheck {
  name: string;
  expected: number | string;
  actual: number | string;
  passed: boolean;
  blocking: boolean;
}

const target = parseD1Target();
const manifestPath = path.resolve(
  argValue('--manifest') ?? path.join(REPO_ROOT, '.artifacts/db/content-manifest.json'),
);
const reportPath = path.resolve(
  argValue('--report') ?? path.join(REPO_ROOT, '.artifacts/db/verification-report.json'),
);
const currentManifest = buildContentSeedPlan().manifest;
const seededManifest = readManifest(manifestPath);
const checks: VerificationCheck[] = [];
const requireAudio = process.argv.includes('--require-audio');

function readManifest(filePath: string): ContentManifest {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Seed manifest is missing: ${filePath}. Run seed before verify.`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as ContentManifest;
}

function addCheck(
  name: string,
  expected: number | string,
  actual: number | string,
  blocking = true,
): void {
  checks.push({ name, expected, actual, passed: expected === actual, blocking });
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function rowCountSql(entry: ContentManifestEntry): string {
  if (entry.selector.kind === 'source') {
    return `SELECT count(*) AS count FROM ${entry.table} WHERE source_id = (SELECT id FROM sources WHERE code = ${sqlLiteral(entry.selector.value)})`;
  }
  if (entry.selector.kind === 'level') {
    const column = entry.table === 'kanji' ? 'jlpt_level' : 'level';
    return `SELECT count(*) AS count FROM ${entry.table} WHERE ${column} = ${sqlLiteral(entry.selector.value)}`;
  }
  return `SELECT count(*) AS count FROM ${entry.table}`;
}

function compareManifests(expected: ContentManifest, actual: ContentManifest): void {
  const expectedEntries = new Map(expected.entries.map((entry) => [entry.sourceCode, entry]));
  for (const entry of actual.entries) {
    const seeded = expectedEntries.get(entry.sourceCode);
    addCheck(`manifest:${entry.sourceCode}:present`, 'yes', seeded ? 'yes' : 'no');
    if (!seeded) continue;
    addCheck(`manifest:${entry.sourceCode}:sha256`, entry.sha256, seeded.sha256);
    addCheck(`manifest:${entry.sourceCode}:rows`, entry.expectedRows, seeded.expectedRows);
    addCheck(
      `manifest:${entry.sourceCode}:categories`,
      entry.expectedCategories,
      seeded.expectedCategories,
    );
  }
}

console.log(`\nD1 verification (${target.remote ? 'remote' : 'local'}, database=${target.database})\n`);
compareManifests(currentManifest, seededManifest);

for (const entry of currentManifest.entries) {
  addCheck(
    `rows:${entry.sourceCode}:${entry.table}`,
    entry.expectedRows,
    countSql(target, rowCountSql(entry)),
  );
  if (entry.expectedCategories > 0) {
    addCheck(
      `categories:${entry.sourceCode}`,
      entry.expectedCategories,
      countSql(
        target,
        `SELECT count(*) AS count FROM categories WHERE source_id = (SELECT id FROM sources WHERE code = ${sqlLiteral(entry.sourceCode)})`,
      ),
    );
  }
}

for (const [ftsTable, sourceTable] of [
  ['vocab_fts', 'vocab'],
  ['sentences_fts', 'sentences'],
] as const) {
  addCheck(
    `fts:${ftsTable}:exists`,
    1,
    countSql(
      target,
      `SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name = ${sqlLiteral(ftsTable)}`,
    ),
  );
  addCheck(
    `fts:${ftsTable}:parity`,
    countSql(target, `SELECT count(*) AS count FROM ${sourceTable}`),
    countSql(target, `SELECT count(*) AS count FROM ${ftsTable}`),
  );
}

const requiredFieldChecks: Array<[string, string]> = [
  ['vocab required fields', "SELECT count(*) AS count FROM vocab WHERE trim(ja) = '' OR trim(kana) = '' OR trim(ko) = ''"],
  ['grammar required fields', "SELECT count(*) AS count FROM grammar WHERE trim(pattern) = '' OR trim(meaning_ko) = ''"],
  ['kanji required fields', "SELECT count(*) AS count FROM kanji WHERE trim(char) = '' OR trim(meaning_ko) = ''"],
  ['sentences required fields', "SELECT count(*) AS count FROM sentences WHERE trim(ja) = '' OR trim(ko) = ''"],
  ['sysprog required fields', "SELECT count(*) AS count FROM sysprog_terms WHERE trim(ja) = '' OR trim(ko) = ''"],
  ['vocab duplicates', 'SELECT count(*) AS count FROM (SELECT level, ja, kana FROM vocab GROUP BY level, ja, kana HAVING count(*) > 1)'],
  ['grammar duplicates', 'SELECT count(*) AS count FROM (SELECT level, pattern FROM grammar GROUP BY level, pattern HAVING count(*) > 1)'],
  ['sentence duplicates', 'SELECT count(*) AS count FROM (SELECT source_id, level, register, seq_no FROM sentences GROUP BY source_id, level, register, seq_no HAVING count(*) > 1)'],
];
for (const [name, sql] of requiredFieldChecks) {
  addCheck(name, 0, countSql(target, sql));
}

const fkViolations = querySql<Record<string, unknown>>(target, 'PRAGMA foreign_key_check');
addCheck('foreign_key_check', 0, fkViolations.length);

const audioMissing = countSql(
  target,
  'SELECT (SELECT count(*) FROM vocab WHERE audio_r2_key IS NULL) + (SELECT count(*) FROM kanji WHERE audio_r2_key IS NULL) + (SELECT count(*) FROM sentences WHERE audio_r2_key IS NULL) AS count',
);
addCheck('audio_r2_key missing (R2 gate)', 0, audioMissing, requireAudio);

for (const check of checks) {
  const icon = check.passed ? 'OK' : check.blocking ? 'FAIL' : 'WARN';
  console.log(`  ${icon.padEnd(4)} ${check.name} expected=${check.expected} actual=${check.actual}`);
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
  reportPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), target, checks }, null, 2)}\n`,
  'utf8',
);

const failures = checks.filter((check) => check.blocking && !check.passed);
if (failures.length > 0) {
  console.error(`\nVerification failed: ${failures.length} blocking check(s). Report: ${reportPath}\n`);
  process.exit(1);
}
console.log(`\nVerification passed. Report: ${reportPath}\n`);
