import type { Context, Next } from 'hono';
import type { AppEnv, Env } from '../types.js';

const READ_ONLY_MODE = 'read-only';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// These GET endpoints create or consume short-lived OAuth records and sessions.
const MUTATING_GET_ROUTES = [
  /^\/api\/v1\/auth\/google\/(?:start|callback)$/,
  /^\/api\/v1\/auth\/complete$/,
];

// Translation does not write D1 or R2 and remains usable during a DB cutover.
const READ_ONLY_COMMAND_ROUTES = new Set([
  'POST /api/v1/ai/translate',
]);

export function isReadOnlyMaintenance(env: Pick<Env, 'MAINTENANCE_MODE'>): boolean {
  return env.MAINTENANCE_MODE?.trim().toLowerCase() === READ_ONLY_MODE;
}

export function isSideEffectingRequest(method: string, path: string): boolean {
  const normalizedMethod = method.toUpperCase();
  if (MUTATING_GET_ROUTES.some((route) => route.test(path))) return true;
  if (SAFE_METHODS.has(normalizedMethod)) return false;
  if (READ_ONLY_COMMAND_ROUTES.has(`${normalizedMethod} ${path}`)) return false;
  return path.startsWith('/api/') || path.startsWith('/admin');
}

export async function maintenanceMiddleware(c: Context<AppEnv>, next: Next): Promise<Response | void> {
  if (!isReadOnlyMaintenance(c.env) || !isSideEffectingRequest(c.req.method, c.req.path)) {
    await next();
    return;
  }

  c.header('Content-Type', 'application/problem+json');
  c.header('Cache-Control', 'no-store');
  c.header('Retry-After', '900');
  return c.json(
    {
      type: 'https://nihongo-n3.example.com/errors/maintenance-read-only',
      title: 'Service Temporarily Read-only',
      status: 503,
      detail: '데이터베이스 안전 전환 중입니다. 조회는 가능하며 변경 요청은 잠시 후 다시 시도해 주세요.',
    },
    503,
  );
}
