import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { REPO_ROOT } from '../seed/constants.js';
import {
  countSql,
  executeSqlFile,
  parseD1Target,
  querySql,
  type D1TargetOptions,
} from '../seed/d1-cli.js';
import {
  buildTopikIPreviewCandidateSql,
  loadTopikIPreviewCandidate,
} from '../seed/topik-i-preview-candidate.js';

type Check = { name: string; expected: string | number; actual: string | number; passed: boolean };

const requested = parseD1Target();
if (requested.remote) {
  throw new Error('TOPIK I preview candidate verification is local-only and never contacts remote D1.');
}

const persistTo = requested.persistTo ?? fs.mkdtempSync(path.join(os.tmpdir(), 'nihongo-topik-i-preview-'));
const generatedPersistTo = !requested.persistTo;
const target: D1TargetOptions = { ...requested, remote: false, persistTo };
const reportArgument = process.argv.find((argument) => argument.startsWith('--report='))?.slice('--report='.length);
const reportPath = reportArgument
  ? (path.isAbsolute(reportArgument) ? reportArgument : path.resolve(REPO_ROOT, reportArgument))
  : path.join(REPO_ROOT, '.artifacts/db/topik-i-preview-candidate-verification.json');
const sqlPath = path.join(persistTo, 'topik-i-preview-candidate.sql');
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
    { cwd: REPO_ROOT, stdio: 'inherit' },
  );
}

try {
  fs.rmSync(persistTo, { recursive: true, force: true });
  fs.mkdirSync(persistTo, { recursive: true });
  applyMigrations();
  runSql(buildTopikIPreviewCandidateSql());

  const candidate = loadTopikIPreviewCandidate();
  const releaseId = candidate.release.id;
  addCheck(
    'draft release state',
    'draft',
    querySql<{ release_state: string }>(target, `SELECT release_state FROM content_releases WHERE id = '${releaseId}'`)[0]?.release_state ?? 'missing',
  );
  addCheck(
    'manifest checksum',
    candidate.release.manifestSha256,
    querySql<{ manifest_sha256: string }>(target, `SELECT manifest_sha256 FROM content_releases WHERE id = '${releaseId}'`)[0]?.manifest_sha256 ?? 'missing',
  );
  addCheck(
    'source checksum',
    candidate.provenance.sourceSha256,
    querySql<{ source_sha256: string }>(target, `SELECT source_sha256 FROM content_release_sources WHERE release_id = '${releaseId}'`)[0]?.source_sha256 ?? 'missing',
  );
  addCheck(
    'source provenance fields',
    0,
    countSql(target, `SELECT count(*) AS count FROM content_release_sources WHERE release_id = '${releaseId}' AND (
      trim(source_url) = '' OR trim(retrieved_at) = '' OR length(source_sha256) != 64
      OR trim(license_id) = '' OR trim(license_url) = '' OR trim(allowed_use) = ''
      OR trim(attribution_text) = '' OR trim(author) = '' OR trim(first_reviewer) = ''
      OR trim(second_reviewer) = '' OR trim(reviewed_at) = ''
    )`),
  );
  addCheck(
    'pending human sign-offs',
    1,
    countSql(target, `SELECT count(*) AS count FROM content_release_sources WHERE release_id = '${releaseId}' AND first_review_status = 'pending' AND first_reviewed_at IS NULL AND second_review_status = 'pending' AND second_reviewed_at IS NULL`),
  );
  addCheck('units', candidate.units.length, countSql(target, `SELECT count(*) AS count FROM topik_curriculum_units WHERE release_id = '${releaseId}'`));
  addCheck('items', candidate.items.length, countSql(target, `SELECT count(*) AS count FROM topik_content_items WHERE release_id = '${releaseId}'`));
  for (const [section, expected] of Object.entries(candidate.manifest.expectedRows.bySection)) {
    addCheck(`items in ${section}`, expected, countSql(target, `SELECT count(*) AS count FROM topik_content_items WHERE release_id = '${releaseId}' AND section = '${section}'`));
  }
  addCheck(
    'blank multilingual fields',
    0,
    countSql(target, `SELECT count(*) AS count FROM topik_content_items WHERE release_id = '${releaseId}' AND (
      trim(prompt_ko) = '' OR trim(prompt_ja) = '' OR trim(prompt_en) = ''
      OR trim(answer_payload_json) = '' OR trim(explanation_ko) = ''
      OR trim(explanation_ja) = '' OR trim(explanation_en) = ''
    )`),
  );
  addCheck('duplicate stable refs', 0, countSql(target, `SELECT count(*) AS count FROM (SELECT stable_ref FROM topik_content_items WHERE release_id = '${releaseId}' GROUP BY stable_ref HAVING count(*) > 1)`));
  addCheck('foreign key violations', 0, querySql<Record<string, unknown>>(target, 'PRAGMA foreign_key_check').length);
  addCheck('published content rows', 0, countSql(target, `SELECT count(*) AS count FROM topik_content_items i JOIN content_releases r ON r.id = i.release_id WHERE r.id = '${releaseId}' AND r.release_state = 'published'`));

  const beforeReplay = JSON.stringify({
    sources: countSql(target, `SELECT count(*) AS count FROM content_release_sources WHERE release_id = '${releaseId}'`),
    units: countSql(target, `SELECT count(*) AS count FROM topik_curriculum_units WHERE release_id = '${releaseId}'`),
    items: countSql(target, `SELECT count(*) AS count FROM topik_content_items WHERE release_id = '${releaseId}'`),
  });
  runSql(buildTopikIPreviewCandidateSql());
  const afterReplay = JSON.stringify({
    sources: countSql(target, `SELECT count(*) AS count FROM content_release_sources WHERE release_id = '${releaseId}'`),
    units: countSql(target, `SELECT count(*) AS count FROM topik_curriculum_units WHERE release_id = '${releaseId}'`),
    items: countSql(target, `SELECT count(*) AS count FROM topik_content_items WHERE release_id = '${releaseId}'`),
  });
  addCheck('idempotent seed replay', beforeReplay, afterReplay);

  runSql([`UPDATE content_releases SET release_state = 'automated_checked' WHERE id = '${releaseId}'`]);
  addCheck('human review blocked until both sign-offs', 'yes', expectsSqlFailure(`UPDATE content_releases SET release_state = 'human_reviewed' WHERE id = '${releaseId}'`));

  const report = {
    generatedAt: new Date().toISOString(),
    location: 'local-only',
    release: {
      id: candidate.release.id,
      learningTrack: candidate.release.learningTrack,
      contentVersion: candidate.release.contentVersion,
      manifestSha256: candidate.release.manifestSha256,
      sourceSha256: candidate.provenance.sourceSha256,
    },
    reviewGate: 'blocked-pending-two-human-signoffs',
    checks,
    passed: checks.every((check) => check.passed),
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  for (const check of checks) console.log(`  ${check.passed ? 'OK' : 'FAIL'} ${check.name}: expected=${check.expected} actual=${check.actual}`);
  console.log(`TOPIK I preview candidate report: ${reportPath}`);
  if (!report.passed) process.exitCode = 1;
} finally {
  fs.rmSync(sqlPath, { force: true });
  if (generatedPersistTo) fs.rmSync(persistTo, { recursive: true, force: true });
}
