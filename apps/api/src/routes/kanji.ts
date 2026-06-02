/**
 * apps/api/src/routes/kanji.ts
 *
 * GET /kanji        — cursor 페이지네이션 목록
 * GET /kanji/:id    — 단일 항목
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { ok, notFound, badRequest } from '../lib/response.js';
import { paginate, decodeCursor } from '../lib/cursor.js';
import { kanjiQuerySchema } from '@nihongo-n3/shared';

const kanji = new Hono<AppEnv>();

kanji.get('/kanji', async (c) => {
  const q = kanjiQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!q.success) return badRequest(c, q.error.message);

  const { level, cursor, limit } = q.data;
  const cursorId = decodeCursor(cursor);
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (cursorId !== null) { conditions.push('id > ?'); bindings.push(cursorId); }
  if (level) { conditions.push('jlpt_level = ?'); bindings.push(level); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  bindings.push(limit + 1);

  const rows = await c.env.DB.prepare(
    `SELECT * FROM kanji ${where} ORDER BY id LIMIT ?`,
  )
    .bind(...bindings)
    .all<{ id: number }>();

  const { data, hasMore, nextCursor } = paginate(rows.results ?? [], limit);
  return ok(c, data, { limit, hasMore, nextCursor });
});

kanji.get('/kanji/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (!Number.isFinite(id)) return badRequest(c, '유효하지 않은 ID');

  const row = await c.env.DB.prepare('SELECT * FROM kanji WHERE id = ?').bind(id).first();
  if (!row) return notFound(c, `kanji id=${id}을 찾을 수 없습니다`);
  return ok(c, row);
});

export { kanji };
