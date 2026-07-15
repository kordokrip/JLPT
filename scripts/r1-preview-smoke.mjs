#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';

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
  pnpm r1:preview-smoke -- --base-url=https://<preview-worker> --mode=off
  pnpm r1:preview-smoke -- --base-url=https://<preview-worker> --mode=read-only

Options:
  --base-url=<url>  Preview Worker origin (or R1_PREVIEW_API_URL)
  --mode=<mode>     off or read-only (or R1_PREVIEW_MAINTENANCE_MODE)
  --report=<path>   JSON output path under .artifacts by default

Optional environment:
  R1_SMOKE_ADMIN_COOKIE  Existing admin Cookie header for positive admin checks
`);
  process.exit(0);
}

const baseUrl = (args.get('base-url') ?? process.env.R1_PREVIEW_API_URL ?? '').replace(/\/$/, '');
const mode = args.get('mode') ?? process.env.R1_PREVIEW_MAINTENANCE_MODE ?? 'off';
if (!baseUrl) throw new Error('--base-url or R1_PREVIEW_API_URL is required');
if (!['off', 'read-only'].includes(mode)) throw new Error('--mode must be off or read-only');

const timestamp = new Date().toISOString().replaceAll(':', '-');
const reportPath = path.resolve(
  args.get('report') ?? `.artifacts/r1-preview-smoke/${timestamp}-${mode}.json`,
);
const adminCookie = process.env.R1_SMOKE_ADMIN_COOKIE?.trim() ?? '';
const cookieJar = new Map();
const checks = [];
const manualChecks = [];

function cookies() {
  return [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

function updateCookies(response) {
  const values = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  for (const value of values) {
    const pair = value.split(';', 1)[0];
    const separator = pair.indexOf('=');
    if (separator < 1) continue;
    const name = pair.slice(0, separator);
    const cookieValue = pair.slice(separator + 1);
    if (cookieValue) cookieJar.set(name, cookieValue);
    else cookieJar.delete(name);
  }
}

async function request(route, init = {}) {
  const headers = new Headers(init.headers ?? {});
  const cookie = init.cookie ?? cookies();
  if (cookie) headers.set('Cookie', cookie);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${baseUrl}${route}`, {
    ...init,
    headers,
    redirect: init.redirect ?? 'follow',
    signal: AbortSignal.timeout(20_000),
  });
  if (init.captureCookies !== false) updateCookies(response);
  return response;
}

async function json(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`HTTP ${response.status} returned non-JSON content`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function check(name, run) {
  const startedAt = Date.now();
  try {
    const detail = await run();
    checks.push({ name, status: 'passed', durationMs: Date.now() - startedAt, detail });
  } catch (error) {
    checks.push({
      name,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function expectStatus(route, expected, init = {}) {
  const response = await request(route, init);
  assert(response.status === expected, `${route}: expected ${expected}, received ${response.status}`);
  return response;
}

async function expectDataArray(route, { minimum = 1 } = {}) {
  const response = await expectStatus(route, 200);
  const body = await json(response);
  assert(Array.isArray(body?.data), `${route}: data is not an array`);
  assert(body.data.length >= minimum, `${route}: expected at least ${minimum} row(s), received ${body.data.length}`);
  return body.data;
}

async function verifyReadSurface() {
  await check('health', async () => {
    const response = await expectStatus('/health', 200);
    const body = await json(response);
    assert(body?.status === 'ok', 'health status is not ok');
    assert(body?.maintenanceMode === mode, `health maintenanceMode is ${String(body?.maintenanceMode)}`);
    return { maintenanceMode: body.maintenanceMode, release: body.release };
  });

  await check('public_openapi', async () => {
    const response = await expectStatus('/openapi.json', 200);
    const body = await json(response);
    const pathCount = Object.keys(body?.paths ?? {}).length;
    assert(pathCount > 0, 'OpenAPI document has no paths');
    return { pathCount };
  });

  await check('api_docs', async () => {
    const response = await expectStatus('/api/docs', 200);
    const contentType = response.headers.get('content-type') ?? '';
    assert(contentType.includes('text/html'), `unexpected docs content-type: ${contentType}`);
    return { contentType };
  });

  await check('auth_mode', async () => {
    const response = await expectStatus('/api/v1/auth/config', 200);
    const body = await json(response);
    assert(body?.data?.auth_mode === 'app-session', `expected app-session, received ${String(body?.data?.auth_mode)}`);
    return { authMode: body.data.auth_mode, googleEnabled: body.data.google_enabled === true };
  });

  await check('vocab_search', async () => ({ rows: (await expectDataArray('/api/v1/vocab/search?q=%E7%B5%8C%E9%A8%93&limit=3')).length }));
  await check('grammar_list', async () => ({ rows: (await expectDataArray('/api/v1/grammar?limit=3')).length }));
  await check('kanji_list', async () => ({ rows: (await expectDataArray('/api/v1/kanji?limit=3')).length }));
  await check('sentences_search', async () => ({ rows: (await expectDataArray('/api/v1/sentences/search?q=%E4%BA%88%E7%B4%84%E3%81%97%E3%81%9F%E6%99%82%E9%96%93%E3%82%92%E5%A4%89%E6%9B%B4%E3%81%97%E3%81%9F%E3%81%84%E3%82%93%E3%81%A7%E3%81%99%E3%81%8C&limit=3')).length }));

  await check('admin_protection', async () => {
    const spec = await request('/openapi/admin.json', { captureCookies: false });
    const users = await request('/api/v1/auth/admin/users', { captureCookies: false });
    assert([401, 403].includes(spec.status), `admin spec returned ${spec.status}`);
    assert([401, 403].includes(users.status), `admin users returned ${users.status}`);
    return { specStatus: spec.status, usersStatus: users.status };
  });

  if (adminCookie) {
    await check('admin_authenticated', async () => {
      const spec = await expectStatus('/openapi/admin.json', 200, { cookie: adminCookie, captureCookies: false });
      const users = await expectStatus('/api/v1/auth/admin/users', 200, { cookie: adminCookie, captureCookies: false });
      const specBody = await json(spec);
      const usersBody = await json(users);
      assert(Object.keys(specBody?.paths ?? {}).length > 0, 'admin OpenAPI has no paths');
      assert(Array.isArray(usersBody?.data?.users), 'admin users response is invalid');
      return { adminPathCount: Object.keys(specBody.paths).length, userCount: usersBody.data.users.length };
    });
  } else {
    manualChecks.push({
      name: 'admin_authenticated',
      status: 'manual-required',
      detail: 'R1_SMOKE_ADMIN_COOKIE was not provided; authenticated admin spec/users must be verified by a human.',
    });
  }
}

async function verifyReadOnly() {
  const probes = [
    ['register_read_only', '/api/v1/auth/register', 'POST', { email: 'blocked@example.invalid', password: 'BlockedPass123', display_name: 'Blocked' }],
    ['login_read_only', '/api/v1/auth/login', 'POST', { email: 'blocked@example.invalid', password: 'BlockedPass123' }],
    ['logout_read_only', '/api/v1/auth/logout', 'POST', undefined],
    ['google_start_read_only', '/api/v1/auth/google/start', 'GET', undefined],
    ['google_callback_read_only', '/api/v1/auth/google/callback?code=blocked&state=blocked', 'GET', undefined],
    ['google_complete_read_only', '/api/v1/auth/complete?token=blocked', 'GET', undefined],
    ['srs_init_read_only', '/api/v1/srs/init', 'POST', { item_type: 'vocab', item_ids: [1] }],
    ['sync_read_only', '/api/v1/sync', 'POST', { client_id: 'blocked', last_synced_at: new Date(0).toISOString(), operations: [] }],
  ];

  for (const [name, route, method, body] of probes) {
    await check(name, async () => {
      const response = await expectStatus(route, 503, {
        method,
        body: body ? JSON.stringify(body) : undefined,
        redirect: 'manual',
      });
      const retryAfter = response.headers.get('retry-after');
      assert(retryAfter === '900', `${route}: Retry-After is ${String(retryAfter)}`);
      return { status: response.status, retryAfter };
    });
  }
}

async function verifyWritable() {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const email = `r1-smoke-${suffix}@example.invalid`;
  const password = `R1Smoke${suffix}Pass9`;
  let vocabId;
  let cardId;

  await check('password_register', async () => {
    const response = await expectStatus('/api/v1/auth/register', 201, {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name: 'R1 Smoke User' }),
    });
    const body = await json(response);
    assert(body?.data?.user?.email === email, 'registered user mismatch');
    assert(cookies(), 'register did not set a session cookie');
    return { role: body.data.user.role, provider: body.data.user.auth_provider };
  });

  await check('session_refresh', async () => {
    const first = await expectStatus('/api/v1/auth/me', 200);
    const firstBody = await json(first);
    const second = await expectStatus('/api/v1/auth/me', 200);
    const secondBody = await json(second);
    assert(firstBody?.data?.authenticated === true, 'first session check is unauthenticated');
    assert(secondBody?.data?.authenticated === true, 'refreshed session is unauthenticated');
    return { authenticated: true, track: secondBody.data.user.learning_track };
  });

  await check('srs_init', async () => {
    const vocab = await expectDataArray('/api/v1/vocab?limit=1');
    vocabId = Number(vocab[0]?.id);
    assert(Number.isInteger(vocabId) && vocabId > 0, 'no valid vocab ID available');
    const response = await expectStatus('/api/v1/srs/init', 201, {
      method: 'POST', body: JSON.stringify({ item_type: 'vocab', item_ids: [vocabId] }),
    });
    const body = await json(response);
    return { vocabId, created: body?.data?.created };
  });

  await check('srs_due', async () => {
    const response = await expectStatus('/api/v1/srs/due?item_type=vocab&limit=100', 200);
    const body = await json(response);
    const card = body?.data?.find((item) => item.item_id === vocabId);
    cardId = Number(card?.id);
    assert(Number.isInteger(cardId) && cardId > 0, 'initialized card was not returned by due');
    return { cardId };
  });

  await check('srs_review', async () => {
    assert(cardId, 'srs_due did not provide a card ID');
    const response = await expectStatus('/api/v1/srs/review', 200, {
      method: 'POST', body: JSON.stringify({ card_id: cardId, rating: 'good', response_ms: 750 }),
    });
    const body = await json(response);
    return { state: body?.data?.state, dueAt: body?.data?.dueAt };
  });

  await check('sync_queue', async () => {
    assert(cardId, 'srs_due did not provide a card ID');
    const opId = randomUUID();
    const response = await expectStatus('/api/v1/sync', 200, {
      method: 'POST',
      body: JSON.stringify({
        client_id: `r1-preview-smoke-${suffix}`,
        last_synced_at: new Date(0).toISOString(),
        operations: [{
          op_id: opId,
          type: 'review',
          payload: { card_id: cardId, rating: 'good' },
          occurred_at: new Date().toISOString(),
        }],
      }),
    });
    const body = await json(response);
    assert(body?.data?.processed_op_ids?.includes(opId), 'sync operation was not processed');
    return { processed: 1 };
  });

  await check('regular_user_admin_denied', async () => {
    const spec = await request('/openapi/admin.json', { captureCookies: false });
    const users = await request('/api/v1/auth/admin/users', { captureCookies: false });
    assert(spec.status === 403, `regular user admin spec returned ${spec.status}`);
    assert(users.status === 403, `regular user admin users returned ${users.status}`);
    return { specStatus: spec.status, usersStatus: users.status };
  });

  await check('google_oauth_redirect', async () => {
    const response = await expectStatus('/api/v1/auth/google/start', 302, { redirect: 'manual' });
    const location = response.headers.get('location');
    assert(location, 'Google start has no Location header');
    const googleUrl = new URL(location);
    assert(googleUrl.hostname === 'accounts.google.com', `unexpected OAuth host: ${googleUrl.hostname}`);
    const redirectUri = new URL(googleUrl.searchParams.get('redirect_uri') ?? '');
    assert(redirectUri.pathname === '/api/v1/auth/google/callback', `unexpected redirect URI: ${redirectUri}`);
    assert(googleUrl.searchParams.has('state'), 'OAuth state is missing');
    return { oauthHost: googleUrl.hostname, redirectUri: redirectUri.toString() };
  });

  await check('google_callback_error_path', async () => {
    const response = await expectStatus('/api/v1/auth/google/callback', 302, { redirect: 'manual' });
    const location = response.headers.get('location') ?? '';
    assert(location.includes('/login?error=google_state'), `unexpected callback error redirect: ${location}`);
    return { redirectPath: new URL(location).pathname + new URL(location).search };
  });

  await check('google_complete_error_path', async () => {
    const response = await expectStatus('/api/v1/auth/complete?token=invalid-preview-smoke-token', 302, { redirect: 'manual' });
    const location = response.headers.get('location') ?? '';
    assert(location.includes('/login?error=google_callback'), `unexpected complete error redirect: ${location}`);
    return { redirectPath: new URL(location).pathname + new URL(location).search };
  });

  manualChecks.push({
    name: 'google_oauth_positive_callback_complete',
    status: 'manual-required',
    detail: 'A human must complete Google consent and attach callback/complete plus authenticated /auth/me evidence.',
  });

  await check('password_logout', async () => {
    await expectStatus('/api/v1/auth/logout', 200, { method: 'POST' });
    const response = await expectStatus('/api/v1/auth/me', 200);
    const body = await json(response);
    assert(body?.data?.authenticated === false, 'session remained authenticated after logout');
    return { authenticated: false };
  });

  await check('password_login', async () => {
    const response = await expectStatus('/api/v1/auth/login', 200, {
      method: 'POST', body: JSON.stringify({ email, password }),
    });
    const body = await json(response);
    assert(body?.data?.user?.email === email, 'login user mismatch');
    const me = await expectStatus('/api/v1/auth/me', 200);
    const meBody = await json(me);
    assert(meBody?.data?.authenticated === true, 'login session was not persisted');
    return { authenticated: true };
  });
}

await verifyReadSurface();
if (mode === 'read-only') await verifyReadOnly();
else await verifyWritable();

const failed = checks.filter((item) => item.status === 'failed').length;
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  mode,
  checks,
  manualChecks,
  summary: {
    passed: checks.length - failed,
    failed,
    manualRequired: manualChecks.length,
    automatedChecksPassed: failed === 0,
  },
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
console.log(`R1 preview smoke report: ${reportPath}`);
if (failed > 0) process.exitCode = 1;
