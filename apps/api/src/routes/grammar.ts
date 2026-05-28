/**
 * apps/api/src/routes/grammar.ts
 *
 * GET /grammar        — cursor 페이지네이션 목록
 * GET /grammar/:id    — 단일 항목
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { ok, notFound, badRequest } from '../lib/response.js';
import { paginate, decodeCursor } from '../lib/cursor.js';
import { grammarQuerySchema } from '@nihongo-n3/shared';

const grammar = new Hono<AppEnv>();

grammar.get('/grammar', async (c) => {
  const q = grammarQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!q.success) return badRequest(c, q.error.message);

  const { level, category, cursor, limit } = q.data;
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
  )
    .bind(...bindings)
    .all<{ id: number }>();

  const { data, hasMore, nextCursor } = paginate(rows.results ?? [], limit);
  return ok(c, data, { limit, hasMore, nextCursor });
});

grammar.get('/grammar/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (!Number.isFinite(id)) return badRequest(c, '유효하지 않은 ID');

  const row = await c.env.DB.prepare('SELECT * FROM grammar WHERE id = ?').bind(id).first();
  if (!row) return notFound(c, `grammar id=${id}을 찾을 수 없습니다`);
  return ok(c, row);
});

export { grammar };
