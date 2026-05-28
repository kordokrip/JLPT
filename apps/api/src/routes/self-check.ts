/**
 * apps/api/src/routes/self-check.ts
 *
 * GET  /self-check/:week  — 특정 주차 자가진단 조회
 * POST /self-check        — 자가진단 저장 / 업서트
 *
 * 모든 엔드포인트: cfAccessAuth 필수
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { cfAccessAuth } from '../middleware/auth.js';
import { ok, created, notFound, badRequest } from '../lib/response.js';
import { selfCheckBodySchema, weekParamSchema } from '@nihongo-n3/shared';

const selfCheck = new Hono<AppEnv>();
selfCheck.use('*', cfAccessAuth);

// ── GET /self-check/scores ────────────────────
// Phase 7-F: SRS 정확도 기반 레이더 점수 계산 (최근 7일)
selfCheck.get('/self-check/scores', async (c) => {
  const userId = c.get('userId');
  const since  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // 아이템 타입별 정확도
  type AccRow = { item_type: string; total: number; correct: number };
  const accRows = await c.env.DB.prepare(
    `SELECT sc.item_type,
            COUNT(*) AS total,
            SUM(CASE WHEN rl.rating IN ('good','easy') THEN 1 ELSE 0 END) AS correct
     FROM review_logs rl
     JOIN srs_cards sc ON sc.id = rl.card_id
     WHERE sc.user_id = ? AND rl.reviewed_at >= ?
     GROUP BY sc.item_type`,
  )
    .bind(userId, since)
    .all<AccRow>();

  const acc: Record<string, number> = {};
  for (const row of accRows.results ?? []) {
    acc[row.item_type] = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
  }

  // 최근 퀴즈 점수 (listening, grammar_fill)
  type QuizRow = { quiz_type: string; avg_score: number };
  const quizRows = await c.env.DB.prepare(
    `SELECT quiz_type,
            ROUND(AVG(CAST(correct AS REAL) / NULLIF(total, 0) * 100)) AS avg_score
     FROM quiz_attempts
     WHERE user_id = ? AND created_at >= ?
     GROUP BY quiz_type`,
  )
    .bind(userId, since)
    .all<QuizRow>();

  const quiz: Record<string, number> = {};
  for (const row of quizRows.results ?? []) {
    quiz[row.quiz_type] = row.avg_score ?? 0;
  }

  // 레이더 6축: 語彙/文法/読解/聴解/会話/作文
  const scores = [
    acc['vocab']   ?? acc['sysprog']   ?? 0,    // 語彙
    acc['grammar'] ?? 0,                          // 文法
    acc['kanji']   ?? acc['sentence']  ?? 0,    // 読解
    quiz['listening'] ?? 0,                       // 聴解
    quiz['vocab_mc'] ?? quiz['grammar_fill'] ?? 0, // 会話 (proxy)
    acc['sentence'] ?? 0,                         // 作文 (proxy)
  ];

  const hasData = (accRows.results ?? []).length > 0 || (quizRows.results ?? []).length > 0;

  return ok(c, { scores, hasData, since });
});

// ── GET /self-check/:week ─────────────────────
selfCheck.get('/self-check/:week', async (c) => {
  const parsed = weekParamSchema.safeParse({ week: c.req.param('week') });
  if (!parsed.success) return badRequest(c, '유효하지 않은 week 파라미터');

  const userId = c.get('userId');
  const row = await c.env.DB.prepare(
    'SELECT * FROM self_check WHERE user_id = ? AND week_no = ?',
  )
    .bind(userId, parsed.data.week)
    .first();

  if (!row) return ok(c, null);
  return ok(c, row);
});

// ── POST /self-check ──────────────────────────
selfCheck.post('/self-check', async (c) => {
  const body = selfCheckBodySchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return badRequest(c, body.error.message);

  const userId = c.get('userId');
  const d = body.data;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO self_check
       (user_id, week_no, vocab_score, grammar_score,
        listening_score, writing_score, domain_score, notes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      userId,
      d.week_no,
      d.vocab_score ?? null,
      d.grammar_score ?? null,
      d.listening_score ?? null,
      d.writing_score ?? null,
      d.domain_score ?? null,
      d.notes ?? null,
      now,
    )
    .run();

  return created(c, { week_no: d.week_no });
});

export { selfCheck };
