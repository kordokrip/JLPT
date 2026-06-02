/**
 * apps/api/src/middleware/cache.ts
 *
 * Workers Cache API를 이용한 엣지 캐싱 미들웨어.
 *
 * 사용법 (콘텐츠 라우트에 적용):
 *   app.use('*', cacheMiddleware('public, max-age=86400, immutable'));
 *
 * 흐름:
 *   1. GET/HEAD 요청인지 확인
 *   2. caches.default.match(request) → 히트 시 바로 반환
 *   3. 미스 → 다음 핸들러 실행
 *   4. 응답에 Cache-Control 헤더 세팅
 *   5. ctx.waitUntil(cache.put(...)) 로 비동기 캐시 저장
 */
import type { Context, Next } from 'hono';
import type { AppEnv } from '../types.js';

export function cacheMiddleware(
  cacheControl = 'public, max-age=86400, immutable',
) {
  return async function (c: Context<AppEnv>, next: Next): Promise<Response | void> {
    const method = c.req.method;
    if (method !== 'GET' && method !== 'HEAD') {
      await next();
      return;
    }

    const cache = caches.default;
    const cacheKey = new Request(c.req.url, { method: 'GET' });

    // ── 캐시 히트 ────────────────────────────
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    // ── 미스 → 핸들러 실행 ───────────────────
    await next();
    const res = c.res;

    // 에러 응답은 캐시하지 않는다
    if (res.status < 200 || res.status >= 300) return;

    // ── 캐시 저장 ────────────────────────────
    const responseToCache = new Response(res.body, res);
    responseToCache.headers.set('Cache-Control', cacheControl);
    responseToCache.headers.set('X-Cache', 'MISS');

    c.executionCtx.waitUntil(cache.put(cacheKey, responseToCache.clone()));

    // 원 응답에도 Cache-Control 세팅
    c.res = new Response(responseToCache.body, responseToCache);
    c.res.headers.set('X-Cache', 'MISS');
  };
}

/** 30일 캐시 (오디오·이미지용) */
export const audioCacheMiddleware = cacheMiddleware(
  'public, max-age=2592000, immutable',
);

/** 하루 캐시 (콘텐츠용) */
export const contentCacheMiddleware = cacheMiddleware(
  'public, max-age=86400, immutable',
);
