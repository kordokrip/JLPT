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
 *   /api/v1/sysprog     (공개, 엣지 캐시)
 *   /api/v1/homophones  (공개, 엣지 캐시)
 *   /api/v1/audio       (공개, 엣지 캐시 30일)
 *   /api/v1/srs         (인증 필요)
 *   /api/v1/logs        (인증 필요)
 *   /api/v1/quiz        (인증 필요)
 *   /api/v1/self-check  (인증 필요)
 *   /api/v1/sync        (인증 필요)
 */
import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

import type { AppEnv, Env } from './types.js';
import { contentCacheMiddleware, audioCacheMiddleware } from './middleware/cache.js';

// ── Phase 6 완료: sources, vocab, grammar, kanji, sentences ─────────
import { vocabOA } from './routes/vocab-oa.js';
import { grammarOA } from './routes/grammar-oa.js';
import { kanjiOA } from './routes/kanji-oa.js';
import { sentencesOA } from './routes/sentences-oa.js';
import { sourcesOA } from './routes/sources-oa.js';

// ── Phase B 완료: 나머지 8개 라우트 ─────────────────────────────────
import { sysprogOA } from './routes/sysprog-oa.js';
import { homophonesOA } from './routes/homophones-oa.js';
import { audioOA } from './routes/audio-oa.js';
import { srsOA } from './routes/srs-oa.js';
import { logsOA } from './routes/logs-oa.js';
import { selfCheckOA } from './routes/self-check-oa.js';
import { syncOA } from './routes/sync-oa.js';
import { adminOA } from './routes/admin-oa.js';
import { buildWeeklyReport, sendReportEmail } from './routes/admin.js';
import { runAudioGeneration }                from './jobs/generate-audio.js';
import { runFsrsOptimizer }                  from './jobs/optimize-fsrs.js';
import { quizOA }    from './routes/quiz-oa.js';
import { readingOA } from './routes/reading-oa.js';
import { notificationsOA } from './routes/notifications-oa.js';
import { aiOA } from './routes/ai-oa.js';
import { securityMiddleware } from './middleware/security.js';
import { syncRateLimit, authRateLimit, publicRateLimit } from './middleware/rate-limit.js';
import { sendPushToMany } from './lib/push.js';

// ─────────────────────────────────────────────
// 앱 인스턴스 (OpenAPIHono — Hono 완전 호환 + OpenAPI 스펙 자동 생성)
// ─────────────────────────────────────────────
const app = new OpenAPIHono<AppEnv>();

// ─────────────────────────────────────────────
// 글로벌 미들웨어
// ─────────────────────────────────────────────
app.use('*', logger());
app.use('*', secureHeaders());
app.use('/api/*', securityMiddleware);
app.use(
  '/api/*',
  cors({
    origin: [
      'https://nihongo-n3.pages.dev',
      'http://localhost:5173',
    ],
    allowMethods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type', 'Authorization',
      'Cf-Access-Jwt-Assertion', 'Range',
    ],
    exposeHeaders: [
      'Content-Range', 'Accept-Ranges', 'ETag', 'X-Cache',
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
    timestamp: new Date().toISOString(),
  }),
);

// ─────────────────────────────────────────────
// API v1 라우터
// ─────────────────────────────────────────────
const v1 = new OpenAPIHono<AppEnv>();

v1.get('/ping', (c) => c.json({ data: { message: 'pong', version: '1.0.0' } }));

// ── 공개 콘텐츠 라우트 (엣지 캐시 적용) ──────
v1.use('/sources*', contentCacheMiddleware);
v1.use('/curriculum*', contentCacheMiddleware);
v1.use('/vocab*', contentCacheMiddleware);
v1.use('/grammar*', contentCacheMiddleware);
v1.use('/kanji*', contentCacheMiddleware);
v1.use('/sentences*', contentCacheMiddleware);

// ── OpenAPI 마이그레이션 완료 라우트 (Phase 6) ─
v1.route('/', sourcesOA);   // /sources, /curriculum, /curriculum/:week
v1.route('/', vocabOA);     // /vocab, /vocab/search, /vocab/:id
v1.route('/', grammarOA);   // /grammar, /grammar/:id
v1.route('/', kanjiOA);     // /kanji, /kanji/:id
v1.route('/', sentencesOA); // /sentences, /sentences/search, /sentences/:id

// ── Phase B: 공개 콘텐츠 (캐시 + OA 라우트) ─────────────────────────
v1.use('/sysprog*', contentCacheMiddleware);
v1.use('/homophones*', contentCacheMiddleware);
v1.use('/audio*', audioCacheMiddleware);

v1.route('/', sysprogOA);
v1.route('/', homophonesOA);
v1.route('/', audioOA);

// ── Phase B: 인증 필요 학습 라우트 (OA 마이그레이션 완료) ────────────
v1.route('/', srsOA);
v1.route('/', logsOA);
v1.route('/', selfCheckOA);
v1.use('/sync*', syncRateLimit);
v1.route('/', syncOA);
v1.use('/quiz/generate*', authRateLimit);
v1.route('/', quizOA);
v1.use('/ai*', publicRateLimit);
v1.route('/', aiOA);
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

app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Nihongo N3 API',
    version: '1.0.0',
    description: 'JLPT N3 학습 PWA — Cloudflare Workers API\n\nCloudflare Workers + D1 + R2 기반 JLPT 학습 서비스 API입니다.',
    contact: { name: 'nihongo-n3', url: 'https://nihongo-n3.pages.dev' },
  },
  servers: [
    { url: 'http://localhost:8787', description: '로컬 개발 (wrangler dev)' },
    { url: 'https://nihongo-n3-api.workers.dev', description: '프로덕션' },
  ],
  tags: [
    { name: 'Vocab', description: '어휘 (N3 수준)' },
    { name: 'Grammar', description: '문법 패턴' },
    { name: 'Kanji', description: '한자' },
    { name: 'Sentences', description: '예문' },
    { name: 'Content', description: '학습 콘텐츠 (sysprog, homophones, sources)' },
    { name: 'Audio', description: 'R2 오디오 스트리밍' },
    { name: 'SRS', description: 'FSRS-6 간격반복학습' },
    { name: 'Logs', description: '학습 로그 및 퀴즈 기록' },
    { name: 'SelfCheck', description: '주차별 자가진단' },
    { name: 'Sync', description: '오프라인 동기화' },
    { name: 'Admin',   description: '관리자 (주간 리포트)' },
    { name: 'Reading', description: '독해 지문 + 퀘즈' },
    { name: 'Notifications', description: 'Web Push 구독 및 테스트 알림' },
    { name: 'AI', description: 'Workers AI 기반 자연어 학습 보조' },
  ],
});

app.get(
  '/api/docs',
  apiReference({
    spec: { url: '/openapi.json' },
    theme: 'default',
    layout: 'modern',
  }),
);

// ── 관리자 라우트 (/admin/*) — CF Access 보호 ──────────────────────
app.route('/admin', adminOA);

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
  console.error('[Error]', err.message, err.stack);
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

export default {
  fetch: app.fetch,

  // ─────────────────────────────────────────────────────────────────────────
  // Cron Trigger: 매주 일요일 23:00 KST (14:00 UTC)
  // wrangler.toml: [triggers] crons = ["0 14 * * 0"]
  // ─────────────────────────────────────────────────────────────────────────
  async scheduled(
    controller: ScheduledController,
    env:        Env,
    ctx:        ExecutionContext,
  ): Promise<void> {
    const cron = controller.cron;
    ctx.waitUntil(
      (async () => {
        // 주간 리포트: 일요일 14:00 UTC
        if (cron === '0 14 * * 0') {
          try {
            console.log('[Cron] 주간 리포트 생성 시작');
            const { markdown, weekLabel } = await buildWeeklyReport(env.DB);
            const key = `reports/weekly/${weekLabel}.md`;
            await env.REPORTS.put(key, markdown, {
              httpMetadata: { contentType: 'text/markdown; charset=utf-8' },
              customMetadata: { generatedAt: new Date().toISOString() },
            });
            await sendReportEmail(env.NOTIFY_EMAIL, weekLabel, markdown);
            console.log(`[Cron] 주간 리포트 완료: ${key}`);
          } catch (err) {
            console.error('[Cron] 주간 리포트 오류', err);
          }
        }

        // TTS 오디오 생성: 매일 03:00 UTC
        if (cron === '0 3 * * *') {
          try {
            console.log('[Cron] TTS 오디오 생성 시작');
            const result = await runAudioGeneration(env);
            console.log(`[Cron] TTS 완료:`, result);
          } catch (err) {
            console.error('[Cron] TTS 오디오 생성 오류', err);
          }
        }

        // FSRS W 옵티마이저: 일요일 15:00 UTC
        if (cron === '0 15 * * 0') {
          try {
            console.log('[Cron] FSRS 옵티마이저 시작');
            await runFsrsOptimizer(env);
            console.log('[Cron] FSRS 옵티마이저 완료');
          } catch (err) {
            console.error('[Cron] FSRS 옵티마이저 오류', err);
          }
        }

        // 아침/저녁 Web Push 알림 (VAPID 키 미설정 시 스킵)
        if (cron === '0 22 * * *' || cron === '0 13 * * *') {
          try {
            if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
              console.log('[Cron] VAPID 키 미설정 → Push 알림 스킵');
            } else {
              const isMorning = cron === '0 22 * * *';
              const col       = isMorning ? 'morning_on' : 'evening_on';
              const title     = isMorning ? '오늘의 복습 알림' : '취침 전 미니 회상';
              const body      = isMorning
                ? '오늘 복습할 카드가 기다리고 있어요.'
                : '자기 전 5분, 오늘 배운 단어를 떠올려 보세요.';

              const subs = await env.DB.prepare(
                `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE ${col} = 1 LIMIT 200`,
              ).all<{ endpoint: string; p256dh: string; auth: string }>();

              const { sent, failed, expired } = await sendPushToMany(
                subs.results ?? [],
                { title, body, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png', url: '/review', tag: 'daily-reminder' },
                env.VAPID_PUBLIC_KEY,
                env.VAPID_PRIVATE_KEY,
              );

              // 만료된 구독 삭제
              for (const ep of expired) {
                await env.DB.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(ep).run();
              }

              console.log(`[Cron] Push ${isMorning ? '아침' : '저녁'} 완료: sent=${sent}, failed=${failed}, expired=${expired.length}`);
            }
          } catch (err) {
            console.error('[Cron] Push 알림 오류', err);
          }
        }
      })(),
    );
  },
} satisfies ExportedHandler<Env>;

export type { AppEnv };
