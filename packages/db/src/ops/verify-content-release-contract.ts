import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { REPO_ROOT } from '../seed/constants.js';
import { countSql, executeSqlFile, parseD1Target, querySql, type D1TargetOptions } from '../seed/d1-cli.js';
import { buildTopikContentContractFixtureSql, TOPIK_CONTENT_CONTRACT_FIXTURE } from '../seed/content-release-contract.js';

type Check = { name: string; expected: string | number; actual: string | number; passed: boolean };

const requested = parseD1Target();
if (requested.remote) {
  throw new Error('Content release contract verification is local-only and never contacts remote D1.');
}

const persistTo = requested.persistTo ?? fs.mkdtempSync(path.join(os.tmpdir(), 'nihongo-n3-content-contract-'));
const generatedPersistTo = !requested.persistTo;
const target: D1TargetOptions = { ...requested, remote: false, persistTo };
const reportArgument = process.argv.find((arg) => arg.startsWith('--report='))?.slice('--report='.length);
const reportPath = reportArgument
  ? (path.isAbsolute(reportArgument) ? reportArgument : path.resolve(REPO_ROOT, reportArgument))
  : path.join(REPO_ROOT, '.artifacts/db/content-release-contract-verification.json');
const sqlPath = path.join(persistTo, 'content-release-contract.sql');
const checks: Check[] = [];

function addCheck(name: string, expected: string | number, actual: string | number): void {
  checks.push({ name, expected, actual, passed: expected === actual });
}

function runSql(statements: readonly string[]): void {
  fs.writeFileSync(sqlPath, `${statements.join('\n\n')}\n`, 'utf8');
  executeSqlFile(target, sqlPath);
}

function expectsSqlFailure(statement: string): 'yes' | 'no' {
  try {
    runSql([statement]);
    return 'no';
  } catch {
    return 'yes';
  }
}

function applyMigrations(): void {
  execFileSync(
    'pnpm',
    ['exec', 'wrangler', 'd1', 'migrations', 'apply', target.database, '--local', '--persist-to', persistTo, '--config', target.config],
    { cwd: REPO_ROOT, env: { ...process.env, CI: 'true', WRANGLER_WRITE_LOGS: '0' }, stdio: 'inherit' },
  );
}

try {
  fs.rmSync(persistTo, { recursive: true, force: true });
  fs.mkdirSync(persistTo, { recursive: true });
  applyMigrations();
  runSql(buildTopikContentContractFixtureSql());

  const fixture = TOPIK_CONTENT_CONTRACT_FIXTURE;
  addCheck('draft release state', 'draft', querySql<{ release_state: string }>(target, `SELECT release_state FROM content_releases WHERE id = '${fixture.release.id}'`)[0]?.release_state ?? 'missing');
  addCheck('provenance completeness', 0, countSql(target, `SELECT count(*) AS count FROM content_release_sources WHERE release_id = '${fixture.release.id}' AND (trim(source_url) = '' OR trim(retrieved_at) = '' OR length(source_sha256) != 64 OR trim(license_id) = '' OR trim(license_url) = '' OR trim(allowed_use) = '' OR trim(attribution_text) = '' OR trim(author) = '' OR trim(first_reviewer) = '' OR trim(second_reviewer) = '' OR trim(reviewed_at) = '')`));
  addCheck('draft content is not public', 0, countSql(target, `SELECT count(*) AS count FROM topik_content_items i JOIN content_releases r ON r.id = i.release_id WHERE r.release_state = 'published'`));
  addCheck('duplicate stable ref rejected', 'yes', expectsSqlFailure(`INSERT INTO topik_content_items (id, release_id, unit_id, learning_track, stable_ref, exam_level, exam_band, section, item_kind, skill, difficulty, prompt_ko, prompt_ja, prompt_en, answer_payload_json, explanation_ko, explanation_ja, explanation_en, source_code) SELECT 'topik-contract-duplicate', release_id, unit_id, learning_track, stable_ref, exam_level, exam_band, section, item_kind, skill, difficulty, prompt_ko, prompt_ja, prompt_en, answer_payload_json, explanation_ko, explanation_ja, explanation_en, source_code FROM topik_content_items WHERE id = '${fixture.item.id}'`));
  addCheck('track isolation rejected', 'yes', expectsSqlFailure(`INSERT INTO topik_curriculum_units (id, release_id, learning_track, stable_ref, exam_level, exam_band, section, title_ko, title_ja, title_en, instruction_languages_json) VALUES ('topik-contract-wrong-track', '${fixture.release.id}', 'jlpt-ja', 'wrong-track', 'TOPIK-I', 'beginner', 'listening', 'x', 'x', 'x', '["ko"]')`));
  addCheck('incomplete provenance rejected', 'yes', expectsSqlFailure(`INSERT INTO content_release_sources (release_id, source_code, source_type, source_url, retrieved_at, source_sha256, license_id, license_url, allowed_use, attribution_text, author, first_reviewer, second_reviewer, reviewed_at) VALUES ('${fixture.release.id}', 'INVALID-PROVENANCE', 'fixture', 'https://example.invalid/invalid', '2026-07-27', '', 'LicenseRef-test', 'https://example.invalid/license', 'test-only', 'test', 'author', 'reviewer-a', 'reviewer-b', '2026-07-27')`));

  runSql([
    `UPDATE content_releases SET release_state = 'automated_checked' WHERE id = '${fixture.release.id}';`,
    `UPDATE content_releases SET release_state = 'human_reviewed' WHERE id = '${fixture.release.id}';`,
    `UPDATE content_releases SET release_state = 'preview' WHERE id = '${fixture.release.id}';`,
    `UPDATE content_releases SET release_state = 'approved' WHERE id = '${fixture.release.id}';`,
    ...['G0', 'G1', 'G2', 'G3', 'G4'].map((gate) => `INSERT INTO content_release_gate_evidence (release_id, gate, gate_state, artifact_key, artifact_sha256, recorded_by) VALUES ('${fixture.release.id}', '${gate}', 'passed', 'evidence/report/v1/${fixture.release.id}/${fixture.release.manifestSha256}/artifact.json', '${fixture.release.manifestSha256}', 'system');`),
    `UPDATE content_releases SET release_state = 'published', published_at = unixepoch() WHERE id = '${fixture.release.id}';`,
  ]);
  addCheck('published content visible', 1, countSql(target, `SELECT count(*) AS count FROM topik_content_items i JOIN content_releases r ON r.id = i.release_id WHERE r.id = '${fixture.release.id}' AND r.release_state = 'published'`));
  addCheck('published item immutable', 'yes', expectsSqlFailure(`UPDATE topik_content_items SET prompt_ko = 'mutated' WHERE id = '${fixture.item.id}'`));
  runSql([`UPDATE content_releases SET release_state = 'withdrawn', withdrawn_at = unixepoch() WHERE id = '${fixture.release.id}';`]);
  addCheck('withdrawn content hidden', 0, countSql(target, `SELECT count(*) AS count FROM topik_content_items i JOIN content_releases r ON r.id = i.release_id WHERE r.id = '${fixture.release.id}' AND r.release_state = 'published'`));
  addCheck('invalid lifecycle transition rejected', 'yes', expectsSqlFailure(`UPDATE content_releases SET release_state = 'draft' WHERE id = '${fixture.release.id}'`));
  addCheck('foreign keys', 0, querySql<Record<string, unknown>>(target, 'PRAGMA foreign_key_check').length);

  const report = { generatedAt: new Date().toISOString(), location: 'local', fixtureLicense: fixture.provenance.licenseId, checks, passed: checks.every((check) => check.passed) };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  for (const check of checks) console.log(`  ${check.passed ? 'OK' : 'FAIL'} ${check.name}: expected=${check.expected} actual=${check.actual}`);
  console.log(`Content release contract report: ${reportPath}`);
  if (!report.passed) process.exitCode = 1;
} finally {
  fs.rmSync(sqlPath, { force: true });
  if (generatedPersistTo) fs.rmSync(persistTo, { recursive: true, force: true });
}
