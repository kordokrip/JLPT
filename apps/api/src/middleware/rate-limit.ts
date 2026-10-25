/**
 * apps/api/src/middleware/rate-limit.ts
 *
 * Cloudflare Workers Rate Limiting 미들웨어
 * wrangler.toml [[unsafe.bindings]] type="ratelimit" 바인딩 필요
 *
 * 로컬 개발 / 테스트 환경에서는 바인딩이 없으므로 자동 스킵
 */
import type { Context, Next } from 'hono';
import type { AppEnv } from '../types.js';
import { sha256Hex } from '../lib/auth-session.js';

interface RateLimiterBinding {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

// 로그인/가입은 인증 전이므로 사용자 ID 대신 IP와 정규화한 계정의 해시를 제한한다.
export async function loginRateLimit(c: Context<AppEnv>, next: Next): Promise<Response | void> {
  if (c.req.method !== 'POST') return next();
  const limiter = (c.env as unknown as Record<string, unknown>).RATE_LIMITER_SYNC as RateLimiterBinding | undefined;
  if (!limiter) return next();
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const keys = [`auth-entry:ip:${ip}`];
  const body = await c.req.raw.clone().json().catch(() => null) as { email?: unknown } | null;
  if (typeof body?.email === 'string' && body.email.length <= 254) {
    keys.push(`auth-entry:account:${await sha256Hex(body.email.trim().toLowerCase())}`);
  }
  for (const key of keys) {
    if (!(await limiter.limit({ key })).success) {
      c.header('Retry-After', '60');
      return c.json({ status: 429, title: 'Too Many Requests', detail: 'Please retry in one minute.' }, 429);
    }
  }
  return next();
}

type RateLimiterName =
  | 'RATE_LIMITER_PUBLIC'
  | 'RATE_LIMITER_AUTH'
  | 'RATE_LIMITER_SYNC';

/**
 * @param binding   wrangler.toml 바인딩 이름
 * @param limit     설정 한도 (헤더 표시용, 실제 제한은 wrangler.toml에서)
 * @param getKey    요청에서 rate limit 키 추출 함수
 */
export function rateLimitMiddleware(
  binding: RateLimiterName,
  limit:   number,
  getKey:  (c: Context<AppEnv>) => string,
) {
  return async (c: Context<AppEnv>, next: Next): Promise<Response | void> => {
    const limiter = (c.env as Record<string, unknown>)[binding] as
      | RateLimiterBinding
      | undefined;

    // 바인딩 없음 → 개발/테스트 환경: 스킵
    if (!limiter) {
      await next();
      return;
    }

    const key            = getKey(c);
    const { success }    = await limiter.limit({ key });

    c.header('X-RateLimit-Limit', String(limit));

    if (!success) {
      c.header('Retry-After', '60');
      c.header('X-RateLimit-Remaining', '0');
      return c.json(
        {
          type:   'https://nihongo-n3.example.com/errors/too-many-requests',
          title:  'Too Many Requests',
          status: 429,
          detail: '요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.',
        },
        429,
      );
    }

    await next();
  };
}

// ── 미리 만들어 둔 미들웨어 인스턴스 ───────────────────────────────────────

/** 공개 라우트: IP 기반, 100 req/60s */
export const publicRateLimit = rateLimitMiddleware(
  'RATE_LIMITER_PUBLIC',
  100,
  (c) => c.req.header('CF-Connecting-IP') ?? 'unknown',
);

/** 인증 라우트: userId 기반, 300 req/60s */
export const authRateLimit = rateLimitMiddleware(
  'RATE_LIMITER_AUTH',
  300,
  (c) => (c.get('userId') as string | undefined) ?? c.req.header('CF-Connecting-IP') ?? 'unknown',
);

/** Sync / 무거운 라우트: 30 req/60s */
export const syncRateLimit = rateLimitMiddleware(
  'RATE_LIMITER_SYNC',
  30,
  (c) => (c.get('userId') as string | undefined) ?? c.req.header('CF-Connecting-IP') ?? 'unknown',
);

/** Workers AI 라우트: 인증 사용자 기준, 30 req/60s */
export const aiRateLimit = rateLimitMiddleware(
  'RATE_LIMITER_SYNC',
  30,
  (c) => `ai:${(c.get('userId') as string | undefined) ?? c.req.header('CF-Connecting-IP') ?? 'unknown'}`,
);
