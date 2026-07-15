/**
 * apps/api/src/__tests__/routes.test.ts
 *
 * Hono 앱 통합 테스트 — @cloudflare/vitest-pool-workers 환경
 *
 * 모든 요청은 실제 Workers 런타임에서 실행된다.
 * 인증이 필요한 라우트는 ENVIRONMENT=test 에서 dev bypass를 사용한다.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import app, {
  app as honoApp,
  getAdminOpenApiDocument,
  getPublicOpenApiDocument,
  INTERNAL_ROUTE_EXCEPTIONS,
} from '../index.js';
import { audioContentHash, buildImmutableAudioKey } from '../jobs/generate-audio.js';
import { receiver as observabilityReceiver } from '../observability-receiver.js';

// Vite ?raw import 타입 선언 (env.d.ts에 전역 선언됨)
// @ts-ignore – wildcard module declaration only valid in .d.ts files
declare module '*.sql?raw' {
  const content: string;
  export default content;
}

// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawMigration from '../../../../packages/db/drizzle-v2/0000_schema_convergence.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawFtsMigration from '../../../../packages/db/drizzle-v2/0001_fts.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawAppDefaultsMigration from '../../../../packages/db/drizzle-v2/0002_app_defaults.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawSelfCheckMigration from '../../../../packages/db/drizzle-v2/0003_self_check_templates.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawPracticeContentMigration from '../../../../packages/db/drizzle-v2/0004_jlpt_n3_practice_content.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawLearningTrackMigration from '../../../../packages/db/drizzle-v2/0005_learning_track.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawOauthLearningTrackMigration from '../../../../packages/db/drizzle-v2/0006_oauth_learning_track.sql?raw';

// ─────────────────────────────────────────────
// 테스트 전 D1 스키마 적용
// ─────────────────────────────────────────────
beforeAll(async () => {
  // miniflare D1 exec()는 \n 기준으로 한 줄씩 실행하므로 사용 불가.
  // 주석·PRAGMA 제거 후 BEGIN/END 기반 파서로 독립 문장을 분리해
  // 각각 prepare().run() 으로 실행한다.
  const filteredLines = `${rawMigration}\n${rawFtsMigration}\n${rawAppDefaultsMigration}\n${rawSelfCheckMigration}\n${rawPracticeContentMigration}\n${rawLearningTrackMigration}\n${rawOauthLearningTrackMigration}`
    .replaceAll('--> statement-breakpoint', '')
    .split('\n')
    .filter(line => {
      const t = line.trim();
      return t && !t.startsWith('--') && !/^PRAGMA\s/i.test(t);
    });

  const statements: string[] = [];
  let current = '';
  let depth = 0;

  for (const line of filteredLines) {
    const up = line.trim().toUpperCase();
    if (up === 'BEGIN') depth++;
    if (up === 'END;') depth = Math.max(0, depth - 1);

    current += line + '\n';

    if (depth === 0 && line.trim().endsWith(';')) {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = '';
    }
  }
  if (current.trim()) statements.push(current.trim());

  for (const stmt of statements) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (env as any).DB.prepare(stmt).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/fts5|virtual table/i.test(message)) {
        console.warn('[setup] FTS DDL unavailable:', stmt.slice(0, 60).replace(/\n/g, ' '));
        continue;
      }
      throw error;
    }
  }
});


// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────
async function fetch(path: string, init?: RequestInit) {
  const request = new Request(`http://localhost${path}`, init);
  const ctx = createExecutionContext();
  const res = await app.fetch(request, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

async function fetchWithEnv(path: string, testEnv: typeof env, init?: RequestInit) {
  const request = new Request(`https://api.example.test${path}`, init);
  const ctx = createExecutionContext();
  const res = await app.fetch(request, testEnv, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

async function fetchReceiver(path: string, testEnv: typeof env, init?: RequestInit) {
  const request = new Request(`https://alerts.example.test${path}`, init);
  const ctx = createExecutionContext();
  const res = await observabilityReceiver.fetch(request, testEnv, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  return res.json<T>();
}

async function registerTestSession(role: 'user' | 'admin' = 'user'): Promise<string> {
  const email = `admin-route-${role}-${Date.now()}-${crypto.randomUUID()}@example.com`;
  const register = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Passw0rd1234', display_name: `${role} route test` }),
  });
  expect(register.status).toBe(201);

  if (role === 'admin') {
    await (env as typeof env & { DB: D1Database }).DB.prepare(
      `UPDATE users SET role = 'admin' WHERE email = ?`,
    ).bind(email).run();
  }

  return register.headers.get('set-cookie') ?? '';
}

const OPENAPI_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;

function documentRoutes(document: ReturnType<typeof getPublicOpenApiDocument>): Set<string> {
  const routes = new Set<string>();
  for (const [path, item] of Object.entries(document.paths ?? {})) {
    for (const method of OPENAPI_METHODS) {
      if (item?.[method]) routes.add(`${method.toUpperCase()} ${path}`);
    }
  }
  return routes;
}

function normalizeRuntimePath(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)(?:\{[^}]+\})?/g, '{$1}');
}

describe('OpenAPI route coverage', () => {
  it('matches every registered HTTP route except approved internal endpoints', () => {
    const runtime = new Set(
      honoApp.routes
        .filter((route) => route.method !== 'ALL')
        .map((route) => `${route.method} ${normalizeRuntimePath(route.path)}`)
        .filter((route) => !INTERNAL_ROUTE_EXCEPTIONS.has(route)),
    );
    const documented = new Set([
      ...documentRoutes(getPublicOpenApiDocument()),
      ...documentRoutes(getAdminOpenApiDocument()),
    ]);

    expect([...runtime].filter((route) => !documented.has(route))).toEqual([]);
    expect([...documented].filter((route) => !runtime.has(route))).toEqual([]);
  });

  it('keeps admin paths out of the public specification', () => {
    expect(Object.keys(getPublicOpenApiDocument().paths ?? {}).some((path) =>
      path.startsWith('/admin') || path.startsWith('/api/v1/auth/admin/'),
    )).toBe(false);
    expect(Object.keys(getAdminOpenApiDocument().paths ?? {}).length).toBeGreaterThan(0);
  });

  it('protects the admin specification with an application session', async () => {
    const productionEnv = { ...env, ENVIRONMENT: 'production', AUTH_MODE: 'app-session' };
    const publicSpec = await fetchWithEnv('/openapi.json', productionEnv);
    const adminSpec = await fetchWithEnv('/openapi/admin.json', productionEnv);
    expect(publicSpec.status).toBe(200);
    expect(adminSpec.status).toBe(401);
  });

  it('keeps unreviewed homophones out of the public contract', () => {
    expect(getPublicOpenApiDocument().paths?.['/api/v1/homophones']).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// /
// ─────────────────────────────────────────────
describe('GET /', () => {
  it('200 + 공개 서비스 상태', async () => {
    const res = await fetch('/');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { service: string; status: string } }>();
    expect(body.data.service).toBe('nihongo-n3-api');
    expect(body.data.status).toBe('ok');
  });
});

describe('request observability', () => {
  it.each([
    ['/api/v1/vocab/987654321?token=private-query-value', '/api/v1/vocab/:id', ['987654321', 'private-query-value']],
    ['/api/v1/reading/444444', '/api/v1/reading/:id', ['444444']],
    ['/not-a-real-route/private-segment?email=private@example.com', '/*', ['private-segment', 'private@example.com']],
  ])('logs a route template without request path values: %s', async (path, expectedRoute, forbiddenValues) => {
    const messages: Record<string, unknown>[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((message) => {
      if (message && typeof message === 'object') {
        messages.push(message as Record<string, unknown>);
      }
    });

    try {
      await fetch(path);
    } finally {
      log.mockRestore();
    }

    const requestLog = messages.find((message) => message['event'] === 'http_request');

    expect(requestLog?.['route']).toBe(expectedRoute);
    for (const forbidden of forbiddenValues) {
      expect(JSON.stringify(requestLog)).not.toContain(forbidden);
    }
    expect(requestLog).not.toHaveProperty('path');
    expect(requestLog).not.toHaveProperty('url');
    expect(requestLog).not.toHaveProperty('query');
  });

  it('keeps the 5xx canary unavailable outside an authenticated preview', async () => {
    const productionEnv = {
      ...env,
      ENVIRONMENT: 'production',
      OBSERVABILITY_CANARY_TOKEN: 'preview-secret-value',
    };
    const previewEnv = {
      ...env,
      ENVIRONMENT: 'preview',
      OBSERVABILITY_CANARY_TOKEN: 'preview-secret-value',
    };

    expect((await fetchWithEnv('/__ops/canary/5xx', productionEnv, {
      headers: { 'X-Observability-Canary': 'preview-secret-value' },
    })).status).toBe(404);
    expect((await fetchWithEnv('/__ops/canary/5xx', previewEnv, {
      headers: { 'X-Observability-Canary': 'wrong-secret-value' },
    })).status).toBe(404);
  });

  it('fires a PII-free 5xx event for an authenticated preview canary', async () => {
    const secret = 'preview-secret-value';
    const messages: Record<string, unknown>[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((message) => {
      if (message && typeof message === 'object') messages.push(message as Record<string, unknown>);
    });
    const error = vi.spyOn(console, 'error').mockImplementation((message) => {
      if (message && typeof message === 'object') messages.push(message as Record<string, unknown>);
    });

    try {
      const response = await fetchWithEnv(
        '/__ops/canary/5xx',
        { ...env, ENVIRONMENT: 'preview', OBSERVABILITY_CANARY_TOKEN: secret },
        { headers: { 'X-Observability-Canary': secret } },
      );
      expect(response.status).toBe(500);
    } finally {
      log.mockRestore();
      error.mockRestore();
    }

    const requestLog = messages.find((message) => message['event'] === 'http_request');
    const errorLog = messages.find((message) => message['event'] === 'application_error');
    expect(requestLog).toMatchObject({ route: '/__ops/canary/5xx', status: 500 });
    expect(errorLog).toMatchObject({
      route: '/__ops/canary/5xx',
      error_name: 'ObservabilityCanaryError',
    });
    expect(JSON.stringify(messages)).not.toContain(secret);
    expect(JSON.stringify(messages)).not.toContain('x-observability-canary');
  });

  it('authenticates the direct alert receiver and stores PII-free R2 evidence', async () => {
    const webhookToken = 'preview-webhook-secret';
    const canaryToken = 'preview-canary-secret';
    const workerName = 'nihongo-n3-api-observability-preview';
    const previewEnv = {
      ...env,
      ENVIRONMENT: 'preview',
      OBSERVABILITY_ALERT_WEBHOOK_TOKEN: webhookToken,
      OBSERVABILITY_CANARY_TOKEN: canaryToken,
      OBSERVABILITY_WORKER_NAME: workerName,
    };
    const generatedAt = new Date().toISOString();
    const payload = {
      source: 'post-deploy-observe',
      service: workerName,
      generated_at: generatedAt,
      release: 'test-release',
      dedupe_key: `${workerName}:test:${generatedAt}`,
      event_rows_received: 25,
      telemetry_truncated: false,
      alerts: { five_xx: { fired: true, requests: 25, errors: 25, rate: 1 } },
      requests: { requests: 25, five_xx: 25, five_xx_rate: 1 },
      releases: [{ release: 'test-release', requests: 25, five_xx: 25 }],
      routes: [{ route: '/__ops/canary/5xx', requests: 25, five_xx: 25 }],
    };

    expect((await fetchReceiver('/__ops/alerts/cloudflare', previewEnv, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-token' },
      body: JSON.stringify(payload),
    })).status).toBe(404);

    const accepted = await fetchReceiver('/__ops/alerts/cloudflare', previewEnv, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${webhookToken}` },
      body: JSON.stringify(payload),
    });
    expect(accepted.status).toBe(202);
    const receipt = await accepted.json<{ received: boolean; object_key: string; sha256: string }>();
    expect(receipt.received).toBe(true);
    expect(receipt.object_key).toMatch(/^alerts\/observability\/\d{4}\/\d{2}\/\d{2}\/[a-f0-9]{64}\.json$/);
    expect(receipt.sha256).toHaveLength(64);
    const evidence = await fetchReceiver('/__ops/evidence/r2?kind=alerts', previewEnv, {
      headers: { 'X-Observability-Canary': canaryToken },
    });
    expect(evidence.status).toBe(200);
    const evidenceBody = await evidence.json<{ count: number; objects: Array<{ key: string }> }>();
    expect(evidenceBody.count).toBeGreaterThan(0);
    expect(evidenceBody.objects.some((object) => object.key === receipt.object_key)).toBe(true);
  });

  it('rejects alert evidence containing PII-shaped fields', async () => {
    const token = 'preview-webhook-secret';
    const workerName = 'nihongo-n3-api-observability-preview';
    const response = await fetchReceiver('/__ops/alerts/cloudflare', {
      ...env,
      ENVIRONMENT: 'preview',
      OBSERVABILITY_ALERT_WEBHOOK_TOKEN: token,
      OBSERVABILITY_WORKER_NAME: workerName,
    }, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        source: 'test',
        service: workerName,
        generated_at: new Date().toISOString(),
        release: 'test',
        dedupe_key: 'test',
        event_rows_received: 1,
        user_email: 'private@example.com',
      }),
    });
    expect(response.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// /health
// ─────────────────────────────────────────────
describe('GET /health', () => {
  it('200 + { status: "ok" }', async () => {
    const res = await fetch('/health');
    expect(res.status).toBe(200);
    const body = await res.json<{ status: string }>();
    expect(body.status).toBe('ok');
  });

  it('returns request and release correlation headers', async () => {
    const res = await fetch('/health', { headers: { 'X-Request-ID': 'test-request-1234' } });
    expect(res.headers.get('x-request-id')).toBe('test-request-1234');
    expect(res.headers.get('x-release')).toBe('test');
  });
});

describe('Read-only cutover mode', () => {
  const readOnlyEnv = {
    ...env,
    ENVIRONMENT: 'production',
    AUTH_MODE: 'app-session',
    MAINTENANCE_MODE: 'read-only',
  };

  it('keeps read endpoints available', async () => {
    const res = await fetchWithEnv('/api/v1/sources', readOnlyEnv);
    expect(res.status).toBe(200);
  });

  it('blocks database-changing commands with retry metadata', async () => {
    const res = await fetchWithEnv('/api/v1/auth/login', readOnlyEnv, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'Passw0rd1234' }),
    });
    expect(res.status).toBe(503);
    expect(res.headers.get('retry-after')).toBe('900');
  });

  it('blocks OAuth GET routes that write state', async () => {
    const res = await fetchWithEnv('/api/v1/auth/google/start', readOnlyEnv);
    expect(res.status).toBe(503);
  });

  it('allows the explicitly side-effect-free translation command', async () => {
    const testReadOnlyEnv = { ...readOnlyEnv, ENVIRONMENT: 'test', AUTH_MODE: 'public-owner' };
    const res = await fetchWithEnv('/api/v1/ai/translate', testReadOnlyEnv, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '오늘은 조금 피곤해요', target: 'ja', tone: 'polite' }),
    });
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────
// /api/v1/ping
// ─────────────────────────────────────────────
describe('GET /api/v1/ping', () => {
  it('200 + { data: { message: "pong" } }', async () => {
    const body = await json<{ data: { message: string } }>('/api/v1/ping');
    expect(body.data.message).toBe('pong');
  });
});

describe('App auth', () => {
  it('registers, reads session user, and logs out with an HttpOnly cookie', async () => {
    const email = `user-${Date.now()}@example.com`;
    const register = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Passw0rd1234', display_name: '테스트 사용자' }),
    });
    expect(register.status).toBe(201);
    const cookie = register.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('n3_session=');
    expect(cookie).toContain('HttpOnly');

    const me = await fetch('/api/v1/auth/me', { headers: { Cookie: cookie } });
    expect(me.status).toBe(200);
    const meBody = await me.json<{ data: { authenticated: boolean; user: { email: string; learning_track: string } } }>();
    expect(meBody.data.authenticated).toBe(true);
    expect(meBody.data.user.email).toBe(email);
    expect(meBody.data.user.learning_track).toBe('jlpt-ja');

    const switchTrack = await fetch('/api/v1/auth/track', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ track: 'topik-ko' }),
    });
    expect(switchTrack.status).toBe(200);

    const switchedMe = await fetch('/api/v1/auth/me', { headers: { Cookie: cookie } });
    const switchedBody = await switchedMe.json<{ data: { user: { learning_track: string } } }>();
    expect(switchedBody.data.user.learning_track).toBe('topik-ko');

    const logout = await fetch('/api/v1/auth/logout', { method: 'POST', headers: { Cookie: cookie } });
    expect(logout.status).toBe(200);
  });

  it('logs out cleanly with production __Host session cookies', async () => {
    const email = `prod-user-${Date.now()}@example.com`;
    const productionEnv = { ...env, ENVIRONMENT: 'production', AUTH_MODE: 'app-session' };
    const register = await app.fetch(
      new Request('https://api.example.test/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://nihongo-n3.pages.dev' },
        body: JSON.stringify({ email, password: 'Passw0rd1234', display_name: '운영 쿠키 사용자' }),
      }),
      productionEnv,
      createExecutionContext(),
    );
    expect(register.status).toBe(201);
    const cookie = register.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('__Host-n3_session=');
    expect(cookie).toContain('Secure');

    const logout = await app.fetch(
      new Request('https://api.example.test/api/v1/auth/logout', {
        method: 'POST',
        headers: { Cookie: cookie, Origin: 'https://nihongo-n3.pages.dev' },
      }),
      productionEnv,
      createExecutionContext(),
    );
    expect(logout.status).toBe(200);
    const cleared = logout.headers.get('set-cookie') ?? '';
    expect(cleared).toContain('__Host-n3_session=');
    expect(cleared).toContain('Secure');
  });

  it('starts Google OAuth with the configured Worker callback in production', async () => {
    const productionEnv = {
      ...env,
      ENVIRONMENT: 'production',
      AUTH_MODE: 'app-session',
      APP_ORIGIN: 'https://nihongo-n3.pages.dev',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      GOOGLE_REDIRECT_URI: 'https://nihongo-n3-api.kordokrip.workers.dev/api/v1/auth/google/callback',
    };
    const res = await app.fetch(
      new Request('https://nihongo-n3.pages.dev/api/v1/auth/google/start?track=topik-ko', {
        headers: { Origin: 'https://nihongo-n3.pages.dev' },
      }),
      productionEnv,
      createExecutionContext(),
    );
    expect(res.status).toBe(302);
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('__Host-n3_oauth_state=');
    expect(cookie).toContain('SameSite=Lax');
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(decodeURIComponent(location)).toContain('redirect_uri=https://nihongo-n3-api.kordokrip.workers.dev/api/v1/auth/google/callback');
    const stateRow = await (env as typeof env & { DB: D1Database }).DB.prepare(
      `SELECT learning_track FROM oauth_states ORDER BY created_at DESC LIMIT 1`,
    ).first<{ learning_track: string }>();
    expect(stateRow?.learning_track).toBe('topik-ko');
  });

  it('completes Google OAuth through the cross-origin bridge and keeps the requested track', async () => {
    const productionEnv = {
      ...env,
      ENVIRONMENT: 'production',
      AUTH_MODE: 'app-session',
      APP_ORIGIN: 'https://nihongo-n3.pages.dev',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      GOOGLE_REDIRECT_URI: 'https://nihongo-n3-api.kordokrip.workers.dev/api/v1/auth/google/callback',
    };
    const start = await app.fetch(
      new Request('https://nihongo-n3.pages.dev/api/v1/auth/google/start?track=topik-ko'),
      productionEnv,
      createExecutionContext(),
    );
    const oauthCookie = (start.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
    const googleLocation = new URL(start.headers.get('location') ?? 'https://invalid.test');
    const state = googleLocation.searchParams.get('state') ?? '';

    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url === 'https://oauth2.googleapis.com/token') {
        return Response.json({ access_token: 'test-google-access-token' });
      }
      if (url === 'https://openidconnect.googleapis.com/v1/userinfo') {
        return Response.json({
          sub: `google-sub-${Date.now()}`,
          email: `google-${Date.now()}@example.com`,
          name: 'Google Test User',
          email_verified: true,
        });
      }
      throw new Error(`Unexpected OAuth test request: ${url}`);
    });

    try {
      const callback = await app.fetch(
        new Request(
          `https://nihongo-n3-api.kordokrip.workers.dev/api/v1/auth/google/callback?code=test-code&state=${encodeURIComponent(state)}`,
          { headers: { Cookie: oauthCookie } },
        ),
        productionEnv,
        createExecutionContext(),
      );
      expect(callback.status).toBe(302);
      const bridgeLocation = new URL(callback.headers.get('location') ?? 'https://invalid.test');
      expect(bridgeLocation.origin).toBe('https://nihongo-n3.pages.dev');
      expect(bridgeLocation.pathname).toBe('/api/v1/auth/complete');

      const complete = await app.fetch(
        new Request(bridgeLocation),
        productionEnv,
        createExecutionContext(),
      );
      expect(complete.status).toBe(302);
      const sessionCookie = complete.headers.get('set-cookie') ?? '';
      expect(sessionCookie).toContain('__Host-n3_session=');

      const me = await app.fetch(
        new Request('https://nihongo-n3.pages.dev/api/v1/auth/me', {
          headers: { Cookie: sessionCookie.split(';')[0] ?? '' },
        }),
        productionEnv,
        createExecutionContext(),
      );
      const meBody = await me.json<{ data: { user: { learning_track: string } } }>();
      expect(me.status).toBe(200);
      expect(meBody.data.user.learning_track).toBe('topik-ko');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('rejects weak passwords and invalid login attempts', async () => {
    const weak = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'weak@example.com', password: 'short' }),
    });
    expect(weak.status).toBe(400);

    const login = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'missing@example.com', password: 'Passw0rd1234' }),
    });
    expect(login.status).toBe(401);
  });
});

describe('Learning tracks', () => {
  it('reports JLPT as available and TOPIK as foundation-only', async () => {
    const jlpt = await json<{ data: { available: boolean; content_release: string } }>(
      '/api/v1/tracks/jlpt-ja/status',
    );
    const topik = await json<{ data: { available: boolean; content_release: string } }>(
      '/api/v1/tracks/topik-ko/status',
    );
    expect(jlpt.data).toEqual(expect.objectContaining({ available: true, content_release: 'n5-n3' }));
    expect(topik.data).toEqual(expect.objectContaining({ available: false, content_release: 'foundation-only' }));
  });
});

describe('R2 audio policy', () => {
  it('returns a visible 404 instead of generating missing audio on demand', async () => {
    const res = await fetch('/api/v1/audio/audio/vocab/n3/not-generated.mp3');
    expect(res.status).toBe(404);
  });

  it('uses stable provider and content version hashes in immutable keys', async () => {
    const provider = { provider: 'google', model: 'ja-JP-Neural2-B', audioVersion: '2026-07-15' } as const;
    const task = { id: 7, type: 'vocab' as const, level: 'N3', text: '勉強' };
    const firstHash = await audioContentHash(task.text, provider);
    const secondHash = await audioContentHash(task.text, provider);
    const key = await buildImmutableAudioKey(task, provider);
    expect(firstHash).toBe(secondHash);
    expect(key).toMatch(/^audio\/vocab\/n3\/7-[a-f0-9]{16}\.mp3$/);
    expect(await audioContentHash(task.text, { ...provider, audioVersion: 'next' })).not.toBe(firstHash);
  });

  it('keeps the production audio batch dry-run by default and rejects unapproved execution', async () => {
    const unauthenticated = await fetch('/admin/audio/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'google' }),
    });
    expect(unauthenticated.status).toBe(401);

    const userCookie = await registerTestSession('user');
    const forbidden = await fetch('/admin/audio/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userCookie },
      body: JSON.stringify({ provider: 'google' }),
    });
    expect(forbidden.status).toBe(403);

    const adminCookie = await registerTestSession('admin');
    const dryRun = await fetch('/admin/audio/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ provider: 'google' }),
    });
    expect(dryRun.status).toBe(200);
    const dryRunBody = await dryRun.json<{ data: {
      dry_run: boolean;
      execution_order: string[];
      immutable_overwrite_allowed: boolean;
      stats: { vocab: { pending: number } };
    } }>();
    expect(dryRunBody.data.dry_run).toBe(true);
    expect(dryRunBody.data.execution_order).toEqual(['N5', 'N4', 'N3']);
    expect(dryRunBody.data.immutable_overwrite_allowed).toBe(false);
    expect(dryRunBody.data.stats.vocab.pending).toBeGreaterThanOrEqual(0);

    const execute = await fetch('/admin/audio/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ execute: true, provider: 'google', level: 'N5' }),
    });
    expect(execute.status).toBe(400);

    const force = await fetch('/admin/audio/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ execute: true, provider: 'google', level: 'N5', force_regenerate: true }),
    });
    expect(force.status).toBe(400);
  });

  it('exposes only safe provider metadata for fixed QA candidates', async () => {
    const assets = (env as unknown as { ASSETS: R2Bucket }).ASSETS;
    await assets.put('audio/qa/google/1.wav', new Uint8Array([82, 73, 70, 70]), {
      httpMetadata: { contentType: 'audio/wav' },
      customMetadata: {
        provider: 'google',
        model: 'ja-JP-Neural2-B',
        audioVersion: 'google-neural2-v1',
      },
    });

    const response = await fetch('/api/v1/audio/audio/qa/google/1.wav', { method: 'HEAD' });
    expect(response.status).toBe(200);
    expect(response.headers.get('x-audio-provider')).toBe('google');
    expect(response.headers.get('x-audio-model')).toBe('ja-JP-Neural2-B');
    expect(response.headers.get('x-audio-version')).toBe('google-neural2-v1');
  });
});

// ─────────────────────────────────────────────
// /api/v1/sources
// ─────────────────────────────────────────────
describe('GET /api/v1/sources', () => {
  it('200 + data는 배열', async () => {
    const res = await fetch('/api/v1/sources');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: unknown[] }>();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('콘텐츠 버전 endpoint가 count/max timestamp 기반 버전을 반환한다', async () => {
    const res = await fetch('/api/v1/content/version');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { version: string; tables: Record<string, { count: number; updatedAt: number | null }> } }>();
    expect(body.data.version).toContain('vocab:');
    expect(body.data.tables.vocab?.count).toBeTypeOf('number');
    expect(body.data.tables.kanji?.count).toBeTypeOf('number');
  });
});

// ─────────────────────────────────────────────
// /api/v1/vocab
// ─────────────────────────────────────────────
describe('GET /api/v1/vocab', () => {
  it('200 + cursor 메타 포함', async () => {
    const res = await fetch('/api/v1/vocab?limit=10');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: unknown[]; meta?: { limit: number } }>();
    expect(Array.isArray(body.data)).toBe(true);
    if (body.meta) {
      expect(body.meta.limit).toBe(10);
    }
  });

  it('level 필터링 — N5', async () => {
    const res = await fetch('/api/v1/vocab?level=N5&limit=5');
    expect(res.status).toBe(200);
  });

  it('limit=0 → 400 Bad Request', async () => {
    const res = await fetch('/api/v1/vocab?limit=0');
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// /api/v1/vocab/search
// ─────────────────────────────────────────────
describe('GET /api/v1/vocab/search', () => {
  it('q 필수 — 없으면 400', async () => {
    const res = await fetch('/api/v1/vocab/search');
    expect(res.status).toBe(400);
  });

  it('정상 검색 → 200', async () => {
    const res = await fetch('/api/v1/vocab/search?q=test');
    expect(res.status).toBe(200);
  });

  it('FTS 연산 문자가 포함된 입력을 literal로 처리한다', async () => {
    const res = await fetch(`/api/v1/vocab/search?q=${encodeURIComponent('A: "test"')}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/v1/sentences/search', () => {
  it('문장 부호가 포함된 입력을 FTS literal로 처리한다', async () => {
    const res = await fetch(`/api/v1/sentences/search?q=${encodeURIComponent('A: 予約した時間を変更したいんですが、今日の午後は空いていますか。')}`);
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────
// /api/v1/vocab/:id
// ─────────────────────────────────────────────
describe('GET /api/v1/vocab/:id', () => {
  it('존재하지 않는 ID → 404', async () => {
    const res = await fetch('/api/v1/vocab/999999');
    expect(res.status).toBe(404);
  });

  it('유효하지 않은 ID → 400', async () => {
    const res = await fetch('/api/v1/vocab/abc');
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// /api/v1/ai/translate
// ─────────────────────────────────────────────
describe('POST /api/v1/ai/translate', () => {
  it('한국어 입력을 자연 일본어 응답 형태로 반환한다', async () => {
    const res = await fetch('/api/v1/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '오늘은 조금 피곤해요', target: 'ja', tone: 'polite' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { translatedText: string; model: string } }>();
    expect(body.data.translatedText).toContain('疲');
    expect(body.data.model).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  });

  it('운영 app-session 모드에서는 세션 없는 요청을 거부한다', async () => {
    const productionEnv = { ...env, ENVIRONMENT: 'production', AUTH_MODE: 'app-session' };
    const res = await fetchWithEnv('/api/v1/ai/translate', productionEnv, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://nihongo-n3.pages.dev' },
      body: JSON.stringify({ text: '오늘은 조금 피곤해요', target: 'ja', tone: 'polite' }),
    });
    expect(res.status).toBe(401);
    const body = await res.json<{ detail: string }>();
    expect(body.detail).toContain('로그인');
  });

  it('빈 입력은 400', async () => {
    const res = await fetch('/api/v1/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '', target: 'ja' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('Auth mode guardrails', () => {
  it('cf-access 모드에서는 Cloudflare Access JWT 없는 보호 라우트를 거부한다', async () => {
    const cfAccessEnv = {
      ...env,
      ENVIRONMENT: 'production',
      AUTH_MODE: 'cf-access',
      CF_ACCESS_AUD: 'test-aud',
      CF_TEAM_DOMAIN: 'test.cloudflareaccess.com',
    };
    const res = await fetchWithEnv('/api/v1/srs/due', cfAccessEnv);
    expect(res.status).toBe(401);
    const body = await res.json<{ detail: string }>();
    expect(body.detail).toContain('Cf-Access-Jwt-Assertion');
  });
});

// ─────────────────────────────────────────────
// /api/v1/grammar
// ─────────────────────────────────────────────
describe('GET /api/v1/grammar', () => {
  it('200 + 배열 반환', async () => {
    const res = await fetch('/api/v1/grammar?limit=5');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: unknown[] }>();
    expect(Array.isArray(body.data)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// /api/v1/kanji
// ─────────────────────────────────────────────
describe('GET /api/v1/kanji', () => {
  it('200', async () => {
    const res = await fetch('/api/v1/kanji?limit=5');
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────
// /api/v1/curriculum
// ─────────────────────────────────────────────
describe('GET /api/v1/curriculum', () => {
  it('200 + 배열', async () => {
    const res = await fetch('/api/v1/curriculum');
    expect(res.status).toBe(200);
  });

  it('GET /curriculum/:week — 유효하지 않은 week → 404', async () => {
    const res = await fetch('/api/v1/curriculum/999');
    expect(res.status).toBe(404);
  });
});

describe('Supplemental JLPT practice content', () => {
  it('N3 독해 지문과 문제가 seed되어 조회된다', async () => {
    const listRes = await fetch('/api/v1/reading?level=N3');
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json<{ data: { items: Array<{ id: number; title_ja: string }> } }>();
    expect(listBody.data.items.length).toBeGreaterThan(0);

    const firstId = listBody.data.items[0]!.id;
    const detailRes = await fetch(`/api/v1/reading/${firstId}`);
    expect(detailRes.status).toBe(200);
    const detailBody = await detailRes.json<{ data: { questions: unknown[] } }>();
    expect(detailBody.data.questions.length).toBeGreaterThanOrEqual(2);
  });

  it('N3 실전 회화 예문이 sentences API에서 조회된다', async () => {
    const first = await fetch('/api/v1/sentences?level=N3&register=conversation&limit=200');
    expect(first.status).toBe(200);
    const firstBody = await first.json<{ data: Array<{ ja: string; ko: string }>; meta?: { nextCursor?: string } }>();

    const second = await fetch(`/api/v1/sentences?level=N3&register=conversation&limit=200&cursor=${encodeURIComponent(firstBody.meta?.nextCursor ?? '')}`);
    expect(second.status).toBe(200);
    const secondBody = await second.json<{ data: Array<{ ja: string; ko: string }> }>();
    const items = [...firstBody.data, ...secondBody.data];
    expect(items.some((item) => item.ja.includes('予約した時間を変更したい'))).toBe(true);
  });
});

// ─────────────────────────────────────────────
// SRS — 개발 환경 auth bypass (ENVIRONMENT=test)
// ─────────────────────────────────────────────
describe('POST /api/v1/srs/init (dev bypass)', () => {
  it('정상 요청 → 201', async () => {
    const res = await fetch('/api/v1/srs/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_type: 'vocab',
        item_ids: [1, 2, 3],
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json<{ data: { created: number } }>();
    expect(body.data.created).toBe(3);
  });

  it('잘못된 item_type → 400', async () => {
    const res = await fetch('/api/v1/srs/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: 'invalid', item_ids: [1] }),
    });
    expect(res.status).toBe(400);
  });

  it('빈 item_ids → 400', async () => {
    const res = await fetch('/api/v1/srs/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: 'vocab', item_ids: [] }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/srs/due (dev bypass)', () => {
  it('200 + 배열 반환', async () => {
    const res = await fetch('/api/v1/srs/due');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: unknown[] }>();
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/v1/srs/review (dev bypass)', () => {
  it('card_id 계약으로 리뷰를 처리한다', async () => {
    await fetch('/api/v1/srs/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: 'vocab', item_ids: [44444] }),
    });

    const dueRes = await fetch('/api/v1/srs/due?item_type=vocab&limit=100');
    const dueBody = await dueRes.json<{ data: Array<{ id: number; item_id: number }> }>();
    const card = dueBody.data.find((item) => item.item_id === 44444);
    expect(card?.id).toBeTypeOf('number');

    const res = await fetch('/api/v1/srs/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: card!.id, rating: 'good' }),
    });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/v1/sync (dev bypass)', () => {
  it('review operation을 card_id로 처리한다', async () => {
    await fetch('/api/v1/srs/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: 'vocab', item_ids: [55555] }),
    });

    const dueRes = await fetch('/api/v1/srs/due?item_type=vocab&limit=100');
    const dueBody = await dueRes.json<{ data: Array<{ id: number; item_id: number }> }>();
    const card = dueBody.data.find((item) => item.item_id === 55555);
    expect(card?.id).toBeTypeOf('number');

    const res = await fetch('/api/v1/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: 'test-client',
        last_synced_at: new Date(0).toISOString(),
        operations: [{
          op_id: '00000000-0000-4000-8000-000000000001',
          type: 'review',
          payload: { card_id: card!.id, rating: 'good' },
          occurred_at: new Date().toISOString(),
        }],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json<{ data: { processed_op_ids: string[] } }>();
    expect(body.data.processed_op_ids).toContain('00000000-0000-4000-8000-000000000001');
  });
});

describe('Self-check routes (dev bypass)', () => {
  it('한국어 N3 자기진단 템플릿을 반환한다', async () => {
    const res = await fetch('/api/v1/self-check/templates?level=N3');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { templates: Array<{ item_ko: string; recommendation_ko: string }> } }>();
    expect(body.data.templates.length).toBeGreaterThan(0);
    expect(body.data.templates[0]?.item_ko).toMatch(/[가-힣]/);
    expect(body.data.templates[0]?.recommendation_ko).toMatch(/[가-힣]/);
  });

  it('독해와 회화 점수를 포함해 자기진단을 저장한다', async () => {
    const save = await fetch('/api/v1/self-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week_no: 3,
        vocab_score: 70,
        grammar_score: 60,
        reading_score: 55,
        listening_score: 40,
        speaking_score: 30,
        writing_score: 65,
        domain_score: 50,
      }),
    });
    expect(save.status).toBe(201);

    const res = await fetch('/api/v1/self-check/3');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { reading_score: number; speaking_score: number } }>();
    expect(body.data.reading_score).toBe(55);
    expect(body.data.speaking_score).toBe(30);
  });
});

describe('GET /api/v1/srs/stats (dev bypass)', () => {
  it('200 + state별 count', async () => {
    const res = await fetch('/api/v1/srs/stats');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: Record<string, number> }>();
    expect(typeof body.data.new).toBe('number');
    expect(typeof body.data.review).toBe('number');
  });
});

// ─────────────────────────────────────────────
// Logs
// ─────────────────────────────────────────────
describe('POST /api/v1/logs/daily (dev bypass)', () => {
  it('201 성공', async () => {
    const res = await fetch('/api/v1/logs/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2025-01-01',
        items_new: 10,
        items_review: 20,
        time_min: 30,
        audio_min: 0,
      }),
    });
    expect(res.status).toBe(201);
  });

  it('날짜 형식 오류 → 400', async () => {
    const res = await fetch('/api/v1/logs/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '20250101', items_new: 0, items_review: 0, time_min: 0, audio_min: 0 }),
    });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// 404
// ─────────────────────────────────────────────
describe('존재하지 않는 경로', () => {
  it('404 + RFC 7807 형식', async () => {
    const res = await fetch('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    const body = await res.json<{ type: string; status: number }>();
    expect(body.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('루트 레벨 미등록 경로도 Access 미설정 오류가 아닌 404', async () => {
    const res = await fetch('/unknown');
    expect(res.status).toBe(404);
    const body = await res.json<{ type: string; status: number }>();
    expect(body.status).toBe(404);
    expect(body.type).toContain('not-found');
  });
});
