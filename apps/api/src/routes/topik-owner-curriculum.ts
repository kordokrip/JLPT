import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
  topikOwnerCurriculumGradeSchema,
  topikOwnerCurriculumListSchema,
  topikOwnerCurriculumSolutionSchema,
  type TopikOwnerCurriculumItemDto,
  type TopikOwnerCurriculumUnitDto,
  type TopikPlacementAudioDto,
} from '@nihongo-n3/shared';

import { appSessionAuth } from '../lib/auth-session.js';
import type { AppEnv } from '../types.js';

/**
 * Reads only the additive owner-authored curriculum tables. It never reads
 * content_releases, topik_practice_questions, or owner-private publication
 * records, so this route cannot make a local fixture a public release.
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
  binding_state: 'r2-ready' | 'preparing' | 'not-provided' | null;
  immutable_r2_key: string | null;
};

type SolutionRow = Pick<ItemRow, 'id' | 'answer_json'> & {
  explanation_ko: string;
  explanation_ja: string;
  explanation_en: string;
};

function isTopikTrack(c: { get: (key: 'learningTrack') => string }) {
  return c.get('learningTrack') === 'topik-ko';
}

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
  if (row.binding_state === 'r2-ready' && row.immutable_r2_key) {
    return {
      kind: 'r2',
      url: `/api/v1/audio/${row.immutable_r2_key.split('/').map(encodeURIComponent).join('/')}`,
    };
  }
  // A self-authored transcript or pronunciation text gives the learner an
  // immediate, language-correct browser path while the durable R2 asset is
  // still being generated. Never synthesize the visible question instead.
  const browserText = row.audio_text_ko?.trim();
  if (browserText) return { kind: 'browser-fallback', text_ko: browserText };
  return { kind: 'unavailable', reason: row.binding_state === 'preparing' ? 'preparing' : 'not-provided' };
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
  };
}

topikOwnerCurriculumOA.use('/tracks/topik-ko/curriculum', appSessionAuth);
topikOwnerCurriculumOA.use('/tracks/topik-ko/curriculum/*', appSessionAuth);

const listRoute = createRoute({
  method: 'get',
  path: '/tracks/topik-ko/curriculum',
  tags: ['TOPIK Owner-authored Curriculum'],
  summary: 'TOPIK 1–6 owner-authored local curriculum units',
  description: 'Returns additive owner-authored curriculum records only. It does not read the reviewed practice bank or the public content-release lifecycle.',
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
       FROM topik_owner_authored_curriculum_units
      WHERE target_grade = ?
      ORDER BY section, id`,
  ).bind(grade).all<UnitRow>();
  const rows = unitResult.results ?? [];
  if (rows.length === 0) return c.json({ data: { target_grade: grade, units: [] } }, 200);

  const itemResult = await c.env.DB.prepare(
    `SELECT i.id, i.unit_id, i.stable_ref, i.target_grade, i.item_type,
            i.prompt_ko, i.prompt_ja, i.prompt_en, i.answer_json, i.audio_required, i.audio_text_ko,
            CASE WHEN activated.id IS NOT NULL THEN 'r2-ready' ELSE b.binding_state END AS binding_state,
            a.immutable_r2_key
       FROM topik_owner_authored_curriculum_items i
       LEFT JOIN content_audio_bindings b
         ON b.item_type = 'topik-owner-item'
        AND b.item_id = i.id
        AND b.language = 'ko'
        AND b.audio_role = CASE WHEN i.item_type = 'listening' THEN 'listening' ELSE 'pronunciation' END
       LEFT JOIN content_audio_binding_activations activated ON activated.binding_id = b.id
       LEFT JOIN content_source_assets a ON a.id = COALESCE(activated.asset_id, b.asset_id)
      WHERE i.target_grade = ?
      ORDER BY i.unit_id, i.id`,
  ).bind(grade).all<ItemRow>();
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
       FROM topik_owner_authored_curriculum_items
      WHERE id = ?`,
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

export { topikOwnerCurriculumOA };
