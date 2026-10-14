import { Hono } from 'hono';
import {
  learningActivityEventsBodySchema,
  learningActivitySummaryQuerySchema,
  type LearningActivitySummary,
} from '@nihongo-n3/shared';
import type { AppEnv } from '../types.js';
import { cfAccessAuth } from '../middleware/auth.js';
import { badRequest, created, internalError, ok } from '../lib/response.js';
import { safeErrorName } from '../lib/safe-log.js';

const activity = new Hono<AppEnv>();
activity.use('/activity/*', cfAccessAuth);

activity.post('/activity/events', async (c) => {
  const parsed = learningActivityEventsBodySchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) return badRequest(c, parsed.error.message);

  const userId = c.get('userId');
  const learningTrack = c.get('learningTrack');
  if (parsed.data.events.some((event) => event.learning_track !== learningTrack)) {
    return badRequest(c, 'learning_track must match the authenticated learning track');
  }

  const statements = parsed.data.events.map((event) => c.env.DB.prepare(
    `INSERT OR IGNORE INTO learning_activity_events
       (event_id, user_id, learning_track, event_type, content_type, content_id,
        level_tag, section, mode, correct, rating, duration_ms, speech_outcome, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    event.event_id,
    userId,
    learningTrack,
    event.event_type,
    event.content_type ?? null,
    event.content_id ?? null,
    event.level_tag ?? null,
    event.section ?? null,
    event.mode ?? null,
    event.correct === undefined ? null : Number(event.correct),
    event.rating ?? null,
    event.duration_ms ?? null,
    event.speech_outcome ?? null,
    Math.floor(new Date(event.occurred_at).getTime() / 1000),
  ));

  try {
    const results = await c.env.DB.batch(statements);
    const accepted = results.reduce((sum, result) => sum + Number(result.meta.changes ?? 0), 0);
    return created(c, { accepted, duplicates: parsed.data.events.length - accepted });
  } catch (error) {
    console.error({ event: 'activity_event_write_error', error_name: safeErrorName(error) });
    return internalError(c, '학습 활동을 저장하지 못했습니다');
  }
});

type SummaryRow = {
  learning_track: 'jlpt-ja' | 'topik-ko';
  level_tag: string | null;
  section: string | null;
  mode: 'vocab_mc' | 'grammar_fill' | 'kanji_reading' | 'listening' | null;
  events: number;
  completed: number;
  quiz_answered: number;
  quiz_correct: number;
  reviews: number;
  speech_attempts: number;
  speech_played: number;
  speech_unavailable: number;
  speech_errors: number;
};

const SUMMARY_SELECT = `
  count(*) AS events,
  sum(CASE WHEN event_type = 'content_completed' THEN 1 ELSE 0 END) AS completed,
  sum(CASE WHEN event_type = 'quiz_answered' THEN 1 ELSE 0 END) AS quiz_answered,
  sum(CASE WHEN event_type = 'quiz_answered' AND correct = 1 THEN 1 ELSE 0 END) AS quiz_correct,
  sum(CASE WHEN event_type = 'review_rated' THEN 1 ELSE 0 END) AS reviews,
  sum(CASE WHEN event_type = 'speech_attempted' THEN 1 ELSE 0 END) AS speech_attempts,
  sum(CASE WHEN event_type = 'speech_attempted' AND speech_outcome = 'played' THEN 1 ELSE 0 END) AS speech_played,
  sum(CASE WHEN event_type = 'speech_attempted' AND speech_outcome = 'unavailable' THEN 1 ELSE 0 END) AS speech_unavailable,
  sum(CASE WHEN event_type = 'speech_attempted' AND speech_outcome = 'error' THEN 1 ELSE 0 END) AS speech_errors
`;

function counters(row?: Partial<SummaryRow> | null) {
  return {
    events: Number(row?.events ?? 0),
    completed: Number(row?.completed ?? 0),
    quiz_answered: Number(row?.quiz_answered ?? 0),
    quiz_correct: Number(row?.quiz_correct ?? 0),
    reviews: Number(row?.reviews ?? 0),
    speech_attempts: Number(row?.speech_attempts ?? 0),
    speech_played: Number(row?.speech_played ?? 0),
    speech_unavailable: Number(row?.speech_unavailable ?? 0),
    speech_errors: Number(row?.speech_errors ?? 0),
  };
}

activity.get('/activity/summary', async (c) => {
  const parsed = learningActivitySummaryQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return badRequest(c, parsed.error.message);

  const days = parsed.data.window === '30d' ? 30 : 7;
  const cutoff = Math.floor((Date.now() - days * 86_400_000) / 1000);
  const userId = c.get('userId');
  const learningTrack = c.get('learningTrack');

  try {
    const [total, grouped] = await Promise.all([
      c.env.DB.prepare(
        `SELECT ${SUMMARY_SELECT}
         FROM learning_activity_events
         WHERE user_id = ? AND learning_track = ? AND occurred_at >= ?`,
      ).bind(userId, learningTrack, cutoff).first<SummaryRow>(),
      c.env.DB.prepare(
        `SELECT learning_track, level_tag, section, mode, ${SUMMARY_SELECT}
         FROM learning_activity_events
         WHERE user_id = ? AND learning_track = ? AND occurred_at >= ?
         GROUP BY learning_track, level_tag, section, mode
         ORDER BY level_tag, section, mode`,
      ).bind(userId, learningTrack, cutoff).all<SummaryRow>(),
    ]);

    const response: LearningActivitySummary = {
      window: parsed.data.window,
      from: new Date(cutoff * 1000).toISOString(),
      totals: counters(total),
      groups: (grouped.results ?? []).map((row) => ({
        learning_track: row.learning_track,
        level_tag: row.level_tag,
        section: row.section,
        mode: row.mode,
        ...counters(row),
      })),
    };
    return ok(c, response);
  } catch (error) {
    console.error({ event: 'activity_summary_error', error_name: safeErrorName(error) });
    return internalError(c, '학습 활동 요약을 불러오지 못했습니다');
  }
});

export { activity };

