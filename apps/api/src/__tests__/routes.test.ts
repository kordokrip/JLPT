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

// ─────────────────────────────────────────────
// 테스트 전 D1 스키마 적용
// ─────────────────────────────────────────────
beforeAll(async () => {
  // miniflare D1 exec()는 \n 기준으로 한 줄씩 실행하므로 사용 불가.
  // 주석·PRAGMA 제거 후 BEGIN/END 기반 파서로 독립 문장을 분리해
  // 각각 prepare().run() 으로 실행한다.
  const filteredLines = (rawMigration as string)
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
