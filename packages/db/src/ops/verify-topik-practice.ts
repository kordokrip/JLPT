import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { REPO_ROOT } from '../seed/constants.js';
import { countSql, executeSqlFile, parseD1Target, querySql, type D1TargetOptions } from '../seed/d1-cli.js';
import {
  buildTopikPracticeV2SeedPlan,
  TOPIK_PRACTICE_V2_BANK_VERSION,
  TOPIK_PRACTICE_V2_QUESTIONS,
  TOPIK_PRACTICE_V2_TRACK,
} from '../seed/topik-practice-bank-v2.js';

type Check = { name: string; expected: number | string; actual: number | string; passed: boolean };

const requestedTarget = parseD1Target();
const generatedPersistTo = !requestedTarget.remote && !requestedTarget.persistTo;
const persistTo = requestedTarget.persistTo ?? fs.mkdtempSync(path.join(os.tmpdir(), 'nihongo-n3-topik-practice-'));
const target: D1TargetOptions = requestedTarget.remote
  ? requestedTarget
  : { ...requestedTarget, remote: false, persistTo };
const reportPath = path.resolve(process.argv.find((arg) => arg.startsWith('--report='))?.slice('--report='.length) ?? path.join(REPO_ROOT, '.artifacts/db/topik-practice-verification.json'));
const seedSqlPath = path.join(persistTo, 'topik-practice-seed.sql');
const checks: Check[] = [];

function addCheck(name: string, expected: number | string, actual: number | string) {
  checks.push({ name, expected, actual, passed: expected === actual });
}

function applyMigrations() {
  execFileSync('pnpm', ['exec', 'wrangler', 'd1', 'migrations', 'apply', target.database, '--local', '--persist-to', persistTo, '--config', target.config], { cwd: REPO_ROOT, stdio: 'inherit' });
}

try {
  const plan = buildTopikPracticeV2SeedPlan();
  if (!target.remote) {
    if (generatedPersistTo) {
      fs.rmSync(persistTo, { recursive: true, force: true });
      fs.mkdirSync(persistTo, { recursive: true });
      applyMigrations();
    }
    fs.writeFileSync(seedSqlPath, `${plan.statements.join('\n\n')}\n`, 'utf8');
    executeSqlFile(target, seedSqlPath);
  }

  const scope = `learning_track = '${TOPIK_PRACTICE_V2_TRACK}' AND bank_version = '${TOPIK_PRACTICE_V2_BANK_VERSION}'`;
  addCheck('published v2 practice questions', plan.manifest.questions.expectedRows, countSql(target, `SELECT count(*) AS count FROM topik_practice_questions WHERE ${scope} AND is_published = 1`));
  addCheck('published v1 questions', 0, countSql(target, `SELECT count(*) AS count FROM topik_practice_questions WHERE learning_track = '${TOPIK_PRACTICE_V2_TRACK}' AND bank_version = 'v1' AND is_published = 1`));
  addCheck('TOPIK I listening', 60, countSql(target, `SELECT count(*) AS count FROM topik_practice_questions WHERE ${scope} AND exam_level = 'TOPIK-I' AND section = 'listening'`));
  addCheck('TOPIK I reading', 60, countSql(target, `SELECT count(*) AS count FROM topik_practice_questions WHERE ${scope} AND exam_level = 'TOPIK-I' AND section = 'reading'`));
  addCheck('TOPIK II listening', 60, countSql(target, `SELECT count(*) AS count FROM topik_practice_questions WHERE ${scope} AND exam_level = 'TOPIK-II' AND section = 'listening'`));
  addCheck('TOPIK II writing', 60, countSql(target, `SELECT count(*) AS count FROM topik_practice_questions WHERE ${scope} AND exam_level = 'TOPIK-II' AND section = 'writing'`));
  addCheck('TOPIK II reading', 60, countSql(target, `SELECT count(*) AS count FROM topik_practice_questions WHERE ${scope} AND exam_level = 'TOPIK-II' AND section = 'reading'`));
  addCheck('blank multilingual fields', 0, countSql(target, `SELECT count(*) AS count FROM topik_practice_questions WHERE ${scope} AND (
    trim(prompt_ko) = '' OR trim(prompt_ja) = '' OR trim(prompt_en) = '' OR trim(explanation_ko) = '' OR trim(explanation_ja) = '' OR trim(explanation_en) = ''
    OR trim(source_code) = '' OR trim(author_reviewer) = '' OR trim(second_reviewer) = '' OR trim(reviewed_at) = '')`));
  addCheck('invalid choice answers', 0, countSql(target, `SELECT count(*) AS count FROM topik_practice_questions WHERE ${scope} AND question_type = 'choice' AND (answer_index IS NULL OR answer_index < 0 OR answer_index >= json_array_length(choices_json))`));
  addCheck('invalid writing answers', 0, countSql(target, `SELECT count(*) AS count FROM topik_practice_questions WHERE ${scope} AND question_type = 'writing' AND (answer_index IS NOT NULL OR json_array_length(choices_json) != 0 OR trim(COALESCE(sample_answer_ko, '')) = '' OR trim(COALESCE(sample_answer_ja, '')) = '' OR trim(COALESCE(sample_answer_en, '')) = '')`));
  addCheck('R2 pronunciation references', 0, countSql(target, `SELECT count(*) AS count FROM topik_practice_questions WHERE ${scope} AND audio_r2_key IS NOT NULL`));
  addCheck('duplicate prompts', 0, countSql(target, `SELECT count(*) AS count FROM (SELECT exam_level, section, prompt_ko FROM topik_practice_questions WHERE ${scope} GROUP BY exam_level, section, prompt_ko HAVING count(*) > 1)`));
  for (const [examLevel, section] of [['TOPIK-I', 'listening'], ['TOPIK-I', 'reading'], ['TOPIK-II', 'listening'], ['TOPIK-II', 'reading']] as const) {
    for (const answerIndex of [0, 1, 2, 3] as const) {
      addCheck(`${examLevel} ${section} answer position ${answerIndex + 1}`, 15, countSql(target, `SELECT count(*) AS count FROM topik_practice_questions WHERE ${scope} AND exam_level = '${examLevel}' AND section = '${section}' AND answer_index = ${answerIndex}`));
    }
  }
  addCheck('foreign keys', 0, querySql<Record<string, unknown>>(target, 'PRAGMA foreign_key_check').length);
  const run = querySql<{ manifest_sha256: string; parser_version: string }>(target, `SELECT manifest_sha256, parser_version FROM track_content_seed_runs WHERE id = '${plan.manifest.seedRunId}'`)[0];
  addCheck('seed manifest', plan.manifest.manifestSha256, run?.manifest_sha256 ?? 'missing');
  addCheck('seed parser', plan.manifest.parserVersion, run?.parser_version ?? 'missing');
  addCheck('published quality-ledger entries', TOPIK_PRACTICE_V2_QUESTIONS.length, countSql(target, `SELECT count(*) AS count FROM content_quality_audits WHERE learning_track = '${TOPIK_PRACTICE_V2_TRACK}' AND content_type = 'topik-practice' AND content_version = '${plan.manifest.contentVersion}' AND automated_status = 'passed' AND author_review_status = 'signed' AND adversarial_review_status = 'signed' AND release_state = 'published'`));
  addCheck('manifest IDs', TOPIK_PRACTICE_V2_QUESTIONS.length, countSql(target, `SELECT count(*) AS count FROM topik_practice_questions WHERE ${scope} AND id LIKE 'topik-practice-v2-%'`));
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify({ generated_at: new Date().toISOString(), target: target.database, manifest: plan.manifest, checks }, null, 2)}\n`, 'utf8');
  for (const check of checks) console.log(`  ${check.passed ? 'OK' : 'FAIL'} ${check.name}: expected=${check.expected} actual=${check.actual}`);
  if (checks.some((check) => !check.passed)) process.exitCode = 1;
} finally {
  fs.rmSync(seedSqlPath, { force: true });
  if (generatedPersistTo) fs.rmSync(persistTo, { recursive: true, force: true });
}
