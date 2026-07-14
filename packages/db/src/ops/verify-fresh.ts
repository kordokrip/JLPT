import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { REPO_ROOT } from '../seed/constants.js';

const persistTo = path.join(os.tmpdir(), 'nihongo-n3-db-verify');
const manifest = path.join(persistTo, 'content-manifest.json');
const report = path.join(persistTo, 'verification-report.json');
const config = path.join(REPO_ROOT, 'apps/api/wrangler.toml');
const requireAudio = process.argv.includes('--require-audio');

fs.rmSync(persistTo, { recursive: true, force: true });
fs.mkdirSync(persistTo, { recursive: true });

function run(args: string[]): void {
  execFileSync('pnpm', args, { cwd: REPO_ROOT, stdio: 'inherit' });
}

console.log(`Fresh D1 verification workspace: ${persistTo}`);
run([
  'exec', 'wrangler', 'd1', 'migrations', 'apply', 'DB', '--local',
  '--persist-to', persistTo, '--config', config,
]);
run([
  'exec', 'tsx', 'packages/db/src/seed/seed.ts', '--local',
  `--persist-to=${persistTo}`, `--manifest-out=${manifest}`,
]);
run([
  'exec', 'tsx', 'packages/db/src/seed/verify.ts', '--local',
  `--persist-to=${persistTo}`, `--manifest=${manifest}`, `--report=${report}`,
  ...(requireAudio ? ['--require-audio'] : []),
]);

console.log(`Fresh D1 verification complete: ${report}`);
