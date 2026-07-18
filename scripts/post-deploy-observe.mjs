#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import {
  buildObservabilitySummary,
  hasFiredAlert,
  normalizeTelemetryEvents,
  telemetryEventsFromQueryResult,
  parseWindow,
} from '../packages/shared/src/observability-core.mjs';

const args = new Map(
  process.argv.slice(2)
    .filter((value) => value.startsWith('--'))
    .map((value) => {
      const [name, ...rest] = value.slice(2).split('=');
      return [name, rest.join('=') || 'true'];
    }),
);

if (args.has('help')) {
  console.log(`Usage:
  pnpm ops:observe -- --base-url=https://<worker> --window=30m
  pnpm ops:observe -- --base-url=https://<worker> --window=24h --fail-on-alert

Required for telemetry aggregation:
  CLOUDFLARE_ACCOUNT_ID (or CF_ACCOUNT_ID)
  CLOUDFLARE_API_TOKEN  (or CF_API_TOKEN; Workers Observability Write)

Options:
  --base-url=<url>       Worker origin (or OBSERVABILITY_BASE_URL)
  --window=30m|24h       Aggregation window
  --worker=<name>        Worker service name (default: nihongo-n3-api)
  --release-sha=<sha>    Expected X-Release value
  --report=<path>        JSON evidence output
  --smoke-only           Skip Workers Observability API query
  --logs-only            Skip HTTP smoke checks
  --fail-on-alert        Exit 2 when a threshold fires
  --trigger-canary       Trigger the secret-protected preview 5xx and verify delivery
  --canary-count         Preview 5xx requests (default: 25, range: 1-50)
  --canary-wait-seconds  Telemetry ingestion wait (default: 45, max: 300)

Optional alert delivery:
  OBSERVABILITY_ALERT_WEBHOOK_URL
  OBSERVABILITY_ALERT_WEBHOOK_TOKEN
  OBSERVABILITY_CANARY_TOKEN (preview only)
`);
  process.exit(0);
}

loadEnvFile(path.resolve('.env'));
loadEnvFile(path.resolve('.env.local'));

const baseUrl = (args.get('base-url') ?? process.env.OBSERVABILITY_BASE_URL ?? '').replace(/\/$/, '');
const workerName = args.get('worker') ?? process.env.WORKER_NAME ?? 'nihongo-n3-api';
const windowLabel = args.get('window') ?? '30m';
const windowMs = parseWindow(windowLabel);
const accountId = firstEnv('CLOUDFLARE_ACCOUNT_ID', 'CF_ACCOUNT_ID');
const apiToken = firstEnv('CLOUDFLARE_API_TOKEN', 'CF_API_TOKEN');
const expectedRelease = args.get('release-sha') ?? process.env.RELEASE_SHA;
const triggerCanaryRequested = args.has('trigger-canary');
const canaryToken = process.env.OBSERVABILITY_CANARY_TOKEN?.trim();
const canaryCount = Number(args.get('canary-count') ?? '25');
const canaryWaitSeconds = Number(args.get('canary-wait-seconds') ?? '45');
const now = Date.now();
const timestamp = new Date(now).toISOString().replaceAll(':', '-');
const reportPath = path.resolve(
  args.get('report') ?? `.artifacts/observability/${timestamp}-${windowLabel}.json`,
);

if (!baseUrl && !args.has('logs-only')) {
  throw new Error('--base-url or OBSERVABILITY_BASE_URL is required for smoke checks');
}
if (!args.has('smoke-only') && (!accountId || !apiToken)) {
  throw new Error(
    'CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Workers Observability Write) are required unless --smoke-only is used',
  );
}
if (triggerCanaryRequested) {
  if (args.has('smoke-only')) {
    throw new Error('--trigger-canary requires a Workers Observability query; remove --smoke-only');
  }
  if (!baseUrl || !canaryToken) {
    throw new Error('--trigger-canary requires --base-url and OBSERVABILITY_CANARY_TOKEN');
  }
  if (!process.env.OBSERVABILITY_ALERT_WEBHOOK_URL?.trim()) {
    throw new Error('--trigger-canary requires OBSERVABILITY_ALERT_WEBHOOK_URL to verify delivery');
  }
  if (!Number.isInteger(canaryWaitSeconds) || canaryWaitSeconds < 0 || canaryWaitSeconds > 300) {
    throw new Error('--canary-wait-seconds must be an integer between 0 and 300');
  }
  if (!Number.isInteger(canaryCount) || canaryCount < 1 || canaryCount > 50) {
    throw new Error('--canary-count must be an integer between 1 and 50');
  }
}

const report = {
  generated_at: new Date(now).toISOString(),
  base_url: baseUrl || null,
  worker: workerName,
  expected_release: expectedRelease ?? null,
  smoke: [],
  canary: null,
  telemetry: null,
  alerts_delivered: false,
};

if (!args.has('logs-only')) {
  report.smoke = await runSmokeChecks(baseUrl, expectedRelease);
}

if (triggerCanaryRequested) {
  report.canary = await triggerCanary(baseUrl, canaryToken, canaryCount);
  if (canaryWaitSeconds > 0) await sleep(canaryWaitSeconds * 1_000);
}

if (!args.has('smoke-only')) {
  const telemetryNow = Date.now();
  const events = await queryTelemetry({
    accountId,
    apiToken,
    workerName,
    from: telemetryNow - Math.max(windowMs, 60 * 60_000),
    to: telemetryNow,
  });
  const logs = normalizeTelemetryEvents(events);
  report.telemetry = {
    event_rows_received: events.length,
    structured_events_used: logs.length,
    truncated_at_api_limit: events.length >= 2_000,
    ...buildObservabilitySummary(logs, { now: telemetryNow, windowMs }),
  };

  if (hasFiredAlert(report.telemetry.alert_evaluation)) {
    report.alerts_delivered = await deliverAlert(report);
  }
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({
  report: reportPath,
  smoke: summarizeChecks(report.smoke),
  canary: report.canary,
  telemetry: report.telemetry
    ? {
        requests: report.telemetry.requests.requests,
        five_xx_rate: report.telemetry.requests.five_xx_rate,
        d1_errors: report.telemetry.d1_errors,
        alerts: report.telemetry.alert_evaluation,
      }
    : null,
}, null, 2));

const smokeFailed = report.smoke.some((check) => check.status !== 'passed');
const alertFired = report.telemetry && hasFiredAlert(report.telemetry.alert_evaluation);
const canaryFailed = triggerCanaryRequested && (
  report.canary?.status !== 'passed'
  || report.telemetry?.alert_evaluation?.five_xx?.fired !== true
  || report.alerts_delivered !== true
);
if (smokeFailed) process.exit(1);
if (canaryFailed) process.exit(1);
if (args.has('fail-on-alert') && alertFired && !triggerCanaryRequested) process.exit(2);

async function runSmokeChecks(origin, release) {
  const probes = [
    ['health', '/health', 'application/json'],
    ['openapi', '/openapi.json', 'application/json'],
    ['auth_config', '/api/v1/auth/config', 'application/json'],
    ['vocab_search', '/api/v1/vocab/search?q=%E7%B5%8C%E9%A8%93&limit=1', 'application/json'],
    ['grammar', '/api/v1/grammar?limit=1', 'application/json'],
    ['kanji', '/api/v1/kanji?limit=1', 'application/json'],
    ['sentences', '/api/v1/sentences?limit=1', 'application/json'],
  ];
  const checks = [];
  for (const [name, route, expectedType] of probes) {
    const startedAt = Date.now();
    try {
      const response = await fetch(`${origin}${route}`, {
        headers: { 'X-Request-ID': `ops-${randomUUID()}` },
        signal: AbortSignal.timeout(20_000),
      });
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!contentType.includes(expectedType)) throw new Error(`unexpected content-type: ${contentType}`);
      const actualRelease = response.headers.get('x-release');
      if (release && actualRelease !== release) {
        throw new Error(`release mismatch: expected ${release}, received ${actualRelease ?? '<missing>'}`);
      }
      checks.push({ name, route, status: 'passed', http_status: response.status, duration_ms: Date.now() - startedAt, release: actualRelease });
    } catch (error) {
      checks.push({ name, route, status: 'failed', duration_ms: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return checks;
}

async function triggerCanary(origin, token, count) {
  const startedAt = Date.now();
  let passed = 0;
  for (let offset = 0; offset < count; offset += 5) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(5, count - offset) }, async () => {
        const response = await fetch(`${origin}/__ops/canary/5xx`, {
          headers: {
            'X-Observability-Canary': token,
            'X-Request-ID': `ops-canary-${randomUUID()}`,
          },
          signal: AbortSignal.timeout(20_000),
        });
        return response.status;
      }),
    );
    const unexpected = batch.find((status) => status !== 500);
    if (unexpected !== undefined) {
      throw new Error(`Preview observability canary returned HTTP ${unexpected}; expected 500`);
    }
    passed += batch.length;
  }
  return { status: 'passed', attempted: count, passed, http_status: 500, duration_ms: Date.now() - startedAt };
}

async function queryTelemetry({ accountId: id, apiToken: token, workerName: worker, from, to }) {
  const payload = {
    queryId: `nihongo-n3-post-deploy-${randomUUID()}`,
    timeframe: { from, to },
    dry: true,
    limit: 2_000,
    view: 'events',
    parameters: {
      datasets: ['cloudflare-workers'],
      filterCombination: 'and',
      filters: [
        {
          kind: 'filter',
          key: '$metadata.service',
          operation: 'eq',
          type: 'string',
          value: worker,
        },
      ],
      limit: 2_000,
    },
  };
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${id}/workers/observability/telemetry/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    const errors = (body?.errors ?? []).map(({ code, message }) => ({ code, message }));
    throw new Error(`Workers Observability API ${response.status}: ${JSON.stringify(errors)}`);
  }
  return telemetryEventsFromQueryResult(body?.result);
}

async function deliverAlert(currentReport) {
  const webhook = process.env.OBSERVABILITY_ALERT_WEBHOOK_URL?.trim();
  if (!webhook) return false;
  const headers = { 'Content-Type': 'application/json' };
  const token = process.env.OBSERVABILITY_ALERT_WEBHOOK_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(webhook, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source: 'post-deploy-observe',
      service: currentReport.worker,
      generated_at: currentReport.generated_at,
      expected_release: currentReport.expected_release,
      dedupe_key: `${currentReport.worker}:post-deploy:${currentReport.generated_at}`,
      event_rows_received: currentReport.telemetry.event_rows_received,
      telemetry_truncated: currentReport.telemetry.truncated_at_api_limit,
      alerts: currentReport.telemetry.alert_evaluation,
      requests: currentReport.telemetry.requests,
      releases: currentReport.telemetry.releases,
      routes: currentReport.telemetry.routes,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Alert webhook returned HTTP ${response.status}`);
  return true;
}

function summarizeChecks(checks) {
  return {
    passed: checks.filter((check) => check.status === 'passed').length,
    failed: checks.filter((check) => check.status === 'failed').length,
  };
}

function firstEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
