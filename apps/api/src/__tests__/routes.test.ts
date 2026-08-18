/**
 * apps/api/src/__tests__/routes.test.ts
 *
 * Hono 앱 통합 테스트 — @cloudflare/vitest-pool-workers 환경
 *
 * 모든 요청은 실제 Workers 런타임에서 실행된다.
 * 인증이 필요한 라우트는 ENVIRONMENT=test 에서 dev bypass를 사용한다.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { JLPT_LEVELS, type JlptLevel } from '@nihongo-n3/shared';
import app, {
  app as honoApp,
  getAdminOpenApiDocument,
  getPublicOpenApiDocument,
  INTERNAL_ROUTE_EXCEPTIONS,
} from '../app.js';
import { receiver as observabilityReceiver } from '../observability-receiver.js';
import { isSideEffectingRequest } from '../middleware/maintenance.js';

// Vite ?raw import 타입 선언 (env.d.ts에 전역 선언됨)
// @ts-ignore – wildcard module declaration only valid in .d.ts files
declare module '*.sql?raw' {
  const content: string;
  export default content;
}

// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawMigration from '../../../../packages/db/drizzle-v2/0000_schema_convergence.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawFtsMigration from '../../../../packages/db/drizzle-v2/0001_fts.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawAppDefaultsMigration from '../../../../packages/db/drizzle-v2/0002_app_defaults.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawSelfCheckMigration from '../../../../packages/db/drizzle-v2/0003_self_check_templates.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawPracticeContentMigration from '../../../../packages/db/drizzle-v2/0004_jlpt_n3_practice_content.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawLearningTrackMigration from '../../../../packages/db/drizzle-v2/0005_learning_track.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawOauthLearningTrackMigration from '../../../../packages/db/drizzle-v2/0006_oauth_learning_track.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawContentProvenanceHomophonesMigration from '../../../../packages/db/drizzle-v2/0007_content_provenance_homophones.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawTopikTrackMigration from '../../../../packages/db/drizzle-v2/0008_topik_track_content_and_learning_keys.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawTopikPlacementV2Migration from '../../../../packages/db/drizzle-v2/0009_topik_placement_v2.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawTopikOfficialReferenceMigration from '../../../../packages/db/drizzle-v2/0010_topik_official_reference_data.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawTopikJapanesePlacementMigration from '../../../../packages/db/drizzle-v2/0011_topik_japanese_placement_and_practice.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawContentReleaseContractMigration from '../../../../packages/db/drizzle-v2/0012_content_release_contract.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawContentReleaseControlPlaneMigration from '../../../../packages/db/drizzle-v2/0013_content_release_control_plane.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawContentReleaseReviewSignoffsMigration from '../../../../packages/db/drizzle-v2/0014_content_release_review_signoffs.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawAiLearningAssistanceMigration from '../../../../packages/db/drizzle-v2/0015_ai_learning_assistance_foundation.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawTopikOwnerPrivatePublicationMigration from '../../../../packages/db/drizzle-v2/0016_topik_owner_private_publication.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawContentSourceAudioAndOwnerCurriculumMigration from '../../../../packages/db/drizzle-v2/0017_content_source_audio_and_owner_curriculum.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawPreserveExistingJlptLevelsMigration from '../../../../packages/db/drizzle-v2/0018_preserve_existing_jlpt_levels.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawTopikOwnerCurriculumAudioTextMigration from '../../../../packages/db/drizzle-v2/0019_topik_owner_curriculum_audio_text.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawContentAudioBindingActivationsMigration from '../../../../packages/db/drizzle-v2/0020_content_audio_binding_activations.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawTopikOwnerCurriculumProgressFsrsMigration from '../../../../packages/db/drizzle-v2/0021_topik_owner_curriculum_progress_fsrs.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawQuestionBankQualityLedgerMigration from '../../../../packages/db/drizzle-v2/0022_question_bank_quality_ledger.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawRebalanceJlptN3ReadingAnswersMigration from '../../../../packages/db/drizzle-v2/0023_rebalance_jlpt_n3_reading_answers.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawLearningActivityEventsMigration from '../../../../packages/db/drizzle-v2/0024_learning_activity_events.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawJlptPracticeQuestionsMigration from '../../../../packages/db/drizzle-v2/0025_jlpt_practice_questions.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawReleaseQualityLinksMigration from '../../../../packages/db/drizzle-v2/0026_release_quality_links.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawGoogleSpeechContractMigration from '../../../../packages/db/drizzle-v2/0027_google_speech_contract.sql?raw';

// ─────────────────────────────────────────────
// 테스트 전 D1 스키마 적용
// ─────────────────────────────────────────────
beforeAll(async () => {
  // miniflare D1 exec()는 \n 기준으로 한 줄씩 실행하므로 사용 불가.
  // 주석·PRAGMA 제거 후 BEGIN/END 기반 파서로 독립 문장을 분리해
  // 각각 prepare().run() 으로 실행한다.
  const filteredLines = `${rawMigration}\n${rawFtsMigration}\n${rawAppDefaultsMigration}\n${rawSelfCheckMigration}\n${rawPracticeContentMigration}\n${rawLearningTrackMigration}\n${rawOauthLearningTrackMigration}\n${rawContentProvenanceHomophonesMigration}\n${rawTopikTrackMigration}\n${rawTopikPlacementV2Migration}\n${rawTopikOfficialReferenceMigration}\n${rawTopikJapanesePlacementMigration}\n${rawContentReleaseContractMigration}\n${rawContentReleaseControlPlaneMigration}\n${rawContentReleaseReviewSignoffsMigration}\n${rawAiLearningAssistanceMigration}\n${rawTopikOwnerPrivatePublicationMigration}\n${rawContentSourceAudioAndOwnerCurriculumMigration}\n${rawPreserveExistingJlptLevelsMigration}\n${rawTopikOwnerCurriculumAudioTextMigration}\n${rawContentAudioBindingActivationsMigration}\n${rawTopikOwnerCurriculumProgressFsrsMigration}\n${rawQuestionBankQualityLedgerMigration}\n${rawRebalanceJlptN3ReadingAnswersMigration}\n${rawLearningActivityEventsMigration}\n${rawJlptPracticeQuestionsMigration}\n${rawReleaseQualityLinksMigration}\n${rawGoogleSpeechContractMigration}`
    .replaceAll('--> statement-breakpoint', '')
    .split('\n')
    .filter(line => {
      const t = line.trim();
      return t && !t.startsWith('--') && !/^PRAGMA\s/i.test(t);
    });

  const statements: string[] = [];
  let current = '';
  let depth = 0;

  for (const line of filteredLines) {
    const up = line.trim().toUpperCase();
    if (up === 'BEGIN') depth++;
    if (up === 'END;') depth = Math.max(0, depth - 1);

    current += line + '\n';

    if (depth === 0 && line.trim().endsWith(';')) {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = '';
    }
  }
  if (current.trim()) statements.push(current.trim());

  for (const stmt of statements) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (env as any).DB.prepare(stmt).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/fts5|virtual table/i.test(message)) {
        console.warn('[setup] FTS DDL unavailable:', stmt.slice(0, 60).replace(/\n/g, ' '));
        continue;
      }
      throw error;
    }
  }
});


// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────
async function fetch(path: string, init?: RequestInit) {
  const request = new Request(`http://localhost${path}`, init);
  const ctx = createExecutionContext();
  const res = await app.fetch(request, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

async function fetchWithEnv(path: string, testEnv: typeof env, init?: RequestInit) {
  const request = new Request(`https://api.example.test${path}`, init);
  const ctx = createExecutionContext();
  const res = await app.fetch(request, testEnv, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

async function fetchReceiver(path: string, testEnv: typeof env, init?: RequestInit) {
  const request = new Request(`https://alerts.example.test${path}`, init);
  const ctx = createExecutionContext();
  const res = await observabilityReceiver.fetch(request, testEnv, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  return res.json<T>();
}

async function registerTestSession(role: 'user' | 'admin' = 'user'): Promise<string> {
  const email = `admin-route-${role}-${Date.now()}-${crypto.randomUUID()}@example.com`;
  const register = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Passw0rd1234', display_name: `${role} route test` }),
  });
  expect(register.status).toBe(201);

  if (role === 'admin') {
    await (env as typeof env & { DB: D1Database }).DB.prepare(
      `UPDATE users SET role = 'admin' WHERE email = ?`,
    ).bind(email).run();
  }

  return register.headers.get('set-cookie') ?? '';
}

const OPENAPI_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;

function documentRoutes(document: ReturnType<typeof getPublicOpenApiDocument>): Set<string> {
  const routes = new Set<string>();
  for (const [path, item] of Object.entries(document.paths ?? {})) {
    for (const method of OPENAPI_METHODS) {
      if (item?.[method]) routes.add(`${method.toUpperCase()} ${path}`);
    }
  }
  return routes;
}

function normalizeRuntimePath(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)(?:\{[^}]+\})?/g, '{$1}');
}

describe('OpenAPI route coverage', () => {
  it('matches every registered HTTP route except approved internal endpoints', () => {
    const runtime = new Set(
      honoApp.routes
        .filter((route) => route.method !== 'ALL')
        .map((route) => `${route.method} ${normalizeRuntimePath(route.path)}`)
        .filter((route) => !INTERNAL_ROUTE_EXCEPTIONS.has(route)),
    );
    const documented = new Set([
      ...documentRoutes(getPublicOpenApiDocument()),
      ...documentRoutes(getAdminOpenApiDocument()),
    ]);

    expect([...runtime].filter((route) => !documented.has(route))).toEqual([]);
    expect([...documented].filter((route) => !runtime.has(route))).toEqual([]);
  });

  it('keeps admin paths out of the public specification', () => {
    expect(Object.keys(getPublicOpenApiDocument().paths ?? {}).some((path) =>
      path.startsWith('/admin') || path.startsWith('/api/v1/auth/admin/'),
    )).toBe(false);
    expect(Object.keys(getAdminOpenApiDocument().paths ?? {}).length).toBeGreaterThan(0);
  });

  it('protects the admin specification with an application session', async () => {
    const productionEnv = { ...env, ENVIRONMENT: 'production', AUTH_MODE: 'app-session' };
    const publicSpec = await fetchWithEnv('/openapi.json', productionEnv);
    const adminSpec = await fetchWithEnv('/openapi/admin.json', productionEnv);
    expect(publicSpec.status).toBe(200);
    expect(adminSpec.status).toBe(401);
  });

  it('exposes reviewed homophones in the public contract', () => {
    const route = getPublicOpenApiDocument().paths?.['/api/v1/homophones']?.get;
    expect(route).toBeDefined();
    expect(route?.tags).toContain('Homophones');
  });
});

// ─────────────────────────────────────────────
// /api/v1/homophones
// ─────────────────────────────────────────────
describe('GET /api/v1/homophones', () => {
  it('returns only complete reviewed pairs with source provenance', async () => {
    const db = (env as unknown as { DB: D1Database }).DB;
    await db.prepare(
      `INSERT OR IGNORE INTO sources (code, title, file_path, version)
       VALUES ('HP-TEST', 'Homophone test source', 'tests/homophones.md', 'test-v1')`,
    ).run();

    await db.batch([
      db.prepare(
        `INSERT OR IGNORE INTO vocab (source_id, level, ja, kana, ko, tags)
         VALUES ((SELECT id FROM sources WHERE code = 'HP-TEST'), 'N3', '試験紙', 'しけんし', '시험용 종이', '[]')`,
      ),
      db.prepare(
        `INSERT OR IGNORE INTO vocab (source_id, level, ja, kana, ko, tags)
         VALUES ((SELECT id FROM sources WHERE code = 'HP-TEST'), 'N3', '試験氏', 'しけんし', '시험용 성씨', '[]')`,
      ),
      db.prepare(
        `INSERT OR IGNORE INTO vocab (source_id, level, ja, kana, ko, tags)
         VALUES ((SELECT id FROM sources WHERE code = 'HP-TEST'), 'N3', '未検証一', 'みけんしょう', '미검수 하나', '[]')`,
      ),
      db.prepare(
        `INSERT OR IGNORE INTO vocab (source_id, level, ja, kana, ko, tags)
         VALUES ((SELECT id FROM sources WHERE code = 'HP-TEST'), 'N3', '未検証二', 'みけんしょう', '미검수 둘', '[]')`,
      ),
    ]);

    const reviewedA = await db.prepare(
      `SELECT id FROM vocab WHERE level = 'N3' AND ja = '試験紙' AND kana = 'しけんし'`,
    ).first<{ id: number }>();
    const reviewedB = await db.prepare(
      `SELECT id FROM vocab WHERE level = 'N3' AND ja = '試験氏' AND kana = 'しけんし'`,
    ).first<{ id: number }>();
    const hiddenA = await db.prepare(
      `SELECT id FROM vocab WHERE level = 'N3' AND ja = '未検証一' AND kana = 'みけんしょう'`,
    ).first<{ id: number }>();
    const hiddenB = await db.prepare(
      `SELECT id FROM vocab WHERE level = 'N3' AND ja = '未検証二' AND kana = 'みけんしょう'`,
    ).first<{ id: number }>();
    expect(reviewedA?.id).toBeTruthy();
    expect(reviewedB?.id).toBeTruthy();
    expect(hiddenA?.id).toBeTruthy();
    expect(hiddenB?.id).toBeTruthy();

    await db.batch([
      db.prepare(
        `INSERT OR IGNORE INTO homophone_pairs (
          level, word_a_id, word_b_id, word_a_source_code, word_b_source_code,
          note_ko, accent_source, accent_source_url, accent_a, accent_b,
          example_a_ja, example_a_ko, example_b_ja, example_b_ko, reviewer, reviewed_at
        ) VALUES (
          'N3', ?, ?, 'HP-TEST', 'HP-TEST',
          '검수된 동음이의어입니다.', 'test-accent', 'https://example.test/accent', '0형', '1형',
          '試験紙を確認します。', '시험용 종이를 확인합니다.',
          '試験氏に連絡します。', '시험용 성씨에게 연락합니다.', 'test reviewer', '2026-07-16'
        )`,
      ).bind(reviewedA!.id, reviewedB!.id),
      db.prepare(
        `INSERT OR IGNORE INTO homophone_pairs (level, word_a_id, word_b_id)
         VALUES ('N3', ?, ?)`,
      ).bind(hiddenA!.id, hiddenB!.id),
    ]);

    const res = await fetch('/api/v1/homophones?level=N3');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: Array<{
      reading: string;
      word_a: { word: string; source: { code: string } };
      word_b: { word: string };
      accent: { source_url: string };
      review: { reviewer: string };
    }> }>();
    const reviewed = body.data.find((item) => item.word_a.word === '試験紙');
    expect(reviewed).toMatchObject({
      reading: 'しけんし',
      word_a: { source: { code: 'HP-TEST' } },
      word_b: { word: '試験氏' },
      accent: { source_url: 'https://example.test/accent' },
      review: { reviewer: 'test reviewer' },
    });
    expect(body.data.some((item) => item.word_a.word === '未検証一')).toBe(false);
  });
});

// ─────────────────────────────────────────────
// /
// ─────────────────────────────────────────────
describe('GET /', () => {
  it('200 + 공개 서비스 상태', async () => {
    const res = await fetch('/');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { service: string; status: string } }>();
    expect(body.data.service).toBe('nihongo-n3-api');
    expect(body.data.status).toBe('ok');
  });
});

describe('request observability', () => {
  it.each([
    ['/api/v1/vocab/987654321?token=private-query-value', '/api/v1/vocab/:id', ['987654321', 'private-query-value']],
    ['/api/v1/reading/444444', '/api/v1/reading/:id', ['444444']],
    ['/not-a-real-route/private-segment?email=private@example.com', '/*', ['private-segment', 'private@example.com']],
  ])('logs a route template without request path values: %s', async (path, expectedRoute, forbiddenValues) => {
    const messages: Record<string, unknown>[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((message) => {
      if (message && typeof message === 'object') {
        messages.push(message as Record<string, unknown>);
      }
    });

    try {
      await fetch(path);
    } finally {
      log.mockRestore();
    }

    const requestLog = messages.find((message) => message['event'] === 'http_request');

    expect(requestLog?.['route']).toBe(expectedRoute);
    for (const forbidden of forbiddenValues) {
      expect(JSON.stringify(requestLog)).not.toContain(forbidden);
    }
    expect(requestLog).not.toHaveProperty('path');
    expect(requestLog).not.toHaveProperty('url');
    expect(requestLog).not.toHaveProperty('query');
  });

  it('keeps the 5xx canary unavailable outside an authenticated preview', async () => {
    const productionEnv = {
      ...env,
      ENVIRONMENT: 'production',
      OBSERVABILITY_CANARY_TOKEN: 'preview-secret-value',
    };
    const previewEnv = {
      ...env,
      ENVIRONMENT: 'preview',
      OBSERVABILITY_CANARY_TOKEN: 'preview-secret-value',
    };

    expect((await fetchWithEnv('/__ops/canary/5xx', productionEnv, {
      headers: { 'X-Observability-Canary': 'preview-secret-value' },
    })).status).toBe(404);
    expect((await fetchWithEnv('/__ops/canary/5xx', previewEnv, {
      headers: { 'X-Observability-Canary': 'wrong-secret-value' },
    })).status).toBe(404);
  });

  it('fires a PII-free 5xx event for an authenticated preview canary', async () => {
    const secret = 'preview-secret-value';
    const messages: Record<string, unknown>[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((message) => {
      if (message && typeof message === 'object') messages.push(message as Record<string, unknown>);
    });
    const error = vi.spyOn(console, 'error').mockImplementation((message) => {
      if (message && typeof message === 'object') messages.push(message as Record<string, unknown>);
    });

    try {
      const response = await fetchWithEnv(
        '/__ops/canary/5xx',
        { ...env, ENVIRONMENT: 'preview', OBSERVABILITY_CANARY_TOKEN: secret },
        { headers: { 'X-Observability-Canary': secret } },
      );
      expect(response.status).toBe(500);
    } finally {
      log.mockRestore();
      error.mockRestore();
    }

    const requestLog = messages.find((message) => message['event'] === 'http_request');
    const errorLog = messages.find((message) => message['event'] === 'application_error');
    expect(requestLog).toMatchObject({ route: '/__ops/canary/5xx', status: 500 });
    expect(errorLog).toMatchObject({
      route: '/__ops/canary/5xx',
      error_name: 'ObservabilityCanaryError',
    });
    expect(JSON.stringify(messages)).not.toContain(secret);
    expect(JSON.stringify(messages)).not.toContain('x-observability-canary');
  });

  it('authenticates the direct alert receiver and stores PII-free R2 evidence', async () => {
    const webhookToken = 'preview-webhook-secret';
    const canaryToken = 'preview-canary-secret';
    const workerName = 'nihongo-n3-api-observability-preview';
    const previewEnv = {
      ...env,
      ENVIRONMENT: 'preview',
      OBSERVABILITY_ALERT_WEBHOOK_TOKEN: webhookToken,
      OBSERVABILITY_CANARY_TOKEN: canaryToken,
      OBSERVABILITY_WORKER_NAME: workerName,
    };
    const generatedAt = new Date().toISOString();
    const payload = {
      source: 'post-deploy-observe',
      service: workerName,
      generated_at: generatedAt,
      release: 'test-release',
      dedupe_key: `${workerName}:test:${generatedAt}`,
      event_rows_received: 25,
      telemetry_truncated: false,
      alerts: { five_xx: { fired: true, requests: 25, errors: 25, rate: 1 } },
      requests: { requests: 25, five_xx: 25, five_xx_rate: 1 },
      releases: [{ release: 'test-release', requests: 25, five_xx: 25 }],
      routes: [{ route: '/__ops/canary/5xx', requests: 25, five_xx: 25 }],
    };

    expect((await fetchReceiver('/__ops/alerts/cloudflare', previewEnv, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-token' },
      body: JSON.stringify(payload),
    })).status).toBe(404);

    const accepted = await fetchReceiver('/__ops/alerts/cloudflare', previewEnv, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${webhookToken}` },
      body: JSON.stringify(payload),
    });
    expect(accepted.status).toBe(202);
    const receipt = await accepted.json<{ received: boolean; object_key: string; sha256: string }>();
    expect(receipt.received).toBe(true);
    expect(receipt.object_key).toMatch(/^alerts\/observability\/\d{4}\/\d{2}\/\d{2}\/[a-f0-9]{64}\.json$/);
    expect(receipt.sha256).toHaveLength(64);
    const evidence = await fetchReceiver('/__ops/evidence/r2?kind=alerts', previewEnv, {
      headers: { 'X-Observability-Canary': canaryToken },
    });
    expect(evidence.status).toBe(200);
    const evidenceBody = await evidence.json<{ count: number; objects: Array<{ key: string }> }>();
    expect(evidenceBody.count).toBeGreaterThan(0);
    expect(evidenceBody.objects.some((object) => object.key === receipt.object_key)).toBe(true);
  });

  it('rejects alert evidence containing PII-shaped fields', async () => {
    const token = 'preview-webhook-secret';
    const workerName = 'nihongo-n3-api-observability-preview';
    const response = await fetchReceiver('/__ops/alerts/cloudflare', {
      ...env,
      ENVIRONMENT: 'preview',
      OBSERVABILITY_ALERT_WEBHOOK_TOKEN: token,
      OBSERVABILITY_WORKER_NAME: workerName,
    }, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        source: 'test',
        service: workerName,
        generated_at: new Date().toISOString(),
        release: 'test',
        dedupe_key: 'test',
        event_rows_received: 1,
        user_email: 'private@example.com',
      }),
    });
    expect(response.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// /health
// ─────────────────────────────────────────────
describe('GET /health', () => {
  it('200 + { status: "ok" }', async () => {
    const res = await fetch('/health');
    expect(res.status).toBe(200);
    const body = await res.json<{ status: string }>();
    expect(body.status).toBe('ok');
  });

  it('returns request and release correlation headers', async () => {
    const res = await fetch('/health', { headers: { 'X-Request-ID': 'test-request-1234' } });
    expect(res.headers.get('x-request-id')).toBe('test-request-1234');
    expect(res.headers.get('x-release')).toBe('test');
  });
});

describe('Read-only cutover mode', () => {
  const readOnlyEnv = {
    ...env,
    ENVIRONMENT: 'production',
    AUTH_MODE: 'app-session',
    MAINTENANCE_MODE: 'read-only',
  };

  it('keeps read endpoints available', async () => {
    const res = await fetchWithEnv('/api/v1/sources', readOnlyEnv);
    expect(res.status).toBe(200);
  });

  it('blocks router-local write paths as well as mounted API paths', () => {
    expect(isSideEffectingRequest('POST', '/auth/login')).toBe(true);
    expect(isSideEffectingRequest('GET', '/auth/google/start')).toBe(true);
    expect(isSideEffectingRequest('POST', '/ai/translate')).toBe(false);
  });

  it('blocks database-changing commands with retry metadata', async () => {
    const res = await fetchWithEnv('/api/v1/auth/login', readOnlyEnv, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'Passw0rd1234' }),
    });
    expect(res.status).toBe(503);
    expect(res.headers.get('retry-after')).toBe('900');
  });

  it('blocks OAuth GET routes that write state', async () => {
    const res = await fetchWithEnv('/api/v1/auth/google/start', readOnlyEnv);
    expect(res.status).toBe(503);
  });

  it('allows the explicitly side-effect-free translation command', async () => {
    const testReadOnlyEnv = { ...readOnlyEnv, ENVIRONMENT: 'test', AUTH_MODE: 'public-owner' };
    const res = await fetchWithEnv('/api/v1/ai/translate', testReadOnlyEnv, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '오늘은 조금 피곤해요', target: 'ja', tone: 'polite' }),
    });
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────
// /api/v1/ping
// ─────────────────────────────────────────────
describe('GET /api/v1/ping', () => {
  it('200 + { data: { message: "pong" } }', async () => {
    const body = await json<{ data: { message: string } }>('/api/v1/ping');
    expect(body.data.message).toBe('pong');
  });
});

describe('App auth', () => {
  it('registers, reads session user, and logs out with an HttpOnly cookie', async () => {
    const email = `user-${Date.now()}@example.com`;
    const register = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Passw0rd1234', display_name: '테스트 사용자' }),
    });
    expect(register.status).toBe(201);
    const cookie = register.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('n3_session=');
    expect(cookie).toContain('HttpOnly');

    const me = await fetch('/api/v1/auth/me', { headers: { Cookie: cookie } });
    expect(me.status).toBe(200);
    const meBody = await me.json<{ data: { authenticated: boolean; user: { email: string; learning_track: string } } }>();
    expect(meBody.data.authenticated).toBe(true);
    expect(meBody.data.user.email).toBe(email);
    expect(meBody.data.user.learning_track).toBe('jlpt-ja');

    const switchTrack = await fetch('/api/v1/auth/track', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ track: 'topik-ko' }),
    });
    expect(switchTrack.status).toBe(200);

    const switchedMe = await fetch('/api/v1/auth/me', { headers: { Cookie: cookie } });
    const switchedBody = await switchedMe.json<{ data: { user: { learning_track: string } } }>();
    expect(switchedBody.data.user.learning_track).toBe('topik-ko');

    const logout = await fetch('/api/v1/auth/logout', { method: 'POST', headers: { Cookie: cookie } });
    expect(logout.status).toBe(200);
  });

  it('partitions mutable server records and sync deltas by the authenticated learning track', async () => {
    const cookie = await registerTestSession();
    const headers = { 'Content-Type': 'application/json', Cookie: cookie };
    const changeTrack = async (track: 'jlpt-ja' | 'topik-ko') => {
      const response = await fetch('/api/v1/auth/track', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ track }),
      });
      expect(response.status).toBe(200);
    };
    const postDaily = async (date: string, itemsNew: number) => {
      const response = await fetch('/api/v1/logs/daily', {
        method: 'POST',
        headers,
        body: JSON.stringify({ date, items_new: itemsNew, items_review: 0, time_min: 1, audio_min: 0 }),
      });
      expect(response.status).toBe(201);
    };
    const postSelfCheck = async (vocabScore: number) => {
      const response = await fetch('/api/v1/self-check', {
        method: 'POST',
        headers,
        body: JSON.stringify({ week_no: 1, vocab_score: vocabScore }),
      });
      expect(response.status).toBe(201);
    };

    await changeTrack('topik-ko');
    await postDaily('2026-07-17', 2);
    await postSelfCheck(20);
    const topikSrs = await fetch('/api/v1/srs/init', {
      method: 'POST',
      headers,
      body: JSON.stringify({ item_type: 'vocab', item_ids: [101] }),
    });
    expect(topikSrs.status).toBe(404);
    const topikQuiz = await fetch('/api/v1/quiz/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ mode: 'vocab_mc', level: 'N3', count: 1 }),
    });
    expect(topikQuiz.status).toBe(404);

    const topikSync = await fetch('/api/v1/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        client_id: 'track-isolation-api',
        last_synced_at: '2000-01-01T00:00:00.000Z',
        operations: [{
          op_id: '00000000-0000-4000-8000-000000000111',
          type: 'daily_log',
          payload: { date: '2026-07-16', items_new: 3, items_review: 0, time_min: 1, audio_min: 0 },
          occurred_at: new Date().toISOString(),
        }],
      }),
    });
    expect(topikSync.status).toBe(200);
    const topikSyncBody = await topikSync.json<{ data: { server_delta: { daily_logs: Array<{ learning_track: string; items_new: number }> } } }>();
    expect(topikSyncBody.data.server_delta.daily_logs).toHaveLength(2);
    expect(topikSyncBody.data.server_delta.daily_logs.every((row) => row.learning_track === 'topik-ko')).toBe(true);

    await changeTrack('jlpt-ja');
    await postDaily('2026-07-17', 9);
    await postSelfCheck(90);
    const jlptLogs = await fetch('/api/v1/logs/daily', { headers: { Cookie: cookie } });
    const jlptLogsBody = await jlptLogs.json<{ data: Array<{ learning_track: string; items_new: number }> }>();
    expect(jlptLogsBody.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ learning_track: 'jlpt-ja', items_new: 9 }),
    ]));
    expect(jlptLogsBody.data.some((row) => row.learning_track === 'topik-ko')).toBe(false);
    const jlptCheck = await fetch('/api/v1/self-check/1', { headers: { Cookie: cookie } });
    const jlptCheckBody = await jlptCheck.json<{ data: { learning_track: string; vocab_score: number } }>();
    expect(jlptCheckBody.data).toMatchObject({ learning_track: 'jlpt-ja', vocab_score: 90 });

    await changeTrack('topik-ko');
    const topikLogs = await fetch('/api/v1/logs/daily', { headers: { Cookie: cookie } });
    const topikLogsBody = await topikLogs.json<{ data: Array<{ learning_track: string; items_new: number }> }>();
    expect(topikLogsBody.data).toHaveLength(2);
    expect(topikLogsBody.data.every((row) => row.learning_track === 'topik-ko')).toBe(true);
    const topikCheck = await fetch('/api/v1/self-check/1', { headers: { Cookie: cookie } });
    const topikCheckBody = await topikCheck.json<{ data: { learning_track: string; vocab_score: number } }>();
    expect(topikCheckBody.data).toMatchObject({ learning_track: 'topik-ko', vocab_score: 20 });
  });

  it('logs out cleanly with production __Host session cookies', async () => {
    const email = `prod-user-${Date.now()}@example.com`;
    const productionEnv = { ...env, ENVIRONMENT: 'production', AUTH_MODE: 'app-session' };
    const register = await app.fetch(
      new Request('https://api.example.test/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://nihongo-n3.pages.dev' },
        body: JSON.stringify({ email, password: 'Passw0rd1234', display_name: '운영 쿠키 사용자' }),
      }),
      productionEnv,
      createExecutionContext(),
    );
    expect(register.status).toBe(201);
    const cookie = register.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('__Host-n3_session=');
    expect(cookie).toContain('Secure');

    const logout = await app.fetch(
      new Request('https://api.example.test/api/v1/auth/logout', {
        method: 'POST',
        headers: { Cookie: cookie, Origin: 'https://nihongo-n3.pages.dev' },
      }),
      productionEnv,
      createExecutionContext(),
    );
    expect(logout.status).toBe(200);
    const cleared = logout.headers.get('set-cookie') ?? '';
    expect(cleared).toContain('__Host-n3_session=');
    expect(cleared).toContain('Secure');
  });

  it('starts Google OAuth with the configured Pages callback in production', async () => {
    const productionEnv = {
      ...env,
      ENVIRONMENT: 'production',
      AUTH_MODE: 'app-session',
      APP_ORIGIN: 'https://nihongo-n3.pages.dev',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      GOOGLE_REDIRECT_URI: 'https://nihongo-n3.pages.dev/api/v1/auth/google/callback',
    };
    const res = await app.fetch(
      new Request('https://nihongo-n3.pages.dev/api/v1/auth/google/start?track=topik-ko', {
        headers: { Origin: 'https://nihongo-n3.pages.dev' },
      }),
      productionEnv,
      createExecutionContext(),
    );
    expect(res.status).toBe(302);
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('__Host-n3_oauth_state=');
    expect(cookie).toContain('SameSite=Lax');
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(decodeURIComponent(location)).toContain('redirect_uri=https://nihongo-n3.pages.dev/api/v1/auth/google/callback');
    const stateRow = await (env as typeof env & { DB: D1Database }).DB.prepare(
      `SELECT learning_track FROM oauth_states ORDER BY created_at DESC LIMIT 1`,
    ).first<{ learning_track: string }>();
    expect(stateRow?.learning_track).toBe('topik-ko');
  });

  it('completes Google OAuth on the Pages origin and keeps the requested track', async () => {
    const productionEnv = {
      ...env,
      ENVIRONMENT: 'production',
      AUTH_MODE: 'app-session',
      APP_ORIGIN: 'https://nihongo-n3.pages.dev',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      GOOGLE_REDIRECT_URI: 'https://nihongo-n3.pages.dev/api/v1/auth/google/callback',
    };
    const start = await app.fetch(
      new Request('https://nihongo-n3.pages.dev/api/v1/auth/google/start?track=topik-ko'),
      productionEnv,
      createExecutionContext(),
    );
    const oauthCookie = (start.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
    const googleLocation = new URL(start.headers.get('location') ?? 'https://invalid.test');
    const state = googleLocation.searchParams.get('state') ?? '';

    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url === 'https://oauth2.googleapis.com/token') {
        return Response.json({ access_token: 'test-google-access-token' });
      }
      if (url === 'https://openidconnect.googleapis.com/v1/userinfo') {
        return Response.json({
          sub: `google-sub-${Date.now()}`,
          email: `google-${Date.now()}@example.com`,
          name: 'Google Test User',
          email_verified: true,
        });
      }
      throw new Error(`Unexpected OAuth test request: ${url}`);
    });

    try {
      const callback = await app.fetch(
        new Request(
          `https://nihongo-n3.pages.dev/api/v1/auth/google/callback?code=test-code&state=${encodeURIComponent(state)}`,
          { headers: { Cookie: oauthCookie } },
        ),
        productionEnv,
        createExecutionContext(),
      );
      expect(callback.status).toBe(302);
      expect(callback.headers.get('location')).toBe('https://nihongo-n3.pages.dev');
      const sessionCookie = (callback.headers.get('set-cookie') ?? '')
        .match(/__Host-n3_session=[^;]+/)?.[0] ?? '';
      expect(sessionCookie).toContain('__Host-n3_session=');

      const me = await app.fetch(
        new Request('https://nihongo-n3.pages.dev/api/v1/auth/me', {
          headers: { Cookie: sessionCookie },
        }),
        productionEnv,
        createExecutionContext(),
      );
      const meBody = await me.json<{ data: { user: { learning_track: string } } }>();
      expect(me.status).toBe(200);
      expect(meBody.data.user.learning_track).toBe('topik-ko');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('rejects weak passwords and invalid login attempts', async () => {
    const weak = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'weak@example.com', password: 'short' }),
    });
    expect(weak.status).toBe(400);

    const login = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'missing@example.com', password: 'Passw0rd1234' }),
    });
    expect(login.status).toBe(401);
  });
});

describe('Learning tracks', () => {
  async function seedCompleteTrackLevels(levels: readonly JlptLevel[]) {
    const sourceCode = 'N7-TRACK-STATUS';
    await (env as typeof env & { DB: D1Database }).DB.prepare(
      `INSERT OR IGNORE INTO sources (code, title, file_path, version)
       VALUES (?, ?, ?, 'test')`,
    ).bind(sourceCode, 'N7 track status fixture', 'test/n7-track-status').run();
    const source = await (env as typeof env & { DB: D1Database }).DB.prepare(
      'SELECT id FROM sources WHERE code = ?',
    ).bind(sourceCode).first<{ id: number }>();
    expect(source?.id).toBeTypeOf('number');

    const characters = ['㐀', '㐁', '㐂', '㐃', '㐄'];
    for (const level of levels) {
      const index = JLPT_LEVELS.indexOf(level);
      await (env as typeof env & { DB: D1Database }).DB.batch([
        (env as typeof env & { DB: D1Database }).DB.prepare(
          `INSERT OR IGNORE INTO vocab (source_id, level, ja, kana, ko, pos)
           VALUES (?, ?, ?, ?, ?, 'test')`,
        ).bind(source!.id, level, `track-${level}`, `とらっく-${level.toLowerCase()}`, `${level} 뜻`),
        (env as typeof env & { DB: D1Database }).DB.prepare(
          `INSERT OR IGNORE INTO grammar (source_id, level, pattern, meaning_ko, examples)
           VALUES (?, ?, ?, ?, '[]')`,
        ).bind(source!.id, level, `〜${level}`, `${level} 문법`),
        (env as typeof env & { DB: D1Database }).DB.prepare(
          `INSERT OR IGNORE INTO kanji (char, on_yomi, meaning_ko, jlpt_level)
           VALUES (?, 'テスト', ?, ?)`,
        ).bind(characters[index]!, `${level} 한자`, level),
      ]);
    }
  }

  it('derives JLPT release stages from complete DB level coverage and keeps TOPIK foundation-only', async () => {
    await seedCompleteTrackLevels(['N5', 'N4', 'N3']);
    const jlpt = await json<{ data: { available: boolean; content_release: string; available_levels: string[] } }>(
      '/api/v1/tracks/jlpt-ja/status',
    );
    const topik = await json<{ data: { available: boolean; content_release: string } }>(
      '/api/v1/tracks/topik-ko/status',
    );
    expect(jlpt.data).toEqual(expect.objectContaining({ available: true, content_release: 'n5-n3' }));
    expect(jlpt.data.available_levels).toEqual(['N5', 'N4', 'N3']);
    expect(topik.data).toEqual(expect.objectContaining({ available: false, content_release: 'foundation-only' }));

    await seedCompleteTrackLevels(['N2']);
    const n2 = await json<{ data: { content_release: string; available_levels: string[] } }>(
      '/api/v1/tracks/jlpt-ja/status',
    );
    expect(n2.data).toMatchObject({
      content_release: 'n5-n2',
      available_levels: ['N5', 'N4', 'N3', 'N2'],
    });

    await seedCompleteTrackLevels(['N1']);
    const expanded = await json<{ data: { content_release: string; available_levels: string[] } }>(
      '/api/v1/tracks/jlpt-ja/status',
    );
    expect(expanded.data).toMatchObject({
      content_release: 'n5-n1',
      available_levels: ['N5', 'N4', 'N3', 'N2', 'N1'],
    });
  });

  it.each(['N2', 'N1'] as const)('generates a level-matched %s vocabulary quiz', async (level) => {
    await seedCompleteTrackLevels([level]);
    const source = await (env as typeof env & { DB: D1Database }).DB.prepare(
      'SELECT id FROM sources WHERE code = ?',
    ).bind('N7-TRACK-STATUS').first<{ id: number }>();
    await (env as typeof env & { DB: D1Database }).DB.batch(
      ['a', 'b', 'c'].map((suffix) => (env as typeof env & { DB: D1Database }).DB.prepare(
        `INSERT INTO vocab (source_id, level, ja, kana, ko, pos)
         VALUES (?, ?, ?, ?, ?, 'test')`,
      ).bind(source!.id, level, `track-${level}-${suffix}`, `とらっく-${level.toLowerCase()}-${suffix}`, `${level} 뜻 ${suffix}`)),
    );
    await (env as typeof env & { DB: D1Database }).DB.prepare(
      `INSERT OR IGNORE INTO users (id, email, display_name)
       VALUES ('owner', 'owner@nihongo-n3.local', 'test owner')`,
    ).run();

    const response = await fetch('/api/v1/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'vocab_mc', level, count: 1 }),
    });
    expect(response.status).toBe(200);
    const body = await response.json<{
      data: { level: string; questions: Array<{ prompt: string }> };
    }>();
    expect(body.data.level).toBe(level);
    expect(body.data.questions).toHaveLength(1);
    expect(body.data.questions[0]?.prompt).toMatch(new RegExp(`^track-${level}`));
  });
});

describe('learning activity and strict-level quiz strategy', () => {
  it('stores activity idempotently and returns only authenticated-track aggregates', async () => {
    const db = (env as typeof env & { DB: D1Database }).DB;
    await db.prepare(
      `INSERT OR IGNORE INTO users (id, email, display_name, learning_track)
       VALUES ('owner', 'owner@nihongo-n3.local', 'test owner', 'jlpt-ja')`,
    ).run();
    const suffix = crypto.randomUUID();
    const payload = {
      events: [
        {
          event_id: `open:${suffix}`,
          event_type: 'content_opened',
          learning_track: 'jlpt-ja',
          content_type: 'jlpt-vocab',
          content_id: 'fixture-1',
          level_tag: 'N3',
          occurred_at: new Date().toISOString(),
        },
        {
          event_id: `speech:${suffix}`,
          event_type: 'speech_attempted',
          learning_track: 'jlpt-ja',
          content_type: 'jlpt-vocab',
          content_id: 'fixture-1',
          level_tag: 'N3',
          speech_outcome: 'played',
          occurred_at: new Date().toISOString(),
        },
      ],
    };

    const first = await fetch('/api/v1/activity/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(first.status).toBe(201);
    expect(await first.json()).toMatchObject({ data: { accepted: 2, duplicates: 0 } });

    const duplicate = await fetch('/api/v1/activity/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(duplicate.status).toBe(201);
    expect(await duplicate.json()).toMatchObject({ data: { accepted: 0, duplicates: 2 } });

    const summary = await fetch('/api/v1/activity/summary?window=7d');
    expect(summary.status).toBe(200);
    const summaryBody = await summary.json<{
      data: { window: string; totals: { events: number; speech_attempts: number; speech_played: number } };
    }>();
    expect(summaryBody.data.window).toBe('7d');
    expect(summaryBody.data.totals.events).toBeGreaterThanOrEqual(2);
    expect(summaryBody.data.totals.speech_attempts).toBeGreaterThanOrEqual(1);
    expect(summaryBody.data.totals.speech_played).toBeGreaterThanOrEqual(1);

    const mismatch = await fetch('/api/v1/activity/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [{ ...payload.events[0], event_id: `mismatch:${suffix}`, learning_track: 'topik-ko' }] }),
    });
    expect(mismatch.status).toBe(400);
  });

  it('uses recent wrong answers for weakest and never falls back across JLPT levels', async () => {
    const db = (env as typeof env & { DB: D1Database }).DB;
    await db.prepare(
      `INSERT OR IGNORE INTO users (id, email, display_name, learning_track)
       VALUES ('owner', 'owner@nihongo-n3.local', 'test owner', 'jlpt-ja')`,
    ).run();
    await db.prepare(
      `INSERT OR IGNORE INTO sources (code, title, file_path, version)
       VALUES ('ACTIVITY-QUIZ-TEST', 'activity quiz test', 'test/activity-quiz', '1')`,
    ).run();
    const source = await db.prepare('SELECT id FROM sources WHERE code = ?')
      .bind('ACTIVITY-QUIZ-TEST').first<{ id: number }>();
    const suffix = crypto.randomUUID().slice(0, 8);
    const inserts = await db.batch(Array.from({ length: 5 }, (_, index) => db.prepare(
      `INSERT INTO vocab (source_id, level, ja, kana, ko, pos)
       VALUES (?, 'N4', ?, ?, ?, 'test')`,
    ).bind(source!.id, `weak-${suffix}-${index}`, `うぃーく-${index}`, `취약 뜻 ${suffix}-${index}`)));
    const weakId = Number(inserts[0]!.meta.last_row_id);
    await db.prepare(
      `INSERT INTO learning_activity_events
         (event_id, user_id, learning_track, event_type, content_type, content_id, level_tag, mode, correct, occurred_at)
       VALUES (?, 'owner', 'jlpt-ja', 'quiz_answered', 'vocab_mc', ?, 'N4', 'vocab_mc', 0, unixepoch())`,
    ).bind(`weak-answer:${suffix}`, String(weakId)).run();

    const weakest = await fetch('/api/v1/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'vocab_mc', level: 'N4', count: 1, strategy: 'weakest' }),
    });
    expect(weakest.status).toBe(200);
    const weakestBody = await weakest.json<{ data: { questions: Array<{ item_id: number }> } }>();
    expect(weakestBody.data.questions[0]?.item_id).toBe(weakId);

    const insufficient = await fetch('/api/v1/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'vocab_mc', level: 'N5', count: 20 }),
    });
    expect(insufficient.status).toBe(400);
  });

  it('prefers a reviewed published N3 static bank item for weakest strategy', async () => {
    const db = (env as typeof env & { DB: D1Database }).DB;
    await db.prepare(
      `INSERT OR IGNORE INTO users (id, email, display_name, learning_track)
       VALUES ('owner', 'owner@nihongo-n3.local', 'test owner', 'jlpt-ja')`,
    ).run();
    const suffix = crypto.randomUUID().slice(0, 8);
    const releaseId = `release-static-${suffix}`;
    const version = `static-bank-${suffix}`;
    await db.prepare(
      `INSERT INTO content_releases
         (id, learning_track, content_version, release_state, manifest_sha256, parser_version)
       VALUES (?, 'jlpt-ja', ?, 'approved', ?, 'test-parser')`,
    ).bind(releaseId, version, 'd'.repeat(64)).run();
    await db.prepare(
      `INSERT INTO content_release_quality_requirements
         (release_id, content_type, expected_audit_count, validator_version)
       VALUES (?, 'jlpt-quiz', 4, 'test-validator')`,
    ).bind(releaseId).run();

    const staticIds: string[] = [];
    for (let index = 0; index < 4; index++) {
      const id = `static-kanji-${suffix}-${index}`;
      staticIds.push(id);
      const auditId = `audit-${id}`;
      await db.prepare(
        `INSERT INTO content_quality_audits
           (id, learning_track, content_type, content_id, content_version, evidence_sha256,
            validator_version, automated_status, author_review_status, adversarial_review_status,
            author_reviewer, adversarial_reviewer, release_state, checked_at)
         VALUES (?, 'jlpt-ja', 'jlpt-quiz', ?, ?, ?, 'test-validator', 'passed',
                 'signed', 'signed', 'reviewer-a', 'reviewer-b', 'approved', '2026-08-19')`,
      ).bind(auditId, id, version, 'e'.repeat(64)).run();
      await db.prepare(
        `INSERT INTO content_release_quality_audit_links (release_id, audit_id) VALUES (?, ?)`,
      ).bind(releaseId, auditId).run();
      const choices = Array.from({ length: 4 }, (_, choice) => ({
        ko: `읽기 ${index}-${choice}`,
        ja: `よみ-${index}-${choice}`,
        en: `reading ${index}-${choice}`,
      }));
      await db.prepare(
        `INSERT INTO jlpt_practice_questions
           (id, level, mode, skill, difficulty, prompt_ko, prompt_ja, prompt_en,
            choices_json, answer_index, explanation_ko, explanation_ja, explanation_en,
            source_code, source_evidence_sha256, bank_version, is_published)
         VALUES (?, 'N3', 'kanji_reading', 'test', 3, ?, ?, ?, ?, ?, ?, ?, ?,
                 'TEST-STATIC', ?, ?, 1)`,
      ).bind(
        id,
        `정적 한자 ${index}`,
        `静的漢字${index}`,
        `static kanji ${index}`,
        JSON.stringify(choices),
        index,
        `한국어 해설 ${index}`,
        `日本語解説${index}`,
        `English explanation ${index}`,
        'f'.repeat(64),
        version,
      ).run();
    }
    const weakId = staticIds[2]!;
    await db.prepare(
      `INSERT INTO learning_activity_events
         (event_id, user_id, learning_track, event_type, content_type, content_id, level_tag, mode, correct, occurred_at)
       VALUES (?, 'owner', 'jlpt-ja', 'quiz_answered', 'kanji_reading', ?, 'N3', 'kanji_reading', 0, unixepoch())`,
    ).bind(`static-wrong:${suffix}`, weakId).run();

    const response = await fetch('/api/v1/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'kanji_reading', level: 'N3', count: 1, strategy: 'weakest' }),
    });
    expect(response.status).toBe(200);
    const body = await response.json<{
      data: { questions: Array<{ item_id: string; prompt: string; choices: string[]; answer?: string }> };
    }>();
    expect(body.data.questions[0]).toMatchObject({ item_id: weakId, prompt: '静的漢字2' });
    expect(body.data.questions[0]?.choices).toEqual([
      'よみ-2-0', 'よみ-2-1', 'よみ-2-2', 'よみ-2-3',
    ]);
    expect(body.data.questions[0]).not.toHaveProperty('answer');
  });
});

describe('TOPIK placement V2', () => {
  it('publishes only a complete 12+12 bank, hides answers until submit, and prevents resubmission', async () => {
    const db = (env as typeof env & { DB: D1Database }).DB;
    await db.batch([
      db.prepare(
        `INSERT INTO track_content_sources (learning_track, source_code, title, file_path, source_version, provenance_json)
         VALUES ('topik-ko', 'TOPIK-PLACEMENT-V2', 'test placement', 'test/topik-v2', 'test', '{}')`,
      ),
      db.prepare(
        `INSERT INTO track_exam_levels (learning_track, exam_level, sort_order, label_en, label_ko, sections_json)
         VALUES ('topik-ko', 'TOPIK-I', 1, 'TOPIK I', 'TOPIK I', '["listening","reading"]')
         ON CONFLICT(learning_track, exam_level) DO UPDATE SET sections_json = excluded.sections_json`,
      ),
    ]);
    const questionStatements = Array.from({ length: 24 }, (_, index) => {
      const section = index < 12 ? 'listening' : 'reading';
      const id = `topik-placement-v2-test-${String(index + 1).padStart(3, '0')}`;
      return db.prepare(
        `INSERT INTO topik_placement_questions
          (id, learning_track, exam_level, section, skill, difficulty, prompt_ko, prompt_ja, prompt_en, gloss_en,
           choices_json, answer_index, explanation_en, explanation_ko, explanation_ja, source_code, author_reviewer,
           second_reviewer, reviewed_at, bank_version, audio_script_ko, is_published)
         VALUES (?, 'topik-ko', 'TOPIK-I', ?, 'test-skill', 1, ?, ?, ?, 'test',
                 '["정답","오답 1","오답 2","오답 3"]', 0, 'English explanation', '한국어 해설', '日本語の解説',
                 'TOPIK-PLACEMENT-V2', 'author review', 'language review', '2026-07-19', 'v2', ?, 1)`,
      ).bind(id, section, `${section} 질문 ${index + 1}`, `${section} 日本語の質問 ${index + 1}`, `${section} question ${index + 1}`, section === 'listening' ? `한국어 듣기 문장 ${index + 1}입니다.` : null);
    });
    await db.batch(questionStatements);

    const status = await json<{ data: { available: boolean; content_release: string; available_sections: string[] } }>('/api/v1/tracks/topik-ko/status');
    expect(status.data).toMatchObject({ available: true, content_release: 'placement-v2', available_sections: ['listening', 'reading'] });

    const cookie = await registerTestSession();
    const headers = { 'Content-Type': 'application/json', Cookie: cookie };
    const switched = await fetch('/api/v1/auth/track', { method: 'PATCH', headers, body: JSON.stringify({ track: 'topik-ko' }) });
    expect(switched.status).toBe(200);

    const started = await fetch('/api/v1/tracks/topik-ko/placement/attempts', {
      method: 'POST', headers, body: JSON.stringify({ instruction_language: 'ja' }),
    });
    expect(started.status).toBe(201);
    const startBody = await started.json<{ data: { instruction_language: string; id: string; questions: Array<{ id: string; section: string; prompt_ja: string; audio: { kind: string } | null }> } }>();
    expect(startBody.data.instruction_language).toBe('ja');
    expect(startBody.data.questions).toHaveLength(24);
    expect(startBody.data.questions.filter((item) => item.section === 'listening')).toHaveLength(12);
    expect(startBody.data.questions[0]?.audio).toMatchObject({ kind: 'google', text_ko: '한국어 듣기 문장 1입니다.' });
    expect(startBody.data.questions[0]?.prompt_ja).toContain('日本語');
    expect(JSON.stringify(startBody)).not.toContain('answer_index');
    expect(JSON.stringify(startBody)).not.toContain('explanation_en');

    const answers = startBody.data.questions.map((question) => ({ question_id: question.id, selected_index: 0 }));
    const submitted = await fetch(`/api/v1/tracks/topik-ko/placement/attempts/${startBody.data.id}/submit`, {
      method: 'POST', headers, body: JSON.stringify({ answers }),
    });
    expect(submitted.status).toBe(200);
    const result = await submitted.json<{ data: { score_total: number; score_listening: number; score_reading: number; result_band: string; answers: unknown[] } }>();
    expect(result.data).toMatchObject({ score_total: 100, score_listening: 100, score_reading: 100, result_band: 'ready' });
    expect(result.data.answers).toHaveLength(24);

    const repeated = await fetch(`/api/v1/tracks/topik-ko/placement/attempts/${startBody.data.id}/submit`, {
      method: 'POST', headers, body: JSON.stringify({ answers }),
    });
    expect(repeated.status).toBe(409);
  });
});

describe('TOPIK self-authored practice bank', () => {
  it('keeps answers private until a learner explicitly opens a reviewed solution', async () => {
    const db = (env as typeof env & { DB: D1Database }).DB;
    await db.batch([
      db.prepare(
        `INSERT INTO track_content_sources (learning_track, source_code, title, file_path, source_version, provenance_json)
         VALUES ('topik-ko', 'TOPIK-PRACTICE-V2', 'test practice', 'test/topik-practice', 'test', '{}')
         ON CONFLICT(learning_track, source_code) DO UPDATE SET source_version = excluded.source_version`,
      ),
      db.prepare(
        `INSERT INTO track_exam_levels (learning_track, exam_level, sort_order, label_en, label_ko, sections_json)
         VALUES ('topik-ko', 'TOPIK-II', 2, 'TOPIK II', 'TOPIK II', '["listening","writing","reading"]')
         ON CONFLICT(learning_track, exam_level) DO UPDATE SET sections_json = excluded.sections_json`,
      ),
      db.prepare(
        `INSERT INTO topik_practice_questions
          (id, learning_track, exam_level, section, question_type, skill, difficulty, prompt_ko, prompt_ja, prompt_en,
           choices_json, answer_index, explanation_ko, explanation_ja, explanation_en, source_code, author_reviewer,
           second_reviewer, reviewed_at, bank_version, is_published)
         VALUES ('topik-practice-test-001', 'topik-ko', 'TOPIK-II', 'reading', 'choice', 'test', 3,
           '한국어 질문', '日本語の質問', 'English question', '["정답","오답 1","오답 2","오답 3"]', 0,
           '한국어 해설', '日本語の解説', 'English explanation', 'TOPIK-PRACTICE-V2', 'author', 'reviewer', '2026-07-20', 'v2', 1)`,
      ),
    ]);

    const cookie = await registerTestSession();
    const headers = { Cookie: cookie };
    const switched = await fetch('/api/v1/auth/track', { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ track: 'topik-ko' }) });
    expect(switched.status).toBe(200);

    const listed = await fetch('/api/v1/tracks/topik-ko/practice?exam_level=TOPIK-II&section=reading', { headers });
    expect(listed.status).toBe(200);
    const listBody = await listed.json<{ data: { questions: Array<{ id: string; prompt_ja: string }> } }>();
    expect(listBody.data.questions).toHaveLength(1);
    expect(listBody.data.questions[0]?.prompt_ja).toBe('日本語の質問');
    expect(JSON.stringify(listBody)).not.toContain('answer_index');
    expect(JSON.stringify(listBody)).not.toContain('explanation_ja');

    const solution = await fetch('/api/v1/tracks/topik-ko/practice/questions/topik-practice-test-001/solution', { headers });
    expect(solution.status).toBe(200);
    const solutionBody = await solution.json<{ data: { answer_index: number; explanation_ja: string; question_type: string } }>();
    expect(solutionBody.data).toMatchObject({
      question_id: 'topik-practice-test-001',
      question_type: 'choice',
      answer_index: 0,
      explanation_ja: '日本語の解説',
    });
  });
});

describe('TOPIK owner-authored 1–6 curriculum contract', () => {
  it('reads the additive grade-1 unit without changing the reviewed practice bank or public release lifecycle', async () => {
    const db = (env as typeof env & { DB: D1Database }).DB;
    const sourceAssetId = 'api-test-topik-owner-curriculum-source';
    const unitId = 'api-test-topik-owner-curriculum-unit';
    const vocabId = 'api-test-topik-owner-curriculum-vocab';
    const listeningId = 'api-test-topik-owner-curriculum-listening';
    await db.batch([
      db.prepare(`INSERT INTO content_source_assets (id, asset_kind, source_url, license_id, license_url, attribution_text, allowed_use, source_sha256, generated_at, selection_reason) VALUES (?, 'self-authored-fixture', 'https://example.invalid/topik-owner', 'LicenseRef-api-test', 'https://example.invalid/license', 'API test fixture', 'local test only', ?, 1785283200, 'API contract test')`).bind(sourceAssetId, 'e'.repeat(64)),
      db.prepare(`INSERT INTO topik_owner_authored_curriculum_units (id, target_grade, stable_ref, section, title_ko, title_ja, title_en, source_asset_id) VALUES (?, 1, 'topik.api.grade1.unit', 'vocab', '인사와 자기소개', 'あいさつと自己紹介', 'Greetings and introductions', ?)`).bind(unitId, sourceAssetId),
      db.prepare(`INSERT INTO topik_owner_authored_curriculum_items (id, unit_id, target_grade, stable_ref, item_type, prompt_ko, prompt_ja, prompt_en, answer_json, explanation_ko, explanation_ja, explanation_en, audio_required, audio_text_ko, source_asset_id) VALUES (?, ?, 1, 'topik.api.grade1.vocab', 'vocab', '안녕하세요의 뜻은 무엇입니까?', '「안녕하세요」の意味は何ですか。', 'What does 안녕하세요 mean?', '{"choices":["인사","주문","날짜","길"],"answer_index":0}', '인사입니다.', 'あいさつです。', 'It is a greeting.', 1, '안녕하세요.', ?)`)
        .bind(vocabId, unitId, sourceAssetId),
      db.prepare(`INSERT INTO topik_owner_authored_curriculum_items (id, unit_id, target_grade, stable_ref, item_type, prompt_ko, prompt_ja, prompt_en, answer_json, explanation_ko, explanation_ja, explanation_en, audio_required, audio_text_ko, source_asset_id) VALUES (?, ?, 1, 'topik.api.grade1.listening', 'listening', '말하는 사람은 무엇을 합니까?', '話している人は何をしますか。', 'What is the speaker doing?', '{"choices":["자기소개","주문","날짜","길"],"answer_index":0}', '자기소개입니다.', '自己紹介です。', 'It is an introduction.', 1, '안녕하세요. 저는 유나예요. 처음 뵙겠습니다.', ?)`)
        .bind(listeningId, unitId, sourceAssetId),
      db.prepare(`INSERT INTO learning_content_stable_refs (stable_ref, learning_track, item_type, item_id, level_tag, source_asset_id) VALUES ('topik.api.grade1.vocab', 'topik-ko', 'topik-owner-item', ?, 'TOPIK-1', ?)`)
        .bind(vocabId, sourceAssetId),
      db.prepare(`INSERT INTO learning_content_stable_refs (stable_ref, learning_track, item_type, item_id, level_tag, source_asset_id) VALUES ('topik.api.grade1.listening', 'topik-ko', 'topik-owner-item', ?, 'TOPIK-1', ?)`)
        .bind(listeningId, sourceAssetId),
      db.prepare(`INSERT INTO content_speech_bindings (id, stable_ref, item_type, item_id, language, speech_role, provider, binding_state, text_source) VALUES ('topik.api.grade1.vocab.speech', 'topik.api.grade1.vocab', 'topik-owner-item', ?, 'ko', 'pronunciation', 'google-browser', 'ready', 'audio-script')`).bind(vocabId),
      db.prepare(`INSERT INTO content_speech_bindings (id, stable_ref, item_type, item_id, language, speech_role, provider, binding_state, text_source) VALUES ('topik.api.grade1.listening.speech', 'topik.api.grade1.listening', 'topik-owner-item', ?, 'ko', 'listening', 'google-browser', 'ready', 'audio-script')`).bind(listeningId),
    ]);

    const cookie = await registerTestSession();
    const headers = { Cookie: cookie, 'Content-Type': 'application/json' };
    const switched = await fetch('/api/v1/auth/track', { method: 'PATCH', headers, body: JSON.stringify({ track: 'topik-ko' }) });
    expect(switched.status).toBe(200);

    const listed = await fetch('/api/v1/tracks/topik-ko/curriculum?target_grade=1', { headers });
    expect(listed.status).toBe(200);
    const listBody = await listed.json<{ data: { units: Array<{ id: string; items: Array<{ id: string; audio: { kind: string; text_ko?: string } }> }> } }>();
    expect(listBody.data.units).toHaveLength(1);
    expect(listBody.data.units[0]).toMatchObject({ id: unitId });
    expect(listBody.data.units[0]?.items).toHaveLength(2);
    const items = new Map(listBody.data.units[0]?.items.map((item) => [item.id, item]));
    expect(items.get(vocabId)?.audio).toMatchObject({ kind: 'google', text_ko: '안녕하세요.' });
    expect(items.get(listeningId)?.audio).toMatchObject({ kind: 'google', text_ko: '안녕하세요. 저는 유나예요. 처음 뵙겠습니다.' });
    expect(JSON.stringify(listBody)).not.toContain('answer_index');
    expect(JSON.stringify(listBody)).not.toContain('해설');

    const solution = await fetch(`/api/v1/tracks/topik-ko/curriculum/items/${vocabId}/solution`, { headers });
    expect(solution.status).toBe(200);
    const solutionBody = await solution.json<{ data: { item_id: string; answer_payload: { answer_index: number }; explanation_ko: string } }>();
    expect(solutionBody.data).toMatchObject({ item_id: vocabId, answer_payload: { answer_index: 0 }, explanation_ko: '인사입니다.' });

    const completed = await fetch(`/api/v1/tracks/topik-ko/curriculum/items/${vocabId}/complete`, { method: 'POST', headers });
    expect(completed.status).toBe(200);
    const completionBody = await completed.json<{ data: { card_id: number; status: string } }>();
    expect(completionBody.data).toMatchObject({ status: 'completed' });
    expect(completionBody.data.card_id).toBeTypeOf('number');

    const progress = await fetch('/api/v1/tracks/topik-ko/curriculum/progress', { headers });
    expect(progress.status).toBe(200);
    const progressBody = await progress.json<{ data: { grades: Array<{ target_grade: number; completed_items: number; total_items: number; due_cards: number }>; completed_item_ids: string[] } }>();
    expect(progressBody.data.grades.find((grade) => grade.target_grade === 1)).toMatchObject({ total_items: 2, completed_items: 1, due_cards: 1 });
    expect(progressBody.data.completed_item_ids).toContain(vocabId);

    const due = await fetch('/api/v1/tracks/topik-ko/curriculum/review/due?limit=5', { headers });
    expect(due.status).toBe(200);
    const dueBody = await due.json<{ data: { cards: Array<{ card_id: number; item: { id: string } }> } }>();
    expect(dueBody.data.cards).toHaveLength(1);
    expect(dueBody.data.cards[0]).toMatchObject({ card_id: completionBody.data.card_id, item: { id: vocabId } });
    expect(JSON.stringify(dueBody)).not.toContain('answer_index');
    expect(JSON.stringify(dueBody)).not.toContain('해설');

    const reviewed = await fetch('/api/v1/tracks/topik-ko/curriculum/review', {
      method: 'POST',
      headers,
      body: JSON.stringify({ card_id: completionBody.data.card_id, rating: 'good', response_ms: 800 }),
    });
    expect(reviewed.status).toBe(200);
    const reviewedBody = await reviewed.json<{ data: { state: string; due_at: number } }>();
    expect(reviewedBody.data.state).toBeTruthy();
    expect(reviewedBody.data.due_at).toBeGreaterThan(0);
    const reviewLog = await db.prepare('SELECT rating, response_ms FROM topik_owner_review_logs WHERE card_id = ?').bind(completionBody.data.card_id).first<{ rating: string; response_ms: number }>();
    expect(reviewLog).toEqual({ rating: 'good', response_ms: 800 });

    const reviewBank = await db.prepare(`SELECT count(*) AS count FROM topik_practice_questions WHERE id IN (?, ?)`).bind(vocabId, listeningId).first<{ count: number }>();
    const publicRelease = await db.prepare(`SELECT count(*) AS count FROM content_releases WHERE content_version = 'api-test-topik-owner-curriculum-source'`).first<{ count: number }>();
    expect(reviewBank?.count).toBe(0);
    expect(publicRelease?.count).toBe(0);
  });

  it('hides a quality-gated owner item until its linked release is published', async () => {
    const db = (env as typeof env & { DB: D1Database }).DB;
    const assetId = 'api-test-topik-owner-draft-asset';
    const unitId = 'api-test-topik-owner-draft-unit';
    const itemId = 'api-test-topik-owner-draft-item';
    await db.batch([
      db.prepare(`INSERT INTO content_source_assets (id, asset_kind, source_url, license_id, license_url, attribution_text, allowed_use, source_sha256, generated_at, selection_reason) VALUES (?, 'self-authored-fixture', 'https://example.invalid/topik-owner-draft', 'LicenseRef-api-test', 'https://example.invalid/license', 'API draft fixture', 'local test only', ?, 1785283200, 'API publication gate test')`).bind(assetId, 'd'.repeat(64)),
      db.prepare(`INSERT INTO topik_owner_authored_curriculum_units (id, target_grade, stable_ref, section, title_ko, title_ja, title_en, source_asset_id) VALUES (?, 2, 'topik.api.grade2.draft.unit', 'reading', '미공개 단위', '未公開単位', 'Unpublished unit', ?)`).bind(unitId, assetId),
      db.prepare(`INSERT INTO topik_owner_authored_curriculum_items (id, unit_id, target_grade, stable_ref, item_type, prompt_ko, prompt_ja, prompt_en, answer_json, explanation_ko, explanation_ja, explanation_en, audio_required, audio_text_ko, source_asset_id) VALUES (?, ?, 2, 'topik.api.grade2.draft.item', 'reading', '미공개 질문', '未公開の質問', 'Unpublished question', '{"choices":["하나","둘","셋","넷"],"answer_index":0}', '미공개 해설', '未公開の解説', 'Unpublished explanation', 0, NULL, ?)`).bind(itemId, unitId, assetId),
      db.prepare(`INSERT INTO content_quality_audits (id, learning_track, content_type, content_id, content_version, evidence_sha256, validator_version, automated_status, author_review_status, adversarial_review_status, author_reviewer, adversarial_reviewer, release_state, checked_at) VALUES ('api-owner-draft-audit', 'topik-ko', 'topik-owner', ?, 'api-owner-draft-v1', ?, 'api-validator-v1', 'passed', 'signed', 'signed', 'api-reviewer-one', 'api-reviewer-two', 'draft', '2026-08-19')`).bind(itemId, 'f'.repeat(64)),
    ]);
    const cookie = await registerTestSession();
    const headers = { Cookie: cookie, 'Content-Type': 'application/json' };
    await fetch('/api/v1/auth/track', { method: 'PATCH', headers, body: JSON.stringify({ track: 'topik-ko' }) });

    const listed = await fetch('/api/v1/tracks/topik-ko/curriculum?target_grade=2', { headers });
    expect(listed.status).toBe(200);
    expect(JSON.stringify(await listed.json())).not.toContain(itemId);
    expect((await fetch(`/api/v1/tracks/topik-ko/curriculum/items/${itemId}/solution`, { headers })).status).toBe(404);
    expect((await fetch(`/api/v1/tracks/topik-ko/curriculum/items/${itemId}/complete`, { method: 'POST', headers })).status).toBe(404);
  });
});

describe('TOPIK release-controlled curriculum contract', () => {
  it('returns published items only and never serializes answers or explanations', async () => {
    const db = (env as typeof env & { DB: D1Database }).DB;
    const releaseId = 'topik-release-contract-api-test';
    const checksum = 'a'.repeat(64);
    await db.batch([
      db.prepare(`INSERT INTO content_releases (id, learning_track, content_version, release_state, manifest_sha256, parser_version) VALUES (?, 'topik-ko', 'api-contract-v1', 'draft', ?, 'test-parser')`).bind(releaseId, checksum),
      db.prepare(`INSERT INTO content_release_sources (release_id, source_code, source_type, source_url, retrieved_at, source_sha256, license_id, license_url, allowed_use, attribution_text, author, first_reviewer, second_reviewer, reviewed_at, first_review_status, first_reviewed_at, second_review_status, second_reviewed_at) VALUES (?, 'API-CONTRACT-TEST', 'fixture', 'https://example.invalid/api-contract', '2026-07-27', ?, 'LicenseRef-local-test-fixture', 'https://example.invalid/license', 'test-fixture-only', 'API contract fixture', 'author', 'reviewer-a', 'reviewer-b', '2026-07-27', 'signed', '2026-07-27', 'signed', '2026-07-27')`).bind(releaseId, checksum),
      db.prepare(`INSERT INTO topik_curriculum_units (id, release_id, learning_track, stable_ref, exam_level, exam_band, section, title_ko, title_ja, title_en, instruction_languages_json) VALUES ('topik-release-contract-unit', ?, 'topik-ko', 'topik.unit.api.contract', 'TOPIK-I', 'beginner', 'reading', '검증', '検証', 'Verification', '["ko","ja","en"]')`).bind(releaseId),
      db.prepare(`INSERT INTO topik_content_items (id, release_id, unit_id, learning_track, stable_ref, exam_level, exam_band, section, item_kind, skill, difficulty, prompt_ko, prompt_ja, prompt_en, answer_payload_json, explanation_ko, explanation_ja, explanation_en, source_code) VALUES ('topik-release-contract-item', ?, 'topik-release-contract-unit', 'topik-ko', 'topik.item.api.contract', 'TOPIK-I', 'beginner', 'reading', 'practice', 'contract', 1, '한국어 공개 질문', '日本語の公開質問', 'English public prompt', '{"answer":"private"}', '비공개 해설', '非公開解説', 'Private explanation', 'API-CONTRACT-TEST')`).bind(releaseId),
    ]);

    const cookie = await registerTestSession();
    const headers = { Cookie: cookie };
    const switched = await fetch('/api/v1/auth/track', { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ track: 'topik-ko' }) });
    expect(switched.status).toBe(200);

    const draft = await fetch('/api/v1/tracks/topik-ko/content?exam_level=TOPIK-I&section=reading', { headers });
    expect(draft.status).toBe(503);

    for (const state of ['automated_checked', 'human_reviewed', 'preview', 'approved']) {
      await db.prepare(`UPDATE content_releases SET release_state = ?, published_at = CASE WHEN ? = 'published' THEN unixepoch() ELSE published_at END WHERE id = ?`).bind(state, state, releaseId).run();
    }
    await db.batch(['G0', 'G1', 'G2', 'G3', 'G4'].map((gate) =>
      db.prepare(`INSERT INTO content_release_gate_evidence (release_id, gate, gate_state, artifact_key, artifact_sha256, recorded_by) VALUES (?, ?, 'passed', ?, ?, 'system')`)
        .bind(releaseId, gate, `evidence/report/v1/${releaseId}/${checksum}/artifact.json`, checksum),
    ));
    await db.prepare(`UPDATE content_releases SET release_state = 'published', published_at = unixepoch() WHERE id = ?`).bind(releaseId).run();
    const published = await fetch('/api/v1/tracks/topik-ko/content?exam_level=TOPIK-I&section=reading', { headers });
    expect(published.status).toBe(200);
    const body = await published.json<{ data: { content_release: string; items: Array<{ id: string; prompt_ja: string }> } }>();
    expect(body.data).toMatchObject({ content_release: 'api-contract-v1' });
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]?.prompt_ja).toBe('日本語の公開質問');
    expect(JSON.stringify(body)).not.toContain('private');
    expect(JSON.stringify(body)).not.toContain('해설');

    await db.prepare(`UPDATE content_releases SET release_state = 'withdrawn', withdrawn_at = unixepoch() WHERE id = ?`).bind(releaseId).run();
    const withdrawn = await fetch('/api/v1/tracks/topik-ko/content?exam_level=TOPIK-I&section=reading', { headers });
    expect(withdrawn.status).toBe(503);
  });
});

describe('TOPIK owner-private publication', () => {
  it('binds a draft v2 release only to the current admin session and never exposes it publicly or through cacheable responses', async () => {
    const db = (env as typeof env & { DB: D1Database }).DB;
    const releaseId = 'topik-owner-private-api-v2';
    const manifestSha256 = 'b'.repeat(64);
    const sourceSha256 = 'c'.repeat(64);
    await db.batch([
      db.prepare(`INSERT INTO content_releases (id, learning_track, content_version, release_state, manifest_sha256, parser_version) VALUES (?, 'topik-ko', 'topik-owner-private-api-v2', 'draft', ?, 'test-owner-private-parser')`).bind(releaseId, manifestSha256),
      db.prepare(`INSERT INTO content_release_sources (release_id, source_code, source_type, source_url, retrieved_at, source_sha256, license_id, license_url, allowed_use, attribution_text, author, first_reviewer, second_reviewer, reviewed_at, first_review_status, second_review_status) VALUES (?, 'TOPIK-OWNER-PRIVATE-API', 'self-authored', 'https://example.invalid/owner-private', '2026-07-29', ?, 'LicenseRef-owner-private', 'https://example.invalid/license', 'owner-private-only', 'Owner-private API fixture', 'author-ksh', 'owner-private-no-human-review-a', 'owner-private-no-human-review-b', '2026-07-29', 'pending', 'pending')`).bind(releaseId, sourceSha256),
      db.prepare(`INSERT INTO topik_curriculum_units (id, release_id, learning_track, stable_ref, exam_level, exam_band, section, title_ko, title_ja, title_en, instruction_languages_json) VALUES ('topik-owner-private-api-unit', ?, 'topik-ko', 'topik.owner-private.api.unit', 'TOPIK-I', 'beginner', 'reading', '비공개 검증', '非公開検証', 'Private verification', '["ko","ja","en"]')`).bind(releaseId),
      db.prepare(`INSERT INTO topik_content_items (id, release_id, unit_id, learning_track, stable_ref, exam_level, exam_band, section, item_kind, skill, difficulty, prompt_ko, prompt_ja, prompt_en, answer_payload_json, explanation_ko, explanation_ja, explanation_en, source_code) VALUES ('topik-owner-private-api-item-1', ?, 'topik-owner-private-api-unit', 'topik-ko', 'topik.owner-private.api.item.1', 'TOPIK-I', 'beginner', 'reading', 'practice', 'owner-private', 1, '비공개 한국어 질문', '非公開日本語質問', 'Private English prompt', '{"answer":"private"}', '비공개 한국어 해설', '非公開日本語解説', 'Private English explanation', 'TOPIK-OWNER-PRIVATE-API')`).bind(releaseId),
      db.prepare(`INSERT INTO content_release_private_policies (release_id, manifest_sha256, owner_ref, owner_attested_at, attestation_sha256, claim_method, public_publish_prohibited) VALUES (?, ?, 'author-ksh', '2026-07-29', ?, 'authenticated_admin_session', 1)`).bind(releaseId, manifestSha256, 'd'.repeat(64)),
    ]);
    const ownerCookie = await registerTestSession('admin');
    const otherCookie = await registerTestSession('user');
    const topikHeaders = (cookie: string) => ({ Cookie: cookie, 'Content-Type': 'application/json' });
    for (const cookie of [ownerCookie, otherCookie]) {
      const switched = await fetch('/api/v1/auth/track', {
        method: 'PATCH',
        headers: topikHeaders(cookie),
        body: JSON.stringify({ track: 'topik-ko' }),
      });
      expect(switched.status).toBe(200);
    }

    const unauthenticated = await fetch('/api/v1/admin/topik-owner-private/claims', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ release_id: releaseId, manifest_sha256: manifestSha256 }),
    });
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.headers.get('cache-control')).toContain('no-store');
    expect(unauthenticated.headers.get('vary')).toContain('Cookie');

    const nonAdminClaim = await fetch('/api/v1/admin/topik-owner-private/claims', {
      method: 'POST', headers: topikHeaders(otherCookie),
      body: JSON.stringify({ release_id: releaseId, manifest_sha256: manifestSha256 }),
    });
    expect(nonAdminClaim.status).toBe(403);
    expect(nonAdminClaim.headers.get('cache-control')).toContain('no-store');

    const injectedUserId = await fetch('/api/v1/admin/topik-owner-private/claims', {
      method: 'POST', headers: topikHeaders(ownerCookie),
      body: JSON.stringify({ release_id: releaseId, manifest_sha256: manifestSha256, owner_user_id: 'other-user' }),
    });
    expect(injectedUserId.status).toBe(400);

    const changedManifest = await fetch('/api/v1/admin/topik-owner-private/claims', {
      method: 'POST', headers: topikHeaders(ownerCookie),
      body: JSON.stringify({ release_id: releaseId, manifest_sha256: '0'.repeat(64) }),
    });
    expect(changedManifest.status).toBe(409);

    const claimed = await fetch('/api/v1/admin/topik-owner-private/claims', {
      method: 'POST', headers: topikHeaders(ownerCookie),
      body: JSON.stringify({ release_id: releaseId, manifest_sha256: manifestSha256 }),
    });
    expect(claimed.status).toBe(201);
    expect(claimed.headers.get('cache-control')).toContain('no-store');
    expect(JSON.stringify(await claimed.json())).not.toContain('owner_user_id');

    const duplicateClaim = await fetch('/api/v1/admin/topik-owner-private/claims', {
      method: 'POST', headers: topikHeaders(ownerCookie),
      body: JSON.stringify({ release_id: releaseId, manifest_sha256: manifestSha256 }),
    });
    expect(duplicateClaim.status).toBe(409);

    const ownerContent = await fetch('/api/v1/tracks/topik-ko/owner-private/content?exam_level=TOPIK-I&section=reading', {
      headers: { Cookie: ownerCookie },
    });
    expect(ownerContent.status).toBe(200);
    expect(ownerContent.headers.get('cache-control')).toContain('no-store');
    expect(ownerContent.headers.get('vary')).toContain('Cookie');
    const ownerBody = await ownerContent.json<{ data: { items: Array<{ id: string; prompt_ja: string }> } }>();
    expect(ownerBody.data.items).toHaveLength(1);
    expect(JSON.stringify(ownerBody)).not.toContain('answer_payload');
    expect(JSON.stringify(ownerBody)).not.toContain('explanation_ja');

    const ownerSolution = await fetch(`/api/v1/tracks/topik-ko/owner-private/content/${ownerBody.data.items[0]!.id}/solution`, { headers: { Cookie: ownerCookie } });
    expect(ownerSolution.status).toBe(200);
    expect(JSON.stringify(await ownerSolution.json())).toContain('answer_payload');

    const otherContent = await fetch('/api/v1/tracks/topik-ko/owner-private/content?exam_level=TOPIK-I&section=reading', {
      headers: { Cookie: otherCookie },
    });
    expect(otherContent.status).toBe(404);
    expect(otherContent.headers.get('cache-control')).toContain('no-store');
    expect(JSON.stringify(await otherContent.json())).not.toContain(releaseId);
    const otherSolution = await fetch(`/api/v1/tracks/topik-ko/owner-private/content/${ownerBody.data.items[0]!.id}/solution`, { headers: { Cookie: otherCookie } });
    expect(otherSolution.status).toBe(404);
    expect(JSON.stringify(await otherSolution.json())).not.toContain('answer_payload');

    const publicContent = await fetch('/api/v1/tracks/topik-ko/content?exam_level=TOPIK-I&section=reading', { headers: { Cookie: ownerCookie } });
    expect(JSON.stringify(await publicContent.json())).not.toContain(releaseId);
    await expect(db.prepare(`UPDATE topik_content_items SET prompt_ko = 'mutated' WHERE release_id = ?`).bind(releaseId).run()).rejects.toThrow();

    const withdrawn = await fetch(`/api/v1/admin/topik-owner-private/releases/${releaseId}/withdraw`, {
      method: 'POST', headers: topikHeaders(ownerCookie), body: JSON.stringify({ manifest_sha256: manifestSha256 }),
    });
    expect(withdrawn.status).toBe(200);
    const afterWithdrawal = await fetch('/api/v1/tracks/topik-ko/owner-private/content?exam_level=TOPIK-I&section=reading', { headers: { Cookie: ownerCookie } });
    expect(afterWithdrawal.status).toBe(404);
  });
});

describe('TOPIK official reference', () => {
  it('returns the public format and aggregate statistics without official item content', async () => {
    const db = (env as typeof env & { DB: D1Database }).DB;
    const sourceCode = 'TOPIK-NIIED-APPLICANTS-2023';
    await db.prepare(
      `INSERT INTO track_content_sources (learning_track, source_code, title, file_path, source_version, provenance_json)
       VALUES ('topik-ko', ?, 'NIIED TOPIK public statistics', 'docs/test.csv', '2023-12-31', '{}')
       ON CONFLICT(learning_track, source_code) DO UPDATE SET source_version = excluded.source_version`,
    ).bind(sourceCode).run();

    const blueprints = [
      ['topik-i-pbt-listening', 'TOPIK-I', 'listening', 30, 100, 200, 1, 2],
      ['topik-i-pbt-reading', 'TOPIK-I', 'reading', 40, 100, 200, 1, 2],
      ['topik-ii-pbt-listening', 'TOPIK-II', 'listening', 50, 100, 300, 3, 6],
      ['topik-ii-pbt-writing', 'TOPIK-II', 'writing', 4, 100, 300, 3, 6],
      ['topik-ii-pbt-reading', 'TOPIK-II', 'reading', 50, 100, 300, 3, 6],
    ] as const;
    await db.batch(blueprints.map(([id, examLevel, section, questionCount, sectionScore, totalScore, gradeMin, gradeMax]) => db.prepare(
      `INSERT INTO topik_exam_blueprints
        (id, learning_track, exam_level, delivery_mode, section, question_count, section_score, total_score,
         grade_min, grade_max, source_code, source_url, source_version)
       VALUES (?, 'topik-ko', ?, 'PBT', ?, ?, ?, ?, ?, ?, ?, 'https://www.data.go.kr/data/15067926/fileData.do', '2023-12-31')
       ON CONFLICT(id) DO UPDATE SET question_count = excluded.question_count`,
    ).bind(id, examLevel, section, questionCount, sectionScore, totalScore, gradeMin, gradeMax, sourceCode)));
    await db.batch([
      db.prepare(
        `INSERT INTO topik_official_statistics
          (learning_track, source_code, country_name_ko, exam_level, age_band, applicant_count, source_row)
         VALUES ('topik-ko', ?, '테스트', 'TOPIK-I', '20s', 70, 2)
         ON CONFLICT(learning_track, source_code, country_name_ko, exam_level, age_band) DO UPDATE SET applicant_count = excluded.applicant_count`,
      ).bind(sourceCode),
      db.prepare(
        `INSERT INTO topik_official_statistics
          (learning_track, source_code, country_name_ko, exam_level, age_band, applicant_count, source_row)
         VALUES ('topik-ko', ?, '테스트', 'TOPIK-II', '20s', 100, 2)
         ON CONFLICT(learning_track, source_code, country_name_ko, exam_level, age_band) DO UPDATE SET applicant_count = excluded.applicant_count`,
      ).bind(sourceCode),
    ]);

    const response = await fetch('/api/v1/tracks/topik-ko/official-reference');
    expect(response.status).toBe(200);
    const body = await response.json<{
      data: {
        source: { code: string; statistics_rows: number };
        blueprints: Array<{ section: string; question_count: number }>;
        applicant_totals: Array<{ exam_level: string; applicants: number }>;
      };
    }>();
    expect(body.data.source).toMatchObject({ code: sourceCode, statistics_rows: 2 });
    expect(body.data.blueprints).toHaveLength(5);
    expect(body.data.blueprints.map((item) => item.question_count)).toEqual([30, 40, 50, 4, 50]);
    expect(body.data.applicant_totals).toEqual([
      { exam_level: 'TOPIK-I', applicants: 70 },
      { exam_level: 'TOPIK-II', applicants: 100 },
    ]);
    expect(JSON.stringify(body)).not.toMatch(/answer|question_id|audio/i);
  });
});

describe('Google-only pronunciation audio policy', () => {
  it('returns 410 for every legacy R2 audio path', async () => {
    const res = await fetch('/api/v1/audio/audio/vocab/n3/not-generated.mp3');
    expect(res.status).toBe(410);
    expect(await res.json()).toMatchObject({ title: 'Gone', status: 410 });
  });

  it('blocks legacy R2 batch generation even for an admin', async () => {
    const unauthenticated = await fetch('/admin/audio/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'google' }),
    });
    expect(unauthenticated.status).toBe(401);

    const userCookie = await registerTestSession('user');
    const forbidden = await fetch('/admin/audio/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userCookie },
      body: JSON.stringify({ provider: 'google' }),
    });
    expect(forbidden.status).toBe(403);

    const adminCookie = await registerTestSession('admin');
    for (const path of ['/admin/audio/queue', '/admin/audio/curriculum-queue', '/admin/audio/qa/warmup']) {
      const blocked = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ provider: 'google' }),
      });
      expect(blocked.status).toBe(410);
      expect(await blocked.json()).toMatchObject({ title: 'Gone', status: 410 });
    }
  });

  it('blocks legacy R2 QA routes regardless of HTTP method', async () => {
    const response = await fetch('/api/v1/audio/audio/qa/google/1.wav', { method: 'HEAD' });
    expect(response.status).toBe(410);
    const korean = await fetch('/api/v1/audio/audio/qa/ko/google/1.wav', { method: 'HEAD' });
    expect(korean.status).toBe(410);
  });
});

// ─────────────────────────────────────────────
// /api/v1/sources
// ─────────────────────────────────────────────
describe('GET /api/v1/sources', () => {
  it('200 + data는 배열', async () => {
    const res = await fetch('/api/v1/sources');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: unknown[] }>();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('콘텐츠 버전 endpoint가 count/max timestamp 기반 버전을 반환한다', async () => {
    const res = await fetch('/api/v1/content/version');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { version: string; tables: Record<string, { count: number; updatedAt: number | null }> } }>();
    expect(body.data.version).toContain('vocab:');
    expect(body.data.tables.vocab?.count).toBeTypeOf('number');
    expect(body.data.tables.kanji?.count).toBeTypeOf('number');
  });
});

// ─────────────────────────────────────────────
// /api/v1/vocab
// ─────────────────────────────────────────────
describe('GET /api/v1/vocab', () => {
  it('200 + cursor 메타 포함', async () => {
    const res = await fetch('/api/v1/vocab?limit=10');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: unknown[]; meta?: { limit: number } }>();
    expect(Array.isArray(body.data)).toBe(true);
    if (body.meta) {
      expect(body.meta.limit).toBe(10);
    }
  });

  it('level 필터링 — N5', async () => {
    const res = await fetch('/api/v1/vocab?level=N5&limit=5');
    expect(res.status).toBe(200);
  });

  it('limit=0 → 400 Bad Request', async () => {
    const res = await fetch('/api/v1/vocab?limit=0');
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// /api/v1/vocab/search
// ─────────────────────────────────────────────
describe('GET /api/v1/vocab/search', () => {
  it('q 필수 — 없으면 400', async () => {
    const res = await fetch('/api/v1/vocab/search');
    expect(res.status).toBe(400);
  });

  it('정상 검색 → 200', async () => {
    const res = await fetch('/api/v1/vocab/search?q=test');
    expect(res.status).toBe(200);
  });

  it('FTS 연산 문자가 포함된 입력을 literal로 처리한다', async () => {
    const res = await fetch(`/api/v1/vocab/search?q=${encodeURIComponent('A: "test"')}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/v1/sentences/search', () => {
  it('문장 부호가 포함된 입력을 FTS literal로 처리한다', async () => {
    const res = await fetch(`/api/v1/sentences/search?q=${encodeURIComponent('A: 予約した時間を変更したいんですが、今日の午後は空いていますか。')}`);
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────
// /api/v1/vocab/:id
// ─────────────────────────────────────────────
describe('GET /api/v1/vocab/:id', () => {
  it('존재하지 않는 ID → 404', async () => {
    const res = await fetch('/api/v1/vocab/999999');
    expect(res.status).toBe(404);
  });

  it('유효하지 않은 ID → 400', async () => {
    const res = await fetch('/api/v1/vocab/abc');
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// /api/v1/ai/translate
// ─────────────────────────────────────────────
describe('POST /api/v1/ai/translate', () => {
  it('한국어 입력을 자연 일본어 응답 형태로 반환한다', async () => {
    const res = await fetch('/api/v1/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '오늘은 조금 피곤해요', target: 'ja', tone: 'polite' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { translatedText: string; model: string } }>();
    expect(body.data.translatedText).toContain('疲');
    expect(body.data.model).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  });

  it('운영 app-session 모드에서는 세션 없는 요청을 거부한다', async () => {
    const productionEnv = { ...env, ENVIRONMENT: 'production', AUTH_MODE: 'app-session' };
    const res = await fetchWithEnv('/api/v1/ai/translate', productionEnv, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://nihongo-n3.pages.dev' },
      body: JSON.stringify({ text: '오늘은 조금 피곤해요', target: 'ja', tone: 'polite' }),
    });
    expect(res.status).toBe(401);
    const body = await res.json<{ detail: string }>();
    expect(body.detail).toContain('로그인');
  });

  it('빈 입력은 400', async () => {
    const res = await fetch('/api/v1/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '', target: 'ja' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('AI learning-assistance routes', () => {
  it('keeps admin lint deterministic and blocks unlicensed official-reference drafts', async () => {
    const cookie = await registerTestSession('admin');
    const res = await fetch('/admin/ai/content-lint', {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learning_track: 'topik-ko',
        release_id: 'topik-ai-admin-lint',
        source: { source_type: 'official-reference', source_url: 'https://example.invalid/reference', license_id: '', allowed_use: '' },
        items: [{
          stable_ref: 'topik.ai.lint.001', prompt_ko: '한국어 문항', prompt_ja: '', prompt_en: 'English prompt',
          explanation_ko: '짧음', explanation_ja: '日本語の説明', explanation_en: 'English explanation', distractors: ['가', '가'],
        }],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { blocking: boolean; provider: string; issues: Array<{ code: string }> } }>();
    expect(body.data.blocking).toBe(true);
    expect(body.data.provider).toBe('deterministic-policy');
    expect(body.data.issues.map((entry) => entry.code)).toContain('prohibited_source');
  });

  it('returns only an approved fallback for a published TOPIK item while the AI feature flag is off', async () => {
    const db = (env as typeof env & { DB: D1Database }).DB;
    const releaseId = 'topik-ai-helper-release';
    const checksum = 'b'.repeat(64);
    await db.batch([
      db.prepare(`INSERT INTO content_releases (id, learning_track, content_version, release_state, manifest_sha256, parser_version) VALUES (?, 'topik-ko', 'ai-helper-v1', 'draft', ?, 'test-parser')`).bind(releaseId, checksum),
      db.prepare(`INSERT INTO content_release_sources (release_id, source_code, source_type, source_url, retrieved_at, source_sha256, license_id, license_url, allowed_use, attribution_text, author, first_reviewer, second_reviewer, reviewed_at, first_review_status, first_reviewed_at, second_review_status, second_reviewed_at) VALUES (?, 'AI-HELPER-TEST', 'fixture', 'https://example.invalid/ai-helper', '2026-07-28', ?, 'LicenseRef-local-test-fixture', 'https://example.invalid/license', 'test-fixture-only', 'AI helper fixture', 'author', 'reviewer-a', 'reviewer-b', '2026-07-28', 'signed', '2026-07-28', 'signed', '2026-07-28')`).bind(releaseId, checksum),
      db.prepare(`INSERT INTO topik_curriculum_units (id, release_id, learning_track, stable_ref, exam_level, exam_band, section, title_ko, title_ja, title_en, instruction_languages_json) VALUES ('topik-ai-helper-unit', ?, 'topik-ko', 'topik.unit.ai.helper', 'TOPIK-II', 'intermediate', 'writing', '쓰기', '作文', 'Writing', '["ko","ja","en"]')`).bind(releaseId),
      db.prepare(`INSERT INTO topik_content_items (id, release_id, unit_id, learning_track, stable_ref, exam_level, exam_band, section, item_kind, skill, difficulty, prompt_ko, prompt_ja, prompt_en, answer_payload_json, explanation_ko, explanation_ja, explanation_en, source_code) VALUES ('topik-ai-helper-item', ?, 'topik-ai-helper-unit', 'topik-ko', 'topik.item.ai.helper', 'TOPIK-II', 'intermediate', 'writing', 'writing', 'writing', 2, '승인된 질문', '承認済みの質問', 'Approved prompt', '{"answer":"private"}', '승인된 해설', '承認済みの解説', 'Approved explanation', 'AI-HELPER-TEST')`).bind(releaseId),
    ]);
    for (const state of ['automated_checked', 'human_reviewed', 'preview', 'approved']) {
      await db.prepare(`UPDATE content_releases SET release_state = ? WHERE id = ?`).bind(state, releaseId).run();
    }
    await db.batch(['G0', 'G1', 'G2', 'G3', 'G4'].map((gate) =>
      db.prepare(`INSERT INTO content_release_gate_evidence (release_id, gate, gate_state, artifact_key, artifact_sha256, recorded_by) VALUES (?, ?, 'passed', ?, ?, 'system')`)
        .bind(releaseId, gate, `evidence/report/v1/${releaseId}/${checksum}/artifact.json`, checksum),
    ));
    await db.prepare(`UPDATE content_releases SET release_state = 'published', published_at = unixepoch() WHERE id = ?`).bind(releaseId).run();

    const cookie = await registerTestSession();
    const headers = { Cookie: cookie, 'Content-Type': 'application/json' };
    await fetch('/api/v1/auth/track', { method: 'PATCH', headers, body: JSON.stringify({ track: 'topik-ko' }) });
    const explanation = await fetch('/api/v1/tracks/topik-ko/ai/explanation', {
      method: 'POST', headers, body: JSON.stringify({ item_id: 'topik-ai-helper-item', instruction_language: 'ja' }),
    });
    expect(explanation.status).toBe(200);
    const body = await explanation.json<{ data: { mode: string; summary: string } }>();
    expect(body.data.mode).toBe('approved_fallback');
    expect(body.data.summary).toContain('承認済み');
    expect(JSON.stringify(body)).not.toContain('private');

    const writing = await fetch('/api/v1/tracks/topik-ko/ai/writing-feedback', {
      method: 'POST', headers, body: JSON.stringify({ item_id: 'topik-ai-helper-item', response_text: '저는 오늘 한국어를 공부하고 내일도 연습하겠습니다.', instruction_language: 'ja' }),
    });
    expect(writing.status).toBe(503);
  });

  it('blocks writing input with PII before it can reach a provider', async () => {
    const cookie = await registerTestSession();
    const headers = { Cookie: cookie, 'Content-Type': 'application/json' };
    await fetch('/api/v1/auth/track', { method: 'PATCH', headers, body: JSON.stringify({ track: 'topik-ko' }) });
    const res = await fetch('/api/v1/tracks/topik-ko/ai/writing-feedback', {
      method: 'POST', headers,
      body: JSON.stringify({ item_id: 'unknown', response_text: '연락처는 learner@example.com 입니다. 한국어를 공부합니다.', instruction_language: 'ja' }),
    });
    expect(res.status).toBe(422);
  });
});

describe('Auth mode guardrails', () => {
  it('cf-access 모드에서는 Cloudflare Access JWT 없는 보호 라우트를 거부한다', async () => {
    const cfAccessEnv = {
      ...env,
      ENVIRONMENT: 'production',
      AUTH_MODE: 'cf-access',
      CF_ACCESS_AUD: 'test-aud',
      CF_TEAM_DOMAIN: 'test.cloudflareaccess.com',
    };
    const res = await fetchWithEnv('/api/v1/srs/due', cfAccessEnv);
    expect(res.status).toBe(401);
    const body = await res.json<{ detail: string }>();
    expect(body.detail).toContain('Cf-Access-Jwt-Assertion');
  });
});

// ─────────────────────────────────────────────
// /api/v1/grammar
// ─────────────────────────────────────────────
describe('GET /api/v1/grammar', () => {
  it('200 + 배열 반환', async () => {
    const res = await fetch('/api/v1/grammar?limit=5');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: unknown[] }>();
    expect(Array.isArray(body.data)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// /api/v1/kanji
// ─────────────────────────────────────────────
describe('GET /api/v1/kanji', () => {
  it('200', async () => {
    const res = await fetch('/api/v1/kanji?limit=5');
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────
// /api/v1/curriculum
// ─────────────────────────────────────────────
describe('GET /api/v1/curriculum', () => {
  it('200 + 배열', async () => {
    const res = await fetch('/api/v1/curriculum');
    expect(res.status).toBe(200);
  });

  it('GET /curriculum/:week — 유효하지 않은 week → 404', async () => {
    const res = await fetch('/api/v1/curriculum/999');
    expect(res.status).toBe(404);
  });
});

describe('Supplemental JLPT practice content', () => {
  it('N3 독해 지문과 문제가 seed되어 조회된다', async () => {
    const listRes = await fetch('/api/v1/reading?level=N3');
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json<{ data: { items: Array<{ id: number; title_ja: string }> } }>();
    expect(listBody.data.items.length).toBeGreaterThan(0);

    const firstId = listBody.data.items[0]!.id;
    const detailRes = await fetch(`/api/v1/reading/${firstId}`);
    expect(detailRes.status).toBe(200);
    const detailBody = await detailRes.json<{ data: { questions: unknown[] } }>();
    expect(detailBody.data.questions.length).toBeGreaterThanOrEqual(2);
  });

  it('N3 실전 회화 예문이 sentences API에서 조회된다', async () => {
    const first = await fetch('/api/v1/sentences?level=N3&register=conversation&limit=200');
    expect(first.status).toBe(200);
    const firstBody = await first.json<{ data: Array<{ ja: string; ko: string }>; meta?: { nextCursor?: string } }>();

    const second = await fetch(`/api/v1/sentences?level=N3&register=conversation&limit=200&cursor=${encodeURIComponent(firstBody.meta?.nextCursor ?? '')}`);
    expect(second.status).toBe(200);
    const secondBody = await second.json<{ data: Array<{ ja: string; ko: string }> }>();
    const items = [...firstBody.data, ...secondBody.data];
    expect(items.some((item) => item.ja.includes('予約した時間を変更したい'))).toBe(true);
  });
});

// ─────────────────────────────────────────────
// SRS — 개발 환경 auth bypass (ENVIRONMENT=test)
// ─────────────────────────────────────────────
describe('POST /api/v1/srs/init (dev bypass)', () => {
  it('정상 요청 → 201', async () => {
    const res = await fetch('/api/v1/srs/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_type: 'vocab',
        item_ids: [1, 2, 3],
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json<{ data: { created: number } }>();
    expect(body.data.created).toBe(3);
  });

  it('잘못된 item_type → 400', async () => {
    const res = await fetch('/api/v1/srs/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: 'invalid', item_ids: [1] }),
    });
    expect(res.status).toBe(400);
  });

  it('빈 item_ids → 400', async () => {
    const res = await fetch('/api/v1/srs/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: 'vocab', item_ids: [] }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/srs/due (dev bypass)', () => {
  it('200 + 배열 반환', async () => {
    const res = await fetch('/api/v1/srs/due');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: unknown[] }>();
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/v1/srs/review (dev bypass)', () => {
  it('card_id 계약으로 리뷰를 처리한다', async () => {
    await fetch('/api/v1/srs/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: 'vocab', item_ids: [44444] }),
    });

    const dueRes = await fetch('/api/v1/srs/due?item_type=vocab&limit=100');
    const dueBody = await dueRes.json<{ data: Array<{ id: number; item_id: number }> }>();
    const card = dueBody.data.find((item) => item.item_id === 44444);
    expect(card?.id).toBeTypeOf('number');

    const res = await fetch('/api/v1/srs/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: card!.id, rating: 'good' }),
    });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/v1/sync (dev bypass)', () => {
  it('review operation을 card_id로 처리한다', async () => {
    await fetch('/api/v1/srs/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: 'vocab', item_ids: [55555] }),
    });

    const dueRes = await fetch('/api/v1/srs/due?item_type=vocab&limit=100');
    const dueBody = await dueRes.json<{ data: Array<{ id: number; item_id: number }> }>();
    const card = dueBody.data.find((item) => item.item_id === 55555);
    expect(card?.id).toBeTypeOf('number');

    const res = await fetch('/api/v1/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: 'test-client',
        last_synced_at: new Date(0).toISOString(),
        operations: [{
          op_id: '00000000-0000-4000-8000-000000000001',
          type: 'review',
          payload: { card_id: card!.id, rating: 'good' },
          occurred_at: new Date().toISOString(),
        }],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json<{ data: { processed_op_ids: string[] } }>();
    expect(body.data.processed_op_ids).toContain('00000000-0000-4000-8000-000000000001');
  });
});

describe('Self-check routes (dev bypass)', () => {
  it('한국어 N3 자기진단 템플릿을 반환한다', async () => {
    const res = await fetch('/api/v1/self-check/templates?level=N3');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { templates: Array<{ item_ko: string; recommendation_ko: string }> } }>();
    expect(body.data.templates.length).toBeGreaterThan(0);
    expect(body.data.templates[0]?.item_ko).toMatch(/[가-힣]/);
    expect(body.data.templates[0]?.recommendation_ko).toMatch(/[가-힣]/);
  });

  it('독해와 회화 점수를 포함해 자기진단을 저장한다', async () => {
    const save = await fetch('/api/v1/self-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week_no: 3,
        vocab_score: 70,
        grammar_score: 60,
        reading_score: 55,
        listening_score: 40,
        speaking_score: 30,
        writing_score: 65,
        domain_score: 50,
      }),
    });
    expect(save.status).toBe(201);

    const res = await fetch('/api/v1/self-check/3');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { reading_score: number; speaking_score: number } }>();
    expect(body.data.reading_score).toBe(55);
    expect(body.data.speaking_score).toBe(30);
  });
});

describe('GET /api/v1/srs/stats (dev bypass)', () => {
  it('200 + state별 count', async () => {
    const res = await fetch('/api/v1/srs/stats');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: Record<string, number> }>();
    expect(typeof body.data.new).toBe('number');
    expect(typeof body.data.review).toBe('number');
  });
});

// ─────────────────────────────────────────────
// Logs
// ─────────────────────────────────────────────
describe('POST /api/v1/logs/daily (dev bypass)', () => {
  it('201 성공', async () => {
    const res = await fetch('/api/v1/logs/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2025-01-01',
        items_new: 10,
        items_review: 20,
        time_min: 30,
        audio_min: 0,
      }),
    });
    expect(res.status).toBe(201);
  });

  it('날짜 형식 오류 → 400', async () => {
    const res = await fetch('/api/v1/logs/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '20250101', items_new: 0, items_review: 0, time_min: 0, audio_min: 0 }),
    });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// 404
// ─────────────────────────────────────────────
describe('존재하지 않는 경로', () => {
  it('404 + RFC 7807 형식', async () => {
    const res = await fetch('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    const body = await res.json<{ type: string; status: number }>();
    expect(body.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('루트 레벨 미등록 경로도 Access 미설정 오류가 아닌 404', async () => {
    const res = await fetch('/unknown');
    expect(res.status).toBe(404);
    const body = await res.json<{ type: string; status: number }>();
    expect(body.status).toBe(404);
    expect(body.type).toContain('not-found');
  });
});
