#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API_DIRECTORY = join(REPOSITORY_ROOT, 'apps', 'api');

export function validateReleaseSha(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) {
    return 'release SHA must be a lowercase 40-character Git commit SHA';
  }
  return null;
}

export function buildWranglerArgs({ releaseSha, environment, dryRun = false }) {
  const args = [
    'exec',
    'wrangler',
    'deploy',
    '--config=wrangler.toml',
    `--var=RELEASE_SHA:${releaseSha}`,
    `--message=release ${releaseSha}`,
  ];
  if (environment) args.push(`--env=${environment}`);
  if (dryRun) args.push('--dry-run');
  return args;
}

function valueFromArg(argv, name) {
  const prefix = `${name}=`;
  return argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
}

function readGit(args) {
  return execFileSync('git', args, {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function verifyImmutableCheckout(releaseSha) {
  const head = readGit(['rev-parse', 'HEAD']);
  if (head !== releaseSha) {
    throw new Error(`release SHA ${releaseSha} does not match checked-out HEAD ${head}`);
  }
  readGit(['cat-file', '-e', `${releaseSha}^{commit}`]);
  const status = readGit(['status', '--porcelain=v1', '--untracked-files=all']);
  if (status !== '') {
    throw new Error('deployment requires a clean checkout; commit or remove every pending file first');
  }
}

export async function main(argv, env = process.env) {
  const releaseSha = valueFromArg(argv, '--release-sha') ?? env.RELEASE_SHA;
  const environment = valueFromArg(argv, '--env');
  const dryRun = argv.includes('--dry-run');
  const validationError = validateReleaseSha(releaseSha);
  if (validationError) {
    console.error(`worker deployment blocked: ${validationError}`);
    console.error('usage: RELEASE_SHA=<current-git-sha> pnpm -F @nihongo-n3/api run deploy');
    return 2;
  }

  try {
    verifyImmutableCheckout(releaseSha);
  } catch (error) {
    console.error(`worker deployment blocked: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const result = spawnSync(
    command,
    buildWranglerArgs({ releaseSha, environment, dryRun }),
    {
      cwd: API_DIRECTORY,
      env: { ...env, WRANGLER_WRITE_LOGS: '0' },
      stdio: 'inherit',
    },
  );
  if (result.error) {
    console.error(`worker deployment failed to start: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
