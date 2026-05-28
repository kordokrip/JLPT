/**
 * apps/api/src/routes/sysprog.ts
 *
 * GET /sysprog        — cursor 페이지네이션 목록 (IT/반도체 용어)
 * GET /sysprog/:id    — 단일 항목
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { ok, notFound, badRequest } from '../lib/response.js';
import { paginate, decodeCursor } from '../lib/cursor.js';
import { sysProgQuerySchema } from '@nihongo-n3/shared';

const sysprog = new Hono<AppEnv>();

sysprog.get('/sysprog', async (c) => {
  const q = sysProgQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!q.success) return badRequest(c, q.error.message);

  const { domain, star, cursor, limit } = q.data;
  const cursorId = decodeCursor(cursor);
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (cursorId !== null) { conditions.push('id > ?'); bindings.push(cursorId); }
  if (domain) { conditions.push('domain = ?'); bindings.push(domain); }
  if (star !== undefined) { conditions.push('star = ?'); bindings.push(star ? 1 : 0); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  bindings.push(limit + 1);

  const rows = await c.env.DB.prepare(
    `SELECT * FROM sysprog_terms ${where} ORDER BY id LIMIT ?`,
  )
    .bind(...bindings)
    .all<{ id: number }>();

  const { data, hasMore, nextCursor } = paginate(rows.results ?? [], limit);
  return ok(c, data, { limit, hasMore, nextCursor });
});

sysprog.get('/sysprog/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (!Number.isFinite(id)) return badRequest(c, '유효하지 않은 ID');

  const row = await c.env.DB.prepare('SELECT * FROM sysprog_terms WHERE id = ?').bind(id).first();
  if (!row) return notFound(c, `sysprog id=${id}을 찾을 수 없습니다`);
  return ok(c, row);
});

export { sysprog };
