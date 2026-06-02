/**
 * apps/api/src/middleware/security.ts
 *
 * 보안 헤더 미들웨어
 *   - Content-Security-Policy
 *   - Strict-Transport-Security
 *   - X-Content-Type-Options
 *   - X-Frame-Options
 *   - Referrer-Policy
 *   - Permissions-Policy
 */
import type { Context, Next } from 'hono';
import type { AppEnv } from '../types.js';

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "media-src 'self' https://*.r2.cloudflarestorage.com",
  "connect-src 'self' https://nihongo-n3-api.kordokrip.workers.dev https://nihongo-n3.pages.dev",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export async function securityMiddleware(c: Context<AppEnv>, next: Next): Promise<Response | void> {
  await next();

  // CSP
  c.header('Content-Security-Policy', CSP_DIRECTIVES);

  // HSTS (1년, サブドメイン含む)
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // MIME スニッフィング防止
  c.header('X-Content-Type-Options', 'nosniff');

  // Pages 앱에서 Workers API를 CORS로 읽을 수 있도록 API 응답은 cross-origin을 허용한다.
  c.header('Cross-Origin-Resource-Policy', 'cross-origin');

  // クリックジャッキング防止 (CSP の frame-ancestors と二重ガード)
  c.header('X-Frame-Options', 'DENY');

  // リファラー最小化
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 不要な機能 API を無効化
  c.header(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );
}
