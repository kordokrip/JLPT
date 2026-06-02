/**
 * apps/api/src/routes/vocab-oa.ts
 *
 * OpenAPI 마이그레이션 (Phase 6 — B-2)
 * GET /vocab             — cursor 페이지네이션 목록
 * GET /vocab/search      — FTS5 전문 검색
 * GET /vocab/{id}        — 단일 항목
 */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { paginate, decodeCursor } from '../lib/cursor.js';
import { vocabQuerySchema, vocabSearchQuerySchema } from '@nihongo-n3/shared';

// ── 공통 응답 스키마 ──────────────────────────
const cursorMetaSchema = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
});

const pagedResponse = z
  .object({ data: z.array(z.record(z.string(), z.unknown())), meta: cursorMetaSchema.optional() })
  .openapi('VocabListResponse');

const singleResponse = z
  .object({ data: z.record(z.string(), z.unknown()) })
  .openapi('VocabSingleResponse');

const listResponse = z
  .object({ data: z.array(z.record(z.string(), z.unknown())) })
  .openapi('VocabSearchResponse');

const problemSchema = z
  .object({ type: z.string(), title: z.string(), status: z.number().int(), detail: z.string() })
  .openapi('ProblemDetail');

// ── 라우트 정의 ───────────────────────────────
const listRoute = createRoute({
  method: 'get',
  path: '/vocab',
  tags: ['Vocab'],
  summary: '어휘 목록 (cursor 페이지네이션)',
  request: { query: vocabQuerySchema },
  responses: {
    200: { content: { 'application/json': { schema: pagedResponse } }, description: '어휘 목록' },
    400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
  },
});

const searchRoute = createRoute({
  method: 'get',
  path: '/vocab/search',
  tags: ['Vocab'],
  summary: '어휘 전문 검색 (FTS5)',
  request: { query: vocabSearchQuerySchema },
  responses: {
    200: { content: { 'application/json': { schema: listResponse } }, description: '검색 결과' },
    400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 요청' },
  },
});

const getByIdRoute = createRoute({
  method: 'get',
  path: '/vocab/{id}',
  tags: ['Vocab'],
  summary: '어휘 단일 항목',
  request: {
    params: z.object({ id: z.string().regex(/^\d+$/, '정수 ID 필요').openapi({ example: '1' }) }),
  },
  responses: {
    200: { content: { 'application/json': { schema: singleResponse } }, description: '어휘 항목' },
    400: { content: { 'application/json': { schema: problemSchema } }, description: '잘못된 ID' },
    404: { content: { 'application/json': { schema: problemSchema } }, description: '항목 없음' },
  },
});

// ── 핸들러 ────────────────────────────────────
const BASE = 'https://nihongo-n3.example.com/errors/';

const vocabOA = new OpenAPIHono<AppEnv>();

vocabOA.openapi(listRoute, async (c) => {
  const { level, category, source, cursor, limit } = c.req.valid('query');
  const cursorId = decodeCursor(cursor);
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (cursorId !== null) { conditions.push('v.id > ?'); bindings.push(cursorId); }
  if (level)    { conditions.push('v.level = ?');    bindings.push(level); }
  if (category) { conditions.push('v.category = ?'); bindings.push(category); }
  if (source)   { conditions.push('v.source_code = ?'); bindings.push(source); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  bindings.push(limit + 1);

  const rows = await c.env.DB.prepare(
    `SELECT * FROM vocab v ${where} ORDER BY id LIMIT ?`,
  ).bind(...bindings).all<{ id: number }>();

  const { data, hasMore, nextCursor } = paginate(rows.results ?? [], limit);
  return c.json(
    { data: data as Record<string, unknown>[], meta: { limit, hasMore, nextCursor } },
    200,
  );
});

vocabOA.openapi(searchRoute, async (c) => {
  const { q, limit } = c.req.valid('query');
  const ftsTable = await c.env.DB.prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'vocab_fts'`,
  ).first();

  const rows = ftsTable
    ? await c.env.DB.prepare(
        `SELECT v.*
         FROM vocab v
         JOIN vocab_fts ON v.id = vocab_fts.rowid
         WHERE vocab_fts MATCH ?
         ORDER BY rank
         LIMIT ?`,
      ).bind(q, limit).all()
    : await c.env.DB.prepare(
        `SELECT *
         FROM vocab
         WHERE ja LIKE ? OR kana LIKE ? OR ko LIKE ? OR tags LIKE ?
         ORDER BY
           CASE
             WHEN ja = ? THEN 0
             WHEN kana = ? THEN 1
             WHEN ko = ? THEN 2
             ELSE 3
           END,
           id
         LIMIT ?`,
      ).bind(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, q, q, q, limit).all();
  return c.json({ data: (rows.results ?? []) as Record<string, unknown>[] }, 200);
});

vocabOA.openapi(getByIdRoute, async (c) => {
  const id = parseInt(c.req.valid('param').id, 10);
  if (!Number.isFinite(id)) {
    return c.json(
      { type: `${BASE}bad-request`, title: 'Bad Request', status: 400, detail: '유효하지 않은 ID' },
      400,
    );
  }

  const row = await c.env.DB.prepare('SELECT * FROM vocab WHERE id = ?').bind(id).first();
  if (!row) {
    return c.json(
      {
        type: `${BASE}not-found`,
        title: 'Not Found',
        status: 404,
        detail: `vocab id=${id}을 찾을 수 없습니다`,
      },
      404,
    );
  }
  return c.json({ data: row as Record<string, unknown> }, 200);
});

export { vocabOA };
