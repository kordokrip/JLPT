/**
 * apps/api/src/routes/logs.ts
 *
 * POST /logs/daily  — 일일 학습 로그 기록 / 업서트
 * GET  /logs/daily  — 날짜 범위 조회
 * POST /quiz/attempt — 퀴즈 결과 저장
 *
 * 모든 엔드포인트: cfAccessAuth 필수
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { cfAccessAuth } from '../middleware/auth.js';
import { ok, created, badRequest } from '../lib/response.js';
import { dailyLogBodySchema, dailyLogQuerySchema, quizAttemptBodySchema } from '@nihongo-n3/shared';
import { learningStreak } from '../lib/motivation.js';

const logs = new Hono<AppEnv>();
logs.use('*', cfAccessAuth);

// ── POST /logs/daily ──────────────────────────
logs.post('/logs/daily', async (c) => {
  const body = dailyLogBodySchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return badRequest(c, body.error.message);

  const userId = c.get('userId');
  const learningTrack = c.get('learningTrack');
  const d = body.data;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO daily_logs
       (user_id, learning_track, date, source_code, items_new, items_review,
        accuracy, time_min, audio_min, notes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      userId,
      learningTrack,
      d.date,
      d.source_code ?? null,
      d.items_new,
      d.items_review,
      d.accuracy ?? null,
      d.time_min,
      d.audio_min,
      d.notes ?? null,
      now,
    )
    .run();

  return created(c, { date: d.date });
});

// ── GET /logs/daily ───────────────────────────
logs.get('/logs/daily', async (c) => {
  const q = dailyLogQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!q.success) return badRequest(c, q.error.message);

  const userId = c.get('userId');
  const learningTrack = c.get('learningTrack');
  const conditions = ['user_id = ?', 'learning_track = ?'];
  const bindings: unknown[] = [userId, learningTrack];

  if (q.data.from) { conditions.push('date >= ?'); bindings.push(q.data.from); }
  if (q.data.to)   { conditions.push('date <= ?'); bindings.push(q.data.to); }

  const rows = await c.env.DB.prepare(
    `SELECT * FROM daily_logs WHERE ${conditions.join(' AND ')} ORDER BY date DESC`,
  )
    .bind(...bindings)
    .all();

  return ok(c, rows.results ?? []);
});

// ── POST /quiz/attempt ────────────────────────
logs.post('/quiz/attempt', async (c) => {
  const body = quizAttemptBodySchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return badRequest(c, body.error.message);

  const userId = c.get('userId');
  const learningTrack = c.get('learningTrack');
  const d = body.data;
  const now = new Date().toISOString();

  const result = await c.env.DB.prepare(
    `INSERT INTO quiz_attempts
       (user_id, learning_track, quiz_type, week_no, total, correct,
        duration_sec, detail_json, attempted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      userId,
      learningTrack,
      d.quiz_type,
      d.week_no ?? null,
      d.total,
      d.correct,
      d.duration_sec ?? null,
      d.detail_json ? JSON.stringify(d.detail_json) : null,
      now,
    )
    .run();

  return created(c, { id: result.meta.last_row_id });
});

// ── GET /logs/streak ──────────────────────────
logs.get('/logs/streak', async (c) => {
  const userId = c.get('userId');
  const learningTrack = c.get('learningTrack');

  const { badgeDates: _badges, ...streak } = await learningStreak(c.env.DB, userId, learningTrack);
  return ok(c, streak);
});

// ── GET /logs/heatmap ─────────────────────────
logs.get('/logs/heatmap', async (c) => {
  const yearParam = new URL(c.req.url).searchParams.get('year');
  const year = parseInt(yearParam ?? String(new Date().getFullYear()), 10);
  if (isNaN(year) || year < 2020 || year > 2100) {
    return badRequest(c, 'year 파라미터가 잘못됨 (2020~2100)');
  }

  const userId = c.get('userId');
  const learningTrack = c.get('learningTrack');
  const rows = await c.env.DB.prepare(
    `SELECT date, SUM(items_new + items_review) AS total
     FROM daily_logs
     WHERE user_id = ? AND learning_track = ? AND date LIKE ? AND items_new + items_review > 0
     GROUP BY date`,
  ).bind(userId, learningTrack, `${year}-%`).all<{ date: string; total: number }>();

  const heatmap: Record<string, { count: number; intensity: number }> = {};
  for (const row of rows.results ?? []) {
    const count = Number(row.total ?? 0);
    const intensity =
      count <= 0  ? 0 :
      count <= 5  ? 1 :
      count <= 15 ? 2 :
      count <= 30 ? 3 : 4;
    heatmap[row.date] = { count, intensity };
  }

  return ok(c, heatmap);
});

export { logs };
