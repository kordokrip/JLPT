import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { REPO_ROOT } from '../seed/constants.js';
import { executeSqlFile, countSql, parseD1Target, querySql, type D1TargetOptions } from '../seed/d1-cli.js';
import {
  buildTopikPlacementV2SeedPlan,
  TOPIK_PLACEMENT_V2_QUESTIONS,
  TOPIK_PLACEMENT_V2_TRACK,
} from '../seed/topik-placement-bank-v2.js';

type Check = {
  name: string;
  expected: number | string;
  actual: number | string;
  passed: boolean;
};

const requestedTarget = parseD1Target();
if (requestedTarget.remote) {
  throw new Error('TOPIK placement verification is local-only. It must not write a remote D1 database.');
}

const generatedPersistTo = !requestedTarget.persistTo;
const persistTo = requestedTarget.persistTo ?? fs.mkdtempSync(path.join(os.tmpdir(), 'nihongo-n3-topik-placement-'));
const target: D1TargetOptions = { ...requestedTarget, remote: false, persistTo };
const reportPath = path.resolve(
  process.argv.find((arg) => arg.startsWith('--report='))?.slice('--report='.length)
    ?? path.join(REPO_ROOT, '.artifacts/db/topik-placement-verification.json'),
);
const seedSqlPath = path.join(persistTo, 'topik-placement-seed.sql');
const checks: Check[] = [];

function addCheck(name: string, expected: number | string, actual: number | string): void {
  checks.push({ name, expected, actual, passed: expected === actual });
}

function applyMigrations(): void {
  execFileSync(
    'pnpm',
    [
      'exec', 'wrangler', 'd1', 'migrations', 'apply', target.database, '--local',
      '--persist-to', persistTo, '--config', target.config,
    ],
    { cwd: REPO_ROOT, stdio: 'inherit' },
  );
}

function main(): void {
  fs.rmSync(persistTo, { recursive: true, force: true });
  fs.mkdirSync(persistTo, { recursive: true });

  const plan = buildTopikPlacementV2SeedPlan();
  applyMigrations();
  fs.writeFileSync(seedSqlPath, `${plan.statements.join('\n\n')}\n`, 'utf8');
  executeSqlFile(target, seedSqlPath);

  addCheck(
    'placement questions',
    plan.manifest.questions.expectedRows,
    countSql(target, `SELECT count(*) AS count FROM topik_placement_questions WHERE learning_track = '${TOPIK_PLACEMENT_V2_TRACK}' AND bank_version = 'v2'`),
  );
  addCheck(
    'track content source',
    1,
    countSql(target, `SELECT count(*) AS count FROM track_content_sources WHERE learning_track = '${TOPIK_PLACEMENT_V2_TRACK}' AND source_code = '${plan.manifest.source.code}'`),
  );
  addCheck(
    'exam levels',
    plan.manifest.examLevels.length,
    countSql(target, `SELECT count(*) AS count FROM track_exam_levels WHERE learning_track = '${TOPIK_PLACEMENT_V2_TRACK}'`),
  );
  addCheck(
    'blank required fields',
    0,
    countSql(
      target,
      `SELECT count(*) AS count FROM topik_placement_questions WHERE bank_version = 'v2' AND (
          trim(prompt_ko) = '' OR trim(prompt_en) = '' OR trim(gloss_en) = ''
          OR trim(choices_json) = '' OR trim(explanation_en) = '' OR trim(explanation_ko) = ''
          OR trim(source_code) = '' OR trim(author_reviewer) = '' OR trim(second_reviewer) = ''
          OR trim(reviewed_at) = '')`,
    ),
  );
  addCheck(
    'invalid answer index',
    0,
    countSql(
      target,
      "SELECT count(*) AS count FROM topik_placement_questions WHERE bank_version = 'v2' AND (answer_index < 0 OR answer_index >= json_array_length(choices_json))",
    ),
  );
  addCheck(
    'answer choice positions',
    4,
    countSql(target, "SELECT count(DISTINCT answer_index) AS count FROM topik_placement_questions WHERE bank_version = 'v2'"),
  );
  addCheck(
    'unbalanced answer distribution',
    0,
    countSql(
      target,
      "SELECT count(*) AS count FROM (SELECT answer_index FROM topik_placement_questions WHERE bank_version = 'v2' GROUP BY answer_index HAVING count(*) != 6)",
    ),
  );
  addCheck(
    'duplicate prompt',
    0,
    countSql(
      target,
      "SELECT count(*) AS count FROM (SELECT section, prompt_ko FROM topik_placement_questions WHERE bank_version = 'v2' GROUP BY section, prompt_ko HAVING count(*) > 1)",
    ),
  );
  addCheck(
    'foreign_key_check',
    0,
    querySql<Record<string, unknown>>(target, 'PRAGMA foreign_key_check').length,
  );

  const run = querySql<{ manifest_sha256: string; parser_version: string }>(
    target,
    `SELECT manifest_sha256, parser_version FROM track_content_seed_runs
     WHERE id = '${plan.manifest.seedRunId}' AND learning_track = '${TOPIK_PLACEMENT_V2_TRACK}'`,
  )[0];
  addCheck('seed run manifest checksum', plan.manifest.manifestSha256, run?.manifest_sha256 ?? 'missing');
  addCheck('seed run parser version', plan.manifest.parserVersion, run?.parser_version ?? 'missing');

  const source = querySql<{ source_checksum: string; parser_version: string }>(
    target,
    `SELECT source_checksum, parser_version FROM track_content_seed_sources
     WHERE seed_run_id = '${plan.manifest.seedRunId}' AND source_code = '${plan.manifest.source.code}'`,
  )[0];
  addCheck('source checksum', plan.manifest.source.sourceChecksum, source?.source_checksum ?? 'missing');
  addCheck('source parser version', plan.manifest.parserVersion, source?.parser_version ?? 'missing');
  addCheck('manifest ids', TOPIK_PLACEMENT_V2_QUESTIONS.length, countSql(target, "SELECT count(*) AS count FROM topik_placement_questions WHERE id LIKE 'topik-placement-v2-%'"));
  addCheck('listening rows', 12, countSql(target, "SELECT count(*) AS count FROM topik_placement_questions WHERE bank_version = 'v2' AND section = 'listening'"));
  addCheck('reading rows', 12, countSql(target, "SELECT count(*) AS count FROM topik_placement_questions WHERE bank_version = 'v2' AND section = 'reading'"));
  addCheck('listening script gaps', 0, countSql(target, "SELECT count(*) AS count FROM topik_placement_questions WHERE bank_version = 'v2' AND section = 'listening' AND trim(COALESCE(audio_script_ko, '')) = ''"));
  addCheck('unpublished rows', 0, countSql(target, "SELECT count(*) AS count FROM topik_placement_questions WHERE bank_version = 'v2' AND is_published != 1"));
  addCheck('attempt table', 'topik_placement_attempts', querySql<{ name: string }>(target, "SELECT name FROM sqlite_master WHERE type='table' AND name='topik_placement_attempts'")[0]?.name ?? 'missing');

  for (const check of checks) {
    console.log(`  ${check.passed ? 'OK' : 'FAIL'} ${check.name}: expected=${check.expected} actual=${check.actual}`);
  }
  const report = {
    generatedAt: new Date().toISOString(),
    target: { database: target.database, location: 'local' },
    manifest: plan.manifest,
    checks,
    passed: checks.every((check) => check.passed),
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`TOPIK placement verification report: ${reportPath}`);
  if (!report.passed) process.exitCode = 1;
}

try {
  main();
} finally {
  if (generatedPersistTo) fs.rmSync(persistTo, { recursive: true, force: true });
}
