import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildTopikContentContractFixtureSql, TOPIK_CONTENT_CONTRACT_FIXTURE } from '../seed/content-release-contract.js';
import { executeSqlFile, parseD1Target, querySql, type D1TargetOptions } from '../seed/d1-cli.js';
import { REPO_ROOT } from '../seed/constants.js';

type Check = { name: string; expected: string | number; actual: string | number; passed: boolean };
type CountRow = { count: number };

const requested = parseD1Target();
if (requested.remote) {
  throw new Error('Content release control-plane verification is local-only and never contacts remote D1.');
}

const persistTo = requested.persistTo ?? fs.mkdtempSync(path.join(os.tmpdir(), 'nihongo-n3-control-plane-'));
const target: D1TargetOptions = { ...requested, persistTo };
const reportArgument = process.argv.find((argument) => argument.startsWith('--report='))?.slice('--report='.length);
const reportPath = reportArgument
  ? (path.isAbsolute(reportArgument) ? reportArgument : path.resolve(REPO_ROOT, reportArgument))
  : path.join(REPO_ROOT, '.artifacts/db/content-release-control-plane-report.json');
const fixture = TOPIK_CONTENT_CONTRACT_FIXTURE;
const hash = fixture.release.manifestSha256;
const manifestKey = `evidence/manifest/v1/${fixture.release.id}/${hash}/artifact.json`;
const idempotencyKey = `crcp:v1:${fixture.release.id}:topik-control-job-v1:${hash}`;
const checks: Check[] = [];

function runSql(statements: string[]): void {
  const file = path.join(persistTo, `control-${crypto.randomUUID()}.sql`);
  fs.writeFileSync(file, `${statements.join('\n')}\n`, 'utf8');
  try {
    executeSqlFile(target, file);
  } finally {
    fs.rmSync(file, { force: true });
  }
}

function applyMigrations(): void {
  execFileSync(
    'pnpm',
    ['exec', 'wrangler', 'd1', 'migrations', 'apply', target.database, '--local', '--persist-to', persistTo, '--config', target.config],
    { cwd: REPO_ROOT, stdio: 'pipe' },
  );
}

function expectsSqlFailure(statement: string): 'yes' | 'no' {
  try {
    runSql([statement]);
    return 'no';
  } catch {
    return 'yes';
  }
}

function addCheck(name: string, expected: string | number, actual: string | number): void {
  checks.push({ name, expected, actual, passed: expected === actual });
}

try {
  applyMigrations();
  runSql(buildTopikContentContractFixtureSql());

  addCheck(
    'preview candidate blocked before approval',
    'yes',
    expectsSqlFailure(`INSERT INTO content_release_preview_candidates (id, release_id, manifest_key, manifest_sha256) VALUES ('preview-before-approval', '${fixture.release.id}', '${manifestKey}', '${hash}')`),
  );

  runSql([
    `UPDATE content_releases SET release_state = 'automated_checked' WHERE id = '${fixture.release.id}';`,
    `UPDATE content_releases SET release_state = 'human_reviewed' WHERE id = '${fixture.release.id}';`,
    `UPDATE content_releases SET release_state = 'preview' WHERE id = '${fixture.release.id}';`,
    `UPDATE content_releases SET release_state = 'approved' WHERE id = '${fixture.release.id}';`,
    `INSERT INTO content_release_jobs (id, release_id, job_kind, artifact_key, artifact_sha256, idempotency_key) VALUES ('topik-control-job-v1', '${fixture.release.id}', 'preview_candidate', '${manifestKey}', '${hash}', '${idempotencyKey}');`,
    `INSERT INTO content_release_preview_candidates (id, release_id, manifest_key, manifest_sha256) VALUES ('preview-${fixture.release.id}', '${fixture.release.id}', '${manifestKey}', '${hash}');`,
  ]);

  addCheck(
    'approved release remains unpublished after preview candidate',
    'approved',
    querySql<{ release_state: string }>(target, `SELECT release_state FROM content_releases WHERE id = '${fixture.release.id}'`)[0]?.release_state ?? 'missing',
  );
  addCheck(
    'preview candidate created once',
    1,
    querySql<CountRow>(target, `SELECT count(*) AS count FROM content_release_preview_candidates WHERE release_id = '${fixture.release.id}'`)[0]?.count ?? -1,
  );
  addCheck(
    'duplicate idempotency rejected',
    'yes',
    expectsSqlFailure(`INSERT INTO content_release_jobs (id, release_id, job_kind, artifact_key, artifact_sha256, idempotency_key) VALUES ('topik-control-job-duplicate', '${fixture.release.id}', 'preview_candidate', '${manifestKey}', '${hash}', '${idempotencyKey}')`),
  );
  addCheck(
    'publication blocked without all gates',
    'yes',
    expectsSqlFailure(`UPDATE content_releases SET release_state = 'published', published_at = unixepoch() WHERE id = '${fixture.release.id}'`),
  );

  runSql(['G0', 'G1', 'G2', 'G3', 'G4'].map((gate) =>
    `INSERT INTO content_release_gate_evidence (release_id, gate, gate_state, artifact_key, artifact_sha256, recorded_by) VALUES ('${fixture.release.id}', '${gate}', 'passed', 'evidence/report/v1/${fixture.release.id}/${hash}/artifact.json', '${hash}', 'system');`,
  ));
  addCheck(
    'all G0-G4 evidence recorded',
    5,
    querySql<CountRow>(target, `SELECT count(*) AS count FROM content_release_gate_evidence WHERE release_id = '${fixture.release.id}' AND gate_state = 'passed'`)[0]?.count ?? -1,
  );
  runSql([
    `INSERT INTO content_release_poison_reports (id, job_id, queue_name, message_id, idempotency_key, attempts, reason_code, artifact_key, artifact_sha256) VALUES ('poison-topik-control-job-v1', 'topik-control-job-v1', 'nihongo-n3-content-release-dlq', 'delivery-v1', '${idempotencyKey}', 4, 'dlq_delivery', '${manifestKey}', '${hash}');`,
  ]);
  addCheck(
    'duplicate poison report rejected',
    'yes',
    expectsSqlFailure(`INSERT INTO content_release_poison_reports (id, job_id, queue_name, message_id, idempotency_key, attempts, reason_code, artifact_key, artifact_sha256) VALUES ('poison-duplicate', 'topik-control-job-v1', 'nihongo-n3-content-release-dlq', 'delivery-v1', '${idempotencyKey}', 4, 'dlq_delivery', '${manifestKey}', '${hash}')`),
  );
  addCheck('foreign keys', 0, querySql<Record<string, unknown>>(target, 'PRAGMA foreign_key_check').length);

  const report = {
    generatedAt: new Date().toISOString(),
    location: 'local',
    fixtureLicense: fixture.provenance.licenseId,
    checks,
    passed: checks.every((check) => check.passed),
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  for (const check of checks) console.log(`  ${check.passed ? 'OK' : 'FAIL'} ${check.name}: expected=${check.expected} actual=${check.actual}`);
  console.log(`Content release control-plane report: ${reportPath}`);
  if (!report.passed) process.exitCode = 1;
} finally {
  if (!requested.persistTo) fs.rmSync(persistTo, { recursive: true, force: true });
}
