/**
 * apps/api/src/routes/vocab.ts
 *
 * GET /vocab             — cursor 페이지네이션 목록
 * GET /vocab/search      — FTS5 전문 검색
 * GET /vocab/:id         — 단일 항목
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { ok, notFound, badRequest } from '../lib/response.js';
import { paginate, decodeCursor } from '../lib/cursor.js';
import { vocabQuerySchema, vocabSearchQuerySchema } from '@nihongo-n3/shared';

const vocab = new Hono<AppEnv>();

// ── GET /vocab ────────────────────────────────
vocab.get('/vocab', async (c) => {
  const q = vocabQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!q.success) return badRequest(c, q.error.message);

  const { level, category, source, cursor, limit } = q.data;
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
  )
    .bind(...bindings)
    .all<{ id: number }>();

  const { data, hasMore, nextCursor } = paginate(rows.results ?? [], limit);
  return ok(c, data, { limit, hasMore, nextCursor });
});

// ── GET /vocab/search ─────────────────────────
vocab.get('/vocab/search', async (c) => {
  const q = vocabSearchQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!q.success) return badRequest(c, q.error.message);

  let rows;
  const ftsTable = await c.env.DB.prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'vocab_fts'`,
  ).first();

  if (ftsTable) {
    rows = await c.env.DB.prepare(
      `SELECT v.*
       FROM vocab v
       JOIN vocab_fts ON v.id = vocab_fts.rowid
       WHERE vocab_fts MATCH ?
       ORDER BY rank
       LIMIT ?`,
    )
      .bind(q.data.q, q.data.limit)
      .all();
  } else {
    const like = `%${q.data.q}%`;
    rows = await c.env.DB.prepare(
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
    )
      .bind(like, like, like, like, q.data.q, q.data.q, q.data.q, q.data.limit)
      .all();
  }

  return ok(c, rows.results ?? []);
});

// ── GET /vocab/:id ────────────────────────────
vocab.get('/vocab/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (!Number.isFinite(id)) return badRequest(c, '유효하지 않은 ID');

  const row = await c.env.DB.prepare('SELECT * FROM vocab WHERE id = ?')
    .bind(id)
    .first();

  if (!row) return notFound(c, `vocab id=${id}을 찾을 수 없습니다`);
  return ok(c, row);
});

export { vocab };
