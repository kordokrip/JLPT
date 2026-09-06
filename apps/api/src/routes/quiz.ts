/**
 * apps/api/src/routes/quiz.ts
 *
 * Phase 7-D  퀴즈 시스템
 *
 * POST /quiz/generate   — 문제 생성 (vocab_mc | grammar_fill | kanji_reading | listening)
 * POST /quiz/submit     — 답안 제출 → 채점 → DB 저장
 * GET  /quiz/history    — 최근 20건 시도 이력
 *
 * 모든 엔드포인트: cfAccessAuth 필수
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { cfAccessAuth } from '../middleware/auth.js';
import { ok, created, notFound, badRequest, conflict, internalError } from '../lib/response.js';
import { quizGenerateBodySchema, quizSubmitBodySchema } from '@nihongo-n3/shared';
import { safeErrorName } from '../lib/safe-log.js';
import { generateQuizQuestions, QuizPoolError } from '../lib/quiz-questions.js';

const quiz = new Hono<AppEnv>();
quiz.use('*', cfAccessAuth);

// ───────────────────────────────────────────────────────
// ───────────────────────────────────────────────────────
// POST /quiz/generate
// ───────────────────────────────────────────────────────
quiz.post('/quiz/generate', async (c) => {
  const learningTrack = c.get('learningTrack');
  if (learningTrack !== 'jlpt-ja') {
    return notFound(c, 'TOPIK 퀴즈는 검수 및 출시 승인 전까지 제공되지 않습니다');
  }

  const body = quizGenerateBodySchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!body.success) return badRequest(c, body.error.message);

  const { mode, level, count, strategy } = body.data;
  const userId = c.get('userId');
  const db = c.env.DB;

  let questions: Awaited<ReturnType<typeof generateQuizQuestions>>;
  try { questions = await generateQuizQuestions(db, userId, body.data); }
  catch (error) {
    return error instanceof QuizPoolError ? badRequest(c, error.message) : internalError(c, '문제 생성 중 오류가 발생했습니다');
  }

  // 생성된 문제를 DB에 저장 (채점용)
  const now = new Date().toISOString();
  const questionsJson = JSON.stringify(questions);

  try {
    const result = await db
      .prepare(
        `INSERT INTO quiz_attempts
           (user_id, learning_track, quiz_type, mode, level, total, correct,
            questions_json, started_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      )
      .bind(userId, learningTrack, mode, mode, level, questions.length, questionsJson, now, now, now)
      .run();
    const quizId = result.meta.last_row_id as number;

    // 클라이언트에는 정답을 숨기고 반환
    // `script_ko` on a canonical listening item is the correct translation.
    // Keep it in the stored attempt for post-submit use, but never expose it in
    // the generation response alongside the still-unanswered choices.
    const clientQuestions = questions.map(({ answer: _answer, script_ko: _translation, ...question }) => question);
    return ok(c, { quiz_id: quizId, mode, level, questions: clientQuestions });
  } catch (error) {
    console.error({ event: 'quiz_attempt_create_error', error_name: safeErrorName(error) });
    return internalError(c, '퀴즈 시도를 저장하지 못했습니다');
  }
});

// ───────────────────────────────────────────────────────
// POST /quiz/submit
// ───────────────────────────────────────────────────────
quiz.post('/quiz/submit', async (c) => {
  const learningTrack = c.get('learningTrack');
  if (learningTrack !== 'jlpt-ja') {
    return notFound(c, 'TOPIK 퀴즈는 검수 및 출시 승인 전까지 제공되지 않습니다');
  }

  const body = quizSubmitBodySchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!body.success) return badRequest(c, body.error.message);

  const { quiz_id, answers } = body.data;
  const userId = c.get('userId');
  const db = c.env.DB;

  // 저장된 퀴즈 조회
  type StoredAttempt = {
    id: number;
    user_id: string;
    total: number;
    questions_json: string | null;
    detail_json: string | null;
    mode: string | null;
    level: string | null;
    finished_at: string | null;
  };

  const attempt = await db
    .prepare('SELECT * FROM quiz_attempts WHERE id = ? AND user_id = ? AND learning_track = ?')
    .bind(quiz_id, userId, learningTrack)
    .first<StoredAttempt>();

  if (!attempt) return notFound(c, `quiz_id=${quiz_id} 를 찾을 수 없습니다`);
  if (attempt.finished_at) return conflict(c, '이미 제출된 퀴즈입니다');

  const raw = attempt.questions_json ?? attempt.detail_json ?? '[]';
  type StoredQ = { id: string; type: string; answer: string; item_id: string | number };
  let storedQuestions: StoredQ[] = [];
  try {
    storedQuestions = JSON.parse(raw) as StoredQ[];
  } catch {
    return internalError(c, '문제 데이터가 손상되었습니다');
  }

  // 채점
  const answerMap = new Map(answers.map((a) => [a.question_id, a.answer]));
  const detail: Array<{ question_id: string; submitted: string; correct: string; is_correct: boolean }> = [];
  let correctCount = 0;

  for (const q of storedQuestions) {
    const submitted = answerMap.get(q.id) ?? '';
    const is_correct = submitted === q.answer;
    if (is_correct) correctCount++;
    detail.push({ question_id: q.id, submitted, correct: q.answer, is_correct });
  }

  const now = new Date().toISOString();
  const score = attempt.total > 0 ? Math.round((correctCount / attempt.total) * 100) : 0;
  const detailJson = JSON.stringify(detail);

  // 결과와 문항별 활동 기록을 하나의 D1 batch로 반영한다. 이벤트 ID는
  // attempt 범위에서 결정적이므로 같은 제출이 재전송되어도 중복되지 않는다.
  try {
    const update = db.prepare(
        `UPDATE quiz_attempts
         SET correct = ?, detail_json = ?, finished_at = ?, updated_at = ?
         WHERE id = ? AND learning_track = ? AND finished_at IS NULL`,
      )
      .bind(correctCount, detailJson, now, now, quiz_id, learningTrack);
    const activityStatements = storedQuestions.map((question) => {
      const submitted = answerMap.get(question.id) ?? '';
      return db.prepare(
        `INSERT OR IGNORE INTO learning_activity_events
           (event_id, user_id, learning_track, event_type, content_type, content_id,
            level_tag, mode, correct, occurred_at)
         VALUES (?, ?, ?, 'quiz_answered', ?, ?, ?, ?, ?, unixepoch())`,
      ).bind(
        `quiz:${quiz_id}:${question.id}`,
        userId,
        learningTrack,
        question.type || attempt.mode || null,
        String(question.item_id),
        attempt.level,
        question.type || attempt.mode,
        Number(submitted === question.answer),
      );
    });
    const results = await db.batch([update, ...activityStatements]);
    if (Number(results[0]?.meta.changes ?? 0) !== 1) {
      return conflict(c, '이미 제출된 퀴즈입니다');
    }
  } catch (error) {
    console.error({ event: 'quiz_submission_write_error', error_name: safeErrorName(error) });
    return internalError(c, '퀴즈 결과와 학습 활동을 저장하지 못했습니다');
  }

  return ok(c, {
    quiz_id,
    score,
    correct: correctCount,
    total: attempt.total,
    detail,
  });
});

// ───────────────────────────────────────────────────────
// GET /quiz/history
// ───────────────────────────────────────────────────────
quiz.get('/quiz/history', async (c) => {
  const userId = c.get('userId');
  const learningTrack = c.get('learningTrack');
  if (learningTrack !== 'jlpt-ja') {
    return notFound(c, 'TOPIK 퀴즈는 검수 및 출시 승인 전까지 제공되지 않습니다');
  }

  type HistoryRow = {
    id: number; quiz_type: string; total: number;
    correct: number; created_at: string; finished_at: string | null;
  };

  let rows;
  try {
    rows = await c.env.DB
      .prepare(
        `SELECT id, quiz_type, total, correct, created_at, finished_at
         FROM quiz_attempts
         WHERE user_id = ? AND learning_track = ?
         ORDER BY created_at DESC
         LIMIT 20`,
      )
      .bind(userId, learningTrack)
      .all<HistoryRow>();
  } catch {
    rows = await c.env.DB
      .prepare(
        `SELECT id, quiz_type, total, correct, created_at, NULL AS finished_at
         FROM quiz_attempts
         WHERE user_id = ? AND learning_track = ?
         ORDER BY created_at DESC
         LIMIT 20`,
      )
      .bind(userId, learningTrack)
      .all<HistoryRow>();
  }

  return ok(c, rows.results ?? []);
});

quiz.get('/quiz/attempts/:id', async (c) => {
  const track = c.get('learningTrack');
  if (track !== 'jlpt-ja' || !/^\d+$/.test(c.req.param('id'))) return notFound(c);
  const row = await c.env.DB.prepare(`SELECT id,total,correct,detail_json FROM quiz_attempts
    WHERE id=? AND user_id=? AND learning_track=? AND finished_at IS NOT NULL`)
    .bind(Number(c.req.param('id')),c.get('userId'),track).first<{id:number;total:number;correct:number;detail_json:string}>();
  if (!row) return notFound(c);
  c.header('Cache-Control', 'private, no-store');
  return ok(c, { quiz_id:row.id,total:row.total,correct:row.correct,
    score:row.total ? Math.round(row.correct/row.total*100):0, detail:JSON.parse(row.detail_json) });
});
export { quiz };
