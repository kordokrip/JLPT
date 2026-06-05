/**
 * apps/api/src/__tests__/routes.test.ts
 *
 * Hono 앱 통합 테스트 — @cloudflare/vitest-pool-workers 환경
 *
 * 모든 요청은 실제 Workers 런타임에서 실행된다.
 * 인증이 필요한 라우트는 ENVIRONMENT=test 에서 dev bypass를 사용한다.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import app from '../index.js';

// Vite ?raw import 타입 선언 (env.d.ts에 전역 선언됨)
// @ts-ignore – wildcard module declaration only valid in .d.ts files
declare module '*.sql?raw' {
  const content: string;
  export default content;
}

// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawMigration from '../../../../packages/db/drizzle/0000_init.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawSelfCheckMigration from '../../../../packages/db/drizzle/0001_self_check_templates.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawPhase8Migration from '../../../../packages/db/src/migrate/phase8-audio-reading.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawPracticeContentMigration from '../../../../packages/db/drizzle/0002_jlpt_n3_practice_content.sql?raw';
// @ts-ignore – Vite raw import (번들 시점 처리됨)
import rawAuthMigration from '../../../../packages/db/drizzle/0003_app_auth.sql?raw';

// ─────────────────────────────────────────────
// 테스트 전 D1 스키마 적용
// ─────────────────────────────────────────────
beforeAll(async () => {
  // miniflare D1 exec()는 \n 기준으로 한 줄씩 실행하므로 사용 불가.
  // 주석·PRAGMA 제거 후 BEGIN/END 기반 파서로 독립 문장을 분리해
  // 각각 prepare().run() 으로 실행한다.
  const filteredLines = `${rawMigration}\n${rawSelfCheckMigration}\n${rawPhase8Migration}\n${rawPracticeContentMigration}\n${rawAuthMigration}`
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
    } catch (e) {
      // FTS5 등 miniflare 미지원 DDL 오류는 무시 (경고만 출력)
      console.warn('[setup] DDL skipped:', stmt.slice(0, 60).replace(/\n/g, ' '));
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

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  return res.json<T>();
}

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
    const meBody = await me.json<{ data: { authenticated: boolean; user: { email: string } } }>();
    expect(meBody.data.authenticated).toBe(true);
    expect(meBody.data.user.email).toBe(email);

    const logout = await fetch('/api/v1/auth/logout', { method: 'POST', headers: { Cookie: cookie } });
    expect(logout.status).toBe(200);
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

  it('starts Google OAuth with the configured Worker callback in production', async () => {
    const productionEnv = {
      ...env,
      ENVIRONMENT: 'production',
      AUTH_MODE: 'app-session',
      APP_ORIGIN: 'https://nihongo-n3.pages.dev',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      GOOGLE_REDIRECT_URI: 'https://nihongo-n3-api.kordokrip.workers.dev/api/v1/auth/google/callback',
    };
    const res = await app.fetch(
      new Request('https://nihongo-n3.pages.dev/api/v1/auth/google/start', {
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
    expect(decodeURIComponent(location)).toContain('redirect_uri=https://nihongo-n3-api.kordokrip.workers.dev/api/v1/auth/google/callback');
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

  it('빈 입력은 400', async () => {
    const res = await fetch('/api/v1/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '', target: 'ja' }),
    });
    expect(res.status).toBe(400);
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
