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

// 강성호 2026-10-13: 배포가 백업 점검을 암묵 해제하지 않도록 모드를 필수 입력으로 고정한다.
export function validateMaintenanceMode(value) {
  return ['off', 'read-only'].includes(value) ? null : 'explicit maintenance mode off|read-only is required';
}

export function buildWranglerArgs({ releaseSha, environment, maintenanceMode, dryRun = false }) {
  const error = validateMaintenanceMode(maintenanceMode);
  if (error) throw new Error(error);
  const args = [
    'exec',
    'wrangler',
    'deploy',
    '--config=wrangler.toml',
    `--var=RELEASE_SHA:${releaseSha}`,
    `--var=MAINTENANCE_MODE:${maintenanceMode}`,
    `--message=release ${releaseSha}`,
  ];
  if (environment) args.push(`--env=${environment}`);
  if (dryRun) args.push('--dry-run');
  return args;
}

const HEALTH_ORIGINS = {
  production: 'https://nihongo-n3-api.kordokrip.workers.dev',
  'topik-preview': 'https://nihongo-n3-api-topik-preview.kordokrip.workers.dev',
  'observability-preview': 'https://nihongo-n3-api-observability-preview.kordokrip.workers.dev',
};

export async function verifyDeploymentHealth(url, { releaseSha, maintenanceMode, attempts = 6 }, fetcher = fetch) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetcher(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      const health = response.ok ? await response.json() : null;
      if (health?.status === 'ok' && health.release === releaseSha && health.maintenanceMode === maintenanceMode) return;
    } catch { /* 전파 중 응답을 성공으로 기록하지 않고 제한된 횟수만 재조회한다. */ }
    if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 1500));
  }
  throw new Error('post-deployment health did not match the exact release SHA and maintenance mode');
}

export function parseDeploymentArgs(argv, env = process.env) {
  const names = ['--release-sha', '--env', '--maintenance-mode'];
  if (argv.some(arg => arg !== '--dry-run' && !names.some(name => arg.startsWith(`${name}=`))) ||
      names.some(name => argv.filter(arg => arg.startsWith(`${name}=`)).length > 1) ||
      argv.filter(arg => arg === '--dry-run').length > 1) throw new Error('Unknown, split or duplicate deployment options are prohibited');
  const value = name => argv.find(arg => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  const selected = value('--env');
  if (!['production', 'topik-preview', 'observability-preview'].includes(selected)) throw new Error('Explicit --env=production|topik-preview|observability-preview is required');
  return { releaseSha: value('--release-sha') ?? env.RELEASE_SHA,
    environment: selected === 'production' ? undefined : selected,
    maintenanceMode: value('--maintenance-mode'), dryRun: argv.includes('--dry-run') };
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
  let options;
  try { options = parseDeploymentArgs(argv, env); }
  catch (error) { console.error(`worker deployment blocked: ${error.message}`); return 2; }
  const { releaseSha, environment, dryRun, maintenanceMode } = options;
  const healthOrigin = HEALTH_ORIGINS[environment ?? 'production'];
  const validationError = validateReleaseSha(releaseSha) ?? validateMaintenanceMode(maintenanceMode) ?? (!healthOrigin ? 'unsupported Worker environment' : null);
  if (validationError) {
    console.error(`worker deployment blocked: ${validationError}`);
    console.error('usage: RELEASE_SHA=<current-git-sha> pnpm -F @nihongo-n3/api run deploy --maintenance-mode=off|read-only (package script pins --env=production)');
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
    buildWranglerArgs({ releaseSha, environment, maintenanceMode, dryRun }),
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
  if (result.status !== 0) return result.status ?? 1;
  if (!dryRun) {
    try { await verifyDeploymentHealth(`${healthOrigin}/health`, { releaseSha, maintenanceMode }); }
    catch (error) { console.error(`worker deployment verification failed: ${error.message}`); return 1; }
  }
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
