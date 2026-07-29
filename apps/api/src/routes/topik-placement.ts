import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
  topikPlacementAttemptSchema,
  topikPlacementResultSchema,
  topikPlacementStartBodySchema,
  topikPlacementSubmitBodySchema,
  type TopikPlacementAudioDto,
  type TopikPlacementQuestionDto,
} from '@nihongo-n3/shared';

import { appSessionAuth } from '../lib/auth-session.js';
import type { AppEnv } from '../types.js';

const topikPlacementOA = new OpenAPIHono<AppEnv>();
const BANK_VERSION = 'v2';
const REQUIRED_SECTION_SIZE = 12;

const problemSchema = z.object({
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
});

type QuestionRow = {
  id: string;
  section: 'listening' | 'reading';
  skill: string;
  difficulty: number;
  prompt_ko: string;
  prompt_ja: string;
  prompt_en: string;
  choices_json: string;
  answer_index: number;
  explanation_en: string;
  explanation_ko: string;
  explanation_ja: string;
  audio_script_ko: string | null;
  audio_r2_key: string | null;
};

type AttemptRow = {
  id: string;
  user_id: string;
  bank_version: string;
  instruction_language: 'ko' | 'en' | 'ja';
  status: 'in_progress' | 'completed';
  question_ids_json: string;
  started_at: number;
};

function parseChoices(value: string): string[] {
  try {
    const choices = JSON.parse(value) as unknown;
    return Array.isArray(choices) && choices.every((choice) => typeof choice === 'string') ? choices : [];
  } catch {
    return [];
  }
}

function audioDto(row: QuestionRow): TopikPlacementAudioDto | null {
  if (row.section !== 'listening') return null;
  if (row.audio_r2_key) {
    const path = row.audio_r2_key.split('/').map(encodeURIComponent).join('/');
    return { kind: 'r2', url: `/api/v1/audio/${path}` };
  }
  if (row.audio_script_ko?.trim()) return { kind: 'browser-fallback', text_ko: row.audio_script_ko };
  return { kind: 'unavailable', reason: 'not-provided' };
}

function publicQuestion(row: QuestionRow): TopikPlacementQuestionDto {
  return {
    id: row.id,
    section: row.section,
    skill: row.skill,
    difficulty: row.difficulty,
    prompt_ko: row.prompt_ko,
    prompt_ja: row.prompt_ja,
    prompt_en: row.prompt_en,
    choices: parseChoices(row.choices_json),
    audio: audioDto(row),
  };
}

async function releasedQuestions(db: D1Database): Promise<QuestionRow[]> {
  const result = await db.prepare(
    `SELECT id, section, skill, difficulty, prompt_ko, prompt_ja, prompt_en, choices_json,
            answer_index, explanation_en, explanation_ko, explanation_ja, audio_script_ko, audio_r2_key
       FROM topik_placement_questions
      WHERE learning_track = 'topik-ko' AND bank_version = ? AND is_published = 1
      ORDER BY CASE section WHEN 'listening' THEN 0 ELSE 1 END, difficulty, id`,
  ).bind(BANK_VERSION).all<QuestionRow>();
  const rows = result.results ?? [];
  const listening = rows.filter((row) => row.section === 'listening').length;
  const reading = rows.filter((row) => row.section === 'reading').length;
  return listening >= REQUIRED_SECTION_SIZE && reading >= REQUIRED_SECTION_SIZE ? rows : [];
}

topikPlacementOA.use('/tracks/topik-ko/placement/*', appSessionAuth);

const startRoute = createRoute({
  method: 'post',
  path: '/tracks/topik-ko/placement/attempts',
  tags: ['TOPIK Placement'],
  summary: 'TOPIK I 배치 진단 시작',
  request: { body: { content: { 'application/json': { schema: topikPlacementStartBodySchema } } } },
  responses: {
    201: { description: '정답을 제외한 진단 문항', content: { 'application/json': { schema: z.object({ data: topikPlacementAttemptSchema }) } } },
    401: { description: '인증 필요', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK 트랙 필요', content: { 'application/json': { schema: problemSchema } } },
    503: { description: '검수 문제은행 미출시', content: { 'application/json': { schema: problemSchema } } },
  },
});

topikPlacementOA.openapi(startRoute, async (c) => {
  if (c.get('learningTrack') !== 'topik-ko') {
    return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  }
  const body = c.req.valid('json');
  const questions = await releasedQuestions(c.env.DB);
  if (questions.length === 0) {
    return c.json({ title: 'Placement unavailable', status: 503, detail: '검수된 TOPIK I 진단 문제은행이 아직 출시되지 않았습니다.' }, 503);
  }

  const id = crypto.randomUUID();
  const userId = c.get('userId');
  const startedAt = Math.floor(Date.now() / 1000);
  await c.env.DB.prepare(
    `INSERT INTO topik_placement_attempts
       (id, user_id, learning_track, bank_version, instruction_language, status, question_ids_json, started_at)
     VALUES (?, ?, 'topik-ko', ?, ?, 'in_progress', ?, ?)`,
  ).bind(id, userId, BANK_VERSION, body.instruction_language, JSON.stringify(questions.map((item) => item.id)), startedAt).run();

  return c.json({ data: {
    id,
    bank_version: BANK_VERSION,
    status: 'in_progress' as const,
    instruction_language: body.instruction_language,
    questions: questions.map(publicQuestion),
    started_at: startedAt,
  } }, 201);
});

const submitRoute = createRoute({
  method: 'post',
  path: '/tracks/topik-ko/placement/attempts/{attemptId}/submit',
  tags: ['TOPIK Placement'],
  summary: 'TOPIK I 배치 진단 제출 및 채점',
  request: {
    params: z.object({ attemptId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: topikPlacementSubmitBodySchema } } },
  },
  responses: {
    200: { description: '채점과 학습 밴드', content: { 'application/json': { schema: z.object({ data: topikPlacementResultSchema }) } } },
    400: { description: '누락·중복 답안', content: { 'application/json': { schema: problemSchema } } },
    401: { description: '인증 필요', content: { 'application/json': { schema: problemSchema } } },
    404: { description: '응시 기록 없음', content: { 'application/json': { schema: problemSchema } } },
    409: { description: '이미 제출 또는 트랙 불일치', content: { 'application/json': { schema: problemSchema } } },
  },
});

topikPlacementOA.openapi(submitRoute, async (c) => {
  if (c.get('learningTrack') !== 'topik-ko') {
    return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  }
  const { attemptId } = c.req.valid('param');
  const { answers } = c.req.valid('json');
  const attempt = await c.env.DB.prepare(
    `SELECT id, user_id, bank_version, instruction_language, status, question_ids_json, started_at
       FROM topik_placement_attempts
      WHERE id = ? AND user_id = ? AND learning_track = 'topik-ko'`,
  ).bind(attemptId, c.get('userId')).first<AttemptRow>();
  if (!attempt) return c.json({ title: 'Not found', status: 404, detail: '응시 기록을 찾을 수 없습니다.' }, 404);
  if (attempt.status !== 'in_progress') return c.json({ title: 'Already submitted', status: 409, detail: '이미 제출된 진단입니다.' }, 409);

  const questionIds = JSON.parse(attempt.question_ids_json) as string[];
  const answerMap = new Map(answers.map((answer) => [answer.question_id, answer.selected_index]));
  if (answerMap.size !== answers.length || questionIds.length !== answerMap.size || questionIds.some((id) => !answerMap.has(id))) {
    return c.json({ title: 'Invalid answers', status: 400, detail: '모든 문항에 중복 없이 한 번씩 답해야 합니다.' }, 400);
  }

  const placeholders = questionIds.map(() => '?').join(',');
  const result = await c.env.DB.prepare(
    `SELECT id, section, skill, difficulty, prompt_ko, prompt_ja, prompt_en, choices_json,
            answer_index, explanation_en, explanation_ko, explanation_ja, audio_script_ko, audio_r2_key
       FROM topik_placement_questions
      WHERE bank_version = ? AND is_published = 1 AND id IN (${placeholders})`,
  ).bind(attempt.bank_version, ...questionIds).all<QuestionRow>();
  const rows = result.results ?? [];
  if (rows.length !== questionIds.length) return c.json({ title: 'Question set changed', status: 409, detail: '문제은행 버전이 변경되었습니다. 새 진단을 시작하세요.' }, 409);

  const scored = rows.map((row) => {
    const selectedIndex = answerMap.get(row.id) as number;
    return { row, selectedIndex, correct: selectedIndex === row.answer_index };
  });
  const percent = (items: typeof scored) => items.length === 0 ? 0 : Math.round(items.filter((item) => item.correct).length / items.length * 100);
  const scoreTotal = percent(scored);
  const scoreListening = percent(scored.filter((item) => item.row.section === 'listening'));
  const scoreReading = percent(scored.filter((item) => item.row.section === 'reading'));
  const resultBand: 'starter' | 'foundation' | 'ready' = scoreTotal >= 80 ? 'ready' : scoreTotal >= 50 ? 'foundation' : 'starter';
  const completedAt = Math.floor(Date.now() / 1000);

  await c.env.DB.batch([
    ...scored.map((item) => c.env.DB.prepare(
      `INSERT INTO topik_placement_responses (attempt_id, question_id, selected_index, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(attemptId, item.row.id, item.selectedIndex, item.correct ? 1 : 0, completedAt)),
    c.env.DB.prepare(
      `UPDATE topik_placement_attempts
          SET status = 'completed', score_total = ?, score_listening = ?, score_reading = ?, result_band = ?, completed_at = ?
        WHERE id = ? AND status = 'in_progress'`,
    ).bind(scoreTotal, scoreListening, scoreReading, resultBand, completedAt, attemptId),
  ]);

  return c.json({ data: {
    attempt_id: attemptId,
    score_total: scoreTotal,
    score_listening: scoreListening,
    score_reading: scoreReading,
    result_band: resultBand,
    answers: scored.map((item) => ({
      question_id: item.row.id,
      selected_index: item.selectedIndex,
      answer_index: item.row.answer_index,
      is_correct: item.correct,
      explanation_en: item.row.explanation_en,
      explanation_ko: item.row.explanation_ko,
      explanation_ja: item.row.explanation_ja,
    })),
  } }, 200);
});

const latestRoute = createRoute({
  method: 'get',
  path: '/tracks/topik-ko/placement/latest',
  tags: ['TOPIK Placement'],
  summary: '최근 TOPIK 진단 결과',
  responses: {
    200: { description: '최근 결과 또는 null', content: { 'application/json': { schema: z.object({ data: z.object({
      attempt_id: z.string(), score_total: z.number().int(), score_listening: z.number().int(), score_reading: z.number().int(), result_band: z.enum(['starter', 'foundation', 'ready']), completed_at: z.number().int(),
    }).nullable() }) } } },
    401: { description: '인증 필요', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK 트랙 필요', content: { 'application/json': { schema: problemSchema } } },
  },
});

topikPlacementOA.openapi(latestRoute, async (c) => {
  if (c.get('learningTrack') !== 'topik-ko') {
    return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  }
  const row = await c.env.DB.prepare(
    `SELECT id AS attempt_id, score_total, score_listening, score_reading, result_band, completed_at
       FROM topik_placement_attempts
      WHERE user_id = ? AND learning_track = 'topik-ko' AND status = 'completed'
      ORDER BY completed_at DESC LIMIT 1`,
  ).bind(c.get('userId')).first<{
    attempt_id: string; score_total: number; score_listening: number; score_reading: number; result_band: 'starter' | 'foundation' | 'ready'; completed_at: number;
  }>();
  return c.json({ data: row ?? null }, 200);
});

const reviewRoute = createRoute({
  method: 'get',
  path: '/tracks/topik-ko/placement/review',
  tags: ['TOPIK Placement'],
  summary: '최근 진단 오답 복습',
  responses: {
    200: { description: '제출 완료 후 공개되는 최근 오답과 해설', content: { 'application/json': { schema: z.object({ data: z.array(z.object({
      question_id: z.string(), section: z.enum(['listening', 'reading']), prompt_ko: z.string(), prompt_ja: z.string(), prompt_en: z.string(), choices: z.array(z.string()), selected_index: z.number().int(), answer_index: z.number().int(), explanation_en: z.string(), explanation_ko: z.string(), explanation_ja: z.string(),
    })) }) } } },
    401: { description: '인증 필요', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK 트랙 필요', content: { 'application/json': { schema: problemSchema } } },
  },
});

topikPlacementOA.openapi(reviewRoute, async (c) => {
  if (c.get('learningTrack') !== 'topik-ko') {
    return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  }
  const rows = await c.env.DB.prepare(
    `SELECT q.id AS question_id, q.section, q.prompt_ko, q.prompt_ja, q.prompt_en, q.choices_json,
            r.selected_index, q.answer_index, q.explanation_en, q.explanation_ko, q.explanation_ja
       FROM topik_placement_responses r
       JOIN topik_placement_questions q ON q.id = r.question_id
      WHERE r.attempt_id = (
        SELECT id FROM topik_placement_attempts
         WHERE user_id = ? AND learning_track = 'topik-ko' AND status = 'completed'
         ORDER BY completed_at DESC LIMIT 1
      ) AND r.is_correct = 0
      ORDER BY q.section, q.difficulty, q.id`,
  ).bind(c.get('userId')).all<{
    question_id: string; section: 'listening' | 'reading'; prompt_ko: string; prompt_ja: string; prompt_en: string; choices_json: string; selected_index: number; answer_index: number; explanation_en: string; explanation_ko: string; explanation_ja: string;
  }>();
  return c.json({ data: (rows.results ?? []).map((row) => ({
    question_id: row.question_id,
    section: row.section,
    prompt_ko: row.prompt_ko,
    prompt_ja: row.prompt_ja,
    prompt_en: row.prompt_en,
    choices: parseChoices(row.choices_json),
    selected_index: row.selected_index,
    answer_index: row.answer_index,
    explanation_en: row.explanation_en,
    explanation_ko: row.explanation_ko,
    explanation_ja: row.explanation_ja,
  })) }, 200);
});

export { topikPlacementOA };
