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
import { ok, created, notFound, badRequest, internalError } from '../lib/response.js';
import { quizGenerateBodySchema, quizSubmitBodySchema } from '@nihongo-n3/shared';
import { safeErrorName } from '../lib/safe-log.js';
import { buildBalancedChoices, cryptoRandomIndex, rotatingAnswerIndex } from '../lib/quiz-choice-order.js';

const quiz = new Hono<AppEnv>();
quiz.use('*', cfAccessAuth);

// ───────────────────────────────────────────────────────
function firstExampleJa(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    const first = parsed[0];
    const value = first?.ja ?? first?.jp ?? first?.example_ja ?? first?.example_jp;
    return typeof value === 'string' && value.trim() ? value : null;
  } catch {
    return null;
  }
}

async function loadRows<T>(
  db: AppEnv['Bindings']['DB'],
  sql: string,
  bindings: unknown[],
): Promise<T[]> {
  const rows = await db.prepare(sql).bind(...bindings).all<T>();
  return rows.results ?? [];
}

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

  type Question = {
    id:       string;
    type:     string;
    prompt:   string;
    choices:  string[];
    answer:   string;
    item_id:  string | number;
    script_ja?: string;
    script_ko?: string;
  };

  const questions: Question[] = [];
  const answerPositionOffset = cryptoRandomIndex(4);
  let answerPositionOrdinal = 0;
  const nextChoices = (answer: string, candidates: string[]): string[] => {
    const choices = buildBalancedChoices(
      answer,
      candidates,
      rotatingAnswerIndex(answerPositionOffset, answerPositionOrdinal),
    );
    answerPositionOrdinal += 1;
    return choices;
  };
  const ordering = (tableAlias: string): { sql: string; bindings: unknown[] } => {
    if (strategy === 'random') return { sql: 'ORDER BY RANDOM() LIMIT ?', bindings: [count * 4] };
    return {
      sql: `ORDER BY (
        SELECT count(*) FROM learning_activity_events activity
        WHERE activity.user_id = ?
          AND activity.learning_track = 'jlpt-ja'
          AND activity.event_type = 'quiz_answered'
          AND activity.content_type = ?
          AND activity.content_id = CAST(${tableAlias}.id AS TEXT)
          AND activity.correct = 0
          AND activity.occurred_at >= unixepoch() - 2592000
      ) DESC, RANDOM() LIMIT ?`,
      bindings: [userId, mode, count * 4],
    };
  };

  try {
    if (strategy === 'weakest' && level === 'N3' && (mode === 'kanji_reading' || mode === 'listening')) {
      type LocalizedChoice = { ko: string; ja: string; en: string };
      const staticRows = await loadRows<{
        id: string;
        prompt_ko: string;
        prompt_ja: string;
        choices_json: string;
        answer_index: number;
        audio_script_ja: string | null;
      }>(
        db,
        `SELECT bank.id, bank.prompt_ko, bank.prompt_ja, bank.choices_json,
                bank.answer_index, bank.audio_script_ja
           FROM jlpt_practice_questions bank
          WHERE bank.learning_track = 'jlpt-ja'
            AND bank.level = ?
            AND bank.mode = ?
            AND bank.is_published = 1
          ORDER BY (
            SELECT count(*) FROM learning_activity_events activity
             WHERE activity.user_id = ?
               AND activity.learning_track = 'jlpt-ja'
               AND activity.event_type = 'quiz_answered'
               AND activity.content_type = ?
               AND activity.content_id = bank.id
               AND activity.correct = 0
               AND activity.occurred_at >= unixepoch() - 2592000
          ) DESC, RANDOM()
          LIMIT ?`,
        [level, mode, userId, mode, count],
      );
      const mapped = staticRows.flatMap((row): Question[] => {
        let localized: LocalizedChoice[];
        try {
          localized = JSON.parse(row.choices_json) as LocalizedChoice[];
        } catch {
          return [];
        }
        const language = mode === 'kanji_reading' ? 'ja' : 'ko';
        const choices = localized.map((choice) => choice?.[language]?.trim()).filter((choice): choice is string => Boolean(choice));
        const answer = choices[row.answer_index];
        if (choices.length !== 4 || new Set(choices).size !== 4 || !answer) return [];
        return [{
          id: `q_${row.id}`,
          type: mode,
          prompt: mode === 'kanji_reading' ? row.prompt_ja : row.prompt_ko,
          choices,
          answer,
          item_id: row.id,
          ...(mode === 'listening' && row.audio_script_ja ? { script_ja: row.audio_script_ja } : {}),
        }];
      });
      if (mapped.length === count) questions.push(...mapped);
    }

    if (questions.length === 0 && mode === 'vocab_mc') {
      const order = ordering('vocab');
      const pool = await loadRows<{ id: number; word: string; meaning_ko: string }>(
        db,
        `SELECT id, ja AS word, ko AS meaning_ko FROM vocab
         WHERE level = ?
           AND ja != ''
           AND ko != ''
         ${order.sql}`,
        [level, ...order.bindings],
      );
      const answers = pool.slice(0, count);

      for (const ans of answers) {
        const distractorCandidates = pool
          .filter((r) => r.id !== ans.id)
          .map((r) => r.meaning_ko);

        questions.push({
          id:      `q_${ans.id}`,
          type:    'vocab_mc',
          prompt:  ans.word,
          choices: nextChoices(ans.meaning_ko, distractorCandidates),
          answer:  ans.meaning_ko,
          item_id: ans.id,
        });
      }
    } else if (questions.length === 0 && mode === 'kanji_reading') {
      const order = ordering('kanji');
      const pool = await loadRows<{ id: number; kanji: string; primary_reading: string }>(
        db,
        `SELECT id, char AS kanji, COALESCE(on_yomi, kun_yomi, '') AS primary_reading FROM kanji
         WHERE jlpt_level = ?
           AND COALESCE(on_yomi, kun_yomi, '') != ''
         ${order.sql}`,
        [level, ...order.bindings],
      );
      const answers = pool.slice(0, count);

      for (const ans of answers) {
        const distractorCandidates = pool
          .filter((r) => r.id !== ans.id)
          .map((r) => r.primary_reading);

        questions.push({
          id:      `q_${ans.id}`,
          type:    'kanji_reading',
          prompt:  ans.kanji,
          choices: nextChoices(ans.primary_reading, distractorCandidates),
          answer:  ans.primary_reading,
          item_id: ans.id,
        });
      }
    } else if (questions.length === 0 && mode === 'grammar_fill') {
      const order = ordering('grammar');
      const rawPool = await loadRows<{ id: number; pattern: string; examples: string }>(
        db,
        `SELECT id, pattern, examples FROM grammar
         WHERE level = ?
           AND examples IS NOT NULL
           AND examples != '[]'
         ${order.sql}`,
        [level, ...order.bindings],
      );

      const pool = rawPool
        .map((row) => ({ ...row, example_ja: firstExampleJa(row.examples) }))
        .filter((row): row is { id: number; pattern: string; examples: string; example_ja: string } => Boolean(row.example_ja));
      const answers = pool.slice(0, count);

      for (const ans of answers) {
        const prompt = ans.example_ja.replace(ans.pattern, '＿＿＿');
        const distractorCandidates = pool
          .filter((r) => r.id !== ans.id)
          .map((r) => r.pattern);

        questions.push({
          id:      `q_${ans.id}`,
          type:    'grammar_fill',
          prompt,
          choices: nextChoices(ans.pattern, distractorCandidates),
          answer:  ans.pattern,
          item_id: ans.id,
        });
      }
    } else if (questions.length === 0 && mode === 'listening') {
      const order = ordering('sentences');
      const pool = await loadRows<{ id: number; sentence_ja: string; sentence_ko: string; level: string }>(
        db,
        `SELECT id, ja AS sentence_ja, ko AS sentence_ko, level
         FROM sentences
         WHERE level = ?
           AND ja != ''
           AND ko != ''
         ${order.sql}`,
        [level, ...order.bindings],
      );
      const answers = pool.slice(0, count);

      for (const ans of answers) {
        const distractorCandidates = pool
          .filter((r) => r.id !== ans.id)
          .map((r) => r.sentence_ko);

        questions.push({
          id:       `q_${ans.id}`,
          type:     'listening',
          prompt:   '음성을 듣고 올바른 해석을 고르세요.',
          choices:  nextChoices(ans.sentence_ko, distractorCandidates),
          answer:   ans.sentence_ko,
          item_id:  ans.id,
          script_ja: ans.sentence_ja,
          script_ko: ans.sentence_ko,
        });
      }
    }
  } catch (err) {
    console.error({ event: 'quiz_generation_error', error_name: safeErrorName(err) });
    return internalError(c, '문제 생성 중 오류가 발생했습니다');
  }

  if (questions.length !== count || questions.some((question) => question.choices.length !== 4)) {
    return badRequest(c, `${level} 레벨 ${mode} 문제 데이터가 부족합니다`);
  }

  // 생성된 문제를 DB에 저장 (채점용)
  const now = new Date().toISOString();
  const questionsJson = JSON.stringify(questions);

  let quizId: number;
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
    quizId = result.meta.last_row_id as number;
  } catch {
    // mode/level 컬럼이 아직 없으면 기존 스키마로 폴백
    const result = await db
      .prepare(
        `INSERT INTO quiz_attempts
           (user_id, learning_track, quiz_type, total, correct, detail_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
      )
      .bind(userId, learningTrack, mode, questions.length, questionsJson, now, now)
      .run();
    quizId = result.meta.last_row_id as number;
  }

  // 클라이언트에는 정답을 숨기고 반환
  const clientQuestions = questions.map(({ answer: _a, ...q }) => q);

  return ok(c, { quiz_id: quizId, mode, level, questions: clientQuestions });
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
  };

  const attempt = await db
    .prepare('SELECT * FROM quiz_attempts WHERE id = ? AND user_id = ? AND learning_track = ?')
    .bind(quiz_id, userId, learningTrack)
    .first<StoredAttempt>();

  if (!attempt) return notFound(c, `quiz_id=${quiz_id} 를 찾을 수 없습니다`);

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

  // 결과와 문항별 활동 기록을 하나의 D1 batch로 반영한다. 이벤트 ID는
  // attempt 범위에서 결정적이므로 같은 제출이 재전송되어도 중복되지 않는다.
  try {
    const update = db.prepare(
        `UPDATE quiz_attempts
           SET correct = ?, detail_json = ?, finished_at = ?, updated_at = ?
         WHERE id = ? AND learning_track = ?`,
      )
      .bind(correctCount, JSON.stringify(detail), now, now, quiz_id, learningTrack);
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
    await db.batch([update, ...activityStatements]);
  } catch {
    await db
      .prepare(
        `UPDATE quiz_attempts
           SET correct = ?, detail_json = ?, updated_at = ?
         WHERE id = ? AND learning_track = ?`,
      )
      .bind(correctCount, JSON.stringify(detail), now, quiz_id, learningTrack)
      .run();
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

export { quiz };
