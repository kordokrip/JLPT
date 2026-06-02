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
import { schedule } from '../lib/fsrs.js';
import type { CardSnapshot } from '../lib/fsrs.js';
import { srsInitBodySchema, srsReviewBodySchema, srsDueQuerySchema, FsrsOptionsSchema } from '@nihongo-n3/shared';

const srs = new Hono<AppEnv>();
srs.use('*', cfAccessAuth);

// ── POST /srs/init ────────────────────────────
srs.post('/srs/init', async (c) => {
  const body = srsInitBodySchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return badRequest(c, body.error.message);

  const userId = c.get('userId');
  const { item_type, item_ids } = body.data;
  const now = new Date().toISOString();

  // 각 아이템에 대해 INSERT OR IGNORE 로 신규 카드 생성
  const stmts = item_ids.map((itemId) =>
    c.env.DB.prepare(
      `INSERT OR IGNORE INTO srs_cards
         (user_id, item_type, item_id, state, stability, difficulty,
          lapses, reps, due_at, created_at, updated_at)
       VALUES (?, ?, ?, 'new', 2.5, 5.0, 0, 0, ?, ?, ?)`,
    ).bind(userId, item_type, itemId, now, now, now),
  );

  await c.env.DB.batch(stmts);

  return created(c, { created: item_ids.length });
});

// ── GET /srs/due ──────────────────────────────
srs.get('/srs/due', async (c) => {
  const q = srsDueQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!q.success) return badRequest(c, q.error.message);

  const userId = c.get('userId');
  const { limit, item_type } = q.data;
  const now = new Date().toISOString();

  const conditions = ["user_id = ?", "due_at <= ?"];
  const bindings: unknown[] = [userId, now];

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
  const { card_id, rating, response_ms } = body.data;

  // 카드 조회
  const card = await c.env.DB.prepare(
    'SELECT * FROM srs_cards WHERE id = ? AND user_id = ?',
  )
    .bind(card_id, userId)
    .first<{
      id: number;
      state: string;
      stability: number;
      difficulty: number;
      lapses: number;
      reps: number;
      due_at: string | null;
      last_reviewed_at: string | null;
    }>();

  if (!card) return notFound(c, `카드 id=${card_id}을 찾을 수 없습니다`);

  const now = new Date();
  const snapshot: CardSnapshot = {
    state:          card.state as CardSnapshot['state'],
    stability:      card.stability,
    difficulty:     card.difficulty,
    lapses:         card.lapses,
    reps:           card.reps,
    lastReviewedAt: card.last_reviewed_at ? new Date(card.last_reviewed_at) : null,
  };

  const result = schedule(snapshot, rating, now);

  const nowIso    = now.toISOString();
  const dueIso    = result.dueAt.toISOString();
  const scheduledDays = Math.round((result.dueAt.getTime() - now.getTime()) / 86_400_000);
  const elapsedDays   = snapshot.lastReviewedAt
    ? Math.round((now.getTime() - snapshot.lastReviewedAt.getTime()) / 86_400_000)
    : 0;

  await c.env.DB.batch([
    // 카드 업데이트
    c.env.DB.prepare(
      `UPDATE srs_cards SET
         state = ?, stability = ?, difficulty = ?,
         lapses = ?, reps = ?,
         due_at = ?,
         last_reviewed_at = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(
      result.state,
      result.stability,
      result.difficulty,
      result.lapses,
      result.reps,
      dueIso,
      nowIso,
      nowIso,
      card_id,
    ),
    // 리뷰 로그 삽입
    c.env.DB.prepare(
      `INSERT INTO review_logs
         (card_id, rating, elapsed_days, scheduled_days, response_ms, reviewed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(
      card_id,
      rating,
      elapsedDays,
      scheduledDays,
      response_ms ?? null,
      nowIso,
    ),
  ]);

  return ok(c, result);
});

// ── GET /srs/settings ────────────────────────
srs.get('/srs/settings', async (c) => {
  const userId = c.get('userId');
  const row = await c.env.DB.prepare(
    'SELECT fsrs_options FROM users WHERE id = ?',
  )
    .bind(userId)
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
  await c.env.DB.prepare(
    'UPDATE users SET fsrs_options = ? WHERE id = ?',
  )
    .bind(JSON.stringify(body.data), userId)
    .run();

  return ok(c, body.data);
});

// ── GET /srs/stats ────────────────────────────
srs.get('/srs/stats', async (c) => {
  const userId = c.get('userId');

  const rows = await c.env.DB.prepare(
    `SELECT state, COUNT(*) AS count
     FROM srs_cards
     WHERE user_id = ?
     GROUP BY state`,
  )
    .bind(userId)
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
     WHERE user_id = ?`,
  )
    .bind(userId)
    .first<{ first_card_created_at: string | null }>();

  return ok(c, {
    ...stats,
    firstCardCreatedAt: firstRow?.first_card_created_at ?? null,
  });
});

export { srs };
