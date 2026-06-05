import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppEnv } from '../types.js';
import {
  adminSessionAuth,
  appSessionAuth,
  clearOauthStateCookie,
  createSession,
  getSessionUser,
  hashPassword,
  randomToken,
  readOauthStateCookie,
  recordLoginEvent,
  revokeCurrentSession,
  setOauthStateCookie,
  sha256Hex,
  verifyPassword,
} from '../lib/auth-session.js';

const auth = new Hono<AppEnv>();

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  password_hash?: string | null;
  role: 'user' | 'admin';
  auth_provider: 'password' | 'google' | 'cf-access';
};

function appOrigin(c: Context<AppEnv>): string {
  return c.env.APP_ORIGIN || (c.env.ENVIRONMENT === 'production' ? 'https://nihongo-n3.pages.dev' : 'http://localhost:5173');
}

function apiOrigin(c: Context<AppEnv>): string {
  const url = new URL(c.req.url);
  return `${url.protocol}//${url.host}`;
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function readBody(c: Context<AppEnv>): Promise<Record<string, unknown>> {
  const body = await c.req.json<unknown>().catch(() => ({}));
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
}

function publicUser(row: { id: string; email: string; display_name: string; role: string; auth_provider?: string | null }) {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    role: row.role === 'admin' ? 'admin' : 'user',
    auth_provider: row.auth_provider ?? 'password',
  };
}

function isPasswordStrong(password: string): boolean {
  return password.length >= 10 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

async function findUserByEmail(c: Context<AppEnv>, email: string): Promise<UserRow | null> {
  return c.env.DB.prepare(
    `SELECT id, email, display_name, password_hash, COALESCE(role, 'user') AS role, auth_provider
       FROM users
      WHERE lower(email) = lower(?)
      LIMIT 1`,
  )
    .bind(email)
    .first<UserRow>();
}

async function ensureOAuthBridgeTable(c: Context<AppEnv>): Promise<void> {
  await c.env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS oauth_login_tokens (
       token_hash TEXT PRIMARY KEY,
       user_id TEXT NOT NULL,
       expires_at INTEGER NOT NULL,
       created_at INTEGER NOT NULL,
       consumed_at INTEGER
     )`,
  ).run();
}

async function ensureOAuthStateTable(c: Context<AppEnv>): Promise<void> {
  await c.env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS oauth_states (
       state_hash TEXT PRIMARY KEY,
       expires_at INTEGER NOT NULL,
       created_at INTEGER NOT NULL,
       consumed_at INTEGER
     )`,
  ).run();
}

async function saveOAuthState(c: Context<AppEnv>, state: string): Promise<void> {
  await ensureOAuthStateTable(c);
  const stateHash = await sha256Hex(state);
  const now = Math.floor(Date.now() / 1000);
  await c.env.DB.prepare(
    `INSERT INTO oauth_states (state_hash, expires_at, created_at)
     VALUES (?, ?, ?)`,
  )
    .bind(stateHash, now + 600, now)
    .run();
}

async function consumeOAuthState(c: Context<AppEnv>, state: string): Promise<boolean> {
  await ensureOAuthStateTable(c);
  const stateHash = await sha256Hex(state);
  const now = Math.floor(Date.now() / 1000);
  const row = await c.env.DB.prepare(
    `SELECT state_hash
       FROM oauth_states
      WHERE state_hash = ?
        AND consumed_at IS NULL
        AND expires_at > ?
      LIMIT 1`,
  )
    .bind(stateHash, now)
    .first<{ state_hash: string }>();
  if (!row) return false;
  await c.env.DB.prepare('UPDATE oauth_states SET consumed_at = ? WHERE state_hash = ?')
    .bind(now, stateHash)
    .run();
  return true;
}

async function createOAuthBridgeToken(c: Context<AppEnv>, userId: string): Promise<string> {
  await ensureOAuthBridgeTable(c);
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  await c.env.DB.prepare(
    `INSERT INTO oauth_login_tokens (token_hash, user_id, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(tokenHash, userId, now + 300, now)
    .run();
  return token;
}

async function consumeOAuthBridgeToken(c: Context<AppEnv>, token: string): Promise<string | null> {
  await ensureOAuthBridgeTable(c);
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await c.env.DB.prepare(
    `SELECT user_id
       FROM oauth_login_tokens
      WHERE token_hash = ?
        AND consumed_at IS NULL
        AND expires_at > ?
      LIMIT 1`,
  )
    .bind(tokenHash, now)
    .first<{ user_id: string }>();
  if (!row) return null;
  await c.env.DB.prepare('UPDATE oauth_login_tokens SET consumed_at = ? WHERE token_hash = ?')
    .bind(now, tokenHash)
    .run();
  return row.user_id;
}

async function upsertGoogleUser(
  c: Context<AppEnv>,
  profile: { sub: string; email: string; name: string },
): Promise<UserRow> {
  const existing = await c.env.DB.prepare(
    `SELECT id, email, display_name, COALESCE(role, 'user') AS role, auth_provider
       FROM users
      WHERE google_sub = ? OR lower(email) = lower(?)
      LIMIT 1`,
  )
    .bind(profile.sub, profile.email)
    .first<UserRow>();

  const now = Math.floor(Date.now() / 1000);
  if (existing) {
    await c.env.DB.prepare(
      `UPDATE users
          SET google_sub = COALESCE(google_sub, ?),
              auth_provider = CASE WHEN auth_provider = 'password' THEN auth_provider ELSE 'google' END,
              display_name = COALESCE(NULLIF(display_name, ''), ?),
              last_login_at = ?,
              updated_at = ?
        WHERE id = ?`,
    )
      .bind(profile.sub, profile.name, now, now, existing.id)
      .run();
    return existing;
  }

  const user: UserRow = {
    id: `google_${profile.sub}`,
    email: profile.email,
    display_name: profile.name || profile.email.split('@')[0] || 'Google User',
    role: 'user',
    auth_provider: 'google',
  };
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, display_name, role, auth_provider, google_sub, last_login_at, created_at, updated_at)
     VALUES (?, ?, ?, 'user', 'google', ?, ?, ?, ?)`,
  )
    .bind(user.id, user.email, user.display_name, profile.sub, now, now, now)
    .run();
  return user;
}

async function tokenExchange(
  c: Context<AppEnv>,
  code: string,
): Promise<{ access_token: string }> {
  const redirectUri = c.env.GOOGLE_REDIRECT_URI || `${apiOrigin(c)}/api/v1/auth/google/callback`;
  const params = new URLSearchParams({
    code,
    client_id: c.env.GOOGLE_CLIENT_ID || '',
    client_secret: c.env.GOOGLE_CLIENT_SECRET || '',
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  if (!res.ok) throw new Error(`Google token exchange failed: HTTP ${res.status}`);
  return res.json<{ access_token: string }>();
}

async function fetchGoogleProfile(accessToken: string): Promise<{ sub: string; email: string; name: string }> {
  const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google userinfo failed: HTTP ${res.status}`);
  const profile = await res.json<{ sub?: string; email?: string; name?: string; email_verified?: boolean }>();
  if (!profile.sub || !profile.email || profile.email_verified === false) throw new Error('Google profile is not verified');
  return { sub: profile.sub, email: profile.email.toLowerCase(), name: profile.name ?? profile.email };
}

auth.get('/auth/config', (c) => {
  c.header('Cache-Control', 'no-store');
  return c.json({
    data: {
      google_enabled: Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET),
      auth_mode: c.env.AUTH_MODE || 'app-session',
    },
  });
});

auth.get('/auth/me', async (c) => {
  c.header('Cache-Control', 'no-store');
  const user = await getSessionUser(c);
  if (!user) return c.json({ data: { authenticated: false, user: null } });
  return c.json({ data: { authenticated: true, user: publicUser(user) } });
});

auth.post('/auth/register', async (c) => {
  const body = await readBody(c);
  const email = normalizeEmail(body.email);
  const password = text(body.password);
  const displayName = text(body.display_name) || email.split('@')[0] || '학습자';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.json({ error: '올바른 이메일을 입력하세요' }, 400);
  if (!isPasswordStrong(password)) return c.json({ error: '비밀번호는 10자 이상이며 영문과 숫자를 포함해야 합니다' }, 400);

  const existing = await findUserByEmail(c, email);
  if (existing) return c.json({ error: '이미 가입된 이메일입니다' }, 409);

  const now = Math.floor(Date.now() / 1000);
  const role = email === c.env.ADMIN_EMAIL?.toLowerCase() ? 'admin' : 'user';
  const user: UserRow = {
    id: `user_${randomToken(18)}`,
    email,
    display_name: displayName,
    password_hash: await hashPassword(password),
    role,
    auth_provider: 'password',
  };
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, display_name, password_hash, role, auth_provider, created_at, updated_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, 'password', ?, ?, ?)`,
  )
    .bind(user.id, user.email, user.display_name, user.password_hash, user.role, now, now, now)
    .run();
  await createSession(c, user.id);
  await recordLoginEvent(c, { userId: user.id, email, provider: 'password', eventType: 'register' });
  return c.json({ data: { user: publicUser(user) } }, 201);
});

auth.post('/auth/login', async (c) => {
  const body = await readBody(c);
  const email = normalizeEmail(body.email);
  const password = text(body.password);
  const user = await findUserByEmail(c, email);
  const ok = await verifyPassword(password, user?.password_hash);
  if (!user || !ok) {
    await recordLoginEvent(c, { email, provider: 'password', eventType: 'login_failed' });
    return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401);
  }
  const now = Math.floor(Date.now() / 1000);
  await c.env.DB.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?')
    .bind(now, now, user.id)
    .run();
  await createSession(c, user.id);
  await recordLoginEvent(c, { userId: user.id, email, provider: 'password', eventType: 'login_success' });
  return c.json({ data: { user: publicUser(user) } });
});

auth.post('/auth/logout', appSessionAuth, async (c) => {
  await recordLoginEvent(c, { userId: c.get('userId'), email: c.get('userEmail'), provider: 'password', eventType: 'logout' });
  await revokeCurrentSession(c);
  return c.json({ data: { ok: true } });
});

auth.get('/auth/google/start', async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
    return c.json({ error: 'Google 로그인이 아직 설정되지 않았습니다' }, 503);
  }
  const state = randomToken(24);
  setOauthStateCookie(c, state);
  await saveOAuthState(c, state);
  await recordLoginEvent(c, { provider: 'google', eventType: 'google_start' });
  const redirectUri = c.env.GOOGLE_REDIRECT_URI || `${apiOrigin(c)}/api/v1/auth/google/callback`;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', c.env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  return c.redirect(url.toString(), 302);
});

auth.get('/auth/google/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const expected = readOauthStateCookie(c);
  clearOauthStateCookie(c);
  const origin = appOrigin(c);
  if (!code || !state) {
    return c.redirect(`${origin}/login?error=google_state`, 302);
  }
  const storedStateOk = state ? await consumeOAuthState(c, state) : false;
  const cookieStateOk = Boolean(state && expected && state === expected);
  if (!cookieStateOk && !storedStateOk) {
    return c.redirect(`${origin}/login?error=google_state`, 302);
  }
  try {
    const token = await tokenExchange(c, code);
    const profile = await fetchGoogleProfile(token.access_token);
    const user = await upsertGoogleUser(c, profile);
    await recordLoginEvent(c, { userId: user.id, email: user.email, provider: 'google', eventType: 'google_callback' });
    const redirectUri = c.env.GOOGLE_REDIRECT_URI || `${apiOrigin(c)}/api/v1/auth/google/callback`;
    if (new URL(redirectUri).origin !== new URL(origin).origin) {
      const bridgeToken = await createOAuthBridgeToken(c, user.id);
      return c.redirect(`${origin}/api/v1/auth/complete?token=${encodeURIComponent(bridgeToken)}`, 302);
    }
    await createSession(c, user.id);
    return c.redirect(origin, 302);
  } catch (err) {
    console.error('[auth/google]', err);
    return c.redirect(`${origin}/login?error=google_callback`, 302);
  }
});

auth.get('/auth/complete', async (c) => {
  const origin = appOrigin(c);
  const token = text(c.req.query('token'));
  if (!token) return c.redirect(`${origin}/login?error=google_callback`, 302);
  const userId = await consumeOAuthBridgeToken(c, token);
  if (!userId) return c.redirect(`${origin}/login?error=google_callback`, 302);
  await createSession(c, userId);
  return c.redirect(origin, 302);
});

auth.post('/auth/bootstrap-admin', async (c) => {
  const body = await readBody(c);
  const token = text(body.token);
  if (!c.env.ADMIN_BOOTSTRAP_TOKEN || token !== c.env.ADMIN_BOOTSTRAP_TOKEN) {
    return c.json({ error: '관리자 초기화 토큰이 올바르지 않습니다' }, 403);
  }
  const email = normalizeEmail(body.email || c.env.ADMIN_EMAIL);
  const password = text(body.password || c.env.ADMIN_PASSWORD);
  if (!email || !isPasswordStrong(password)) return c.json({ error: '관리자 이메일/비밀번호가 올바르지 않습니다' }, 400);

  const now = Math.floor(Date.now() / 1000);
  const existing = await findUserByEmail(c, email);
  const passwordHash = await hashPassword(password);
  if (existing) {
    await c.env.DB.prepare(
      `UPDATE users SET password_hash = ?, role = 'admin', auth_provider = 'password', updated_at = ? WHERE id = ?`,
    ).bind(passwordHash, now, existing.id).run();
  } else {
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, display_name, password_hash, role, auth_provider, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'admin', 'password', ?, ?)`,
    ).bind(`admin_${randomToken(12)}`, email, 'Administrator', passwordHash, now, now).run();
  }
  return c.json({ data: { ok: true } });
});

auth.get('/auth/admin/users', adminSessionAuth, async (c) => {
  const [stats, users, events] = await Promise.all([
    c.env.DB.prepare(
      `SELECT
          (SELECT COUNT(*) FROM users) AS total_users,
          (SELECT COUNT(*) FROM users WHERE role = 'admin') AS admin_users,
          (SELECT COUNT(*) FROM auth_sessions WHERE revoked_at IS NULL AND expires_at > unixepoch()) AS active_sessions,
          (SELECT COUNT(*) FROM login_events WHERE created_at >= unixepoch() - 86400) AS login_events_24h`,
    ).first<{ total_users: number; admin_users: number; active_sessions: number; login_events_24h: number }>(),
    c.env.DB.prepare(
      `SELECT u.id, u.email, u.display_name, COALESCE(u.role, 'user') AS role, u.auth_provider,
              u.created_at, u.last_login_at,
              COUNT(s.id) AS active_sessions
         FROM users u
         LEFT JOIN auth_sessions s
           ON s.user_id = u.id AND s.revoked_at IS NULL AND s.expires_at > unixepoch()
        GROUP BY u.id
        ORDER BY COALESCE(u.last_login_at, u.created_at) DESC
        LIMIT 100`,
    ).all(),
    c.env.DB.prepare(
      `SELECT le.id, le.user_id, le.email, le.provider, le.event_type, le.ip, le.user_agent, le.created_at
         FROM login_events le
        ORDER BY le.created_at DESC
        LIMIT 100`,
    ).all(),
  ]);
  return c.json({
    data: {
      stats,
      users: users.results ?? [],
      events: events.results ?? [],
    },
  });
});

export { auth };
