/**
 * apps/api/src/routes/srs.ts
 *
 * POST /srs/init    — 신규 카드 벌크 생성
 * GET  /srs/due     — 복습 대기 카드 목록
 * POST /srs/review  — 리뷰 결과 처리 (FSRS 스케줄)
 * GET  /srs/stats   — 카드 상태별 통계
 *
 * 모든 엔드포인트: cfAccessAuth 필수
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { cfAccessAuth } from '../middleware/auth.js';
import { ok, created, notFound, badRequest, internalError } from '../lib/response.js';
import { reviewStatements } from '../lib/learning-effects.js';
import { srsInitBodySchema, srsReviewBodySchema, srsDueQuerySchema, FsrsOptionsSchema } from '@nihongo-n3/shared';

const srs = new Hono<AppEnv>();
srs.use('*', cfAccessAuth);

// ── POST /srs/init ────────────────────────────
srs.post('/srs/init', async (c) => {
  const body = srsInitBodySchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return badRequest(c, body.error.message);

  const userId = c.get('userId');
  const learningTrack = c.get('learningTrack');
  const { item_type, item_ids } = body.data;
  const now = new Date().toISOString();

  if (learningTrack !== 'jlpt-ja') {
    return notFound(c, 'TOPIK SRS 콘텐츠는 아직 출시되지 않았습니다');
  }

  // 각 아이템에 대해 INSERT OR IGNORE 로 신규 카드 생성
  const stmts = item_ids.map((itemId) =>
    c.env.DB.prepare(
      `INSERT OR IGNORE INTO srs_cards
         (user_id, learning_track, item_type, item_id, state, stability, difficulty,
          lapses, reps, due_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'new', 2.5, 5.0, 0, 0, ?, ?, ?)`,
    ).bind(userId, learningTrack, item_type, itemId, now, now, now),
  );

  await c.env.DB.batch(stmts);

  return created(c, { created: item_ids.length });
});

// ── GET /srs/due ──────────────────────────────
srs.get('/srs/due', async (c) => {
  const q = srsDueQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!q.success) return badRequest(c, q.error.message);

  const userId = c.get('userId');
  const learningTrack = c.get('learningTrack');
  const { limit, item_type } = q.data;
  const now = new Date().toISOString();

  if (learningTrack !== 'jlpt-ja') {
    return notFound(c, 'TOPIK SRS 콘텐츠는 아직 출시되지 않았습니다');
  }

  const conditions = ["user_id = ?", "learning_track = ?", "due_at <= ?"];
  const bindings: unknown[] = [userId, learningTrack, now];

  if (item_type) {
    conditions.push('item_type = ?');
    bindings.push(item_type);
  }
  bindings.push(limit);

  const rows = await c.env.DB.prepare(
    `SELECT * FROM srs_cards
     WHERE ${conditions.join(' AND ')}
     ORDER BY due_at
     LIMIT ?`,
  )
    .bind(...bindings)
    .all();

  return ok(c, rows.results ?? []);
});

// ── POST /srs/review ──────────────────────────
srs.post('/srs/review', async (c) => {
  const body = srsReviewBodySchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return badRequest(c, body.error.message);

  const userId = c.get('userId');
  const learningTrack = c.get('learningTrack');
  const { card_id, rating, response_ms } = body.data;

  if (learningTrack !== 'jlpt-ja') {
    return notFound(c, 'TOPIK SRS 콘텐츠는 아직 출시되지 않았습니다');
  }

  const mutation = await reviewStatements(c.env.DB,userId,'jlpt-ja',card_id,rating,response_ms);
  if (!mutation) return notFound(c, 'Review card not found');
  await c.env.DB.batch(mutation.statements);
  return ok(c, mutation.result);
});

// ── GET /srs/settings ────────────────────────
srs.get('/srs/settings', async (c) => {
  const userId = c.get('userId');
  const learningTrack = c.get('learningTrack');
  const row = await c.env.DB.prepare(
    'SELECT fsrs_options FROM track_srs_settings WHERE user_id = ? AND learning_track = ?',
  )
    .bind(userId, learningTrack)
    .first<{ fsrs_options: string | null }>();

  const defaults = {
    request_retention: 0.9,
    maximum_interval: 36500,
    enable_fuzz: true,
    enable_short_term: true,
  };
  return ok(c, row?.fsrs_options ? JSON.parse(row.fsrs_options) : defaults);
});

// ── PUT /srs/settings ────────────────────────
srs.put('/srs/settings', async (c) => {
  const body = FsrsOptionsSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!body.success) return badRequest(c, body.error.message);

  const userId = c.get('userId');
  const learningTrack = c.get('learningTrack');
  await c.env.DB.prepare(
    `INSERT INTO track_srs_settings (user_id, learning_track, fsrs_options, updated_at)
     VALUES (?, ?, ?, unixepoch())
     ON CONFLICT(user_id, learning_track) DO UPDATE SET
       fsrs_options = excluded.fsrs_options,
       updated_at = excluded.updated_at`,
  )
    .bind(userId, learningTrack, JSON.stringify(body.data))
    .run();

  return ok(c, body.data);
});

// ── GET /srs/stats ────────────────────────────
srs.get('/srs/stats', async (c) => {
  const userId = c.get('userId');
  const learningTrack = c.get('learningTrack');

  const rows = await c.env.DB.prepare(
    `SELECT state, COUNT(*) AS count
     FROM srs_cards
     WHERE user_id = ? AND learning_track = ?
     GROUP BY state`,
  )
    .bind(userId, learningTrack)
    .all<{ state: string; count: number }>();

  const stats: Record<string, number> = {
    new: 0, learning: 0, review: 0, relearning: 0,
  };
  for (const row of rows.results ?? []) {
    stats[row.state] = row.count;
  }

  // 첫 카드 생성일 (Phase 7-E: useCurrentWeek 계산용)
  const firstRow = await c.env.DB.prepare(
    `SELECT MIN(created_at) AS first_card_created_at
     FROM srs_cards
     WHERE user_id = ? AND learning_track = ?`,
  )
    .bind(userId, learningTrack)
    .first<{ first_card_created_at: string | null }>();

  return ok(c, {
    ...stats,
    firstCardCreatedAt: firstRow?.first_card_created_at ?? null,
  });
});

export { srs };
