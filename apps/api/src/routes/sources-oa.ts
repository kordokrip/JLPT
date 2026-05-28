/**
 * apps/api/src/routes/sources-oa.ts
 *
 * OpenAPI 마이그레이션 (Phase 6 — B-2)
 * GET /sources              — 모든 학습 소스 목록
 * GET /curriculum           — 전체 주차 커리큘럼
 * GET /curriculum/{week}    — 특정 주차 커리큘럼
 */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { weekParamSchema } from '@nihongo-n3/shared';

const listResponse = z
  .object({ data: z.array(z.record(z.string(), z.unknown())) })
  .openapi('SourcesListResponse');

const curriculumListResponse = z
  .object({ data: z.array(z.record(z.string(), z.unknown())) })
  .openapi('CurriculumListResponse');

const curriculumWeekResponse = z
  .object({ data: z.record(z.string(), z.unknown()) })
  .openapi('CurriculumWeekResponse');

const problemSchema = z
  .object({ type: z.string(), title: z.string(), status: z.number().int(), detail: z.string() })
  .openapi('ProblemDetail');

const sourcesRoute = createRoute({
  method: 'get',
  path: '/sources',
  tags: ['Sources'],
  summary: '학습 소스 목록',
  responses: {
    200: {
      content: { 'application/json': { schema: listResponse } },
      description: '학습 소스 목록',
    },
  },
});

const curriculumListRoute = createRoute({
  method: 'get',
  path: '/curriculum',
  tags: ['Curriculum'],
  summary: '전체 16주 커리큘럼',
  responses: {
    200: {
      content: { 'application/json': { schema: curriculumListResponse } },
      description: '주차별 커리큘럼 목록',
    },
  },
});

const curriculumWeekRoute = createRoute({
  method: 'get',
  path: '/curriculum/{week}',
  tags: ['Curriculum'],
  summary: '특정 주차 커리큘럼',
  request: {
    params: z.object({
      week: z.string().regex(/^\d+$/, '1~52 사이 정수').openapi({ example: '1' }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: curriculumWeekResponse } },
      description: '특정 주차 커리큘럼',
    },
    404: {
      content: { 'application/json': { schema: problemSchema } },
      description: '주차 없음',
    },
  },
});

const BASE = 'https://nihongo-n3.example.com/errors/';

const sourcesOA = new OpenAPIHono<AppEnv>();

sourcesOA.openapi(sourcesRoute, async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM sources ORDER BY code').all();
  return c.json({ data: (rows.results ?? []) as Record<string, unknown>[] }, 200);
});

sourcesOA.openapi(curriculumListRoute, async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM curriculum_weeks ORDER BY week_no',
  ).all();
  return c.json({ data: (rows.results ?? []) as Record<string, unknown>[] }, 200);
});

sourcesOA.openapi(curriculumWeekRoute, async (c) => {
  const parsed = weekParamSchema.safeParse({ week: c.req.valid('param').week });
  if (!parsed.success) {
    return c.json(
      {
        type: `${BASE}not-found`,
        title: 'Not Found',
        status: 404,
        detail: '유효하지 않은 week 파라미터',
      },
      404,
    );
  }

  const row = await c.env.DB.prepare(
    'SELECT * FROM curriculum_weeks WHERE week_no = ?',
  ).bind(parsed.data.week).first();

  if (!row) {
    return c.json(
      {
        type: `${BASE}not-found`,
        title: 'Not Found',
        status: 404,
        detail: `${parsed.data.week}주차 커리큘럼을 찾을 수 없습니다`,
      },
      404,
    );
  }
  return c.json({ data: row as Record<string, unknown> }, 200);
});

export { sourcesOA };
