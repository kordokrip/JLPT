/**
 * apps/api/src/routes/homophones.ts
 *
 * GET /homophones  — 동음이의어 쌍 목록 (vocab JOIN)
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { ok, badRequest } from '../lib/response.js';
import { homophonesQuerySchema } from '@nihongo-n3/shared';

const homophones = new Hono<AppEnv>();

homophones.get('/homophones', async (c) => {
  const q = homophonesQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!q.success) return badRequest(c, q.error.message);

  const { level, limit } = q.data;
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (level) {
    // vocab a 또는 vocab b 중 하나라도 지정 level이면 포함
    conditions.push('(va.level = ? OR vb.level = ?)');
    bindings.push(level, level);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  bindings.push(limit);

  const rows = await c.env.DB.prepare(
    `SELECT
       hp.id,
       hp.note,
       va.ja     AS a_ja,
       va.kana   AS a_kana,
       va.ko_def AS a_ko_def,
       vb.ja     AS b_ja,
       vb.kana   AS b_kana,
       vb.ko_def AS b_ko_def
     FROM homophone_pairs hp
     JOIN vocab va ON hp.vocab_id_a = va.id
     JOIN vocab vb ON hp.vocab_id_b = vb.id
     ${where}
     ORDER BY hp.id
     LIMIT ?`,
  )
    .bind(...bindings)
    .all();

  return ok(c, rows.results ?? []);
});

export { homophones };
