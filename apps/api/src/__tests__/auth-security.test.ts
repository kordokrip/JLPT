import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { Hono } from 'hono';
import { auth } from '../routes/auth.js';
import type { AppEnv } from '../types.js';
import { hashPassword, sha256Hex } from '../lib/auth-session.js';
// Actual isolated D1 migrations; provider HTTP is mocked, not Google acceptance.
// @ts-ignore -- Vite raw SQL import
import baseSchema from '../../../../packages/db/drizzle-v2/0000_schema_convergence.sql?raw';
// @ts-ignore -- Vite raw SQL import
import userTrackSchema from '../../../../packages/db/drizzle-v2/0005_learning_track.sql?raw';
// @ts-ignore -- Vite raw SQL import
import oauthTrackSchema from '../../../../packages/db/drizzle-v2/0006_oauth_learning_track.sql?raw';
// @ts-ignore -- Vite raw SQL import
import accountSchema from '../../../../packages/db/drizzle-v2/0033_account_personalization.sql?raw';

const db = (env as typeof env & { DB: D1Database }).DB;
const origin = 'https://auth-security.example.test';
const redirectUri = origin + '/api/v1/auth/google/callback';
const testEnv = {
  ...env, DB: db, ENVIRONMENT: 'preview', AUTH_MODE: 'app-session', APP_ORIGIN: origin,
  GOOGLE_REDIRECT_URI: redirectUri, GOOGLE_CLIENT_ID: 'mock-client', GOOGLE_CLIENT_SECRET: 'mock-secret',
  ADMIN_EMAIL: 'reserved-admin@example.test', ADMIN_BOOTSTRAP_TOKEN: 'synthetic-bootstrap-secret',
};
// Route/session invariants are tested separately from app CSRF/rate-limit tests.
const app = new Hono<AppEnv>().route('/api/v1', auth);

beforeAll(async () => {
  for (const migration of [baseSchema, userTrackSchema, oauthTrackSchema, accountSchema]) {
    for (const statement of migration.split('--> statement-breakpoint').map((sql: string) => sql.trim()).filter(Boolean)) {
      await db.prepare(statement).run();
    }
  }
});
afterEach(() => vi.unstubAllGlobals());

async function request(path: string, init?: RequestInit, overrides: Partial<typeof testEnv> = {}) {
  const ctx = createExecutionContext();
  const response = await app.fetch(new Request(origin + '/api/v1' + path, init), { ...testEnv, ...overrides }, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}
function json(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
function provider(profile: Record<string, unknown>) {
  const mock = vi.fn(async (input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'mock-token' });
    if (url === 'https://openidconnect.googleapis.com/v1/userinfo') return Response.json(profile);
    throw new Error('Unexpected provider URL');
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}
async function start() {
  const response = await request('/auth/google/start?track=topik-ko');
  return {
    state: new URL(response.headers.get('location')!).searchParams.get('state')!,
    cookie: response.headers.get('set-cookie')!.split(';')[0]!,
  };
}
function callback(state: string, cookie?: string) {
  return request('/auth/google/callback?code=mock-code&state=' + encodeURIComponent(state),
    cookie ? { headers: { Cookie: cookie } } : undefined);
}
async function insertUser(options: { googleSub?: string; email?: string; password?: string } = {}) {
  const id = 'security-' + crypto.randomUUID();
  const email = options.email ?? id + '@example.test';
  const passwordHash = options.password ? await hashPassword(options.password) : null;
  await db.prepare(`INSERT INTO users (id,email,display_name,password_hash,auth_provider,google_sub,learning_track)
    VALUES (?,?,?,?,?,?,'jlpt-ja')`).bind(id,email,'Synthetic account',passwordHash,options.password ? 'password' : 'google',options.googleSub ?? null).run();
  return { id, email, passwordHash };
}

describe('Authentication security contracts (isolated D1; mocked Google)', () => {
  it('never grants admin to a public registration that claims ADMIN_EMAIL', async () => {
    const response = await request('/auth/register', json({ email: testEnv.ADMIN_EMAIL, password: 'Password1234', role: 'admin' }));
    expect(response.status).toBe(201);
    expect((await response.json<{ data: { user: { role: string } } }>()).data.user.role).toBe('user');
    expect(await db.prepare('SELECT role FROM users WHERE email=?').bind(testEnv.ADMIN_EMAIL).first()).toEqual({ role: 'user' });
  });

  it('keeps explicit token-authorized bootstrap, rejecting a wrong token', async () => {
    const email = crypto.randomUUID() + '@example.test';
    expect((await request('/auth/bootstrap-admin', json({ token: 'wrong', email, password: 'Password1234' }))).status).toBe(403);
    expect((await request('/auth/bootstrap-admin', json({ token: testEnv.ADMIN_BOOTSTRAP_TOKEN, email, password: 'Password1234' }))).status).toBe(200);
    expect(await db.prepare('SELECT role FROM users WHERE email=?').bind(email).first()).toEqual({ role: 'admin' });
  });

  it('preserves trimmed password login and bounds user-controlled inputs', async () => {
    const email = crypto.randomUUID() + '@example.test';
    expect((await request('/auth/register', json({ email, password: '  Password1234  ' }))).status).toBe(201);
    expect((await request('/auth/login', json({ email, password: ' Password1234 ' }))).status).toBe(200);
    for (const fields of [{ email: 'a'.repeat(320) + '@example.test' }, { password: 'A1'.repeat(513) }, { display_name: 'a'.repeat(201) }]) {
      expect((await request('/auth/register', json({ email: crypto.randomUUID() + '@example.test', password: 'Password1234', ...fields }))).status).toBe(400);
    }
    expect((await request('/auth/login', json({ email, password: 'A1'.repeat(513) }))).status).toBe(400);
  });

  it('does not merge an unlinked password account, change its records, or revoke its sessions', async () => {
    const user = await insertUser({ password: 'Password1234' });
    const login = await request('/auth/login', json({ email: user.email, password: 'Password1234' }));
    const existingCookie = login.headers.get('set-cookie')!.split(';')[0]!;
    const before = await db.prepare('SELECT * FROM users WHERE id=?').bind(user.id).first();
    provider({ sub: 'unlinked-' + crypto.randomUUID(), email: user.email, name: 'Different name', email_verified: true });
    const flow = await start();
    const result = await callback(flow.state, flow.cookie);
    expect(result.headers.get('location')).toBe(origin + '/login?error=google_account_link');
    expect(result.headers.get('set-cookie') ?? '').not.toContain('n3_session=');
    expect(await db.prepare('SELECT * FROM users WHERE id=?').bind(user.id).first()).toEqual(before);
    expect(await db.prepare('SELECT COUNT(*) AS n FROM auth_sessions WHERE user_id=? AND revoked_at IS NULL').bind(user.id).first()).toEqual({ n: 1 });
    expect((await (await request('/auth/me', { headers: { Cookie: existingCookie } })).json<{ data: { authenticated: boolean } }>()).data.authenticated).toBe(true);
  });

  it('keeps already-linked password/Google login and the original password', async () => {
    const sub = 'linked-' + crypto.randomUUID();
    const user = await insertUser({ googleSub: sub, password: 'Password1234' });
    provider({ sub, email: user.email, name: 'Google name', email_verified: true });
    const flow = await start();
    expect((await callback(flow.state, flow.cookie)).headers.get('location')).toBe(origin);
    expect(await db.prepare('SELECT password_hash,google_sub,learning_track FROM users WHERE id=?').bind(user.id).first())
      .toEqual({ password_hash: user.passwordHash, google_sub: sub, learning_track: 'topik-ko' });
    expect((await request('/auth/login', json({ email: user.email, password: 'Password1234' }))).status).toBe(200);
  });

  it('rejects a verified email collision with a different Google identity', async () => {
    const user = await insertUser({ googleSub: 'first-sub' });
    const before = await db.prepare('SELECT * FROM users WHERE id=?').bind(user.id).first();
    provider({ sub: 'another-sub', email: user.email, name: 'Other Google identity', email_verified: true });
    const flow = await start();
    expect((await callback(flow.state, flow.cookie)).headers.get('location')).toBe(origin + '/login?error=google_account_link');
    expect(await db.prepare('SELECT * FROM users WHERE id=?').bind(user.id).first()).toEqual(before);
  });

  it('prefers the existing Google subject over another account email', async () => {
    const subjectUser = await insertUser({ googleSub: 'preferred-sub' });
    const emailUser = await insertUser({ googleSub: 'different-sub' });
    provider({ sub: 'preferred-sub', email: emailUser.email, name: 'Subject owner', email_verified: true });
    const flow = await start();
    const response = await callback(flow.state, flow.cookie);
    expect(response.headers.get('location')).toBe(origin);
    expect(await db.prepare('SELECT COUNT(*) AS n FROM auth_sessions WHERE user_id=?').bind(subjectUser.id).first()).toEqual({ n: 1 });
    expect(await db.prepare('SELECT COUNT(*) AS n FROM auth_sessions WHERE user_id=?').bind(emailUser.id).first()).toEqual({ n: 0 });
  });

  it.each([undefined, false, 'true', 1])('requires literal email_verified=true (received %s)', async (verified) => {
    const email = crypto.randomUUID() + '@example.test';
    provider({ sub: crypto.randomUUID(), email, name: 'Unverified', email_verified: verified });
    const flow = await start();
    expect((await callback(flow.state, flow.cookie)).headers.get('location')).toBe(origin + '/login?error=google_callback');
    expect(await db.prepare('SELECT COUNT(*) AS n FROM users WHERE email=?').bind(email).first()).toEqual({ n: 0 });
  });

  it('requires both a browser cookie and stored state for same-origin callbacks', async () => {
    const mock = provider({ sub: crypto.randomUUID(), email: crypto.randomUUID() + '@example.test', email_verified: true });
    const flow = await start();
    for (const cookie of [undefined, 'n3_oauth_state=wrong']) {
      expect((await callback(flow.state, cookie)).headers.get('location')).toBe(origin + '/login?error=google_state');
      expect(await db.prepare('SELECT consumed_at FROM oauth_states WHERE state_hash=?').bind(await sha256Hex(flow.state)).first()).toEqual({ consumed_at: null });
    }
    const missingState = 'A'.repeat(32);
    expect((await callback(missingState, 'n3_oauth_state=' + missingState)).headers.get('location')).toBe(origin + '/login?error=google_state');
    expect(mock).not.toHaveBeenCalled();
  });

  it('consumes same-origin state only once under concurrent callbacks and replay', async () => {
    const sub = crypto.randomUUID();
    const mock = provider({ sub, email: crypto.randomUUID() + '@example.test', email_verified: true });
    const flow = await start();
    const results = await Promise.all([callback(flow.state, flow.cookie), callback(flow.state, flow.cookie)]);
    expect(results.filter((response) => response.headers.get('location') === origin)).toHaveLength(1);
    expect(results.filter((response) => response.headers.get('location') === origin + '/login?error=google_state')).toHaveLength(1);
    expect((await callback(flow.state, flow.cookie)).headers.get('location')).toBe(origin + '/login?error=google_state');
    expect(mock).toHaveBeenCalledTimes(2);
    expect(await db.prepare('SELECT COUNT(*) AS n FROM auth_sessions WHERE user_id=?').bind('google_' + sub).first()).toEqual({ n: 1 });
  });

  it('rejects an expired state even when its browser cookie matches', async () => {
    const flow = await start();
    await db.prepare('UPDATE oauth_states SET expires_at=0 WHERE state_hash=?').bind(await sha256Hex(flow.state)).run();
    expect((await callback(flow.state, flow.cookie)).headers.get('location')).toBe(origin + '/login?error=google_state');
  });

  it('production ignores the non-Host cookie for lookup and revocation', async () => {
    const user = await insertUser({ password: 'Password1234' });
    const login = await request('/auth/login', json({ email: user.email, password: 'Password1234' }));
    const cookie = login.headers.get('set-cookie')!.split(';')[0]!;
    const production = { ENVIRONMENT: 'production' };
    const me = await request('/auth/me', { headers: { Cookie: cookie } }, production);
    expect((await me.json<{ data: { authenticated: boolean } }>()).data.authenticated).toBe(false);
    expect((await request('/auth/logout', { method: 'POST', headers: { Cookie: cookie } }, production)).status).toBe(401);
    expect(await db.prepare('SELECT COUNT(*) AS n FROM auth_sessions WHERE user_id=? AND revoked_at IS NULL').bind(user.id).first()).toEqual({ n: 1 });
    const secureCookie = cookie.replace(/^n3_session=/, '__Host-n3_session=');
    expect((await (await request('/auth/me', { headers: { Cookie: secureCookie } }, production)).json<{ data: { authenticated: boolean } }>()).data.authenticated).toBe(true);
    expect((await request('/auth/logout', { method: 'POST', headers: { Cookie: secureCookie } }, production)).status).toBe(200);
  });

  it('does not report successful logout or clear the cookie if durable revocation fails', async () => {
    const user = await insertUser({ password: 'Password1234' });
    const login = await request('/auth/login', json({ email: user.email, password: 'Password1234' }));
    const cookie = login.headers.get('set-cookie')!.split(';')[0]!;
    // D1 trigger reproduces a real statement failure without mocking session lookup.
    await db.prepare(`CREATE TRIGGER reject_security_revocation BEFORE UPDATE OF revoked_at ON auth_sessions
      BEGIN SELECT RAISE(ABORT, 'synthetic revocation failure'); END`).run();
    try {
      const response = await request('/auth/logout', { method: 'POST', headers: { Cookie: cookie } });
      expect(response.status).toBe(500);
      expect(response.headers.get('set-cookie') ?? '').not.toContain('Max-Age=0');
      expect(await db.prepare('SELECT COUNT(*) AS n FROM auth_sessions WHERE user_id=? AND revoked_at IS NULL').bind(user.id).first()).toEqual({ n: 1 });
      expect(await db.prepare("SELECT COUNT(*) AS n FROM login_events WHERE user_id=? AND event_type='logout'").bind(user.id).first()).toEqual({ n: 0 });
    } finally {
      await db.prepare('DROP TRIGGER reject_security_revocation').run();
    }
  });
});
