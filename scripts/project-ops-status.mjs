#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED_DOCS = [
  'AGENTS.md',
  'docs/README.md',
  'docs/00_overview/CURRENT_STATE.md',
  'docs/00_overview/ERROR_LEDGER.md',
  'docs/00_overview/OPERATIONS_MANAGEMENT_RUNBOOK.md',
  'docs/00_overview/LOCAL_CICD_OPERATIONS.md',
  'docs/00_overview/LOCAL_RELEASE_LEDGER.md',
  'docs/00_overview/SUB_AGENT_HANDOFF.md',
];

const REQUIRED_SCRIPTS = [
  'docs:check',
  'openapi:check',
  'ops:status',
  'ops:status:remote',
  'ops:verify',
  'release:verify:audio-contract',
  'verify:ci',
];

const REQUIRED_LOCAL_EVIDENCE = [
  '.artifacts/d1-backups/audio-first-click-pwa-2026-08-24/manifest.json',
  '.artifacts/releases/audio-first-click-pwa-2026-08-24/restore-drill.json',
  '.artifacts/recovery/audio-2026-08-23/SHA256SUMS',
];

function command(program, args, cwd = root) {
  const result = spawnSync(program, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, WRANGLER_WRITE_LOGS: '0' },
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
  };
}

export function parseCurrentState(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const value = (label) => lines
    .find((line) => line.startsWith(`| ${label} |`))
    ?.match(/`([^`]+)`/u)?.[1] ?? null;
  const pagesUrl = value('Pages')?.split(' ')[0] ?? null;
  const productionDeployment = markdown.match(/Production은 `([0-9a-f-]{36})`/)?.[1] ?? null;
  return {
    migration: value('D1 migration'),
    workerVersion: value('Worker'),
    pagesUrl,
    pagesSourceSha: value('web source SHA'),
    productionDeployment,
  };
}

export function validateWorkflowPolicy(workflow) {
  const errors = [];
  if (/^\s+(push|pull_request|schedule):/mu.test(workflow)) {
    errors.push('GitHub Actions must not have automatic push, pull_request, or schedule triggers');
  }
  if (!/^\s+workflow_dispatch:\s*$/mu.test(workflow)) {
    errors.push('workflow_dispatch must remain the only documented manual event');
  }
  if (!/^\s+if:\s*false\s*$/mu.test(workflow)) {
    errors.push('the placeholder GitHub Actions job must remain disabled');
  }
  return errors;
}

function addCheck(checks, id, status, detail) {
  checks.push({ id, status, detail });
}

export function safeDiagnostic(value) {
  return String(value)
    .replace(/\u001b\[[0-9;]*m/gu, '')
    .replace(/\/accounts\/[0-9a-f]+\//giu, '/accounts/[redacted]/')
    .replace(/(\/d1\/database\/)[0-9a-f-]{36}\b/giu, '$1[redacted]')
    // Child-process errors can contain JSON, escaped JSON, or inspect() output.
    .replace(/(\b(?:accountTag|account_?id)["'\\]*\s*:\s*["'\\]*)[0-9a-f]{32}\b/giu, '$1[redacted]')
    .slice(-800);
}

export function parseR2AbsenceReport(stdout) {
  const parsed = JSON.parse(stdout);
  if (!Array.isArray(parsed.references) || typeof parsed.total !== 'number') {
    throw new Error('invalid R2 absence report');
  }
  return parsed;
}

export function validateMigrationLedgerResponse(row, migration) {
  const range = typeof migration === 'string' ? /^0000[–-](\d{4})$/u.exec(migration) : null;
  if (!range) return ['CURRENT_STATE D1 migration must be an explicit 0000–NNNN range'];

  const errors = [];
  const expectedLatest = range[1];
  const expectedCount = Number(expectedLatest) + 1;
  const latest = typeof row?.latest_name === 'string'
    ? /^(\d{4})_[a-z0-9_-]+\.sql$/iu.exec(row.latest_name)
    : null;
  if (latest?.[1] !== expectedLatest) errors.push(`latest_name must match ${expectedLatest}_*.sql`);
  if (row?.migration_count !== expectedCount) errors.push(`migration_count must be ${expectedCount}`);
  return errors;
}

export function validateAuthProxyResponse(status, contentType, payload) {
  const errors = [];
  if (status !== 200) errors.push(`HTTP ${status}, expected 200`);
  if (!/application\/json/iu.test(contentType)) errors.push(`content-type ${contentType || 'missing'}, expected application/json`);
  if (payload?.data?.google_enabled !== true) errors.push('data.google_enabled must be true');
  if (payload?.data?.auth_mode !== 'app-session') errors.push('data.auth_mode must be app-session');
  return errors;
}

export function validateTopikTrackStatusResponse(status, contentType, payload) {
  const errors = [];
  const data = payload?.data;
  if (status !== 200) errors.push(`HTTP ${status}, expected 200`);
  if (!/application\/json/iu.test(contentType)) errors.push(`content-type ${contentType || 'missing'}, expected application/json`);
  if (data?.content_release !== 'topik-i-ii') errors.push('data.content_release must be topik-i-ii');
  if (data?.write_enabled !== true) errors.push('data.write_enabled must be true');
  if (!['TOPIK-I', 'TOPIK-II'].every((level) => data?.available_levels?.includes?.(level))) {
    errors.push('data.available_levels must include TOPIK-I and TOPIK-II');
  }
  if (!['listening', 'writing', 'reading'].every((section) => data?.available_sections?.includes?.(section))) {
    errors.push('data.available_sections must include listening, writing, and reading');
  }
  return errors;
}

async function localChecks() {
  const checks = [];
  const docs = new Map();
  for (const relative of REQUIRED_DOCS) {
    try {
      docs.set(relative, await readFile(path.join(root, relative), 'utf8'));
      addCheck(checks, `file:${relative}`, 'pass', 'present');
    } catch {
      addCheck(checks, `file:${relative}`, 'fail', 'missing');
    }
  }

  const currentStateText = docs.get('docs/00_overview/CURRENT_STATE.md') ?? '';
  const current = parseCurrentState(currentStateText);
  for (const [key, value] of Object.entries(current)) {
    addCheck(checks, `current-state:${key}`, value ? 'pass' : 'fail', value ?? 'missing');
  }

  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  const analysis = await readFile(path.join(root, 'PROJECT_CODEBASE_ANALYSIS.md'), 'utf8');
  for (const [key, value] of Object.entries(current)) {
    if (!value) continue;
    for (const [document, contents] of [['README', readme], ['PROJECT_CODEBASE_ANALYSIS', analysis]]) {
      const synchronized = contents.includes(value);
      addCheck(checks, `docs-sync:${document}:${key}`, synchronized ? 'pass' : 'fail', synchronized ? value : `not found in ${document}`);
    }
  }

  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  for (const script of REQUIRED_SCRIPTS) {
    addCheck(checks, `package-script:${script}`, packageJson.scripts?.[script] ? 'pass' : 'fail', packageJson.scripts?.[script] ?? 'missing');
  }

  const dbPackageJson = JSON.parse(await readFile(path.join(root, 'packages/db/package.json'), 'utf8'));
  const remoteAudioVerifier = dbPackageJson.scripts?.['verify:remote:audio'] ?? '';
  const remoteVerifierBlocked = remoteAudioVerifier.includes('INC-DATA-024') && !remoteAudioVerifier.includes('src/seed/verify.ts --remote');
  addCheck(
    checks,
    'remote-verifier:source-pinned-required',
    remoteVerifierBlocked ? 'pass' : 'fail',
    remoteVerifierBlocked ? 'unsafe current-HEAD alias is fail-closed' : 'verify:remote:audio must not run the current-HEAD verifier while INC-DATA-024 is open',
  );

  const workflow = await readFile(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  const workflowErrors = validateWorkflowPolicy(workflow);
  addCheck(checks, 'github-actions:disabled', workflowErrors.length === 0 ? 'pass' : 'fail', workflowErrors.join('; ') || 'manual placeholder only; job disabled');

  const docsCheck = command('pnpm', ['docs:check']);
  addCheck(checks, 'docs:links', docsCheck.status === 0 ? 'pass' : 'fail', docsCheck.status === 0 ? docsCheck.stdout.split('\n').at(-1) : docsCheck.stderr.slice(-800));
  const audioCheck = command('pnpm', ['release:verify:audio-contract']);
  addCheck(checks, 'audio:browser-only', audioCheck.status === 0 ? 'pass' : 'fail', audioCheck.status === 0 ? audioCheck.stdout.split('\n').at(-1) : audioCheck.stderr.slice(-800));

  const branch = command('git', ['branch', '--show-current']).stdout;
  const head = command('git', ['rev-parse', 'HEAD']).stdout;
  const status = command('git', ['status', '--porcelain']).stdout;
  addCheck(checks, 'git:branch', branch ? 'pass' : 'fail', branch || 'detached or unavailable');
  addCheck(checks, 'git:head', /^[0-9a-f]{40}$/u.test(head) ? 'pass' : 'fail', head || 'unavailable');
  addCheck(checks, 'git:worktree', status ? 'warn' : 'pass', status ? `dirty: ${status.split('\n').length} path(s)` : 'clean');

  for (const relative of REQUIRED_LOCAL_EVIDENCE) {
    try {
      await access(path.join(root, relative));
      addCheck(checks, `evidence:${relative}`, 'pass', 'preserved locally; intentionally ignored by Git');
    } catch {
      addCheck(checks, `evidence:${relative}`, 'warn', 'missing locally; recover or recreate before a Production release');
    }
  }

  const errorLedger = docs.get('docs/00_overview/ERROR_LEDGER.md') ?? '';
  addCheck(
    checks,
    'db:manifest-drift',
    errorLedger.includes('INC-DATA-024') ? 'warn' : 'fail',
    errorLedger.includes('INC-DATA-024')
      ? 'known HEAD-vs-release manifest drift; use immutable release-source verification'
      : 'INC-DATA-024 is not documented',
  );

  return { checks, current, branch, head };
}

function parseJsonOutput(result, label) {
  if (result.status !== 0) throw new Error(`${label}: ${result.stderr.slice(-800) || 'command failed'}`);
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`${label}: invalid JSON output`);
  }
}

async function remoteChecks(context) {
  const checks = [];
  const remote = command('git', ['ls-remote', 'origin', `refs/heads/${context.branch}`]);
  const remoteHead = remote.stdout.split(/\s+/u)[0] ?? '';
  addCheck(checks, 'remote:git-branch', remote.status === 0 && remoteHead === context.head ? 'pass' : 'fail', remote.status === 0 ? `local=${context.head} remote=${remoteHead || 'missing'}` : remote.stderr.slice(-800));

  try {
    const pages = parseJsonOutput(
      command('pnpm', ['exec', 'wrangler', 'pages', 'deployment', 'list', '--project-name', 'nihongo-n3', '--json'], path.join(root, 'apps/web')),
      'Pages deployment list',
    );
    const production = pages.find((entry) => entry.Environment === 'Production');
    const deploymentMatches = Boolean(production?.Id && context.current.productionDeployment === production.Id);
    const sourceMatches = Boolean(production?.Source && context.current.pagesSourceSha?.startsWith(production.Source));
    addCheck(checks, 'remote:pages-deployment', deploymentMatches ? 'pass' : 'fail', production?.Id ?? 'missing');
    addCheck(checks, 'remote:pages-source', sourceMatches ? 'pass' : 'fail', production?.Source ?? 'missing');
  } catch (error) {
    addCheck(checks, 'remote:pages', 'fail', error instanceof Error ? error.message : String(error));
  }

  try {
    const deployment = parseJsonOutput(
      command('pnpm', ['exec', 'wrangler', 'deployments', 'status', '--json', '--config', 'apps/api/wrangler.toml']),
      'Worker deployment status',
    );
    const workerVersion = deployment.versions?.find((entry) => entry.percentage === 100)?.version_id ?? null;
    addCheck(checks, 'remote:worker-version', workerVersion === context.current.workerVersion ? 'pass' : 'fail', workerVersion ?? 'missing');
  } catch (error) {
    addCheck(checks, 'remote:worker', 'fail', error instanceof Error ? error.message : String(error));
  }

  try {
    const migrationResult = parseJsonOutput(
      command('pnpm', [
        'exec', 'wrangler', 'd1', 'execute', 'DB', '--remote', '--config', 'apps/api/wrangler.toml', '--json', '--command',
        'SELECT COUNT(*) AS migration_count, MAX(name) AS latest_name FROM d1_migrations',
      ]),
      'D1 migration ledger',
    );
    const row = migrationResult[0]?.results?.[0];
    const errors = validateMigrationLedgerResponse(row, context.current.migration);
    addCheck(checks, 'remote:d1-migrations', errors.length === 0 ? 'pass' : 'fail', [JSON.stringify(row ?? {}), ...errors].join('; '));
  } catch (error) {
    addCheck(checks, 'remote:d1-migrations', 'fail', error instanceof Error ? error.message : String(error));
  }

  for (const [id, url, expected] of [
    ['remote:pages-root', 'https://nihongo-n3.pages.dev/', 200],
    ['remote:audio-qa', 'https://nihongo-n3.pages.dev/audio-qa', 200],
    ['remote:legacy-audio', 'https://nihongo-n3.pages.dev/api/v1/audio/test', 410],
  ]) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      addCheck(checks, id, response.status === expected ? 'pass' : 'fail', `HTTP ${response.status}, expected ${expected}`);
    } catch (error) {
      addCheck(checks, id, 'fail', error instanceof Error ? error.message : String(error));
    }
  }

  try {
    const response = await fetch('https://nihongo-n3.pages.dev/api/v1/auth/config', { redirect: 'manual' });
    const contentType = response.headers.get('content-type') ?? '';
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      // The validator below records an invalid or non-JSON proxy response.
    }
    const errors = validateAuthProxyResponse(response.status, contentType, payload);
    addCheck(
      checks,
      'remote:auth-proxy',
      errors.length === 0 ? 'pass' : 'fail',
      errors.join('; ') || 'HTTP 200 application/json; google_enabled=true; auth_mode=app-session',
    );
  } catch (error) {
    addCheck(checks, 'remote:auth-proxy', 'fail', error instanceof Error ? error.message : String(error));
  }

  try {
    const response = await fetch('https://nihongo-n3.pages.dev/api/v1/tracks/topik-ko/status', { redirect: 'manual' });
    const contentType = response.headers.get('content-type') ?? '';
    const csp = response.headers.get('content-security-policy') ?? '';
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      // The validator records an invalid or non-JSON response.
    }
    const errors = validateTopikTrackStatusResponse(response.status, contentType, payload);
    addCheck(
      checks,
      'remote:topik-release-status',
      errors.length === 0 ? 'pass' : 'fail',
      errors.join('; ') || 'TOPIK v2 exposes TOPIK I-II with listening/writing/reading',
    );
    const cspBlocksPronunciationMedia = /media-src 'none'/u.test(csp) && !/r2\.cloudflarestorage\.com/iu.test(csp);
    addCheck(
      checks,
      'remote:csp-no-r2-pronunciation',
      cspBlocksPronunciationMedia ? 'pass' : 'fail',
      cspBlocksPronunciationMedia ? "media-src 'none'; no R2 media origin" : (csp || 'Content-Security-Policy missing'),
    );
  } catch (error) {
    addCheck(checks, 'remote:topik-release-status', 'fail', error instanceof Error ? error.message : String(error));
    addCheck(checks, 'remote:csp-no-r2-pronunciation', 'fail', error instanceof Error ? error.message : String(error));
  }

  const r2Check = command('pnpm', ['-F', '@nihongo-n3/db', 'verify:remote:audio:r2']);
  if (r2Check.status !== 0) {
    addCheck(checks, 'remote:r2-pronunciation', 'fail', safeDiagnostic(r2Check.stderr || r2Check.stdout));
  } else {
    try {
      const report = parseR2AbsenceReport(r2Check.stdout);
      addCheck(checks, 'remote:r2-pronunciation', report.total === 0 ? 'pass' : 'fail', `D1 pronunciation R2 references=${report.total}`);
    } catch (error) {
      addCheck(checks, 'remote:r2-pronunciation', 'fail', error instanceof Error ? error.message : String(error));
    }
  }
  return checks;
}

export async function buildOperationsReport({ remote = false } = {}) {
  const context = await localChecks();
  const checks = [...context.checks];
  if (remote) checks.push(...await remoteChecks(context));
  const failures = checks.filter((check) => check.status === 'fail');
  const warnings = checks.filter((check) => check.status === 'warn');
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: remote ? 'remote-read-only' : 'local-read-only',
    ok: failures.length === 0,
    summary: { passed: checks.filter((check) => check.status === 'pass').length, warnings: warnings.length, failed: failures.length },
    git: { branch: context.branch, head: context.head },
    production: context.current,
    checks,
  };
}

async function main() {
  const remote = process.argv.includes('--remote');
  const json = process.argv.includes('--json');
  const noWrite = process.argv.includes('--no-write');
  const report = await buildOperationsReport({ remote });
  if (!noWrite) {
    const directory = path.join(root, '.artifacts/operations');
    const history = path.join(directory, 'history');
    await mkdir(history, { recursive: true });
    await writeFile(path.join(directory, 'ops-status-latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    const timestamp = report.generatedAt.replace(/[:.]/gu, '-');
    await writeFile(path.join(history, `${timestamp}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`operations status: ${report.ok ? 'passed' : 'failed'} (${report.summary.passed} passed, ${report.summary.warnings} warnings, ${report.summary.failed} failed)`);
    for (const check of report.checks.filter((entry) => entry.status !== 'pass')) {
      console.log(`${check.status.toUpperCase()} ${check.id}: ${check.detail}`);
    }
  }
  process.exitCode = report.ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
