import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { REPO_ROOT } from '../seed/constants.js';
import { executeSqlFile, countSql, parseD1Target, querySql, type D1TargetOptions } from '../seed/d1-cli.js';
import {
  buildTopikPlacementSeedPlan,
  TOPIK_PLACEMENT_QUESTIONS,
  TOPIK_TRACK,
} from '../seed/topik-placement-bank.js';

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

  const plan = buildTopikPlacementSeedPlan();
  applyMigrations();
  fs.writeFileSync(seedSqlPath, `${plan.statements.join('\n\n')}\n`, 'utf8');
  executeSqlFile(target, seedSqlPath);

  addCheck(
    'placement questions',
    plan.manifest.questions.expectedRows,
    countSql(target, `SELECT count(*) AS count FROM topik_placement_questions WHERE learning_track = '${TOPIK_TRACK}'`),
  );
  addCheck(
    'track content source',
    1,
    countSql(target, `SELECT count(*) AS count FROM track_content_sources WHERE learning_track = '${TOPIK_TRACK}' AND source_code = '${plan.manifest.source.code}'`),
  );
  addCheck(
    'exam levels',
    plan.manifest.examLevels.length,
    countSql(target, `SELECT count(*) AS count FROM track_exam_levels WHERE learning_track = '${TOPIK_TRACK}'`),
  );
  addCheck(
    'blank required fields',
    0,
    countSql(
      target,
      `SELECT count(*) AS count FROM topik_placement_questions
       WHERE trim(prompt_ko) = '' OR trim(prompt_en) = '' OR trim(gloss_en) = ''
          OR trim(choices_json) = '' OR trim(explanation_en) = '' OR trim(explanation_ko) = ''
          OR trim(source_code) = '' OR trim(author_reviewer) = '' OR trim(second_reviewer) = ''
          OR trim(reviewed_at) = ''`,
    ),
  );
  addCheck(
    'invalid answer index',
    0,
    countSql(
      target,
      'SELECT count(*) AS count FROM topik_placement_questions WHERE answer_index < 0 OR answer_index >= json_array_length(choices_json)',
    ),
  );
  addCheck(
    'duplicate prompt',
    0,
    countSql(
      target,
      'SELECT count(*) AS count FROM (SELECT prompt_ko FROM topik_placement_questions GROUP BY prompt_ko HAVING count(*) > 1)',
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
     WHERE id = '${plan.manifest.seedRunId}' AND learning_track = '${TOPIK_TRACK}'`,
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
  addCheck('manifest ids', TOPIK_PLACEMENT_QUESTIONS.length, countSql(target, `SELECT count(*) AS count FROM topik_placement_questions WHERE id LIKE 'topik-placement-v1-%'`));

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
