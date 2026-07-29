import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
  topikExamLevelSchema,
  topikPracticeListSchema,
  topikPracticeSolutionSchema,
  topikReleasedContentListSchema,
  topikSectionSchema,
  type TopikPlacementAudioDto,
  type TopikReleasedContentItemDto,
  type TopikPracticeQuestionDto,
} from '@nihongo-n3/shared';

import { appSessionAuth } from '../lib/auth-session.js';
import type { AppEnv } from '../types.js';

const topikPracticeOA = new OpenAPIHono<AppEnv>();
const BANK_VERSION = 'v1';

const problemSchema = z.object({ title: z.string(), status: z.number().int(), detail: z.string() });

type PracticeRow = {
  id: string;
  exam_level: 'TOPIK-I' | 'TOPIK-II';
  section: 'listening' | 'writing' | 'reading';
  question_type: 'choice' | 'writing';
  skill: string;
  difficulty: number;
  prompt_ko: string;
  prompt_ja: string;
  prompt_en: string;
  choices_json: string;
  answer_index: number | null;
  explanation_ko: string;
  explanation_ja: string;
  explanation_en: string;
  sample_answer_ko: string | null;
  sample_answer_ja: string | null;
  sample_answer_en: string | null;
  audio_script_ko: string | null;
  audio_r2_key: string | null;
};

type ReleasedContentRow = {
  id: string;
  stable_ref: string;
  content_release: string;
  exam_level: 'TOPIK-I' | 'TOPIK-II';
  exam_band: 'beginner' | 'intermediate' | 'advanced';
  section: 'listening' | 'writing' | 'reading';
  item_kind: 'lesson' | 'vocab' | 'grammar' | 'character' | 'listening' | 'reading' | 'writing' | 'practice';
  skill: string;
  difficulty: number;
  prompt_ko: string;
  prompt_ja: string;
  prompt_en: string;
};

function parseChoices(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

function audioDto(row: PracticeRow): TopikPlacementAudioDto | null {
  if (row.section !== 'listening') return null;
  if (row.audio_r2_key) {
    const path = row.audio_r2_key.split('/').map(encodeURIComponent).join('/');
    return { kind: 'r2', url: `/api/v1/audio/${path}` };
  }
  return { kind: 'unavailable', reason: row.audio_script_ko?.trim() ? 'preparing' : 'not-provided' };
}

function publicQuestion(row: PracticeRow): TopikPracticeQuestionDto {
  return {
    id: row.id,
    exam_level: row.exam_level,
    section: row.section,
    question_type: row.question_type,
    skill: row.skill,
    difficulty: row.difficulty,
    prompt_ko: row.prompt_ko,
    prompt_ja: row.prompt_ja,
    prompt_en: row.prompt_en,
    choices: parseChoices(row.choices_json),
    audio: audioDto(row),
  };
}

function publicReleasedContent(row: ReleasedContentRow): TopikReleasedContentItemDto {
  return {
    id: row.id,
    stable_ref: row.stable_ref,
    content_release: row.content_release,
    exam_level: row.exam_level,
    exam_band: row.exam_band,
    section: row.section,
    item_kind: row.item_kind,
    skill: row.skill,
    difficulty: row.difficulty,
    prompt_ko: row.prompt_ko,
    prompt_ja: row.prompt_ja,
    prompt_en: row.prompt_en,
  };
}

function isTopikTrack(c: { get: (key: 'learningTrack') => string }) {
  return c.get('learningTrack') === 'topik-ko';
}

topikPracticeOA.use('/tracks/topik-ko/practice/*', appSessionAuth);
topikPracticeOA.use('/tracks/topik-ko/content/*', appSessionAuth);

const listRoute = createRoute({
  method: 'get',
  path: '/tracks/topik-ko/practice',
  tags: ['TOPIK Practice'],
  summary: '자체 저작 TOPIK I/II 학습 문항 조회',
  description: '공식 TOPIK 문항·정답·음원이 아닌, 출처와 이중 검수를 기록한 자체 저작 학습 문항만 반환합니다. 정답과 해설은 포함하지 않습니다.',
  request: { query: z.object({ exam_level: topikExamLevelSchema, section: topikSectionSchema }) },
  responses: {
    200: { description: '정답을 제외한 연습 문항', content: { 'application/json': { schema: z.object({ data: topikPracticeListSchema }) } } },
    401: { description: '인증 필요', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK 트랙 필요', content: { 'application/json': { schema: problemSchema } } },
    503: { description: '검수 문제은행 미출시', content: { 'application/json': { schema: problemSchema } } },
  },
});

topikPracticeOA.openapi(listRoute, async (c) => {
  if (!isTopikTrack(c)) return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  const { exam_level: examLevel, section } = c.req.valid('query');
  const result = await c.env.DB.prepare(
    `SELECT id, exam_level, section, question_type, skill, difficulty, prompt_ko, prompt_ja, prompt_en,
            choices_json, answer_index, explanation_ko, explanation_ja, explanation_en,
            sample_answer_ko, sample_answer_ja, sample_answer_en, audio_script_ko, audio_r2_key
       FROM topik_practice_questions
      WHERE learning_track = 'topik-ko' AND bank_version = ? AND is_published = 1
        AND exam_level = ? AND section = ?
      ORDER BY difficulty, id`,
  ).bind(BANK_VERSION, examLevel, section).all<PracticeRow>();
  const rows = result.results ?? [];
  if (rows.length === 0) return c.json({ title: 'Practice unavailable', status: 503, detail: '검수된 자체 저작 TOPIK 학습 문항이 아직 출시되지 않았습니다.' }, 503);
  return c.json({ data: { bank_version: BANK_VERSION, exam_level: examLevel, section, questions: rows.map(publicQuestion) } }, 200);
});

const releasedContentRoute = createRoute({
  method: 'get',
  path: '/tracks/topik-ko/content',
  tags: ['TOPIK Content'],
  summary: '출시된 TOPIK 커리큘럼 항목 조회',
  description: 'immutable content release가 published 상태인 TOPIK 항목만 반환합니다. 정답, 해설, source provenance, reviewer 정보는 포함하지 않습니다.',
  request: { query: z.object({ exam_level: topikExamLevelSchema, section: topikSectionSchema }) },
  responses: {
    200: { description: '출시된 TOPIK 공개 항목', content: { 'application/json': { schema: z.object({ data: topikReleasedContentListSchema }) } } },
    401: { description: '인증 필요', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK 트랙 필요', content: { 'application/json': { schema: problemSchema } } },
    503: { description: '해당 영역의 published release 없음', content: { 'application/json': { schema: problemSchema } } },
  },
});

topikPracticeOA.openapi(releasedContentRoute, async (c) => {
  if (!isTopikTrack(c)) return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  const { exam_level: examLevel, section } = c.req.valid('query');
  const result = await c.env.DB.prepare(
    `SELECT i.id, i.stable_ref, r.content_version AS content_release,
            i.exam_level, i.exam_band, i.section, i.item_kind, i.skill, i.difficulty,
            i.prompt_ko, i.prompt_ja, i.prompt_en
       FROM topik_content_items i
       JOIN content_releases r ON r.id = i.release_id
      WHERE i.learning_track = 'topik-ko'
        AND r.learning_track = 'topik-ko'
        AND r.release_state = 'published'
        AND i.exam_level = ? AND i.section = ?
      ORDER BY r.published_at DESC, r.id DESC, i.difficulty, i.id`,
  ).bind(examLevel, section).all<ReleasedContentRow>();
  const rows = result.results ?? [];
  if (rows.length === 0) {
    return c.json({ title: 'Content unavailable', status: 503, detail: '해당 TOPIK 영역의 검수·출시된 콘텐츠가 아직 없습니다.' }, 503);
  }
  return c.json({ data: {
    content_release: rows[0]!.content_release,
    exam_level: examLevel,
    section,
    items: rows.map(publicReleasedContent),
  } }, 200);
});

const solutionRoute = createRoute({
  method: 'get',
  path: '/tracks/topik-ko/practice/questions/{questionId}/solution',
  tags: ['TOPIK Practice'],
  summary: '자체 저작 TOPIK 학습 문항의 해설 확인',
  description: '학습자가 해설 확인을 선택한 경우에만 자체 저작 정답·해설·쓰기 예시를 반환합니다.',
  request: { params: z.object({ questionId: z.string().min(1).max(100) }) },
  responses: {
    200: { description: '자체 저작 해설', content: { 'application/json': { schema: z.object({ data: topikPracticeSolutionSchema }) } } },
    401: { description: '인증 필요', content: { 'application/json': { schema: problemSchema } } },
    404: { description: '문항 없음', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK 트랙 필요', content: { 'application/json': { schema: problemSchema } } },
  },
});

topikPracticeOA.openapi(solutionRoute, async (c) => {
  if (!isTopikTrack(c)) return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  const { questionId } = c.req.valid('param');
  const row = await c.env.DB.prepare(
    `SELECT id, question_type, answer_index, explanation_ko, explanation_ja, explanation_en,
            sample_answer_ko, sample_answer_ja, sample_answer_en
       FROM topik_practice_questions
      WHERE id = ? AND learning_track = 'topik-ko' AND bank_version = ? AND is_published = 1`,
  ).bind(questionId, BANK_VERSION).first<Pick<PracticeRow,
    'id' | 'question_type' | 'answer_index' | 'explanation_ko' | 'explanation_ja' | 'explanation_en' | 'sample_answer_ko' | 'sample_answer_ja' | 'sample_answer_en'
  >>();
  if (!row) return c.json({ title: 'Not found', status: 404, detail: '검수된 TOPIK 학습 문항을 찾을 수 없습니다.' }, 404);
  return c.json({ data: {
    question_id: row.id,
    question_type: row.question_type,
    answer_index: row.answer_index,
    explanation_ko: row.explanation_ko,
    explanation_ja: row.explanation_ja,
    explanation_en: row.explanation_en,
    sample_answer_ko: row.sample_answer_ko,
    sample_answer_ja: row.sample_answer_ja,
    sample_answer_en: row.sample_answer_en,
  } }, 200);
});

export { topikPracticeOA };
