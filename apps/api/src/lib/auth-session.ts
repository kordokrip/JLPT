import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Context, Next } from 'hono';
import type { AppEnv } from '../types.js';

export const SESSION_COOKIE = '__Host-n3_session';
export const OAUTH_STATE_COOKIE = '__Host-n3_oauth_state';
const DEV_SESSION_COOKIE = 'n3_session';
const DEV_OAUTH_STATE_COOKIE = 'n3_oauth_state';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 100_000;

export type AuthUser = {
  id: string;
  email: string;
  display_name: string;
  role: 'user' | 'admin';
  auth_provider?: string;
};

function b64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export function randomToken(bytes = 32): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return b64url(data);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  const len = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < len; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomToken(16);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: fromB64url(salt),
      iterations: PASSWORD_ITERATIONS,
    },
    key,
    256,
  );
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${salt}$${b64url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [algo, iterRaw, salt, expected] = stored.split('$');
  const iterations = Number(iterRaw);
  if (algo !== 'pbkdf2-sha256' || !Number.isFinite(iterations) || !salt || !expected) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: fromB64url(salt),
      iterations,
    },
    key,
    256,
  );
  return timingSafeEqual(b64url(new Uint8Array(bits)), expected);
}

function cookieSecure(c: Context<AppEnv>): boolean {
  return c.env.ENVIRONMENT === 'production';
}

function sessionCookieName(c: Context<AppEnv>): string {
  return c.env.ENVIRONMENT === 'production' ? SESSION_COOKIE : DEV_SESSION_COOKIE;
}

function oauthStateCookieName(c: Context<AppEnv>): string {
  return c.env.ENVIRONMENT === 'production' ? OAUTH_STATE_COOKIE : DEV_OAUTH_STATE_COOKIE;
}

function cookieSameSite(c: Context<AppEnv>): 'Lax' | 'None' {
  return c.env.ENVIRONMENT === 'production' ? 'None' : 'Lax';
}

export function setSessionCookie(c: Context<AppEnv>, token: string): void {
  setCookie(c, sessionCookieName(c), token, {
    httpOnly: true,
    secure: cookieSecure(c),
    sameSite: cookieSameSite(c),
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(c: Context<AppEnv>): void {
  deleteCookie(c, sessionCookieName(c), { path: '/' });
}

export function setOauthStateCookie(c: Context<AppEnv>, state: string): void {
  setCookie(c, oauthStateCookieName(c), state, {
    httpOnly: true,
    secure: cookieSecure(c),
    sameSite: 'Lax',
    path: '/',
    maxAge: 600,
  });
}

export function readOauthStateCookie(c: Context<AppEnv>): string | undefined {
  return getCookie(c, oauthStateCookieName(c));
}

export function clearOauthStateCookie(c: Context<AppEnv>): void {
  deleteCookie(c, oauthStateCookieName(c), { path: '/' });
}

function requestIp(c: Context<AppEnv>): string {
  return c.req.header('CF-Connecting-IP') ?? c.req.header('x-forwarded-for') ?? 'unknown';
}

export async function createSession(c: Context<AppEnv>, userId: string): Promise<string> {
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  const expires = now + SESSION_TTL_SECONDS;
  await c.env.DB.prepare(
    `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at, user_agent, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(randomToken(16), userId, tokenHash, expires, now, now, c.req.header('user-agent') ?? '', requestIp(c))
    .run();
  setSessionCookie(c, token);
  return token;
}

export async function getSessionUser(c: Context<AppEnv>): Promise<AuthUser | null> {
  const token = getCookie(c, sessionCookieName(c)) ?? getCookie(c, SESSION_COOKIE) ?? getCookie(c, DEV_SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.display_name, COALESCE(u.role, 'user') AS role, u.auth_provider, s.id AS session_id
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
        AND s.revoked_at IS NULL
        AND s.expires_at > ?
      LIMIT 1`,
  )
    .bind(tokenHash, now)
    .first<AuthUser & { session_id: string }>();

  if (!row) return null;
  await c.env.DB.prepare('UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?')
    .bind(now, row.session_id)
    .run()
    .catch(() => undefined);
  const user: AuthUser = {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    role: row.role === 'admin' ? 'admin' : 'user',
  };
  if (row.auth_provider) user.auth_provider = row.auth_provider;
  return user;
}

export function setAuthContext(c: Context<AppEnv>, user: AuthUser): void {
  c.set('userId', user.id);
  c.set('userEmail', user.email);
  c.set('userRole', user.role);
}

export async function revokeCurrentSession(c: Context<AppEnv>): Promise<void> {
  const token = getCookie(c, sessionCookieName(c)) ?? getCookie(c, SESSION_COOKIE) ?? getCookie(c, DEV_SESSION_COOKIE);
  if (!token) return;
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  await c.env.DB.prepare('UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ?')
    .bind(now, tokenHash)
    .run()
    .catch(() => undefined);
  clearSessionCookie(c);
}

export async function recordLoginEvent(
  c: Context<AppEnv>,
  input: {
    userId?: string | null;
    email?: string | null;
    provider: 'password' | 'google' | 'cf-access';
    eventType: 'login_success' | 'login_failed' | 'logout' | 'register' | 'google_start' | 'google_callback';
  },
): Promise<void> {
  await c.env.DB.prepare(
    `INSERT INTO login_events (user_id, email, provider, event_type, ip, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, unixepoch())`,
  )
    .bind(input.userId ?? null, input.email ?? null, input.provider, input.eventType, requestIp(c), c.req.header('user-agent') ?? '')
    .run()
    .catch(() => undefined);
}

export async function appSessionAuth(c: Context<AppEnv>, next: Next): Promise<Response | void> {
  const user = await getSessionUser(c);
  if (!user) {
    c.header('Content-Type', 'application/problem+json');
    return c.json(
      {
        type: 'https://nihongo-n3.example.com/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: '로그인이 필요합니다',
      },
      401,
    );
  }
  setAuthContext(c, user);
  await next();
}

export async function adminSessionAuth(c: Context<AppEnv>, next: Next): Promise<Response | void> {
  const user = await getSessionUser(c);
  if (!user) {
    c.header('Content-Type', 'application/problem+json');
    return c.json({ title: 'Unauthorized', status: 401, detail: '로그인이 필요합니다' }, 401);
  }
  if (user.role !== 'admin') {
    c.header('Content-Type', 'application/problem+json');
    return c.json({ title: 'Forbidden', status: 403, detail: '관리자 권한이 필요합니다' }, 403);
  }
  setAuthContext(c, user);
  await next();
}
