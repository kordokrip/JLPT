/**
 * apps/api/src/routes/kanji-oa.ts
 *
 * OpenAPI 마이그레이션 (Phase 6 — B-2)
 * GET /kanji        — cursor 페이지네이션 목록
 * GET /kanji/{id}   — 단일 항목
 */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { paginate, decodeCursor } from '../lib/cursor.js';
import { kanjiQuerySchema } from '@nihongo-n3/shared';

const cursorMetaSchema = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
});

const pagedResponse = z
  .object({ data: z.array(z.record(z.string(), z.unknown())), meta: cursorMetaSchema.optional() })
  .openapi('KanjiListResponse');

const singleResponse = z
  .object({ data: z.record(z.string(), z.unknown()) })
  .openapi('KanjiSingleResponse');

const problemSchema = z
  .object({ type: z.string(), title: z.string(), status: z.number().int(), detail: z.string() })
  .openapi('ProblemDetail');

const listRoute = createRoute({
  method: 'get',
  path: '/kanji',
  tags: ['Kanji'],
  summary: '한자 목록 (cursor 페이지네이션)',
  request: { query: kanjiQuerySchema },
  responses: {
    200: { content: { 'application/json': { schema: pagedResponse } }, description: '한자 목록' },
    400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
  },
});

const getByIdRoute = createRoute({
  method: 'get',
  path: '/kanji/{id}',
  tags: ['Kanji'],
  summary: '한자 단일 항목',
  request: {
    params: z.object({ id: z.string().regex(/^\d+$/, '정수 ID 필요').openapi({ example: '1' }) }),
  },
  responses: {
    200: { content: { 'application/json': { schema: singleResponse } }, description: '한자 항목' },
    400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 ID' },
    404: { content: { 'application/json': { schema: problemSchema } }, description: '항목 없음' },
  },
});

const BASE = 'https://nihongo-n3.example.com/errors/';

const kanjiOA = new OpenAPIHono<AppEnv>();

kanjiOA.openapi(listRoute, async (c) => {
  const { level, cursor, limit } = c.req.valid('query');
  const cursorId = decodeCursor(cursor);
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (cursorId !== null) { conditions.push('id > ?'); bindings.push(cursorId); }
  if (level) { conditions.push('jlpt_level = ?'); bindings.push(level); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  bindings.push(limit + 1);

  const rows = await c.env.DB.prepare(
    `SELECT * FROM kanji ${where} ORDER BY id LIMIT ?`,
  ).bind(...bindings).all<{ id: number }>();

  const { data, hasMore, nextCursor } = paginate(rows.results ?? [], limit);
  return c.json(
    { data: data as Record<string, unknown>[], meta: { limit, hasMore, nextCursor } },
    200,
  );
});

kanjiOA.openapi(getByIdRoute, async (c) => {
  const id = parseInt(c.req.valid('param').id, 10);
  if (!Number.isFinite(id)) {
    return c.json(
      { type: `${BASE}bad-request`, title: 'Bad Request', status: 400, detail: '유효하지 않은 ID' },
      400,
    );
  }

  const row = await c.env.DB.prepare('SELECT * FROM kanji WHERE id = ?').bind(id).first();
  if (!row) {
    return c.json(
      {
        type: `${BASE}not-found`,
        title: 'Not Found',
        status: 404,
        detail: `kanji id=${id}을 찾을 수 없습니다`,
      },
      404,
    );
  }
  return c.json({ data: row as Record<string, unknown> }, 200);
});

export { kanjiOA };
