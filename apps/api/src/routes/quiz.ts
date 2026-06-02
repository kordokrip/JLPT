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

const quiz = new Hono<AppEnv>();
quiz.use('*', cfAccessAuth);

// ───────────────────────────────────────────────────────
// 헬퍼: Fisher-Yates 셔플
// ───────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function buildChoices(answer: string, candidates: string[], maxDistractors = 3): string[] {
  const seen = new Set<string>();
  const answerKey = answer.trim();
  if (answerKey) seen.add(answerKey);

  const distractors: string[] = [];
  for (const candidate of shuffle(candidates)) {
    const key = candidate.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    distractors.push(candidate);
    if (distractors.length >= maxDistractors) break;
  }

  return shuffle([answer, ...distractors]);
}

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
  const body = quizGenerateBodySchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!body.success) return badRequest(c, body.error.message);

  const { mode, level, count } = body.data;
  const userId = c.get('userId');
  const db = c.env.DB;

  type Question = {
    id:       string;
    type:     string;
    prompt:   string;
    choices:  string[];
    answer:   string;
    item_id:  number;
    audio_key?: string;
    script_ja?: string;
    script_ko?: string;
  };

  const questions: Question[] = [];

  try {
    if (mode === 'vocab_mc') {
      // 정답 후보. N3 원본 중 일부는 한국어 의미가 비어 있어, 운영 퀴즈는
      // 요청 레벨 데이터가 부족할 때 의미가 있는 하위/전체 데이터로 폴백한다.
      let pool = await loadRows<{ id: number; word: string; meaning_ko: string }>(
        db,
        `SELECT id, ja AS word, ko AS meaning_ko FROM vocab
         WHERE level = ?
           AND ja != ''
           AND ko != ''
         ORDER BY RANDOM() LIMIT ?`,
        [level, count * 4],
      );
      if (pool.length < count) {
        pool = await loadRows<{ id: number; word: string; meaning_ko: string }>(
          db,
          `SELECT id, ja AS word, ko AS meaning_ko FROM vocab
           WHERE ja != ''
             AND ko != ''
           ORDER BY RANDOM() LIMIT ?`,
          [count * 4],
        );
      }
      const answers = pool.slice(0, count);

      for (const ans of answers) {
        const distractorCandidates = pool
          .filter((r) => r.id !== ans.id)
          .map((r) => r.meaning_ko);

        questions.push({
          id:      `q_${ans.id}`,
          type:    'vocab_mc',
          prompt:  ans.word,
          choices: buildChoices(ans.meaning_ko, distractorCandidates),
          answer:  ans.meaning_ko,
          item_id: ans.id,
        });
      }
    } else if (mode === 'kanji_reading') {
      let pool = await loadRows<{ id: number; kanji: string; primary_reading: string }>(
        db,
        `SELECT id, char AS kanji, COALESCE(on_yomi, kun_yomi, '') AS primary_reading FROM kanji
         WHERE jlpt_level = ?
           AND COALESCE(on_yomi, kun_yomi, '') != ''
         ORDER BY RANDOM() LIMIT ?`,
        [level, count * 4],
      );
      if (pool.length < count) {
        pool = await loadRows<{ id: number; kanji: string; primary_reading: string }>(
          db,
          `SELECT id, char AS kanji, COALESCE(on_yomi, kun_yomi, '') AS primary_reading FROM kanji
           WHERE COALESCE(on_yomi, kun_yomi, '') != ''
           ORDER BY RANDOM() LIMIT ?`,
          [count * 4],
        );
      }
      const answers = pool.slice(0, count);

      for (const ans of answers) {
        const distractorCandidates = pool
          .filter((r) => r.id !== ans.id)
          .map((r) => r.primary_reading);

        questions.push({
          id:      `q_${ans.id}`,
          type:    'kanji_reading',
          prompt:  ans.kanji,
          choices: buildChoices(ans.primary_reading, distractorCandidates),
          answer:  ans.primary_reading,
          item_id: ans.id,
        });
      }
    } else if (mode === 'grammar_fill') {
      let rawPool = await loadRows<{ id: number; pattern: string; examples: string }>(
        db,
        `SELECT id, pattern, examples FROM grammar
         WHERE level = ?
           AND examples IS NOT NULL
           AND examples != '[]'
         ORDER BY RANDOM() LIMIT ?`,
        [level, count * 4],
      );
      if (rawPool.length < count) {
        rawPool = await loadRows<{ id: number; pattern: string; examples: string }>(
          db,
          `SELECT id, pattern, examples FROM grammar
           WHERE examples IS NOT NULL
             AND examples != '[]'
           ORDER BY RANDOM() LIMIT ?`,
          [count * 4],
        );
      }

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
          choices: buildChoices(ans.pattern, distractorCandidates),
          answer:  ans.pattern,
          item_id: ans.id,
        });
      }
    } else if (mode === 'listening') {
      let pool = await loadRows<{ id: number; sentence_ja: string; sentence_ko: string; audio_r2_key: string | null; level: string }>(
        db,
        `SELECT id, ja AS sentence_ja, ko AS sentence_ko, audio_r2_key, level
         FROM sentences
         WHERE level = ?
           AND ja != ''
           AND ko != ''
         ORDER BY RANDOM() LIMIT ?`,
        [level, count * 4],
      );
      if (pool.length < count) {
        pool = await loadRows<{ id: number; sentence_ja: string; sentence_ko: string; audio_r2_key: string | null; level: string }>(
          db,
          `SELECT id, ja AS sentence_ja, ko AS sentence_ko, audio_r2_key, level
           FROM sentences
           WHERE ja != ''
             AND ko != ''
           ORDER BY RANDOM() LIMIT ?`,
          [count * 4],
        );
      }
      const answers = pool.slice(0, count);

      for (const ans of answers) {
        const distractorCandidates = pool
          .filter((r) => r.id !== ans.id)
          .map((r) => r.sentence_ko);

        questions.push({
          id:       `q_${ans.id}`,
          type:     'listening',
          prompt:   '음성을 듣고 올바른 해석을 고르세요.',
          choices:  buildChoices(ans.sentence_ko, distractorCandidates),
          answer:   ans.sentence_ko,
          item_id:  ans.id,
          audio_key: ans.audio_r2_key ?? `audio/sentence/${ans.level.toLowerCase()}/${ans.id}.mp3`,
          script_ja: ans.sentence_ja,
          script_ko: ans.sentence_ko,
        });
      }
    }
  } catch (err) {
    console.error('[quiz/generate]', err);
    return internalError(c, '문제 생성 중 오류가 발생했습니다');
  }

  if (questions.length === 0) {
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
           (user_id, quiz_type, mode, level, total, correct,
            questions_json, started_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      )
      .bind(userId, mode, mode, level, questions.length, questionsJson, now, now, now)
      .run();
    quizId = result.meta.last_row_id as number;
  } catch {
    // mode/level 컬럼이 아직 없으면 기존 스키마로 폴백
    const result = await db
      .prepare(
        `INSERT INTO quiz_attempts
           (user_id, quiz_type, total, correct, detail_json, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, ?, ?)`,
      )
      .bind(userId, mode, questions.length, questionsJson, now, now)
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
  };

  const attempt = await db
    .prepare('SELECT * FROM quiz_attempts WHERE id = ? AND user_id = ?')
    .bind(quiz_id, userId)
    .first<StoredAttempt>();

  if (!attempt) return notFound(c, `quiz_id=${quiz_id} 를 찾을 수 없습니다`);

  const raw = attempt.questions_json ?? attempt.detail_json ?? '[]';
  type StoredQ = { id: string; answer: string; item_id: number };
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

  // 결과 업데이트. 로컬/이전 D1 스키마에는 finished_at 컬럼이 없을 수 있다.
  try {
    await db
      .prepare(
        `UPDATE quiz_attempts
           SET correct = ?, detail_json = ?, finished_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(correctCount, JSON.stringify(detail), now, now, quiz_id)
      .run();
  } catch {
    await db
      .prepare(
        `UPDATE quiz_attempts
           SET correct = ?, detail_json = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(correctCount, JSON.stringify(detail), now, quiz_id)
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
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 20`,
      )
      .bind(userId)
      .all<HistoryRow>();
  } catch {
    rows = await c.env.DB
      .prepare(
        `SELECT id, quiz_type, total, correct, created_at, NULL AS finished_at
         FROM quiz_attempts
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 20`,
      )
      .bind(userId)
      .all<HistoryRow>();
  }

  return ok(c, rows.results ?? []);
});

export { quiz };
