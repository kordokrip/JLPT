import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { REPO_ROOT } from '../seed/constants.js';

// A unique workspace avoids re-opening a stale local workerd database from a
// previous verifier run. It is never the developer's local D1 state.
const persistTo = fs.mkdtempSync(path.join(os.tmpdir(), 'nihongo-n3-db-verify-'));
const artifacts = path.join(persistTo, 'artifacts');
const manifest = path.join(artifacts, 'content-manifest.json');
const report = path.join(artifacts, 'content-verification-report.json');
const n2FixtureManifest = path.join(artifacts, 'n2-local-fixture-manifest.json');
const n2FixtureReport = path.join(artifacts, 'n2-local-fixture-report.json');
const n2BatchReport = path.join(artifacts, 'n2-batch1-report.json');
const topikFixtureManifest = path.join(artifacts, 'topik-grade1-local-fixture-manifest.json');
const topikFixtureReport = path.join(artifacts, 'topik-grade1-local-fixture-report.json');
const topikOwnerBatchReport = path.join(artifacts, 'topik-owner-curriculum-batch1-report.json');
const topikPracticeReport = path.join(artifacts, 'topik-practice-v2-report.json');
const questionBankQualityReport = path.join(artifacts, 'question-bank-quality-report.json');
const config = path.join(REPO_ROOT, 'apps/api/wrangler.toml');

fs.mkdirSync(artifacts, { recursive: true });

function runWrangler(args: string[]): void {
  execFileSync('pnpm', ['--dir', 'packages/db', 'exec', 'wrangler', ...args], {
    cwd: REPO_ROOT,
    env: { ...process.env, CI: 'true', WRANGLER_WRITE_LOGS: '0' },
    stdio: 'inherit',
  });
}

function runDbScript(script: string, args: string[]): void {
  execFileSync('pnpm', ['--dir', 'packages/db', 'exec', 'tsx', script, ...args], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
}

console.log(`Fresh D1 verification workspace: ${persistTo}`);
runWrangler([
  'd1', 'migrations', 'apply', 'DB', '--local',
  '--persist-to', persistTo, '--config', config,
]);
runDbScript('src/seed/seed.ts', [
  '--local',
  `--persist-to=${persistTo}`, `--manifest-out=${manifest}`,
]);
runDbScript('src/seed/verify.ts', [
  '--local',
  `--persist-to=${persistTo}`, `--manifest=${manifest}`, `--report=${report}`,
]);
runDbScript('src/ops/seed-topik-placement.ts', [
  '--local',
  `--persist-to=${persistTo}`,
  `--report=${path.join(artifacts, 'topik-placement-v2-seed-report.json')}`,
]);
runDbScript('src/ops/verify-topik-practice.ts', [
  '--local',
  `--persist-to=${persistTo}`, `--report=${topikPracticeReport}`,
]);
runDbScript('src/ops/audit-question-bank-quality.ts', [
  '--local',
  `--persist-to=${persistTo}`, `--report=${questionBankQualityReport}`,
]);
runDbScript('src/ops/verify-topik-owner-curriculum-batch1.ts', [
  '--local',
  `--persist-to=${persistTo}`, `--report=${topikOwnerBatchReport}`,
]);
runDbScript('src/seed/seed-n2-local-fixture.ts', [
  '--local',
  `--persist-to=${persistTo}`, `--manifest-out=${n2FixtureManifest}`,
]);
runDbScript('src/ops/verify-n2-local-fixture.ts', [
  '--local',
  `--persist-to=${persistTo}`, `--report=${n2FixtureReport}`,
]);
runDbScript('src/ops/verify-n2-batch1.ts', [
  '--local',
  `--persist-to=${persistTo}`, `--report=${n2BatchReport}`,
]);
runDbScript('src/seed/seed-topik-grade1-local-fixture.ts', [
  '--local',
  `--persist-to=${persistTo}`, `--manifest-out=${topikFixtureManifest}`,
]);
runDbScript('src/ops/verify-topik-grade1-local-fixture.ts', [
  '--local',
  `--persist-to=${persistTo}`, `--report=${topikFixtureReport}`,
]);
runDbScript('src/ops/verify-learning-audio-provenance.ts', [
  '--local',
  `--persist-to=${persistTo}`,
]);
runDbScript('src/ops/verify-content-release-contract.ts', []);
runDbScript('src/ops/verify-content-release-control-plane.ts', []);

console.log(`Fresh D1 verification complete. Artifacts: ${artifacts}`);
