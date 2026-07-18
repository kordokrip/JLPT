#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { normalizeApiList } from './lib/cloudflare-response.mjs';

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const VERIFY_ONLY = args.has('--verify-only');

if (args.has('--help')) {
  console.log(`Usage:
  pnpm ops:alerts -- --dry-run
  pnpm ops:alerts -- --apply
  pnpm ops:alerts -- --verify-only

Required for --apply/--verify-only:
  CLOUDFLARE_ACCOUNT_ID (or CF_ACCOUNT_ID)
  CLOUDFLARE_API_TOKEN  (or CF_API_TOKEN) with:
    - Workers Observability Write
    - Notifications Read (Read/Write when native policies are managed)
    - Workers Scripts Read (cron and secret-name verification)

Optional:
  WORKER_NAME=nihongo-n3-api
  ALERT_RECEIVER_SERVICE=nihongo-n3-observability-receiver-preview
  OBSERVABILITY_ALERT_WEBHOOK_URL
  ALERT_SETUP_REPORT=.artifacts/observability/alert-setup.json

Cloudflare Notifications does not expose arbitrary Workers structured-log
threshold policies. This script verifies that limitation against the account,
creates the three saved detection queries, and verifies the deployed 5-minute
Worker cron plus required secret names without printing secret values.
`);
  process.exit(0);
}

loadEnvFile(path.resolve('.env'));
loadEnvFile(path.resolve('.env.local'));

const accountId = firstEnv('CLOUDFLARE_ACCOUNT_ID', 'CF_ACCOUNT_ID');
const apiToken = firstEnv('CLOUDFLARE_API_TOKEN', 'CF_API_TOKEN');
const workerName = process.env.WORKER_NAME?.trim() || 'nihongo-n3-api';
const queryNamespace = workerName === 'nihongo-n3-api' ? 'nihongo-n3' : workerName;
const webhook = process.env.OBSERVABILITY_ALERT_WEBHOOK_URL?.trim();
const receiverService = process.env.ALERT_RECEIVER_SERVICE?.trim();
const reportPath = path.resolve(
  process.env.ALERT_SETUP_REPORT?.trim() || '.artifacts/observability/alert-setup.json',
);

const queryDefinitions = [
  savedQuery({
    slug: 'five-xx',
    name: `${queryNamespace} / 5xx by release and route`,
    description: '5-minute 5xx evidence source. Alert threshold is >1% of http_request events.',
    filters: [
      filter('event', 'eq', 'string', 'http_request'),
      filter('status', 'gte', 'number', 500),
    ],
    groupBys: ['release', 'route'],
  }),
  savedQuery({
    slug: 'auth-failure',
    name: `${queryNamespace} / auth failure trend`,
    description: 'Authentication 401/403 trend evidence. Runner compares current 5m with normalized previous 55m.',
    filters: [filter('event', 'eq', 'string', 'auth_failure')],
    groupBys: ['release', 'route'],
  }),
  savedQuery({
    slug: 'd1-error',
    name: `${queryNamespace} / D1 errors`,
    description: 'PII-free D1 error evidence. Alert threshold is any event in 5 minutes.',
    filters: [filter('event', 'eq', 'string', 'd1_error')],
    groupBys: ['release', 'route'],
  }),
];

if (!APPLY && !VERIFY_ONLY) {
  console.log(JSON.stringify({
    mode: 'dry-run',
    worker: workerName,
    queries: queryDefinitions,
    delivery: {
      webhook_configured: Boolean(webhook),
      scheduled_runner: 'nihongo-n3-api cron */5 * * * *',
      required_worker_secret_names: [
        'CLOUDFLARE_ACCOUNT_ID',
        'OBSERVABILITY_API_TOKEN',
        'OBSERVABILITY_ALERT_WEBHOOK_URL',
      ],
    },
    native_notification_note:
      'Cloudflare Notifications has no arbitrary Workers structured-log threshold alert type; account support is checked during apply.',
  }, null, 2));
  process.exit(0);
}

if (!accountId || !apiToken) {
  throw new Error(
    'CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required for --apply/--verify-only',
  );
}

const availableAlerts = await cfFetch(`/accounts/${accountId}/alerting/v3/available_alerts`);
const availableAlertTypes = collectAlertTypes(availableAlerts);
const nativeWorkersThresholdTypes = availableAlertTypes.filter((type) =>
  /worker.*(?:error|health)|(?:error|health).*worker/i.test(type),
);

const existingQueriesResult = await cfFetch(`/accounts/${accountId}/workers/observability/queries`);
const existingQueries = normalizeApiList(existingQueriesResult);
const schedules = normalizeApiList(
  await cfFetch(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}/schedules`),
);
const remoteSecrets = normalizeApiList(
  await cfFetch(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}/secrets`),
);
const workerSettings = await cfFetch(
  `/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}/settings`,
);
const expectedCron = '*/5 * * * *';
const requiredSecretNames = [
  'CLOUDFLARE_ACCOUNT_ID',
  'OBSERVABILITY_API_TOKEN',
  'OBSERVABILITY_ALERT_WEBHOOK_URL',
];
const remoteSecretNames = remoteSecrets
  .map((secret) => secret.name)
  .filter((name) => typeof name === 'string')
  .sort();
const serviceBindings = normalizeApiList(workerSettings?.bindings)
  .filter((binding) => binding.type === 'service')
  .map((binding) => ({ name: binding.name, service: binding.service }));
const queryResults = [];

for (const definition of queryDefinitions) {
  const existing = existingQueries.find((query) => query.name === definition.name);
  if (existing) {
    queryResults.push({ slug: definition.slug, id: existing.id, status: 'existing' });
    continue;
  }
  if (VERIFY_ONLY) {
    queryResults.push({ slug: definition.slug, id: null, status: 'missing' });
    continue;
  }
  const created = await cfFetch(`/accounts/${accountId}/workers/observability/queries`, {
    method: 'POST',
    body: JSON.stringify({
      name: definition.name,
      description: definition.description,
      parameters: definition.parameters,
    }),
  });
  queryResults.push({ slug: definition.slug, id: created?.id ?? null, status: 'created' });
}

const report = {
  checked_at: new Date().toISOString(),
  mode: VERIFY_ONLY ? 'verify-only' : 'apply',
  worker: workerName,
  query_results: queryResults,
  native_notifications: {
    supported_alert_type_count: availableAlertTypes.length,
    workers_structured_log_threshold_supported: nativeWorkersThresholdTypes.length > 0,
    possible_types: nativeWorkersThresholdTypes,
    decision:
      nativeWorkersThresholdTypes.length > 0
        ? 'Review account-specific type filters before creating a policy.'
        : 'Use Workers Observability saved queries plus the threshold runner; do not create a mismatched HTTP zone alert.',
  },
  delivery: {
    local_webhook_configured: Boolean(webhook),
    local_webhook_host: webhook ? safeHost(webhook) : null,
    cron: expectedCron,
    cron_present: schedules.some((schedule) => schedule.cron === expectedCron),
    required_worker_secret_names: requiredSecretNames,
    present_worker_secret_names: requiredSecretNames.filter((name) => remoteSecretNames.includes(name)),
    missing_worker_secret_names: requiredSecretNames.filter((name) => !remoteSecretNames.includes(name)),
    internal_receiver: {
      expected_service: receiverService || null,
      present: receiverService
        ? serviceBindings.some((binding) =>
            binding.name === 'OBSERVABILITY_ALERT_RECEIVER'
            && binding.service === receiverService)
        : null,
    },
  },
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ report: reportPath, ...report }, null, 2));

if (
  queryResults.some((result) => result.status === 'missing')
  || !report.delivery.cron_present
  || report.delivery.missing_worker_secret_names.length > 0
  || (receiverService && !report.delivery.internal_receiver.present)
) process.exit(1);

function savedQuery({ slug, name, description, filters, groupBys }) {
  return {
    slug,
    name,
    description,
    parameters: {
      datasets: ['cloudflare-workers'],
      filterCombination: 'and',
      filters: [filter('$metadata.service', 'eq', 'string', workerName), ...filters],
      calculations: [{ operator: 'count', alias: 'events' }],
      groupBys: groupBys.map((value) => ({ type: 'string', value })),
      orderBy: { value: 'events', order: 'desc' },
      limit: 100,
      view: 'calculations',
    },
  };
}

function filter(key, operation, type, value) {
  return { kind: 'filter', key, operation, type, value };
}

function collectAlertTypes(value) {
  const rows = Array.isArray(value) ? value : Object.entries(value ?? {}).map(([key, row]) => ({ key, ...(row ?? {}) }));
  return [...new Set(rows.map((row) => row.alert_type ?? row.type ?? row.key).filter(Boolean))].sort();
}

async function cfFetch(apiPath, options = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${apiPath}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    const errors = (body?.errors ?? []).map(({ code, message }) => ({ code, message }));
    throw new Error(`Cloudflare API ${response.status}: ${JSON.stringify(errors)}`);
  }
  return body?.result;
}

function safeHost(value) {
  try {
    return new URL(value).host;
  } catch {
    return '<invalid-url>';
  }
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
