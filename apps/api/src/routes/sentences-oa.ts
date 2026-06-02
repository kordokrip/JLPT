/**
 * apps/api/src/routes/sentences-oa.ts
 *
 * OpenAPI 마이그레이션 (Phase 6 — B-2)
 * GET /sentences         — cursor 페이지네이션 목록
 * GET /sentences/search  — FTS5 전문 검색
 * GET /sentences/{id}    — 단일 항목
 */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { paginate, decodeCursor } from '../lib/cursor.js';
import { sentencesQuerySchema, vocabSearchQuerySchema } from '@nihongo-n3/shared';

const cursorMetaSchema = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
});

const pagedResponse = z
  .object({ data: z.array(z.record(z.string(), z.unknown())), meta: cursorMetaSchema.optional() })
  .openapi('SentencesListResponse');

const listResponse = z
  .object({ data: z.array(z.record(z.string(), z.unknown())) })
  .openapi('SentencesSearchResponse');

const singleResponse = z
  .object({ data: z.record(z.string(), z.unknown()) })
  .openapi('SentencesSingleResponse');

const problemSchema = z
  .object({ type: z.string(), title: z.string(), status: z.number().int(), detail: z.string() })
  .openapi('ProblemDetail');

const listRoute = createRoute({
  method: 'get',
  path: '/sentences',
  tags: ['Sentences'],
  summary: '예문 목록 (cursor 페이지네이션)',
  request: { query: sentencesQuerySchema },
  responses: {
    200: { content: { 'application/json': { schema: pagedResponse } }, description: '예문 목록' },
    400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
  },
});

const searchRoute = createRoute({
  method: 'get',
  path: '/sentences/search',
  tags: ['Sentences'],
  summary: '예문 전문 검색 (FTS5)',
  request: { query: vocabSearchQuerySchema },
  responses: {
    200: { content: { 'application/json': { schema: listResponse } }, description: '검색 결과' },
    400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
  },
});

const getByIdRoute = createRoute({
  method: 'get',
  path: '/sentences/{id}',
  tags: ['Sentences'],
  summary: '예문 단일 항목',
  request: {
    params: z.object({ id: z.string().regex(/^\d+$/, '정수 ID 필요').openapi({ example: '1' }) }),
  },
  responses: {
    200: { content: { 'application/json': { schema: singleResponse } }, description: '예문 항목' },
    400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 ID' },
    404: { content: { 'application/json': { schema: problemSchema } }, description: '항목 없음' },
  },
});

const BASE = 'https://nihongo-n3.example.com/errors/';

const sentencesOA = new OpenAPIHono<AppEnv>();

sentencesOA.openapi(listRoute, async (c) => {
  const { level, register, cursor, limit } = c.req.valid('query');
  const cursorId = decodeCursor(cursor);
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (cursorId !== null) { conditions.push('id > ?'); bindings.push(cursorId); }
  if (level)    { conditions.push('level = ?');    bindings.push(level); }
  if (register) { conditions.push('register = ?'); bindings.push(register); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  bindings.push(limit + 1);

  const rows = await c.env.DB.prepare(
    `SELECT * FROM sentences ${where} ORDER BY id LIMIT ?`,
  ).bind(...bindings).all<{ id: number }>();

  const { data, hasMore, nextCursor } = paginate(rows.results ?? [], limit);
  return c.json(
    { data: data as Record<string, unknown>[], meta: { limit, hasMore, nextCursor } },
    200,
  );
});

sentencesOA.openapi(searchRoute, async (c) => {
  const { q, limit } = c.req.valid('query');
  const ftsTable = await c.env.DB.prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sentences_fts'`,
  ).first();

  const rows = ftsTable
    ? await c.env.DB.prepare(
        `SELECT s.*
         FROM sentences s
         JOIN sentences_fts ON s.id = sentences_fts.rowid
         WHERE sentences_fts MATCH ?
         ORDER BY rank
         LIMIT ?`,
      ).bind(q, limit).all()
    : await c.env.DB.prepare(
        `SELECT *
         FROM sentences
         WHERE ja LIKE ? OR ko LIKE ?
         ORDER BY
           CASE
             WHEN ja = ? THEN 0
             WHEN ko = ? THEN 1
             ELSE 2
           END,
           id
         LIMIT ?`,
      ).bind(`%${q}%`, `%${q}%`, q, q, limit).all();
  return c.json({ data: (rows.results ?? []) as Record<string, unknown>[] }, 200);
});

sentencesOA.openapi(getByIdRoute, async (c) => {
  const id = parseInt(c.req.valid('param').id, 10);
  if (!Number.isFinite(id)) {
    return c.json(
      { type: `${BASE}bad-request`, title: 'Bad Request', status: 400, detail: '유효하지 않은 ID' },
      400,
    );
  }

  const row = await c.env.DB.prepare('SELECT * FROM sentences WHERE id = ?').bind(id).first();
  if (!row) {
    return c.json(
      {
        type: `${BASE}not-found`,
        title: 'Not Found',
        status: 404,
        detail: `sentences id=${id}을 찾을 수 없습니다`,
      },
      404,
    );
  }
  return c.json({ data: row as Record<string, unknown> }, 200);
});

export { sentencesOA };
