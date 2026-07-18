#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const VERIFY_ONLY = args.has('--verify-only');

if (args.has('--help')) {
  console.log(`Usage:
  node scripts/setup-logpush.mjs --dry-run
  node scripts/setup-logpush.mjs --apply
  node scripts/setup-logpush.mjs --verify-only

Required for --apply:
  CLOUDFLARE_ACCOUNT_ID (or CF_ACCOUNT_ID)
  CLOUDFLARE_API_TOKEN  (or CF_API_TOKEN; Logs Write)
  R2_ACCESS_KEY_ID      (bucket-scoped Object Write)
  R2_SECRET_ACCESS_KEY

Optional:
  R2_BUCKET_NAME=nihongo-n3-reports
  WORKER_NAME=nihongo-n3-api
  LOGPUSH_PREFIX=logs/workers
  LOGPUSH_JOB_NAME=nihongo-n3-api-logpush-r2
  LOGPUSH_REPORT=.artifacts/observability/logpush-job.json

The script never prints R2 credentials. Without --apply it only emits a
redacted plan and performs no Cloudflare mutation.
`);
  process.exit(0);
}

loadEnvFile(path.resolve('.env'));
loadEnvFile(path.resolve('.env.local'));

const ACCOUNT_ID = firstEnv('CLOUDFLARE_ACCOUNT_ID', 'CF_ACCOUNT_ID');
const API_TOKEN = firstEnv('CLOUDFLARE_API_TOKEN', 'CF_API_TOKEN');
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim();
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim();
const BUCKET_NAME = process.env.R2_BUCKET_NAME?.trim() || 'nihongo-n3-reports';
const WORKER_NAME = process.env.WORKER_NAME?.trim() || 'nihongo-n3-api';
const PREFIX = normalizePrefix(process.env.LOGPUSH_PREFIX?.trim() || 'logs/workers');
const JOB_NAME = process.env.LOGPUSH_JOB_NAME?.trim() || `${WORKER_NAME}-logpush-r2`;
const REPORT_PATH = path.resolve(
  process.env.LOGPUSH_REPORT?.trim() || '.artifacts/observability/logpush-job.json',
);

const FIELD_NAMES = [
  'EventTimestampMs',
  'EventType',
  'Outcome',
  'Logs',
  'ScriptName',
  'ScriptVersion',
  'CPUTimeMs',
  'WallTimeMs',
];

const destinationConf = buildDestinationConf({
  accountId: ACCOUNT_ID || '<account-id>',
  accessKeyId: R2_ACCESS_KEY_ID || '<r2-access-key-id>',
  secretAccessKey: R2_SECRET_ACCESS_KEY || '<r2-secret-access-key>',
});

const jobPayload = {
  name: JOB_NAME,
  destination_conf: destinationConf,
  dataset: 'workers_trace_events',
  enabled: true,
  output_options: {
    field_names: FIELD_NAMES,
    timestamp_format: 'rfc3339ms',
    sample_rate: 1,
  },
  filter: JSON.stringify({
    where: {
      key: 'ScriptName',
      operator: 'eq',
      value: WORKER_NAME,
    },
  }),
};

if (!APPLY && !VERIFY_ONLY) {
  const plan = {
    mode: 'dry-run',
    job: redactJob(jobPayload),
    lifecycle: {
      bucket: BUCKET_NAME,
      prefix: `${PREFIX}/`,
      retention_days: 30,
      rule: 'nihongo-n3-worker-logs-30d',
      command:
        `pnpm exec wrangler r2 bucket lifecycle add ${BUCKET_NAME} ` +
        `nihongo-n3-worker-logs-30d ${PREFIX}/ --expire-days 30 --force`,
    },
    required_permissions: {
      cloudflare_api_token: ['Logs Write'],
      r2_token: [`Object Write: ${BUCKET_NAME}`],
    },
  };
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

const required = [
  ['CLOUDFLARE_ACCOUNT_ID or CF_ACCOUNT_ID', ACCOUNT_ID],
  ['CLOUDFLARE_API_TOKEN or CF_API_TOKEN', API_TOKEN],
];
if (APPLY) {
  required.push(
    ['R2_ACCESS_KEY_ID', R2_ACCESS_KEY_ID],
    ['R2_SECRET_ACCESS_KEY', R2_SECRET_ACCESS_KEY],
  );
}

const missing = required.filter(([, value]) => !value).map(([name]) => name);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const basePath = `/accounts/${ACCOUNT_ID}`;
const fields = await cfFetch(`${basePath}/logpush/datasets/workers_trace_events/fields`);
const availableFields = new Set(Object.keys(fields ?? {}));
const unavailableFields = FIELD_NAMES.filter((field) => !availableFields.has(field));
if (unavailableFields.length > 0) {
  throw new Error(`Cloudflare dataset does not expose fields: ${unavailableFields.join(', ')}`);
}

const jobs = await cfFetch(`${basePath}/logpush/jobs`);
const existing = (jobs ?? []).find(
  (job) => job.name === JOB_NAME && job.dataset === 'workers_trace_events',
);

if (VERIFY_ONLY) {
  if (!existing) throw new Error(`Logpush job not found: ${JOB_NAME}`);
  const report = buildReport(existing, 'verified');
  writeReport(report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(existing.enabled && !existing.error_message ? 0 : 1);
}

const result = existing
  ? await cfFetch(`${basePath}/logpush/jobs/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify(jobPayload),
    })
  : await cfFetch(`${basePath}/logpush/jobs`, {
      method: 'POST',
      body: JSON.stringify(jobPayload),
    });

const report = buildReport(result, existing ? 'updated' : 'created');
writeReport(report);
console.log(JSON.stringify(report, null, 2));

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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function normalizePrefix(value) {
  const normalized = value.replace(/^\/+|\/+$/g, '');
  if (!normalized) throw new Error('LOGPUSH_PREFIX must not be empty');
  return normalized;
}

function buildDestinationConf({ accountId, accessKeyId, secretAccessKey }) {
  const query = new URLSearchParams({
    'account-id': accountId,
    'access-key-id': accessKeyId,
    'secret-access-key': secretAccessKey,
  });
  return `r2://${BUCKET_NAME}/${PREFIX}/{DATE}?${query.toString()}`;
}

async function cfFetch(apiPath, options = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${apiPath}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    const errors = (body?.errors ?? []).map((error) => ({
      code: error.code,
      message: error.message,
    }));
    throw new Error(`Cloudflare API ${response.status}: ${JSON.stringify(errors)}`);
  }
  return body?.result;
}

function redactDestination(value) {
  return String(value ?? '')
    .replace(/([?&]access-key-id=)[^&]*/i, '$1<redacted>')
    .replace(/([?&]secret-access-key=)[^&]*/i, '$1<redacted>');
}

function redactJob(job) {
  return {
    ...job,
    destination_conf: redactDestination(job.destination_conf),
  };
}

function buildReport(job, action) {
  return {
    checked_at: new Date().toISOString(),
    action,
    job: {
      id: job.id,
      name: job.name,
      dataset: job.dataset,
      enabled: job.enabled,
      destination_conf: redactDestination(job.destination_conf),
      output_options: job.output_options,
      filter: job.filter,
      last_complete: job.last_complete ?? null,
      last_error: job.last_error ?? null,
      error_message: job.error_message ?? null,
    },
    retention: {
      bucket: BUCKET_NAME,
      prefix: `${PREFIX}/`,
      days: 30,
      rule: 'nihongo-n3-worker-logs-30d',
    },
  };
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
}
