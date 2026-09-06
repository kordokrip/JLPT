import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import app from '../app.js';
import { sha256Hex } from '../lib/auth-session.js';
// Use the same Workers/D1 and canonical raw-migration fixture pattern as
// routes.test.ts, limited to the migrations that own the auth contract.
// @ts-ignore -- Vite raw SQL import
import baseSchema from '../../../../packages/db/drizzle-v2/0000_schema_convergence.sql?raw';
// @ts-ignore -- Vite raw SQL import
import userTrackSchema from '../../../../packages/db/drizzle-v2/0005_learning_track.sql?raw';
// @ts-ignore -- Vite raw SQL import
import oauthTrackSchema from '../../../../packages/db/drizzle-v2/0006_oauth_learning_track.sql?raw';

const db = (env as typeof env & { DB: D1Database }).DB;
const pagesOrigin = 'https://preview-pages.example.test';
const workerOrigin = 'https://preview-worker.example.test';
const redirectUri = workerOrigin + '/api/v1/auth/google/callback';
const previewEnv = {
  ...env,
  ENVIRONMENT: 'preview',
  AUTH_MODE: 'app-session',
  APP_ORIGIN: pagesOrigin,
  GOOGLE_REDIRECT_URI: redirectUri,
  GOOGLE_CLIENT_ID: 'mock-preview-client',
  GOOGLE_CLIENT_SECRET: 'mock-preview-secret',
};

beforeAll(async () => {
  for (const migration of [baseSchema, userTrackSchema, oauthTrackSchema]) {
    for (const statement of migration.split('--> statement-breakpoint').map((sql: string) => sql.trim()).filter(Boolean)) {
      await db.prepare(statement).run();
    }
  }
});

afterEach(() => vi.unstubAllGlobals());

async function request(url: string, cookie?: string) {
  const ctx = createExecutionContext();
  const response = await app.fetch(new Request(url, cookie ? { headers: { Cookie: cookie } } : undefined), previewEnv, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

describe('Preview cross-origin OAuth bridge (Google provider mocked; local D1)', () => {
  it.each(['jlpt-ja', 'topik-ko'] as const)(
    'creates the %s session on the app origin and rejects sequential bridge-token reuse',
    async (track) => {
      const profile = {
        sub: 'bridge-' + crypto.randomUUID(),
        email: 'bridge-' + crypto.randomUUID() + '@example.test',
        name: 'Synthetic bridge fixture',
        email_verified: true,
      };
      const provider = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input instanceof Request ? input.url : String(input);
        if (url === 'https://oauth2.googleapis.com/token') {
          expect(init?.method).toBe('POST');
          const form = new URLSearchParams(String(init?.body));
          expect(form.get('redirect_uri')).toBe(redirectUri);
          expect(form.get('code')).toBe('mock-authorized-code');
          return Response.json({ access_token: 'mock-access-token' });
        }
        if (url === 'https://openidconnect.googleapis.com/v1/userinfo') {
          expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer mock-access-token');
          return Response.json(profile);
        }
        throw new Error('Unexpected external request in local OAuth bridge test');
      });
      vi.stubGlobal('fetch', provider);

      const start = await request(pagesOrigin + '/api/v1/auth/google/start?track=' + track);
      expect(start.status).toBe(302);
      const authorization = new URL(start.headers.get('location')!);
      expect(authorization.origin).toBe('https://accounts.google.com');
      expect(authorization.searchParams.get('redirect_uri')).toBe(redirectUri);
      const state = authorization.searchParams.get('state')!;
      const stateHash = await sha256Hex(state);
      expect(await db.prepare('SELECT learning_track, consumed_at FROM oauth_states WHERE state_hash=?').bind(stateHash).first())
        .toMatchObject({ learning_track: track, consumed_at: null });

      // The Pages host's OAuth cookie is absent on the Worker callback host.
      // This exercises the current DB-backed state path, not a real browser
      // navigation, Google account consent, or production credential setup.
      const callback = await request(redirectUri + '?code=mock-authorized-code&state=' + encodeURIComponent(state));
      expect(callback.status).toBe(302);
      expect(callback.headers.get('set-cookie') ?? '').not.toContain('n3_session=');
      const bridgeUrl = new URL(callback.headers.get('location')!);
      expect(bridgeUrl.origin).toBe(pagesOrigin);
      expect(bridgeUrl.pathname).toBe('/api/v1/auth/complete');
      const token = bridgeUrl.searchParams.get('token')!;
      expect(token.length).toBeGreaterThan(20);
      const tokenHash = await sha256Hex(token);
      const userId = 'google_' + profile.sub;
      expect(await db.prepare('SELECT user_id, consumed_at FROM oauth_login_tokens WHERE token_hash=?').bind(tokenHash).first())
        .toMatchObject({ user_id: userId, consumed_at: null });
      expect(await db.prepare('SELECT COUNT(*) AS n FROM oauth_login_tokens WHERE token_hash=?').bind(token).first())
        .toEqual({ n: 0 });
      expect((await db.prepare('SELECT consumed_at FROM oauth_states WHERE state_hash=?').bind(stateHash).first<{ consumed_at: number }>())?.consumed_at)
        .toBeGreaterThan(0);

      const complete = await request(bridgeUrl.href);
      expect(complete.status).toBe(302);
      expect(complete.headers.get('location')).toBe(pagesOrigin);
      const cookie = (complete.headers.get('set-cookie') ?? '').match(/(?:^|,\s*)(n3_session=[^;]+)/)?.[1];
      expect(cookie).toBeTruthy();
      expect(complete.headers.get('set-cookie')).toContain('HttpOnly');
      const me = await request(pagesOrigin + '/api/v1/auth/me', cookie);
      expect(me.status).toBe(200);
      expect((await me.json<{ data: unknown }>()).data).toMatchObject({
        authenticated: true,
        user: { id: userId, email: profile.email, auth_provider: 'google', learning_track: track },
      });
      expect(await db.prepare('SELECT learning_track FROM users WHERE id=?').bind(userId).first())
        .toEqual({ learning_track: track });
      expect((await db.prepare('SELECT consumed_at FROM oauth_login_tokens WHERE token_hash=?').bind(tokenHash).first<{ consumed_at: number }>())?.consumed_at)
        .toBeGreaterThan(0);

      const replay = await request(bridgeUrl.href);
      expect(replay.status).toBe(302);
      expect(replay.headers.get('location')).toBe(pagesOrigin + '/login?error=google_callback');
      expect(replay.headers.get('set-cookie') ?? '').not.toContain('n3_session=');
      expect(await db.prepare('SELECT COUNT(*) AS n FROM auth_sessions WHERE user_id=?').bind(userId).first())
        .toEqual({ n: 1 });
      const anonymous = await request(pagesOrigin + '/api/v1/auth/me');
      expect((await anonymous.json<{ data: unknown }>()).data).toEqual({ authenticated: false, user: null });
      expect(provider).toHaveBeenCalledTimes(2);
    },
  );
});
