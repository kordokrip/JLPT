import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { REPO_ROOT } from '../seed/constants.js';
import { buildTopikIOwnerPrivateCandidateSql, loadTopikIOwnerPrivateCandidate } from '../seed/topik-i-owner-private-candidate.js';
import { countSql, executeSqlFile, parseD1Target, querySql, type D1TargetOptions } from '../seed/d1-cli.js';

type Check = { name: string; expected: string | number; actual: string | number; passed: boolean };

const requested = parseD1Target();
if (requested.remote) throw new Error('Owner-private TOPIK I verification is local-only and never contacts remote D1.');

const persistTo = requested.persistTo ?? fs.mkdtempSync(path.join(os.tmpdir(), 'nihongo-topik-i-owner-private-'));
const generatedPersistTo = !requested.persistTo;
const target: D1TargetOptions = { ...requested, remote: false, persistTo };
const reportArgument = process.argv.find((argument) => argument.startsWith('--report='))?.slice('--report='.length);
const reportPath = reportArgument
  ? (path.isAbsolute(reportArgument) ? reportArgument : path.resolve(REPO_ROOT, reportArgument))
  : path.join(REPO_ROOT, '.artifacts/db/topik-i-owner-private-candidate-verification.json');
const sqlPath = path.join(persistTo, 'topik-i-owner-private-candidate.sql');
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
  runSql(buildTopikIOwnerPrivateCandidateSql());

  const candidate = loadTopikIOwnerPrivateCandidate();
  const releaseId = candidate.release.id;
  const manifest = candidate.release.manifestSha256;
  addCheck('draft release state', 'draft', querySql<{ release_state: string }>(target, `SELECT release_state FROM content_releases WHERE id = '${releaseId}'`)[0]?.release_state ?? 'missing');
  addCheck('manifest checksum', manifest, querySql<{ manifest_sha256: string }>(target, `SELECT manifest_sha256 FROM content_releases WHERE id = '${releaseId}'`)[0]?.manifest_sha256 ?? 'missing');
  addCheck('owner-private policy', 1, countSql(target, `SELECT count(*) AS count FROM content_release_private_policies WHERE release_id = '${releaseId}' AND manifest_sha256 = '${manifest}' AND claim_method = 'authenticated_admin_session' AND public_publish_prohibited = 1`));
  addCheck('pending public sign-offs', 1, countSql(target, `SELECT count(*) AS count FROM content_release_sources WHERE release_id = '${releaseId}' AND first_review_status = 'pending' AND second_review_status = 'pending' AND first_reviewed_at IS NULL AND second_reviewed_at IS NULL`));
  addCheck('units', candidate.units.length, countSql(target, `SELECT count(*) AS count FROM topik_curriculum_units WHERE release_id = '${releaseId}'`));
  addCheck('items', candidate.items.length, countSql(target, `SELECT count(*) AS count FROM topik_content_items WHERE release_id = '${releaseId}'`));
  addCheck('foreign key violations', 0, querySql<Record<string, unknown>>(target, 'PRAGMA foreign_key_check').length);
  addCheck('public query excludes private draft', 0, countSql(target, `SELECT count(*) AS count FROM topik_content_items i JOIN content_releases r ON r.id = i.release_id WHERE r.release_state = 'published' AND r.id = '${releaseId}'`));

  const beforeReplay = JSON.stringify({
    source: countSql(target, `SELECT count(*) AS count FROM content_release_sources WHERE release_id = '${releaseId}'`),
    policy: countSql(target, `SELECT count(*) AS count FROM content_release_private_policies WHERE release_id = '${releaseId}'`),
    units: countSql(target, `SELECT count(*) AS count FROM topik_curriculum_units WHERE release_id = '${releaseId}'`),
    items: countSql(target, `SELECT count(*) AS count FROM topik_content_items WHERE release_id = '${releaseId}'`),
  });
  runSql(buildTopikIOwnerPrivateCandidateSql());
  const afterReplay = JSON.stringify({
    source: countSql(target, `SELECT count(*) AS count FROM content_release_sources WHERE release_id = '${releaseId}'`),
    policy: countSql(target, `SELECT count(*) AS count FROM content_release_private_policies WHERE release_id = '${releaseId}'`),
    units: countSql(target, `SELECT count(*) AS count FROM topik_curriculum_units WHERE release_id = '${releaseId}'`),
    items: countSql(target, `SELECT count(*) AS count FROM topik_content_items WHERE release_id = '${releaseId}'`),
  });
  addCheck('idempotent candidate seed replay', beforeReplay, afterReplay);

  runSql([`UPDATE content_releases SET release_state = 'automated_checked' WHERE id = '${releaseId}'`]);
  addCheck('public human review still blocked', 'yes', expectsSqlFailure(`UPDATE content_releases SET release_state = 'human_reviewed' WHERE id = '${releaseId}'`));
  addCheck('wrong manifest claim rejected', 'yes', expectsSqlFailure(`INSERT INTO content_release_private_publications (release_id, owner_user_id, manifest_sha256) VALUES ('${releaseId}', 'owner', '${'0'.repeat(64)}')`));
  runSql([`INSERT INTO content_release_private_publications (release_id, owner_user_id, manifest_sha256) VALUES ('${releaseId}', 'owner', '${manifest}')`]);
  addCheck('duplicate claim rejected', 'yes', expectsSqlFailure(`INSERT INTO content_release_private_publications (release_id, owner_user_id, manifest_sha256) VALUES ('${releaseId}', 'owner', '${manifest}')`));
  addCheck('claimed item immutable', 'yes', expectsSqlFailure(`UPDATE topik_content_items SET prompt_ko = 'mutated' WHERE release_id = '${releaseId}'`));
  addCheck('claimed source immutable', 'yes', expectsSqlFailure(`UPDATE content_release_sources SET attribution_text = 'mutated' WHERE release_id = '${releaseId}'`));
  runSql([`UPDATE content_release_private_publications SET private_state = 'withdrawn', withdrawn_at = unixepoch() WHERE release_id = '${releaseId}'`]);
  addCheck('withdrawn private publication', 'withdrawn', querySql<{ private_state: string }>(target, `SELECT private_state FROM content_release_private_publications WHERE release_id = '${releaseId}'`)[0]?.private_state ?? 'missing');
  addCheck('withdrawn private content remains non-public', 0, countSql(target, `SELECT count(*) AS count FROM topik_content_items i JOIN content_releases r ON r.id = i.release_id WHERE r.id = '${releaseId}' AND r.release_state = 'published'`));

  const report = {
    generatedAt: new Date().toISOString(),
    location: 'local-only',
    release: {
      id: releaseId,
      learningTrack: candidate.release.learningTrack,
      manifestSha256: manifest,
      sourceSha256: candidate.provenance.sourceSha256,
    },
    publicRelease: 'not-published',
    checks,
    passed: checks.every((check) => check.passed),
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  for (const check of checks) console.log(`  ${check.passed ? 'OK' : 'FAIL'} ${check.name}: expected=${check.expected} actual=${check.actual}`);
  console.log(`TOPIK I owner-private candidate report: ${reportPath}`);
  if (!report.passed) process.exitCode = 1;
} finally {
  fs.rmSync(sqlPath, { force: true });
  if (generatedPersistTo) fs.rmSync(persistTo, { recursive: true, force: true });
}
