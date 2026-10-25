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
import { safeErrorName } from '../lib/safe-log.js';
import { googlePicture } from '../lib/account-personalization.js';
import { equalSecret } from '../lib/secret.js';

const auth = new Hono<AppEnv>();

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  password_hash?: string | null;
  google_sub?: string | null;
  role: 'user' | 'admin';
  auth_provider: 'password' | 'google' | 'cf-access';
  learning_track: 'jlpt-ja' | 'topik-ko';
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

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 1024;
const MAX_DISPLAY_NAME_LENGTH = 200;

function validEmail(email: string): boolean {
  return email.length <= MAX_EMAIL_LENGTH && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function oversizedAuthFields(body: Record<string, unknown>): boolean {
  return (typeof body.email === 'string' && body.email.length > MAX_EMAIL_LENGTH)
    || (typeof body.password === 'string' && body.password.length > MAX_PASSWORD_LENGTH)
    || (typeof body.display_name === 'string' && body.display_name.length > MAX_DISPLAY_NAME_LENGTH);
}

async function readBody(c: Context<AppEnv>): Promise<Record<string, unknown>> {
  const body = await c.req.json<unknown>().catch(() => ({}));
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
}

function publicUser(row: { id: string; email: string; display_name: string; role: string; auth_provider?: string | null; learning_track?: string | null }) {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    role: row.role === 'admin' ? 'admin' : 'user',
    auth_provider: row.auth_provider ?? 'password',
    learning_track: row.learning_track === 'topik-ko' ? 'topik-ko' : 'jlpt-ja',
  };
}

function isPasswordStrong(password: string): boolean {
  return password.length >= 10 && password.length <= MAX_PASSWORD_LENGTH && /[A-Za-z]/.test(password) && /\d/.test(password);
}

async function findUserByEmail(c: Context<AppEnv>, email: string): Promise<UserRow | null> {
  return c.env.DB.prepare(
    `SELECT id, email, display_name, password_hash, COALESCE(role, 'user') AS role, auth_provider, learning_track
       FROM users
      WHERE lower(email) = lower(?)
      LIMIT 1`,
  )
    .bind(email)
    .first<UserRow>();
}

async function saveOAuthState(
  c: Context<AppEnv>,
  state: string,
  learningTrack: UserRow['learning_track'],
): Promise<void> {
  const stateHash = await sha256Hex(state);
  const now = Math.floor(Date.now() / 1000);
  await c.env.DB.prepare(
    `INSERT INTO oauth_states (state_hash, learning_track, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(stateHash, learningTrack, now + 600, now)
    .run();
}

async function consumeOAuthState(c: Context<AppEnv>, state: string): Promise<UserRow['learning_track'] | null> {
  const stateHash = await sha256Hex(state);
  const now = Math.floor(Date.now() / 1000);
  const row = await c.env.DB.prepare(
    `UPDATE oauth_states SET consumed_at = ?
      WHERE state_hash = ?
        AND consumed_at IS NULL
        AND expires_at > ?
      RETURNING learning_track`,
  )
    .bind(now, stateHash, now)
    .first<{ learning_track: UserRow['learning_track'] }>();
  if (!row) return null;
  return row.learning_track === 'topik-ko' ? 'topik-ko' : 'jlpt-ja';
}

async function createOAuthBridgeToken(c: Context<AppEnv>, userId: string, state: string): Promise<string> {
  // Hash the whole opaque token so its browser-binding suffix cannot be swapped.
  // The Pages cookie remains on the initiating host until /auth/complete.
  const token = `${randomToken(32)}.${state}`;
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
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await c.env.DB.prepare(
    `UPDATE oauth_login_tokens SET consumed_at = ?
      WHERE token_hash = ?
        AND consumed_at IS NULL
        AND expires_at > ?
      RETURNING user_id`,
  )
    .bind(now, tokenHash, now)
    .first<{ user_id: string }>();
  if (!row) return null;
  return row.user_id;
}

class GoogleAccountLinkRequired extends Error {}

async function upsertGoogleUser(
  c: Context<AppEnv>,
  profile: { sub: string; email: string; name: string; picture?: string | null },
): Promise<UserRow> {
  const existing = await c.env.DB.prepare(
    `SELECT id, email, display_name, google_sub, COALESCE(role, 'user') AS role, auth_provider, learning_track
       FROM users
      WHERE google_sub = ?
      LIMIT 1`,
  )
    .bind(profile.sub)
    .first<UserRow>();

  const now = Math.floor(Date.now() / 1000);
  if (existing) {
    await c.env.DB.prepare(
      `UPDATE users
          SET display_name = COALESCE(NULLIF(display_name, ''), ?),
              last_login_at = ?,
              updated_at = ?
        WHERE id = ?`,
    )
      .bind(profile.name, now, now, existing.id)
      .run();
    await saveGooglePicture(c, existing.id, profile.picture);
    return existing;
  }

  // Email possession alone is not consent to connect an existing password or
  // another Google account. Preserve all credentials, roles and learning data.
  if (await findUserByEmail(c, profile.email)) throw new GoogleAccountLinkRequired();

  const user: UserRow = {
    id: `google_${profile.sub}`,
    email: profile.email,
    display_name: profile.name || profile.email.split('@')[0] || 'Google User',
    role: 'user',
    auth_provider: 'google',
    learning_track: 'jlpt-ja',
  };
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, display_name, role, auth_provider, google_sub, last_login_at, created_at, updated_at)
     VALUES (?, ?, ?, 'user', 'google', ?, ?, ?, ?)`,
  )
    .bind(user.id, user.email, user.display_name, profile.sub, now, now, now)
    .run();
  await saveGooglePicture(c, user.id, profile.picture);
  return user;
}

async function saveGooglePicture(c: Context<AppEnv>, userId: string, picture: string | null | undefined) {
  if (!picture) return;
  await c.env.DB.prepare(`INSERT INTO account_preferences(user_id,google_picture_url,updated_at) VALUES(?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET google_picture_url=excluded.google_picture_url`)
    .bind(userId,picture,Math.floor(Date.now()/1000)).run();
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

async function fetchGoogleProfile(accessToken: string): Promise<{ sub: string; email: string; name: string; picture: string | null }> {
  const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google userinfo failed: HTTP ${res.status}`);
  const profile = await res.json<{ sub?: string; email?: string; name?: string; email_verified?: boolean; picture?: string }>();
  const email = normalizeEmail(profile.email);
  if (typeof profile.sub !== 'string' || !profile.sub || profile.sub.length > 255
    || !validEmail(email) || profile.email_verified !== true
    || (profile.name !== undefined && (typeof profile.name !== 'string' || profile.name.length > MAX_DISPLAY_NAME_LENGTH))) {
    throw new Error('Google profile is not verified');
  }
  return { sub: profile.sub, email, name: profile.name ?? email, picture: googlePicture(profile.picture) };
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
  const photo = await c.env.DB.prepare(`SELECT p.google_picture_url,a.updated_at AS avatar_updated_at
    FROM users u LEFT JOIN account_preferences p ON p.user_id=u.id
    LEFT JOIN account_avatars a ON a.user_id=u.id WHERE u.id=?`).bind(user.id)
    .first<{google_picture_url:string|null;avatar_updated_at:number|null}>();
  return c.json({ data: { authenticated: true, user: { ...publicUser(user), ...photo } } });
});

auth.post('/auth/register', async (c) => {
  const body = await readBody(c);
  if (oversizedAuthFields(body)) return c.json({ error: '입력값이 너무 깁니다' }, 400);
  const email = normalizeEmail(body.email);
  const password = text(body.password);
  const displayName = text(body.display_name) || email.split('@')[0] || '학습자';
  if (!validEmail(email)) return c.json({ error: '올바른 이메일을 입력하세요' }, 400);
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) return c.json({ error: '입력값이 너무 깁니다' }, 400);
  if (!isPasswordStrong(password)) return c.json({ error: '비밀번호는 10자 이상이며 영문과 숫자를 포함해야 합니다' }, 400);

  const existing = await findUserByEmail(c, email);
  if (existing) return c.json({ error: '이미 가입된 이메일입니다' }, 409);

  const now = Math.floor(Date.now() / 1000);
  const user: UserRow = {
    id: `user_${randomToken(18)}`,
    email,
    display_name: displayName,
    password_hash: await hashPassword(password),
    role: 'user',
    auth_provider: 'password',
    learning_track: 'jlpt-ja',
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
  if (oversizedAuthFields(body)) return c.json({ error: '입력값이 너무 깁니다' }, 400);
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
  await revokeCurrentSession(c);
  await recordLoginEvent(c, { userId: c.get('userId'), email: c.get('userEmail'), provider: 'password', eventType: 'logout' });
  return c.json({ data: { ok: true } });
});

auth.patch('/auth/track', appSessionAuth, async (c) => {
  const body = await readBody(c);
  const track = body.track;
  if (track !== 'jlpt-ja' && track !== 'topik-ko') {
    return c.json({ error: '지원하지 않는 학습 트랙입니다' }, 400);
  }
  await c.env.DB.prepare('UPDATE users SET learning_track = ?, updated_at = unixepoch() WHERE id = ?')
    .bind(track, c.get('userId'))
    .run();
  return c.json({ data: { track } });
});

auth.get('/auth/google/start', async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
    return c.json({ error: 'Google 로그인이 아직 설정되지 않았습니다' }, 503);
  }
  const requestedTrack = c.req.query('track') === 'topik-ko' ? 'topik-ko' : 'jlpt-ja';
  const configuredApp = new URL(appOrigin(c)).origin;
  const configuredCallback = c.env.GOOGLE_REDIRECT_URI || `${apiOrigin(c)}/api/v1/auth/google/callback`;
  if (new URL(configuredCallback).origin !== configuredApp
    && (c.req.header('Origin') ?? new URL(c.req.url).origin) !== configuredApp) {
    // Hash Preview와 고정 Preview callback의 host-only 쿠키가 갈라지지 않게
    // state를 만들기 전에 설정된 앱 호스트에서 OAuth를 시작한다.
    return c.redirect(`${configuredApp}/api/v1/auth/google/start?track=${requestedTrack}`, 302);
  }
  const state = randomToken(24);
  setOauthStateCookie(c, state);
  await saveOAuthState(c, state, requestedTrack);
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
  const origin = appOrigin(c);
  const redirectUri = c.env.GOOGLE_REDIRECT_URI || `${apiOrigin(c)}/api/v1/auth/google/callback`;
  const crossOriginCallback = new URL(redirectUri).origin !== new URL(origin).origin;
  if (!code || code.length > 4096 || !state || !/^[A-Za-z0-9_-]{32}$/.test(state)) {
    return c.redirect(`${origin}/login?error=google_state`, 302);
  }
  // Same-origin callbacks require both proofs. A configured cross-origin
  // callback cannot see the Pages cookie; defer that proof to /auth/complete.
  if (!crossOriginCallback && (!expected || state !== expected)) {
    return c.redirect(`${origin}/login?error=google_state`, 302);
  }
  const requestedTrack = await consumeOAuthState(c, state);
  if (!requestedTrack) {
    return c.redirect(`${origin}/login?error=google_state`, 302);
  }
  if (!crossOriginCallback) clearOauthStateCookie(c);
  try {
    const token = await tokenExchange(c, code);
    const profile = await fetchGoogleProfile(token.access_token);
    const user = await upsertGoogleUser(c, profile);
    if (requestedTrack && user.learning_track !== requestedTrack) {
      await c.env.DB.prepare('UPDATE users SET learning_track = ?, updated_at = unixepoch() WHERE id = ?')
        .bind(requestedTrack, user.id)
        .run();
      user.learning_track = requestedTrack;
    }
    await recordLoginEvent(c, { userId: user.id, email: user.email, provider: 'google', eventType: 'google_callback' });
    if (crossOriginCallback) {
      const bridgeToken = await createOAuthBridgeToken(c, user.id, state);
      return c.redirect(`${origin}/api/v1/auth/complete?token=${encodeURIComponent(bridgeToken)}`, 302);
    }
    await createSession(c, user.id);
    return c.redirect(origin, 302);
  } catch (err) {
    if (err instanceof GoogleAccountLinkRequired) {
      return c.redirect(`${origin}/login?error=google_account_link`, 302);
    }
    console.error({ event: 'google_oauth_callback_error', error_name: safeErrorName(err) });
    return c.redirect(`${origin}/login?error=google_callback`, 302);
  }
});

auth.get('/auth/complete', async (c) => {
  const origin = appOrigin(c);
  const token = text(c.req.query('token'));
  const binding = /^[A-Za-z0-9_-]{43}\.([A-Za-z0-9_-]{32})$/.exec(token)?.[1];
  const expected = readOauthStateCookie(c);
  if (!binding || !expected || binding !== expected) return c.redirect(`${origin}/login?error=google_callback`, 302);
  const userId = await consumeOAuthBridgeToken(c, token);
  if (!userId) return c.redirect(`${origin}/login?error=google_callback`, 302);
  await createSession(c, userId);
  clearOauthStateCookie(c);
  return c.redirect(origin, 302);
});

auth.post('/auth/bootstrap-admin', async (c) => {
  const body = await readBody(c);
  const token = text(body.token);
  if (!c.env.ADMIN_BOOTSTRAP_TOKEN || token.length > 1024 || !await equalSecret(c.env.ADMIN_BOOTSTRAP_TOKEN, token)) {
    return c.json({ error: '관리자 초기화 토큰이 올바르지 않습니다' }, 403);
  }
  const email = normalizeEmail(body.email || c.env.ADMIN_EMAIL);
  const password = text(body.password || c.env.ADMIN_PASSWORD);
  if (oversizedAuthFields(body) || !validEmail(email) || !isPasswordStrong(password)) return c.json({ error: '관리자 이메일/비밀번호가 올바르지 않습니다' }, 400);

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
