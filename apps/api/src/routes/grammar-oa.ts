/**
 * apps/api/src/routes/grammar-oa.ts
 *
 * OpenAPI 마이그레이션 (Phase 6 — B-2)
 * GET /grammar        — cursor 페이지네이션 목록
 * GET /grammar/{id}   — 단일 항목
 */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { paginate, decodeCursor } from '../lib/cursor.js';
import { grammarQuerySchema } from '@nihongo-n3/shared';

const cursorMetaSchema = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
});

const pagedResponse = z
  .object({ data: z.array(z.record(z.string(), z.unknown())), meta: cursorMetaSchema.optional() })
  .openapi('GrammarListResponse');

const singleResponse = z
  .object({ data: z.record(z.string(), z.unknown()) })
  .openapi('GrammarSingleResponse');

const problemSchema = z
  .object({ type: z.string(), title: z.string(), status: z.number().int(), detail: z.string() })
  .openapi('ProblemDetail');

const listRoute = createRoute({
  method: 'get',
  path: '/grammar',
  tags: ['Grammar'],
  summary: '문법 목록 (cursor 페이지네이션)',
  request: { query: grammarQuerySchema },
  responses: {
    200: { content: { 'application/json': { schema: pagedResponse } }, description: '문법 목록' },
    400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
  },
});

const getByIdRoute = createRoute({
  method: 'get',
  path: '/grammar/{id}',
  tags: ['Grammar'],
  summary: '문법 단일 항목',
  request: {
    params: z.object({ id: z.string().regex(/^\d+$/, '정수 ID 필요').openapi({ example: '1' }) }),
  },
  responses: {
    200: { content: { 'application/json': { schema: singleResponse } }, description: '문법 항목' },
    400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 ID' },
    404: { content: { 'application/json': { schema: problemSchema } }, description: '항목 없음' },
  },
});

const BASE = 'https://nihongo-n3.example.com/errors/';

const grammarOA = new OpenAPIHono<AppEnv>();

grammarOA.openapi(listRoute, async (c) => {
  const { level, category, cursor, limit } = c.req.valid('query');
  const cursorId = decodeCursor(cursor);
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (cursorId !== null) { conditions.push('id > ?'); bindings.push(cursorId); }
  if (level)    { conditions.push('level = ?');    bindings.push(level); }
  if (category) { conditions.push('category = ?'); bindings.push(category); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  bindings.push(limit + 1);

  const rows = await c.env.DB.prepare(
    `SELECT * FROM grammar ${where} ORDER BY id LIMIT ?`,
  ).bind(...bindings).all<{ id: number }>();

  const { data, hasMore, nextCursor } = paginate(rows.results ?? [], limit);
  return c.json(
    { data: data as Record<string, unknown>[], meta: { limit, hasMore, nextCursor } },
    200,
  );
});

grammarOA.openapi(getByIdRoute, async (c) => {
  const id = parseInt(c.req.valid('param').id, 10);
  if (!Number.isFinite(id)) {
    return c.json(
      { type: `${BASE}bad-request`, title: 'Bad Request', status: 400, detail: '유효하지 않은 ID' },
      400,
    );
  }

  const row = await c.env.DB.prepare('SELECT * FROM grammar WHERE id = ?').bind(id).first();
  if (!row) {
    return c.json(
      {
        type: `${BASE}not-found`,
        title: 'Not Found',
        status: 404,
        detail: `grammar id=${id}을 찾을 수 없습니다`,
      },
      404,
    );
  }
  return c.json({ data: row as Record<string, unknown> }, 200);
});

export { grammarOA };
