/**
 * apps/api/src/routes/sync.ts
 *
 * POST /sync — 오프라인 클라이언트 동기화 엔드포인트
 *
 * 흐름:
 *   1. 요청 본문 검증
 *   2. 각 operation을 타입에 따라 D1에 최선-노력(best-effort) 방식으로 저장
 *      INSERT OR IGNORE 로 op_id 기반 멱등성 보장
 *   3. last_synced_at 이후 서버 델타 반환
 *
 * 모든 엔드포인트: cfAccessAuth 필수
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { cfAccessAuth } from '../middleware/auth.js';
import { ok, badRequest } from '../lib/response.js';
import { syncBodySchema } from '@nihongo-n3/shared';
import type { SyncOperation } from '@nihongo-n3/shared';
import { schedule } from '../lib/fsrs.js';
import type { CardSnapshot } from '../lib/fsrs.js';

const sync = new Hono<AppEnv>();
sync.use('*', cfAccessAuth);

// ─────────────────────────────────────────────
// 각 operation 타입 처리
// ─────────────────────────────────────────────
async function applyReview(
  db: D1Database,
  userId: string,
  op: SyncOperation,
): Promise<void> {
  const p = op.payload as {
    card_id?: number;
    item_type?: string;
    item_id?: number;
    rating?: string;
    response_ms?: number;
  };
  if (!p.rating) return;

  const hasCardId = typeof p.card_id === 'number' && Number.isFinite(p.card_id);
  const hasItemKey =
    typeof p.item_type === 'string' &&
    typeof p.item_id === 'number' &&
    Number.isFinite(p.item_id);
  if (!hasCardId && !hasItemKey) return;

  const cardStmt = hasCardId
    ? db.prepare('SELECT * FROM srs_cards WHERE id = ? AND user_id = ?').bind(p.card_id, userId)
    : db.prepare('SELECT * FROM srs_cards WHERE item_type = ? AND item_id = ? AND user_id = ?').bind(p.item_type, p.item_id, userId);

  const card = await cardStmt
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

  if (!card) return;

  const now = new Date(op.occurred_at);
  const snapshot: CardSnapshot = {
    state:          card.state as CardSnapshot['state'],
    stability:      card.stability,
    difficulty:     card.difficulty,
    lapses:         card.lapses,
    reps:           card.reps,
    lastReviewedAt: card.last_reviewed_at ? new Date(card.last_reviewed_at) : null,
  };

  const result = schedule(snapshot, p.rating as Parameters<typeof schedule>[1], now);
  const nowIso    = now.toISOString();
  const scheduledDays = Math.round((result.dueAt.getTime() - now.getTime()) / 86_400_000);
  const elapsedDays   = snapshot.lastReviewedAt
    ? Math.round((now.getTime() - snapshot.lastReviewedAt.getTime()) / 86_400_000)
    : 0;

  await db.batch([
    db.prepare(
      `UPDATE srs_cards SET
         state = ?, stability = ?, difficulty = ?,
         lapses = ?, reps = ?,
         due_at = ?, last_reviewed_at = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(
      result.state, result.stability, result.difficulty,
      result.lapses, result.reps,
      result.dueAt.toISOString(), nowIso, nowIso, card.id,
    ),
    db.prepare(
      `INSERT OR IGNORE INTO review_logs
         (card_id, rating, elapsed_days, scheduled_days, response_ms, reviewed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(
      card.id, p.rating,
      elapsedDays, scheduledDays, p.response_ms ?? null, nowIso,
    ),
  ]);
}

async function applyDailyLog(
  db: D1Database,
  userId: string,
  op: SyncOperation,
): Promise<void> {
  const p = op.payload as Record<string, unknown>;
  if (!p.date) return;

  await db
    .prepare(
      `INSERT OR IGNORE INTO daily_logs
         (user_id, date, source_code, items_new, items_review,
          accuracy, time_min, audio_min, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      userId, p.date,
      p.source_code ?? null,
      Number(p.items_new ?? 0),
      Number(p.items_review ?? 0),
      p.accuracy ?? null,
      Number(p.time_min ?? 0),
      Number(p.audio_min ?? 0),
      p.notes ?? null,
      new Date(op.occurred_at).toISOString(),
    )
    .run();
}

async function applyQuiz(
  db: D1Database,
  userId: string,
  op: SyncOperation,
): Promise<void> {
  const p = op.payload as Record<string, unknown>;
  if (!p.quiz_type || p.total === undefined) return;

  await db
    .prepare(
      `INSERT OR IGNORE INTO quiz_attempts
         (user_id, quiz_type, week_no, total, correct,
          duration_sec, detail_json, attempted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      userId, p.quiz_type,
      p.week_no ?? null,
      Number(p.total), Number(p.correct ?? 0),
      p.duration_sec ?? null,
      p.detail_json ? JSON.stringify(p.detail_json) : null,
      new Date(op.occurred_at).toISOString(),
    )
    .run();
}

async function applySelfCheck(
  db: D1Database,
  userId: string,
  op: SyncOperation,
): Promise<void> {
  const p = op.payload as Record<string, unknown>;
  if (!p.week_no) return;

  const updatedAt = new Date(op.occurred_at).toISOString();
  try {
    await db
      .prepare(
        `INSERT OR IGNORE INTO self_check
           (user_id, week_no, vocab_score, grammar_score, reading_score,
            listening_score, speaking_score, writing_score, domain_score, notes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        userId, Number(p.week_no),
        p.vocab_score ?? null, p.grammar_score ?? null, p.reading_score ?? null,
        p.listening_score ?? null, p.speaking_score ?? null, p.writing_score ?? null,
        p.domain_score ?? null, p.notes ?? null, updatedAt,
      )
      .run();
  } catch {
    await db
      .prepare(
        `INSERT OR IGNORE INTO self_check
           (user_id, week_no, vocab_score, grammar_score,
            listening_score, writing_score, domain_score, notes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        userId, Number(p.week_no),
        p.vocab_score ?? null, p.grammar_score ?? null,
        p.listening_score ?? null, p.writing_score ?? null,
        p.domain_score ?? null, p.notes ?? null, updatedAt,
      )
      .run();
  }
}

// ─────────────────────────────────────────────
// POST /sync
// ─────────────────────────────────────────────
sync.post('/sync', async (c) => {
  const body = syncBodySchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return badRequest(c, body.error.message);

  const userId = c.get('userId');
  const { last_synced_at, operations } = body.data;
  const processedOpIds: string[] = [];

  for (const op of operations) {
    try {
      switch (op.type) {
        case 'review':     await applyReview(c.env.DB, userId, op); break;
        case 'daily_log':  await applyDailyLog(c.env.DB, userId, op); break;
        case 'quiz':       await applyQuiz(c.env.DB, userId, op); break;
        case 'self_check': await applySelfCheck(c.env.DB, userId, op); break;
      }
      processedOpIds.push(op.op_id);
    } catch {
      // best-effort: 실패한 op는 processed 목록에서 제외
    }
  }

  // ── 서버 델타 (last_synced_at 이후 변경 데이터) ──
  const [srsRows, logRows, checkRows] = await Promise.all([
    c.env.DB.prepare(
      `SELECT * FROM srs_cards WHERE user_id = ? AND updated_at > ?`,
    ).bind(userId, last_synced_at).all(),
    c.env.DB.prepare(
      `SELECT * FROM daily_logs WHERE user_id = ? AND updated_at > ?`,
    ).bind(userId, last_synced_at).all(),
    c.env.DB.prepare(
      `SELECT * FROM self_check WHERE user_id = ? AND updated_at > ?`,
    ).bind(userId, last_synced_at).all(),
  ]);

  return ok(c, {
    processed_op_ids: processedOpIds,
    server_delta: {
      srs_cards:   srsRows.results   ?? [],
      daily_logs:  logRows.results   ?? [],
      self_checks: checkRows.results ?? [],
    },
  });
});

export { sync };
