import { OpenAPIHono } from '@hono/zod-openapi';

import { equalSecret } from '../lib/secret.js';
import type { AppEnv } from '../types.js';

const MAX_PAYLOAD_BYTES = 64 * 1024;
const ALERT_PREFIX = 'alerts/observability';
const LOGPUSH_PREFIX = 'logs/workers';
const FORBIDDEN_KEY = /(?:^|_)(?:user|email|ip|address|url|path|query|header|cookie|authorization|token|secret)(?:_|$)/i;
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

type JsonRecord = Record<string, unknown>;

export const observabilityOps = new OpenAPIHono<AppEnv>();

observabilityOps.post('/__ops/alerts/cloudflare', async (c) => {
  const configuredToken = c.env.OBSERVABILITY_ALERT_WEBHOOK_TOKEN?.trim();
  const suppliedToken = bearerToken(c.req.header('authorization'));
  if (!configuredToken || !suppliedToken || !(await equalSecret(configuredToken, suppliedToken))) {
    return c.notFound();
  }

  const contentType = c.req.header('content-type') ?? '';
  const declaredLength = Number(c.req.header('content-length') ?? '0');
  if (!contentType.toLowerCase().includes('application/json')) {
    return c.json({ error: 'application/json required' }, 415);
  }
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PAYLOAD_BYTES) {
    return c.json({ error: 'payload too large' }, 413);
  }

  const text = await c.req.text();
  if (new TextEncoder().encode(text).byteLength > MAX_PAYLOAD_BYTES) {
    return c.json({ error: 'payload too large' }, 413);
  }

  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return c.json({ error: 'invalid JSON' }, 400);
  }

  const payload = normalizeAlertPayload(input, c.env.OBSERVABILITY_WORKER_NAME);
  if (!payload) return c.json({ error: 'invalid alert payload' }, 400);

  const receivedAt = new Date().toISOString();
  const evidence = {
    schema_version: 1,
    received_at: receivedAt,
    ...payload,
  };
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  const hash = await sha256(serialized);
  const datePath = receivedAt.slice(0, 10).replaceAll('-', '/');
  const key = `${ALERT_PREFIX}/${datePath}/${hash}.json`;
  const existing = await c.env.REPORTS.head(key);

  if (!existing) {
    await c.env.REPORTS.put(key, serialized, {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        source: payload.source,
        service: payload.service,
        release: payload.release,
        receivedAt,
      },
    });
  }
  await c.env.REPORTS.put(`${ALERT_PREFIX}/latest.json`, JSON.stringify({ key, hash, received_at: receivedAt }), {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: { source: payload.source, service: payload.service, receivedAt },
  });

  return c.json({ received: true, duplicate: Boolean(existing), object_key: key, sha256: hash }, 202);
});

observabilityOps.get('/__ops/evidence/r2', async (c) => {
  const configuredToken = c.env.OBSERVABILITY_CANARY_TOKEN?.trim();
  const suppliedToken = c.req.header('x-observability-canary')?.trim();
  if (
    c.env.ENVIRONMENT !== 'preview'
    || !configuredToken
    || !suppliedToken
    || !(await equalSecret(configuredToken, suppliedToken))
  ) {
    return c.notFound();
  }

  const kind = c.req.query('kind');
  if (kind !== 'alerts' && kind !== 'logpush') {
    return c.json({ error: 'kind must be alerts or logpush' }, 400);
  }
  const prefix = kind === 'alerts' ? `${ALERT_PREFIX}/` : `${LOGPUSH_PREFIX}/`;
  const listed = await c.env.REPORTS.list({ prefix, limit: 1_000 });
  const objects = listed.objects
    .filter((object) => object.key !== `${ALERT_PREFIX}/latest.json`)
    .sort((left, right) => right.uploaded.getTime() - left.uploaded.getTime())
    .slice(0, 20)
    .map((object) => ({
      key: object.key,
      size: object.size,
      uploaded: object.uploaded.toISOString(),
      etag: object.etag,
    }));

  return c.json({ kind, prefix, count: objects.length, truncated: listed.truncated, objects });
});

function bearerToken(value: string | undefined): string | null {
  const match = value?.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] ?? null;
}

function normalizeAlertPayload(value: unknown, expectedService: string | undefined): {
  source: string;
  service: string;
  generated_at: string;
  release: string;
  dedupe_key: string;
  event_rows_received: number;
  telemetry_truncated: boolean;
  alerts: unknown;
  requests: unknown;
  releases: unknown;
  routes: unknown;
} | null {
  if (!isRecord(value) || containsUnsafeData(value)) return null;
  const service = shortString(value.service, 120);
  const generatedAt = isoDate(value.generated_at);
  const release = shortString(value.release ?? value.expected_release ?? 'unversioned', 120);
  const dedupeKey = shortString(value.dedupe_key ?? `${service}:${generatedAt}`, 240);
  const source = shortString(value.source ?? 'unknown', 64);
  const eventRows = finiteInteger(value.event_rows_received ?? 0, 0, 1_000_000);
  if (!service || !generatedAt || !release || !dedupeKey || !source || eventRows === null) return null;
  if (expectedService?.trim() && service !== expectedService.trim()) return null;
  if (!validRouteMetrics(value.routes)) return null;

  return {
    source,
    service,
    generated_at: generatedAt,
    release,
    dedupe_key: dedupeKey,
    event_rows_received: eventRows,
    telemetry_truncated: value.telemetry_truncated === true,
    alerts: value.alerts ?? null,
    requests: value.requests ?? null,
    releases: value.releases ?? null,
    routes: value.routes ?? null,
  };
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function containsUnsafeData(value: unknown, depth = 0): boolean {
  if (depth > 8) return true;
  if (typeof value === 'string') return value.length > 2_000 || value.includes('@') || UUID_PATTERN.test(value);
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return false;
  if (Array.isArray(value)) return value.length > 500 || value.some((item) => containsUnsafeData(item, depth + 1));
  if (!isRecord(value)) return true;
  const entries = Object.entries(value);
  return entries.length > 100 || entries.some(([key, item]) => FORBIDDEN_KEY.test(key) || containsUnsafeData(item, depth + 1));
}

function validRouteMetrics(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!Array.isArray(value)) return false;
  return value.every((row) => {
    if (!isRecord(row) || typeof row.route !== 'string') return false;
    return row.route.startsWith('/')
      && !row.route.includes('?')
      && !row.route.includes('@')
      && !/\/\d+(?:\/|$)/.test(row.route)
      && !UUID_PATTERN.test(row.route);
  });
}

function shortString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : null;
}

function isoDate(value: unknown): string | null {
  const stringValue = shortString(value, 64);
  if (!stringValue) return null;
  const timestamp = Date.parse(stringValue);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function finiteInteger(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : null;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
