/**
 * apps/api/src/index.ts
 *
 * Hono 4 앱 진입점 — Cloudflare Workers
 *
 * 라우트 구조:
 *   /health             (공개, 캐시 없음)
 *   /api/v1/ping        (공개)
 *   /api/v1/sources     (공개, 엣지 캐시)
 *   /api/v1/curriculum  (공개, 엣지 캐시)
 *   /api/v1/vocab       (공개, 엣지 캐시)
 *   /api/v1/grammar     (공개, 엣지 캐시)
 *   /api/v1/kanji       (공개, 엣지 캐시)
 *   /api/v1/sentences   (공개, 엣지 캐시)
 *   /api/v1/homophones  (공개, 엣지 캐시)
 *   /api/v1/sysprog     (공개, 엣지 캐시)
 *   /api/v1/audio       (공개, 엣지 캐시 30일)
 *   /api/v1/auth        (앱 로그인/회원가입/SSO)
 *   /api/v1/srs         (인증 필요)
 *   /api/v1/logs        (인증 필요)
 *   /api/v1/quiz        (인증 필요)
 *   /api/v1/self-check  (인증 필요)
 *   /api/v1/sync        (인증 필요)
 */
import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

import type { AppEnv, Env } from './types.js';
import { contentCacheMiddleware, audioCacheMiddleware } from './middleware/cache.js';

// ── Phase 6 완료: sources, vocab, grammar, kanji, sentences ─────────
import { vocabOA } from './routes/vocab-oa.js';
import { grammarOA } from './routes/grammar-oa.js';
import { kanjiOA } from './routes/kanji-oa.js';
import { sentencesOA } from './routes/sentences-oa.js';
import { sourcesOA } from './routes/sources-oa.js';
import { homophonesOA } from './routes/homophones-oa.js';

// ── Phase B 완료: 나머지 8개 라우트 ─────────────────────────────────
import { sysprogOA } from './routes/sysprog-oa.js';
import { audioOA } from './routes/audio-oa.js';
import { srsOA } from './routes/srs-oa.js';
import { logsOA } from './routes/logs-oa.js';
import { selfCheckOA } from './routes/self-check-oa.js';
import { syncOA } from './routes/sync-oa.js';
import { adminOA } from './routes/admin-oa.js';
import { quizOA }    from './routes/quiz-oa.js';
import { readingOA } from './routes/reading-oa.js';
import { notificationsOA } from './routes/notifications-oa.js';
import { aiOA } from './routes/ai-oa.js';
import { adminAiOA, aiLearningOA } from './routes/ai-learning-oa.js';
import { authOA } from './routes/auth-oa.js';
import { tracksOA } from './routes/tracks.js';
import { topikPlacementOA } from './routes/topik-placement.js';
import { topikPracticeOA } from './routes/topik-practice.js';
import { adminSessionAuth } from './lib/auth-session.js';
import { securityMiddleware } from './middleware/security.js';
import { syncRateLimit, authRateLimit } from './middleware/rate-limit.js';
import { maintenanceMiddleware } from './middleware/maintenance.js';
import { isD1Error, observabilityMiddleware, routeTemplate } from './middleware/observability.js';
import { safeErrorName } from './lib/safe-log.js';
import { equalSecret } from './lib/secret.js';

// ─────────────────────────────────────────────
// 앱 인스턴스 (OpenAPIHono — Hono 완전 호환 + OpenAPI 스펙 자동 생성)
// ─────────────────────────────────────────────
const app = new OpenAPIHono<AppEnv>();

// ─────────────────────────────────────────────
// 글로벌 미들웨어
// ─────────────────────────────────────────────
app.use('*', observabilityMiddleware);
app.use('*', maintenanceMiddleware);
app.use(
  '*',
  secureHeaders({
    crossOriginResourcePolicy: 'cross-origin',
    referrerPolicy: 'strict-origin-when-cross-origin',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
    xFrameOptions: 'DENY',
  }),
);
app.use('/api/*', securityMiddleware);
app.use(
  '/api/*',
  cors({
    origin: [
      'https://nihongo-n3.pages.dev',
      'http://localhost:5173',
    ],
    allowMethods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type', 'Authorization',
      'Cf-Access-Jwt-Assertion', 'Range',
    ],
    exposeHeaders: [
      'Content-Range', 'Accept-Ranges', 'ETag', 'X-Cache',
      'X-Request-ID', 'X-Release', 'Retry-After',
    ],
    credentials: true,
    maxAge: 86400,
  }),
);

// ─────────────────────────────────────────────
// 헬스체크 (CF Access 외부)
// ─────────────────────────────────────────────
app.get('/', (c) =>
  c.json({
    data: {
      service: 'nihongo-n3-api',
      status: 'ok',
      docs: '/api/docs',
      openapi: '/openapi.json',
      health: '/health',
      version: '1.0.0',
    },
  }),
);

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    maintenanceMode: c.env.MAINTENANCE_MODE || 'off',
    release: c.env.RELEASE_SHA || 'development',
    timestamp: new Date().toISOString(),
  }),
);

app.get('/__ops/canary/5xx', async (c) => {
  const configuredToken = c.env.OBSERVABILITY_CANARY_TOKEN?.trim();
  const suppliedToken = c.req.header('x-observability-canary')?.trim();
  if (
    c.env.ENVIRONMENT !== 'preview'
    || !configuredToken
    || !suppliedToken
    || !(await equalSecret(configuredToken, suppliedToken))
  ) {
    return c.notFound();
  }

  const error = new Error('Preview observability canary');
  error.name = 'ObservabilityCanaryError';
  throw error;
});

// ─────────────────────────────────────────────
// API v1 라우터
// ─────────────────────────────────────────────
const v1 = new OpenAPIHono<AppEnv>();

v1.get('/ping', (c) => c.json({ data: { message: 'pong', version: '1.0.0' } }));
v1.route('/', authOA);
v1.route('/', tracksOA);
v1.route('/', topikPlacementOA);
v1.route('/', topikPracticeOA);

// ── 공개 콘텐츠 라우트 (엣지 캐시 적용) ──────
v1.use('/sources*', contentCacheMiddleware);
v1.use('/content*', contentCacheMiddleware);
v1.use('/curriculum*', contentCacheMiddleware);
v1.use('/vocab*', contentCacheMiddleware);
v1.use('/grammar*', contentCacheMiddleware);
v1.use('/kanji*', contentCacheMiddleware);
v1.use('/sentences*', contentCacheMiddleware);
v1.use('/homophones*', contentCacheMiddleware);

// ── OpenAPI 마이그레이션 완료 라우트 (Phase 6) ─
v1.route('/', sourcesOA);   // /sources, /curriculum, /curriculum/:week
v1.route('/', vocabOA);     // /vocab, /vocab/search, /vocab/:id
v1.route('/', grammarOA);   // /grammar, /grammar/:id
v1.route('/', kanjiOA);     // /kanji, /kanji/:id
v1.route('/', sentencesOA); // /sentences, /sentences/search, /sentences/:id
v1.route('/', homophonesOA); // /homophones (검수 완료 동음이의어)

// ── Phase B: 공개 콘텐츠 (캐시 + OA 라우트) ─────────────────────────
v1.use('/sysprog*', contentCacheMiddleware);
v1.use('/audio*', audioCacheMiddleware);

v1.route('/', sysprogOA);
v1.route('/', audioOA);

// ── Phase B: 인증 필요 학습 라우트 (OA 마이그레이션 완료) ────────────
v1.route('/', srsOA);
v1.route('/', logsOA);
v1.route('/', selfCheckOA);
v1.use('/sync*', syncRateLimit);
v1.route('/', syncOA);
v1.use('/quiz/generate*', authRateLimit);
v1.route('/', quizOA);
v1.route('/', aiOA);
v1.route('/', aiLearningOA);
v1.use('/reading*', contentCacheMiddleware);
v1.route('/', readingOA);
v1.route('/', notificationsOA);  // /notifications/*

app.route('/api/v1', v1);

// ─────────────────────────────────────────────
// OpenAPI 스펙 + Scalar UI
// /openapi.json  — 스펙 JSON
// /api/docs      — Scalar UI (대화형 문서)
// ─────────────────────────────────────────────

// cfAccess 보안 스킴 등록
app.openAPIRegistry.registerComponent('securitySchemes', 'cfAccess', {
  type: 'apiKey',
  in: 'header',
  name: 'Cf-Access-Jwt-Assertion',
  description: 'Cloudflare Access JWT (개발 환경에서는 자동 우회)',
});

const openApiBase = {
  openapi: '3.1.0',
  info: {
    title: 'JLPT · TOPIK Learning API',
    version: '1.0.0',
    description: 'JLPT · TOPIK 학습 PWA — Cloudflare Workers API\n\nCloudflare Workers + D1 + R2 기반의 트랙 분리 학습 서비스 API입니다.',
    contact: { name: 'nihongo-n3', url: 'https://nihongo-n3.pages.dev' },
  },
  servers: [
    { url: 'http://localhost:8787', description: '로컬 개발 (wrangler dev)' },
    { url: 'https://nihongo-n3-api.kordokrip.workers.dev', description: '프로덕션' },
  ],
  tags: [
    { name: 'Vocab', description: 'JLPT 레벨별 어휘' },
    { name: 'Grammar', description: '문법 패턴' },
    { name: 'Kanji', description: '한자' },
    { name: 'Sentences', description: '예문' },
    { name: 'Homophones', description: '검수 완료 동음이의어 변별' },
    { name: 'Content', description: '검수 완료 학습 콘텐츠 (sysprog, sources)' },
    { name: 'Audio', description: 'R2 오디오 스트리밍' },
    { name: 'SRS', description: 'FSRS-6 간격반복학습' },
    { name: 'Logs', description: '학습 로그 및 퀴즈 기록' },
    { name: 'SelfCheck', description: '주차별 자가진단' },
    { name: 'Sync', description: '오프라인 동기화' },
    { name: 'Admin',   description: '관리자 (주간 리포트)' },
    { name: 'Reading', description: '독해 지문 + 퀘즈' },
    { name: 'Notifications', description: 'Web Push 구독 및 테스트 알림' },
    { name: 'AI', description: 'Workers AI 기반 자연어 학습 보조' },
    { name: 'Auth', description: '앱 세션 및 Google OAuth' },
    { name: 'Tracks', description: 'JLPT 일본어 및 TOPIK 한국어 학습 트랙' },
    { name: 'TOPIK Placement', description: '자체 저작 TOPIK I 배치 진단' },
  ],
} satisfies Parameters<typeof app.getOpenAPI31Document>[0];

const adminPathPrefixes = [
  '/admin',
  '/api/v1/auth/admin/',
  '/api/v1/auth/bootstrap-admin',
] as const;

function isAdminPath(path: string): boolean {
  return adminPathPrefixes.some((prefix) => path.startsWith(prefix));
}

type OpenApiDocument = ReturnType<typeof app.getOpenAPI31Document>;

export function getPublicOpenApiDocument(): OpenApiDocument {
  const document = app.getOpenAPI31Document(openApiBase);
  return {
    ...document,
    paths: Object.fromEntries(
      Object.entries(document.paths ?? {}).filter(([path]) => !isAdminPath(path)),
    ),
  };
}

export function getAdminOpenApiDocument(): OpenApiDocument {
  const document = app.getOpenAPI31Document({
    ...openApiBase,
    info: { ...openApiBase.info, title: 'Nihongo N3 Admin API' },
  });
  return {
    ...document,
    paths: Object.fromEntries(
      Object.entries(document.paths ?? {}).filter(([path]) => isAdminPath(path)),
    ),
  };
}

app.get('/openapi.json', (c) => c.json(getPublicOpenApiDocument()));

app.get(
  '/api/docs',
  apiReference({
    spec: { url: '/openapi.json' },
    theme: 'default',
    layout: 'modern',
  }),
);

app.get('/openapi/admin.json', adminSessionAuth, (c) => c.json(getAdminOpenApiDocument()));

app.get(
  '/api/admin/docs',
  adminSessionAuth,
  apiReference({
    spec: { url: '/openapi/admin.json' },
    theme: 'default',
    layout: 'modern',
  }),
);

// ── 관리자 라우트 (/admin/*) — application admin session 보호 ─────
app.route('/admin', adminOA);
app.route('/admin', adminAiOA);

export const INTERNAL_ROUTE_EXCEPTIONS = new Set([
  'GET /',
  'GET /health',
  'GET /__ops/canary/5xx',
  'GET /api/v1/ping',
  'GET /openapi.json',
  'GET /api/docs',
  'GET /openapi/admin.json',
  'GET /api/admin/docs',
]);

export { app };

// ─────────────────────────────────────────────
// 404 / 에러 핸들러 (RFC 7807)
// ─────────────────────────────────────────────
app.notFound((c) => {
  c.header('Content-Type', 'application/problem+json');
  return c.json(
    {
      type: 'https://nihongo-n3.example.com/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: `${c.req.method} ${c.req.path} 를 찾을 수 없습니다`,
    },
    404,
  );
});

app.onError((err, c) => {
  console.error({
    event: isD1Error(err) ? 'd1_error' : 'application_error',
    request_id: c.get('requestId') ?? null,
    release: c.env.RELEASE_SHA?.trim() || 'development',
    environment: c.env.ENVIRONMENT,
    auth_mode: c.env.AUTH_MODE,
    method: c.req.method,
    route: routeTemplate(c),
    error_name: safeErrorName(err),
  });
  c.header('Content-Type', 'application/problem+json');
  return c.json(
    {
      type: 'https://nihongo-n3.example.com/errors/internal-server-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred',
    },
    500,
  );
});

export default app;
