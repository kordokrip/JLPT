/**
 * apps/api/src/routes/sources.ts
 *
 * GET /sources      — 모든 학습 소스 목록
 * GET /curriculum   — 전체 주차 커리큘럼
 * GET /curriculum/:week — 특정 주차 커리큘럼
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { ok, notFound } from '../lib/response.js';
import { weekParamSchema } from '@nihongo-n3/shared';

const sources = new Hono<AppEnv>();

// ── GET /sources ──────────────────────────────
sources.get('/sources', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM sources ORDER BY code',
  ).all();
  return ok(c, rows.results ?? []);
});

// ── GET /curriculum ───────────────────────────
sources.get('/curriculum', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM curriculum_weeks ORDER BY week_no',
  ).all();
  return ok(c, rows.results ?? []);
});

// ── GET /curriculum/:week ─────────────────────
sources.get('/curriculum/:week', async (c) => {
  const parsed = weekParamSchema.safeParse({ week: c.req.param('week') });
  if (!parsed.success) {
    return notFound(c, '유효하지 않은 week 파라미터');
  }

  const row = await c.env.DB.prepare(
    'SELECT * FROM curriculum_weeks WHERE week_no = ?',
  )
    .bind(parsed.data.week)
    .first();

  if (!row) return notFound(c, `${parsed.data.week}주차 커리큘럼을 찾을 수 없습니다`);
  return ok(c, row);
});

export { sources };
