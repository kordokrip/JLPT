import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildObservabilitySummary,
  evaluateAlerts,
  extractStructuredLog,
  normalizeTelemetryEvents,
  parseWindow,
  telemetryEventsFromQueryResult,
} from '../../packages/shared/src/observability-core.mjs';
import { normalizeApiList } from '../lib/cloudflare-response.mjs';

test('parses supported observation windows', () => {
  assert.equal(parseWindow('30m'), 1_800_000);
  assert.equal(parseWindow('24h'), 86_400_000);
  assert.throws(() => parseWindow('1d'), /Unsupported window/);
});

test('extracts object and legacy JSON-string structured logs', () => {
  assert.deepEqual(
    extractStructuredLog({ source: { event: 'http_request', route: '/health' } }),
    { event: 'http_request', route: '/health' },
  );
  assert.deepEqual(
    extractStructuredLog({ source: '{"event":"d1_error","route":"/api/v1/vocab"}' }),
    { event: 'd1_error', route: '/api/v1/vocab' },
  );
});

test('normalizes telemetry without retaining raw paths or query values', () => {
  const events = [
    {
      timestamp: 1_000,
      source: { event: 'http_request', route: '/api/v1/vocab/:id', status: 200, duration_ms: 12 },
      url: 'https://example.test/api/v1/vocab/secret?token=private',
    },
  ];
  const normalized = normalizeTelemetryEvents(events);
  assert.deepEqual(normalized, [
    { event: 'http_request', route: '/api/v1/vocab/:id', status: 200, duration_ms: 12, timestamp: 1_000 },
  ]);
  assert.doesNotMatch(JSON.stringify(normalized), /secret|private/);
});

test('extracts events from the current Cloudflare query envelope and legacy arrays', () => {
  const current = [{ timestamp: 1, source: { event: 'http_request' } }];
  assert.deepEqual(telemetryEventsFromQueryResult({ events: { count: 1, events: current } }), current);
  assert.deepEqual(telemetryEventsFromQueryResult({ events: current }), current);
  assert.deepEqual(telemetryEventsFromQueryResult({ events: { count: 0 } }), []);
});

test('fires all three alert classes at their documented thresholds', () => {
  const now = Date.parse('2026-07-15T00:00:00.000Z');
  const logs = [];
  for (let index = 0; index < 98; index++) {
    logs.push(request(now - 60_000 - index, 200));
  }
  logs.push(request(now - 30_000, 500));
  logs.push(request(now - 29_000, 500));
  for (let index = 0; index < 5; index++) {
    logs.push({ ...request(now - 20_000 - index, 401), event: 'auth_failure', route: '/api/v1/auth/login' });
  }
  logs.push({ event: 'd1_error', timestamp: now - 10_000, release: 'sha-a', route: '/api/v1/vocab' });

  const alerts = evaluateAlerts(logs, { now });
  assert.equal(alerts.five_xx.fired, true);
  assert.equal(alerts.auth_failure_trend.fired, true);
  assert.equal(alerts.d1_error.fired, true);
});

test('groups latency and errors by release SHA and route template', () => {
  const now = Date.parse('2026-07-15T00:00:00.000Z');
  const logs = [
    request(now - 3_000, 200, 10, 'sha-a', '/health'),
    request(now - 2_000, 200, 20, 'sha-a', '/health'),
    request(now - 1_000, 503, 100, 'sha-b', '/api/v1/vocab/:id'),
  ];
  const summary = buildObservabilitySummary(logs, { now, windowMs: parseWindow('30m') });
  assert.equal(summary.requests.requests, 3);
  assert.equal(summary.requests.latency_ms.p95, 100);
  assert.deepEqual(summary.releases.map((row) => row.release), ['sha-a', 'sha-b']);
  assert.deepEqual(summary.routes.map((row) => row.route), ['/health', '/api/v1/vocab/:id']);
});

test('does not double-count paired request and auth_failure events', () => {
  const now = Date.parse('2026-07-15T00:00:00.000Z');
  const paired = [
    request(now - 1_000, 401, 10, 'sha-a', '/api/v1/auth/login'),
    { event: 'auth_failure', timestamp: now - 1_000, status: 401, route: '/api/v1/auth/login' },
  ];
  const alerts = evaluateAlerts(paired, { now });
  assert.equal(alerts.auth_failure_trend.current_5m, 1);
});

test('normalizes Cloudflare list envelopes used by schedules, queries, and secrets', () => {
  assert.deepEqual(normalizeApiList([{ id: 'direct' }]), [{ id: 'direct' }]);
  assert.deepEqual(normalizeApiList({ schedules: [{ cron: '*/5 * * * *' }] }), [
    { cron: '*/5 * * * *' },
  ]);
  assert.deepEqual(normalizeApiList({ queries: [{ id: 'query' }] }), [{ id: 'query' }]);
  assert.deepEqual(normalizeApiList({ secrets: [{ name: 'TOKEN' }] }), [{ name: 'TOKEN' }]);
  assert.deepEqual(normalizeApiList({ unknown: [] }), []);
});

function request(timestamp, status, duration = 10, release = 'sha-a', route = '/health') {
  return { event: 'http_request', timestamp, status, duration_ms: duration, release, route };
}
