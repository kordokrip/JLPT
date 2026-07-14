import type { Context, Next } from 'hono';
import { matchedRoutes } from 'hono/route';
import type { AppEnv } from '../types.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function requestId(c: Context<AppEnv>): string {
  const incoming = c.req.header('x-request-id');
  return incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : crypto.randomUUID();
}

export async function observabilityMiddleware(c: Context<AppEnv>, next: Next): Promise<void> {
  const id = requestId(c);
  const startedAt = Date.now();
  const release = c.env.RELEASE_SHA?.trim() || 'development';
  c.set('requestId', id);
  c.set('requestStartedAt', startedAt);
  c.header('X-Request-ID', id);
  c.header('X-Release', release);

  try {
    await next();
  } finally {
    const route = matchedRoutes(c)[c.req.routeIndex]?.path ?? '<unmatched>';
    console.log(JSON.stringify({
      event: 'http_request',
      request_id: id,
      cf_ray: c.req.header('cf-ray') ?? null,
      release,
      environment: c.env.ENVIRONMENT,
      auth_mode: c.env.AUTH_MODE,
      method: c.req.method,
      route,
      status: c.res.status,
      duration_ms: Date.now() - startedAt,
    }));
  }
}
