/**
 * apps/api/src/routes/sentences.ts
 *
 * GET /sentences         — cursor 페이지네이션 목록
 * GET /sentences/search  — FTS5 전문 검색
 * GET /sentences/:id     — 단일 항목
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { ok, notFound, badRequest } from '../lib/response.js';
import { paginate, decodeCursor } from '../lib/cursor.js';
import { sentencesQuerySchema, vocabSearchQuerySchema } from '@nihongo-n3/shared';

const sentences = new Hono<AppEnv>();

sentences.get('/sentences', async (c) => {
  const q = sentencesQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!q.success) return badRequest(c, q.error.message);

  const { level, register, cursor, limit } = q.data;
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
  )
    .bind(...bindings)
    .all<{ id: number }>();

  const { data, hasMore, nextCursor } = paginate(rows.results ?? [], limit);
  return ok(c, data, { limit, hasMore, nextCursor });
});

sentences.get('/sentences/search', async (c) => {
  const q = vocabSearchQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!q.success) return badRequest(c, q.error.message);

  let rows;
  const ftsTable = await c.env.DB.prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sentences_fts'`,
  ).first();

  if (ftsTable) {
    rows = await c.env.DB.prepare(
      `SELECT s.*
       FROM sentences s
       JOIN sentences_fts ON s.id = sentences_fts.rowid
       WHERE sentences_fts MATCH ?
       ORDER BY rank
       LIMIT ?`,
    )
      .bind(q.data.q, q.data.limit)
      .all();
  } else {
    const like = `%${q.data.q}%`;
    rows = await c.env.DB.prepare(
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
    )
      .bind(like, like, q.data.q, q.data.q, q.data.limit)
      .all();
  }

  return ok(c, rows.results ?? []);
});

sentences.get('/sentences/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (!Number.isFinite(id)) return badRequest(c, '유효하지 않은 ID');

  const row = await c.env.DB.prepare('SELECT * FROM sentences WHERE id = ?').bind(id).first();
  if (!row) return notFound(c, `sentence id=${id}을 찾을 수 없습니다`);
  return ok(c, row);
});

export { sentences };
