import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { topikExamLevelSchema, topikReleasedContentListSchema, topikSectionSchema } from '@nihongo-n3/shared';

import { adminSessionAuth, appSessionAuth } from '../lib/auth-session.js';
import type { AppEnv } from '../types.js';

const ownerPrivateTopikOA = new OpenAPIHono<AppEnv>();

// Apply these headers before authentication so an unauthenticated or
// unauthorized response cannot be stored and later replayed across sessions.
ownerPrivateTopikOA.use('/admin/topik-owner-private/*', async (c, next) => {
  noStore(c);
  await next();
});
ownerPrivateTopikOA.use('/admin/topik-owner-private/*', adminSessionAuth);
ownerPrivateTopikOA.use('/tracks/topik-ko/owner-private/*', async (c, next) => {
  noStore(c);
  await next();
});
ownerPrivateTopikOA.use('/tracks/topik-ko/owner-private/*', appSessionAuth);

const problemSchema = z.object({ title: z.string(), status: z.number().int(), detail: z.string() });
const manifestSchema = z.string().regex(/^[a-f0-9]{64}$/i);
const claimBodySchema = z.object({
  release_id: z.string().min(1).max(160),
  manifest_sha256: manifestSchema,
}).strict();
const releaseIdSchema = z.string().min(1).max(160);
const privateSolutionSchema = z.object({
  item_id: z.string().min(1),
  answer_payload: z.unknown(),
  explanation_ko: z.string().min(1),
  explanation_ja: z.string().min(1),
  explanation_en: z.string().min(1),
});

type PrivateContentRow = {
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

type PrivateSolutionRow = {
  id: string;
  answer_payload_json: string;
  explanation_ko: string;
  explanation_ja: string;
  explanation_en: string;
};

function noStore(c: { header: (name: string, value: string) => void }): void {
  c.header('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  c.header('Pragma', 'no-cache');
  c.header('Vary', 'Cookie');
}

function isTopikTrack(c: { get: (key: 'learningTrack') => string }): boolean {
  return c.get('learningTrack') === 'topik-ko';
}

const claimRoute = createRoute({
  method: 'post',
  path: '/admin/topik-owner-private/claims',
  tags: ['Admin', 'TOPIK Owner-private'],
  summary: '관리자 세션으로 owner-private TOPIK release를 한 번 claim',
  description: '현재 authenticated admin session의 subject만 owner로 연결합니다. 요청 본문은 release ID와 manifest hash만 받으며 사용자 ID는 받지 않습니다.',
  request: { body: { content: { 'application/json': { schema: claimBodySchema } } } },
  responses: {
    201: { description: 'owner-private claim 완료', content: { 'application/json': { schema: z.object({ data: z.object({ release_id: z.string(), state: z.literal('owner_published') }) }) } } },
    401: { description: '인증 필요', content: { 'application/json': { schema: problemSchema } } },
    403: { description: '관리자 권한 필요', content: { 'application/json': { schema: problemSchema } } },
    409: { description: '이미 claim되었거나 policy/manifest가 일치하지 않음', content: { 'application/json': { schema: problemSchema } } },
  },
});

ownerPrivateTopikOA.openapi(claimRoute, async (c) => {
  noStore(c);
  const input = c.req.valid('json');
  const result = await c.env.DB.prepare(
    `INSERT INTO content_release_private_publications (release_id, owner_user_id, manifest_sha256, private_state)
     SELECT p.release_id, ?, p.manifest_sha256, 'owner_published'
       FROM content_release_private_policies p
       JOIN content_releases r ON r.id = p.release_id
       JOIN content_release_sources s ON s.release_id = r.id
      WHERE p.release_id = ?
        AND p.manifest_sha256 = ?
        AND p.claim_method = 'authenticated_admin_session'
        AND p.public_publish_prohibited = 1
        AND r.learning_track = 'topik-ko'
        AND r.manifest_sha256 = p.manifest_sha256
        AND r.release_state IN ('draft', 'automated_checked')
        AND s.source_type = 'self-authored'
        AND s.author = p.owner_ref
        AND s.first_review_status = 'pending'
        AND s.second_review_status = 'pending'
     ON CONFLICT(release_id) DO NOTHING`,
  ).bind(c.get('userId'), input.release_id, input.manifest_sha256).run();

  if ((result.meta.changes ?? 0) !== 1) {
    return c.json({ title: 'Claim unavailable', status: 409, detail: '이 release는 claim할 수 없습니다.' }, 409);
  }
  return c.json({ data: { release_id: input.release_id, state: 'owner_published' as const } }, 201);
});

const withdrawRoute = createRoute({
  method: 'post',
  path: '/admin/topik-owner-private/releases/{releaseId}/withdraw',
  tags: ['Admin', 'TOPIK Owner-private'],
  summary: '현재 owner admin 세션으로 private publication withdrawal',
  request: {
    params: z.object({ releaseId: releaseIdSchema }),
    body: { content: { 'application/json': { schema: z.object({ manifest_sha256: manifestSchema }).strict() } } },
  },
  responses: {
    200: { description: 'withdrawal 완료', content: { 'application/json': { schema: z.object({ data: z.object({ state: z.literal('withdrawn') }) }) } } },
    401: { description: '인증 필요', content: { 'application/json': { schema: problemSchema } } },
    403: { description: '관리자 권한 필요', content: { 'application/json': { schema: problemSchema } } },
    404: { description: 'owner-private publication 없음', content: { 'application/json': { schema: problemSchema } } },
  },
});

ownerPrivateTopikOA.openapi(withdrawRoute, async (c) => {
  noStore(c);
  const { releaseId } = c.req.valid('param');
  const { manifest_sha256: manifestSha256 } = c.req.valid('json');
  const result = await c.env.DB.prepare(
    `UPDATE content_release_private_publications
        SET private_state = 'withdrawn', withdrawn_at = unixepoch()
      WHERE release_id = ?
        AND owner_user_id = ?
        AND manifest_sha256 = ?
        AND private_state = 'owner_published'`,
  ).bind(releaseId, c.get('userId'), manifestSha256).run();
  if ((result.meta.changes ?? 0) !== 1) {
    return c.json({ title: 'Not Found', status: 404, detail: '요청한 owner-private TOPIK 콘텐츠를 찾을 수 없습니다.' }, 404);
  }
  return c.json({ data: { state: 'withdrawn' as const } }, 200);
});

const privateContentRoute = createRoute({
  method: 'get',
  path: '/tracks/topik-ko/owner-private/content',
  tags: ['TOPIK Owner-private'],
  summary: '현재 claim owner에게만 owner-private TOPIK 항목 조회',
  request: { query: z.object({ exam_level: topikExamLevelSchema, section: topikSectionSchema }) },
  responses: {
    200: { description: 'owner-private 항목. 답·해설·owner metadata 없음', content: { 'application/json': { schema: z.object({ data: topikReleasedContentListSchema }) } } },
    401: { description: '인증 필요', content: { 'application/json': { schema: problemSchema } } },
    404: { description: '콘텐츠 없음 또는 접근 불가', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK 트랙 필요', content: { 'application/json': { schema: problemSchema } } },
  },
});

ownerPrivateTopikOA.openapi(privateContentRoute, async (c) => {
  noStore(c);
  if (!isTopikTrack(c)) return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  const { exam_level: examLevel, section } = c.req.valid('query');
  const result = await c.env.DB.prepare(
    `SELECT i.id, i.stable_ref, r.content_version AS content_release,
            i.exam_level, i.exam_band, i.section, i.item_kind, i.skill, i.difficulty,
            i.prompt_ko, i.prompt_ja, i.prompt_en
       FROM topik_content_items i
       JOIN content_releases r ON r.id = i.release_id
       JOIN content_release_private_publications p ON p.release_id = r.id
        AND p.manifest_sha256 = r.manifest_sha256
      WHERE p.owner_user_id = ?
        AND p.private_state = 'owner_published'
        AND i.learning_track = 'topik-ko'
        AND r.learning_track = 'topik-ko'
        AND i.exam_level = ?
        AND i.section = ?
      ORDER BY i.difficulty, i.id`,
  ).bind(c.get('userId'), examLevel, section).all<PrivateContentRow>();
  const rows = result.results ?? [];
  if (rows.length === 0) {
    return c.json({ title: 'Not Found', status: 404, detail: '요청한 owner-private TOPIK 콘텐츠를 찾을 수 없습니다.' }, 404);
  }
  return c.json({ data: {
    content_release: rows[0]!.content_release,
    exam_level: examLevel,
    section,
    items: rows,
  } }, 200);
});

const privateSolutionRoute = createRoute({
  method: 'get',
  path: '/tracks/topik-ko/owner-private/content/{itemId}/solution',
  tags: ['TOPIK Owner-private'],
  summary: '현재 claim owner에게만 owner-private TOPIK 정답·해설 조회',
  request: { params: z.object({ itemId: z.string().min(1).max(160) }) },
  responses: {
    200: { description: 'owner-private 정답·해설', content: { 'application/json': { schema: z.object({ data: privateSolutionSchema }) } } },
    401: { description: '인증 필요', content: { 'application/json': { schema: problemSchema } } },
    404: { description: '콘텐츠 없음 또는 접근 불가', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK 트랙 필요', content: { 'application/json': { schema: problemSchema } } },
  },
});

ownerPrivateTopikOA.openapi(privateSolutionRoute, async (c) => {
  noStore(c);
  if (!isTopikTrack(c)) return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  const { itemId } = c.req.valid('param');
  const row = await c.env.DB.prepare(
    `SELECT i.id, i.answer_payload_json, i.explanation_ko, i.explanation_ja, i.explanation_en
       FROM topik_content_items i
       JOIN content_releases r ON r.id = i.release_id
       JOIN content_release_private_publications p ON p.release_id = r.id
        AND p.manifest_sha256 = r.manifest_sha256
      WHERE i.id = ?
        AND p.owner_user_id = ?
        AND p.private_state = 'owner_published'
        AND i.learning_track = 'topik-ko'
        AND r.learning_track = 'topik-ko'
      LIMIT 1`,
  ).bind(itemId, c.get('userId')).first<PrivateSolutionRow>();
  if (!row) {
    return c.json({ title: 'Not Found', status: 404, detail: '요청한 owner-private TOPIK 콘텐츠를 찾을 수 없습니다.' }, 404);
  }
  return c.json({ data: {
    item_id: row.id,
    answer_payload: JSON.parse(row.answer_payload_json),
    explanation_ko: row.explanation_ko,
    explanation_ja: row.explanation_ja,
    explanation_en: row.explanation_en,
  } }, 200);
});

export { ownerPrivateTopikOA };
