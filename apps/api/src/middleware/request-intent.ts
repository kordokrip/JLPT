import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types.js';

// 강성호 · 2026-10-26: 쿠키 인증 쓰기는 CORS와 별개로 브라우저의 원래 출처를 확인한다.
// Origin/Fetch Metadata가 없는 CLI는 유지한다. 브라우저는 이 헤더를 임의 제거할 수 없다.
export const requestIntent: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) return next();
  const origin = c.req.header('Origin');
  const site = c.req.header('Sec-Fetch-Site');
  const allowed = new Set([new URL(c.req.url).origin]);
  if (c.env.APP_ORIGIN) allowed.add(c.env.APP_ORIGIN.replace(/\/$/, ''));
  if (c.env.ENVIRONMENT !== 'production' && c.env.ENVIRONMENT !== 'preview') allowed.add('http://localhost:5173');
  let trustedPreview = false;
  if (origin && c.env.ENVIRONMENT === 'preview') {
    try {
      const url = new URL(origin);
      trustedPreview = url.origin === origin && url.protocol === 'https:' && !url.port
        && /^[a-z0-9-]+\.nihongo-n3\.pages\.dev$/.test(url.hostname);
    } catch { /* invalid origins fail closed */ }
  }
  if ((origin && !allowed.has(origin) && !trustedPreview)
    || (!origin && site && site !== 'same-origin' && site !== 'none')) {
    return c.json({ status: 403, title: 'Forbidden', detail: 'Untrusted request origin' }, 403);
  }
  return next();
};
