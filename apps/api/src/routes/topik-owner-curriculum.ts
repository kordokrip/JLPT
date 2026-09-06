import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
  topikOwnerCurriculumGradeSchema,
  topikOwnerCurriculumCompletionSchema,
  topikOwnerCurriculumDueListSchema,
  topikOwnerCurriculumListSchema,
  topikOwnerCurriculumProgressSchema,
  topikOwnerCurriculumReviewBodySchema,
  topikOwnerCurriculumReviewResultSchema,
  topikOwnerCurriculumSolutionSchema,
  type TopikOwnerCurriculumItemDto,
  type TopikOwnerCurriculumUnitDto,
  type TopikPlacementAudioDto,
} from '@nihongo-n3/shared';

import { appSessionAuth } from '../lib/auth-session.js';
import { topikCompletionStatements, reviewStatements } from '../lib/learning-effects.js';
import type { AppEnv } from '../types.js';

/**
 * Reads additive owner-authored curriculum tables. Legacy items without a
 * quality-ledger row remain visible; every quality-gated item stays hidden
 * until its linked content release is published.
 */
const topikOwnerCurriculumOA = new OpenAPIHono<AppEnv>();
const problemSchema = z.object({ title: z.string(), status: z.number().int(), detail: z.string() });

type UnitRow = {
  id: string;
  stable_ref: string;
  target_grade: number;
  section: 'vocab' | 'grammar' | 'reading' | 'listening' | 'writing';
  title_ko: string;
  title_ja: string;
  title_en: string;
};

type ItemRow = {
  id: string;
  unit_id: string;
  stable_ref: string;
  target_grade: number;
  item_type: 'vocab' | 'grammar' | 'reading' | 'listening' | 'writing';
  prompt_ko: string;
  prompt_ja: string;
  prompt_en: string;
  answer_json: string;
  audio_required: number;
  audio_text_ko: string | null;
  binding_state: 'ready' | 'unavailable' | null;
  progress_status: 'not_started' | 'in_progress' | 'completed' | null;
};

type SolutionRow = Pick<ItemRow, 'id' | 'answer_json'> & {
  explanation_ko: string;
  explanation_ja: string;
  explanation_en: string;
};

function isTopikTrack(c: { get: (key: 'learningTrack') => string }) {
  return c.get('learningTrack') === 'topik-ko';
}

import { publishedOwnerItem } from '../lib/owner-publication.js';

function parseAnswer(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function parseChoices(value: string): string[] {
  const choices = parseAnswer(value).choices;
  return Array.isArray(choices) && choices.length <= 4 && choices.every((choice) => typeof choice === 'string')
    ? choices as string[]
    : [];
}

function audioDto(row: ItemRow): TopikPlacementAudioDto | null {
  if (!row.audio_required) return null;
  const googleText = row.audio_text_ko?.trim();
  if (googleText) return { kind: 'google', text_ko: googleText };
  return { kind: 'unavailable', reason: 'not-provided' };
}

function publicItem(row: ItemRow): TopikOwnerCurriculumItemDto {
  return {
    id: row.id,
    stable_ref: row.stable_ref,
    target_grade: row.target_grade,
    item_type: row.item_type,
    prompt_ko: row.prompt_ko,
    prompt_ja: row.prompt_ja,
    prompt_en: row.prompt_en,
    choices: parseChoices(row.answer_json),
    audio: audioDto(row),
    progress_status: row.progress_status ?? 'not_started',
  };
}

topikOwnerCurriculumOA.use('/tracks/topik-ko/curriculum', appSessionAuth);
topikOwnerCurriculumOA.use('/tracks/topik-ko/curriculum/*', appSessionAuth);

const listRoute = createRoute({
  method: 'get',
  path: '/tracks/topik-ko/curriculum',
  tags: ['TOPIK Owner-authored Curriculum'],
  summary: 'TOPIK 1–6 owner-authored local curriculum units',
  description: 'Returns owner-authored curriculum records without solutions. Quality-gated items appear only after their linked content release is published.',
  request: { query: z.object({ target_grade: topikOwnerCurriculumGradeSchema }) },
  responses: {
    200: { description: 'Curriculum units without solutions or provenance', content: { 'application/json': { schema: z.object({ data: topikOwnerCurriculumListSchema }) } } },
    401: { description: 'Authentication required', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK track required', content: { 'application/json': { schema: problemSchema } } },
  },
});

topikOwnerCurriculumOA.openapi(listRoute, async (c) => {
  if (!isTopikTrack(c)) return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  const { target_grade: grade } = c.req.valid('query');
  const unitResult = await c.env.DB.prepare(
    `SELECT id, stable_ref, target_grade, section, title_ko, title_ja, title_en
       FROM topik_owner_authored_curriculum_units unit
      WHERE target_grade = ?
        AND EXISTS (
          SELECT 1 FROM topik_owner_authored_curriculum_items visible_item
          WHERE visible_item.unit_id = unit.id
            AND ${publishedOwnerItem('visible_item')}
        )
      ORDER BY section, id`,
  ).bind(grade).all<UnitRow>();
  const rows = unitResult.results ?? [];
  if (rows.length === 0) return c.json({ data: { target_grade: grade, units: [] } }, 200);

  const itemResult = await c.env.DB.prepare(
    `SELECT i.id, i.unit_id, i.stable_ref, i.target_grade, i.item_type,
            i.prompt_ko, i.prompt_ja, i.prompt_en, i.answer_json, i.audio_required, i.audio_text_ko,
            b.binding_state,
            progress.status AS progress_status
       FROM topik_owner_authored_curriculum_items i
       LEFT JOIN content_speech_bindings b
         ON b.item_type = 'topik-owner-item'
        AND b.item_id = i.id
        AND b.language = 'ko'
        AND b.speech_role = CASE WHEN i.item_type = 'listening' THEN 'listening' ELSE 'pronunciation' END
        AND b.provider = 'google-browser'
       LEFT JOIN topik_owner_curriculum_progress progress
         ON progress.item_id = i.id
        AND progress.user_id = ?
      WHERE i.target_grade = ?
        AND ${publishedOwnerItem('i')}
      ORDER BY i.unit_id, i.id`,
  ).bind(c.get('userId'), grade).all<ItemRow>();
  const itemsByUnit = new Map<string, TopikOwnerCurriculumItemDto[]>();
  for (const item of itemResult.results ?? []) {
    const items = itemsByUnit.get(item.unit_id) ?? [];
    items.push(publicItem(item));
    itemsByUnit.set(item.unit_id, items);
  }
  const units: TopikOwnerCurriculumUnitDto[] = rows.map((unit) => ({ ...unit, items: itemsByUnit.get(unit.id) ?? [] }));
  return c.json({ data: { target_grade: grade, units } }, 200);
});

const solutionRoute = createRoute({
  method: 'get',
  path: '/tracks/topik-ko/curriculum/items/{itemId}/solution',
  tags: ['TOPIK Owner-authored Curriculum'],
  summary: 'Reveal an owner-authored local curriculum solution after study',
  request: { params: z.object({ itemId: z.string().min(1).max(160) }) },
  responses: {
    200: { description: 'Solution payload', content: { 'application/json': { schema: z.object({ data: topikOwnerCurriculumSolutionSchema }) } } },
    401: { description: 'Authentication required', content: { 'application/json': { schema: problemSchema } } },
    404: { description: 'Curriculum item not found', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK track required', content: { 'application/json': { schema: problemSchema } } },
  },
});

topikOwnerCurriculumOA.openapi(solutionRoute, async (c) => {
  if (!isTopikTrack(c)) return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  const { itemId } = c.req.valid('param');
  const row = await c.env.DB.prepare(
    `SELECT id, answer_json, explanation_ko, explanation_ja, explanation_en
       FROM topik_owner_authored_curriculum_items i
      WHERE i.id = ? AND ${publishedOwnerItem('i')}`,
  ).bind(itemId).first<SolutionRow>();
  if (!row) return c.json({ title: 'Not found', status: 404, detail: 'TOPIK 1–6 자체 저작 학습 항목을 찾을 수 없습니다.' }, 404);
  return c.json({ data: {
    item_id: row.id,
    answer_payload: parseAnswer(row.answer_json),
    explanation_ko: row.explanation_ko,
    explanation_ja: row.explanation_ja,
    explanation_en: row.explanation_en,
  } }, 200);
});

const progressRoute = createRoute({
  method: 'get',
  path: '/tracks/topik-ko/curriculum/progress',
  tags: ['TOPIK Owner-authored Curriculum'],
  summary: 'Server-persisted TOPIK 1–6 curriculum progress and FSRS queue totals',
  responses: {
    200: { description: 'Progress grouped by TOPIK target grade', content: { 'application/json': { schema: z.object({ data: topikOwnerCurriculumProgressSchema }) } } },
    401: { description: 'Authentication required', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK track required', content: { 'application/json': { schema: problemSchema } } },
  },
});

topikOwnerCurriculumOA.openapi(progressRoute, async (c) => {
  if (!isTopikTrack(c)) return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  const userId = c.get('userId');
  const now = Math.floor(Date.now() / 1000);
  const summaries = await c.env.DB.prepare(
    `SELECT i.target_grade,
            COUNT(i.id) AS total_items,
            SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) AS completed_items,
            SUM(CASE WHEN card.due_at <= ? THEN 1 ELSE 0 END) AS due_cards,
            SUM(CASE WHEN card.state = 'review' THEN 1 ELSE 0 END) AS review_cards
       FROM topik_owner_authored_curriculum_items i
       LEFT JOIN topik_owner_curriculum_progress p
         ON p.item_id = i.id AND p.user_id = ?
       LEFT JOIN topik_owner_srs_cards card
         ON card.item_id = i.id AND card.user_id = ?
      WHERE ${publishedOwnerItem('i')}
      GROUP BY i.target_grade`,
  ).bind(now, userId, userId).all<{
    target_grade: number;
    total_items: number;
    completed_items: number | null;
    due_cards: number | null;
    review_cards: number | null;
  }>();
  const byGrade = new Map((summaries.results ?? []).map((summary) => [summary.target_grade, summary]));
  const grades = [1, 2, 3, 4, 5, 6].map((targetGrade) => {
    const summary = byGrade.get(targetGrade);
    return {
      target_grade: targetGrade,
      total_items: summary?.total_items ?? 0,
      completed_items: summary?.completed_items ?? 0,
      due_cards: summary?.due_cards ?? 0,
      review_cards: summary?.review_cards ?? 0,
    };
  });
  const completed = await c.env.DB.prepare(
    `SELECT p.item_id
       FROM topik_owner_curriculum_progress p
       JOIN topik_owner_authored_curriculum_items i ON i.id = p.item_id
      WHERE p.user_id = ? AND p.status = 'completed'
        AND ${publishedOwnerItem('i')}
      ORDER BY i.target_grade, i.id`,
  ).bind(userId).all<{ item_id: string }>();
  return c.json({ data: { grades, completed_item_ids: (completed.results ?? []).map((row) => row.item_id) } }, 200);
});

const completeRoute = createRoute({
  method: 'post',
  path: '/tracks/topik-ko/curriculum/items/{itemId}/complete',
  tags: ['TOPIK Owner-authored Curriculum'],
  summary: 'Mark a studied owner-curriculum item complete and introduce its FSRS card',
  request: { params: z.object({ itemId: z.string().min(1).max(160) }) },
  responses: {
    200: { description: 'Persisted progress and idempotent FSRS card', content: { 'application/json': { schema: z.object({ data: topikOwnerCurriculumCompletionSchema }) } } },
    401: { description: 'Authentication required', content: { 'application/json': { schema: problemSchema } } },
    404: { description: 'Curriculum item not found', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK track required', content: { 'application/json': { schema: problemSchema } } },
  },
});

topikOwnerCurriculumOA.openapi(completeRoute, async (c) => {
  if (!isTopikTrack(c)) return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  const { itemId } = c.req.valid('param');
  const exists = await c.env.DB.prepare(
    `SELECT i.id, i.target_grade, i.item_type
       FROM topik_owner_authored_curriculum_items i
      WHERE i.id = ? AND ${publishedOwnerItem('i')}`,
  ).bind(itemId).first<{ id: string; target_grade: number; item_type: string }>();
  if (!exists) return c.json({ title: 'Not found', status: 404, detail: 'TOPIK 1–6 자체 저작 학습 항목을 찾을 수 없습니다.' }, 404);
  const userId = c.get('userId');
  const now = Math.floor(Date.now() / 1000);
  await c.env.DB.batch(topikCompletionStatements(c.env.DB, userId, exists, now));
  const card = await c.env.DB.prepare(
    'SELECT id FROM topik_owner_srs_cards WHERE user_id = ? AND item_id = ?',
  ).bind(userId, itemId).first<{ id: number }>();
  if (!card) throw new Error('TOPIK FSRS card was not created');
  return c.json({ data: { item_id: itemId, status: 'completed' as const, card_id: card.id } }, 200);
});

type DueRow = ItemRow & {
  card_id: number;
  card_state: 'new' | 'learning' | 'review' | 'relearning';
  due_at: number;
};

const dueRoute = createRoute({
  method: 'get',
  path: '/tracks/topik-ko/curriculum/review/due',
  tags: ['TOPIK Owner-authored Curriculum'],
  summary: 'TOPIK owner-curriculum FSRS cards currently due',
  request: { query: z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) }) },
  responses: {
    200: { description: 'Due cards without answers or explanations', content: { 'application/json': { schema: z.object({ data: topikOwnerCurriculumDueListSchema }) } } },
    401: { description: 'Authentication required', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK track required', content: { 'application/json': { schema: problemSchema } } },
  },
});

topikOwnerCurriculumOA.openapi(dueRoute, async (c) => {
  if (!isTopikTrack(c)) return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  const { limit } = c.req.valid('query');
  const now = Math.floor(Date.now() / 1000);
  const rows = await c.env.DB.prepare(
    `SELECT card.id AS card_id, card.state AS card_state, card.due_at,
            i.id, i.unit_id, i.stable_ref, i.target_grade, i.item_type,
            i.prompt_ko, i.prompt_ja, i.prompt_en, i.answer_json, i.audio_required, i.audio_text_ko,
            b.binding_state,
            p.status AS progress_status
       FROM topik_owner_srs_cards card
       JOIN topik_owner_authored_curriculum_items i ON i.id = card.item_id
       LEFT JOIN topik_owner_curriculum_progress p
         ON p.user_id = card.user_id AND p.item_id = card.item_id
       LEFT JOIN content_speech_bindings b
         ON b.item_type = 'topik-owner-item'
        AND b.item_id = i.id
        AND b.language = 'ko'
        AND b.speech_role = CASE WHEN i.item_type = 'listening' THEN 'listening' ELSE 'pronunciation' END
        AND b.provider = 'google-browser'
      WHERE card.user_id = ? AND card.due_at <= ?
        AND ${publishedOwnerItem('i')}
      ORDER BY card.due_at, card.id
      LIMIT ?`,
  ).bind(c.get('userId'), now, limit).all<DueRow>();
  return c.json({ data: {
    cards: (rows.results ?? []).map((row) => ({
      card_id: row.card_id,
      state: row.card_state,
      due_at: row.due_at,
      item: publicItem(row),
    })),
  } }, 200);
});

const reviewRoute = createRoute({
  method: 'post',
  path: '/tracks/topik-ko/curriculum/review',
  tags: ['TOPIK Owner-authored Curriculum'],
  summary: 'Apply an FSRS rating to a TOPIK owner-curriculum card',
  request: { body: { content: { 'application/json': { schema: topikOwnerCurriculumReviewBodySchema } } } },
  responses: {
    200: { description: 'Next FSRS state and due timestamp', content: { 'application/json': { schema: z.object({ data: topikOwnerCurriculumReviewResultSchema }) } } },
    401: { description: 'Authentication required', content: { 'application/json': { schema: problemSchema } } },
    404: { description: 'Card not found', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK track required', content: { 'application/json': { schema: problemSchema } } },
  },
});

topikOwnerCurriculumOA.openapi(reviewRoute, async (c) => {
  if (!isTopikTrack(c)) return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  const { card_id: cardId, rating, response_ms: responseMs } = c.req.valid('json');
  const userId = c.get('userId');
  const mutation = await reviewStatements(c.env.DB, userId, 'topik-ko', cardId, rating, responseMs);
  if (!mutation) return c.json({ title: 'Not found', status: 404, detail: 'Review card not found' }, 404);
  await c.env.DB.batch(mutation.statements);
  const { result } = mutation;
  return c.json({ data: { state: result.state, stability: result.stability, difficulty: result.difficulty,
    lapses: result.lapses, reps: result.reps, due_at: Number(mutation.due_at) } }, 200);
});

export { topikOwnerCurriculumOA };
