import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import {
  aiContentLintRequestSchema,
  groundedExplanationRequestSchema,
  topikWritingFeedbackRequestSchema,
} from '@nihongo-n3/shared';

import { adminSessionAuth, appSessionAuth } from '../lib/auth-session.js';
import {
  AI_ASSISTANCE_POLICIES,
  AI_ASSISTANCE_PROMPT_VERSION,
  AiAssistanceFault,
  approvedExplanationFallback,
  assertAiCircuitClosed,
  createAiLearningProvider,
  deleteOptInWritingFeedback,
  detectSensitiveWritingInput,
  groundedExplanationPrompt,
  hasBlockingLintIssue,
  isAiAssistanceEnabled,
  lintTopikContentDraft,
  parseContentDraft,
  parseGroundedExplanation,
  parseWritingFeedback,
  pseudonymousAiUserBucket,
  recordAiAuditEvent,
  recordAiCircuitFailure,
  recordAiCircuitSuccess,
  reserveAiUsage,
  safeWritingFeedbackFallback,
  saveOptInWritingFeedback,
  shouldRecordAiCircuitFailure,
  writingFeedbackPrompt,
} from '../lib/ai-learning-assistance.js';
import type { AppEnv } from '../types.js';

const problemSchema = z.object({
  type: z.string().optional(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
});

const contentLintResponseSchema = z.object({
  data: z.object({
    release_id: z.string(),
    issues: z.array(z.object({ severity: z.enum(['error', 'warning']), code: z.string(), stable_ref: z.string(), field: z.string(), detail: z.string() })),
    blocking: z.boolean(),
    provider: z.literal('deterministic-policy'),
  }),
});

const contentDraftResponseSchema = z.object({
  data: z.object({
    release_id: z.string(),
    draft: z.object({
      prompt_ko: z.string(), prompt_ja: z.string(), prompt_en: z.string(),
      explanation_ko: z.string(), explanation_ja: z.string(), explanation_en: z.string(),
      distractors: z.array(z.string()),
    }),
    provider: z.enum(['workers-ai', 'ai-gateway']),
    model: z.string(),
    prompt_version: z.string(),
  }),
});

const explanationResponseSchema = z.object({
  data: z.object({
    summary: z.string(),
    study_points: z.array(z.string()),
    citation_stable_ref: z.string(),
    prompt_version: z.string(),
    mode: z.enum(['ai_grounded', 'approved_fallback']),
    notice: z.string().optional(),
  }),
});

const writingFeedbackResponseSchema = z.object({
  data: z.object({
    disclaimer: z.string(),
    rubric: z.object({ task_response: z.number().int(), organization: z.number().int(), grammar: z.number().int(), vocabulary: z.number().int() }),
    strengths: z.array(z.string()),
    next_steps: z.array(z.string()),
    requires_human_review: z.boolean(),
    human_escalation_path: z.literal('/support/writing-feedback'),
    prompt_version: z.string(),
    mode: z.enum(['ai_formative', 'safe_fallback']),
    stored: z.boolean(),
  }),
});

const adminAiOA = new OpenAPIHono<AppEnv>();
const aiLearningOA = new OpenAPIHono<AppEnv>();

adminAiOA.use('/ai/*', adminSessionAuth);
aiLearningOA.use('/tracks/topik-ko/ai/*', appSessionAuth);

function aiProblem(c: Context<AppEnv>, error: unknown): Response {
  if (error instanceof AiAssistanceFault) {
    return c.json({
      type: `https://nihongo-n3.example.com/errors/ai-${error.code}`,
      title: 'AI Assistance Unavailable',
      status: error.status,
      detail: error.message,
    }, error.status as 422 | 429 | 502 | 503);
  }
  return c.json({
    type: 'https://nihongo-n3.example.com/errors/ai-provider-failure',
    title: 'AI Assistance Unavailable',
    status: 503,
    detail: 'AI 학습 보조를 지금 사용할 수 없습니다. 승인된 학습 자료를 이용해 주세요.',
  }, 503);
}

const contentLintRoute = createRoute({
  method: 'post',
  path: '/ai/content-lint',
  tags: ['Admin', 'AI'],
  summary: 'TOPIK 콘텐츠 초안의 결정론적 품질·권리 lint',
  description: '초안 본문을 저장하거나 모델로 전송하지 않습니다. 번역, 해설 길이, 중복 distractor, 언어 표기, 금지 원천을 검사합니다.',
  request: { body: { content: { 'application/json': { schema: aiContentLintRequestSchema } } } },
  responses: {
    200: { description: 'lint 결과', content: { 'application/json': { schema: contentLintResponseSchema } } },
    400: { description: 'invalid input', content: { 'application/json': { schema: problemSchema } } },
    401: { description: 'authentication required', content: { 'application/json': { schema: problemSchema } } },
    403: { description: 'admin required', content: { 'application/json': { schema: problemSchema } } },
  },
});

adminAiOA.openapi(contentLintRoute, async (c) => {
  const input = c.req.valid('json');
  const issues = lintTopikContentDraft(input);
  return c.json({ data: {
    release_id: input.release_id,
    issues,
    blocking: hasBlockingLintIssue(issues),
    provider: 'deterministic-policy',
  } }, 200);
});

const contentDraftRoute = createRoute({
  method: 'post',
  path: '/ai/content-draft',
  tags: ['Admin', 'AI'],
  summary: '검증된 TOPIK 콘텐츠 초안 보조',
  description: 'feature flag와 서버 secret이 모두 설정된 경우에만 provider를 호출합니다. 결과는 draft이며 D1 release를 변경하지 않습니다.',
  request: { body: { content: { 'application/json': { schema: aiContentLintRequestSchema } } } },
  responses: {
    200: { description: '검증된 draft', content: { 'application/json': { schema: contentDraftResponseSchema } } },
    400: { description: 'blocking lint', content: { 'application/json': { schema: problemSchema } } },
    404: { description: 'release not found', content: { 'application/json': { schema: problemSchema } } },
    401: { description: 'authentication required', content: { 'application/json': { schema: problemSchema } } },
    403: { description: 'admin required', content: { 'application/json': { schema: problemSchema } } },
    429: { description: 'usage limit', content: { 'application/json': { schema: problemSchema } } },
    502: { description: 'invalid provider output', content: { 'application/json': { schema: problemSchema } } },
    503: { description: 'feature disabled or unavailable', content: { 'application/json': { schema: problemSchema } } },
  },
});

adminAiOA.openapi(contentDraftRoute, async (c) => {
  const input = c.req.valid('json');
  const issues = lintTopikContentDraft(input);
  if (hasBlockingLintIssue(issues)) {
    return c.json({ title: 'Content lint blocked', status: 400, detail: '권리·provenance 또는 필수 번역 오류를 해결한 뒤 초안 보조를 실행하세요.' }, 400);
  }
  const release = await c.env.DB.prepare(
    "SELECT id FROM content_releases WHERE id = ? AND learning_track = 'topik-ko' LIMIT 1",
  ).bind(input.release_id).first<{ id: string }>();
  if (!release) {
    return c.json({ title: 'Release not found', status: 404, detail: '초안 보조는 존재하는 TOPIK release 후보에만 연결할 수 있습니다.' }, 404);
  }
  if (!isAiAssistanceEnabled(c.env)) {
    return c.json({ title: 'AI Assistance Unavailable', status: 503, detail: '콘텐츠 초안 보조는 운영자 검증 후 활성화됩니다.' }, 503);
  }
  try {
    const bucket = await pseudonymousAiUserBucket(c.get('userId'), c.env.AI_ASSISTANCE_BUCKET_SECRET);
    await assertAiCircuitClosed(c.env.DB, 'topik-ko', 'content_draft');
    await reserveAiUsage({ db: c.env.DB, learningTrack: 'topik-ko', feature: 'content_draft', userBucket: bucket });
    const provider = createAiLearningProvider(c.env);
    const sample = input.items[0]!;
    const raw = await provider.generateJson({
      system: 'Create a multilingual TOPIK learning-content draft as JSON. Do not use official past exam material, do not claim official scoring, and do not include copyright text beyond the supplied self-authored draft.',
      user: JSON.stringify({ source: input.source, item: sample }),
      maxTokens: 1_000,
      timeoutMs: AI_ASSISTANCE_POLICIES.content_draft.timeoutMs,
      metadata: {
        requestId: c.get('requestId'),
        promptVersion: AI_ASSISTANCE_PROMPT_VERSION,
        releaseId: input.release_id,
        userBucket: bucket,
        feature: 'content_draft',
      },
    });
    const draft = parseContentDraft(raw);
    await recordAiCircuitSuccess(c.env.DB, 'topik-ko', 'content_draft');
    await recordAiAuditEvent({
      db: c.env.DB, requestId: c.get('requestId'), learningTrack: 'topik-ko', releaseId: input.release_id,
      feature: 'content_draft', provider: provider.kind, model: provider.model, userBucket: bucket,
      outcome: 'success', inputChars: JSON.stringify(input).length, outputChars: JSON.stringify(draft).length,
    });
    return c.json({ data: { release_id: input.release_id, draft, provider: provider.kind, model: provider.model, prompt_version: AI_ASSISTANCE_PROMPT_VERSION } }, 200);
  } catch (error) {
    if (shouldRecordAiCircuitFailure(error)) {
      await recordAiCircuitFailure(c.env.DB, 'topik-ko', 'content_draft').catch(() => undefined);
    }
    return aiProblem(c, error) as never;
  }
});

type GroundedItemRow = {
  id: string;
  release_id: string;
  stable_ref: string;
  prompt_ko: string;
  prompt_ja: string;
  prompt_en: string;
  explanation_ko: string;
  explanation_ja: string;
  explanation_en: string;
};

async function publishedGroundedItem(db: D1Database, id: string): Promise<GroundedItemRow | null> {
  return db.prepare(
    `SELECT i.id, i.release_id, i.stable_ref, i.prompt_ko, i.prompt_ja, i.prompt_en,
            i.explanation_ko, i.explanation_ja, i.explanation_en
       FROM topik_content_items i
       JOIN content_releases r ON r.id = i.release_id
      WHERE i.id = ? AND i.learning_track = 'topik-ko' AND r.learning_track = 'topik-ko'
        AND r.release_state = 'published'
      LIMIT 1`,
  ).bind(id).first<GroundedItemRow>();
}

function localized(row: GroundedItemRow, language: 'ko' | 'ja' | 'en'): { prompt: string; explanation: string } {
  return language === 'ja'
    ? { prompt: row.prompt_ja, explanation: row.explanation_ja }
    : language === 'en'
      ? { prompt: row.prompt_en, explanation: row.explanation_en }
      : { prompt: row.prompt_ko, explanation: row.explanation_ko };
}

const explanationRoute = createRoute({
  method: 'post',
  path: '/tracks/topik-ko/ai/explanation',
  tags: ['AI', 'TOPIK Content'],
  summary: 'published TOPIK 콘텐츠 기반 학습 해설 보조',
  description: 'published release의 승인된 prompt·해설만 context로 사용합니다. 정답을 변경하거나 공식 점수·합격을 예측하지 않습니다.',
  request: { body: { content: { 'application/json': { schema: groundedExplanationRequestSchema } } } },
  responses: {
    200: { description: 'grounded explanation or approved fallback', content: { 'application/json': { schema: explanationResponseSchema } } },
    401: { description: 'authentication required', content: { 'application/json': { schema: problemSchema } } },
    404: { description: 'published item not found', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK track required', content: { 'application/json': { schema: problemSchema } } },
    429: { description: 'usage limit', content: { 'application/json': { schema: problemSchema } } },
  },
});

aiLearningOA.openapi(explanationRoute, async (c) => {
  if (c.get('learningTrack') !== 'topik-ko') {
    return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  }
  const input = c.req.valid('json');
  const row = await publishedGroundedItem(c.env.DB, input.item_id);
  if (!row) return c.json({ title: 'Not found', status: 404, detail: '출시된 TOPIK 콘텐츠를 찾을 수 없습니다.' }, 404);
  const source = localized(row, input.instruction_language);

  if (!isAiAssistanceEnabled(c.env)) {
    return c.json({ data: approvedExplanationFallback({ explanation: source.explanation, stableRef: row.stable_ref, instructionLanguage: input.instruction_language }) }, 200);
  }

  let bucket: string | undefined;
  try {
    bucket = await pseudonymousAiUserBucket(c.get('userId'), c.env.AI_ASSISTANCE_BUCKET_SECRET);
    await assertAiCircuitClosed(c.env.DB, 'topik-ko', 'grounded_explanation');
    await reserveAiUsage({ db: c.env.DB, learningTrack: 'topik-ko', feature: 'grounded_explanation', userBucket: bucket });
    const provider = createAiLearningProvider(c.env);
    const prompt = groundedExplanationPrompt({
      instructionLanguage: input.instruction_language,
      prompt: source.prompt,
      approvedExplanation: source.explanation,
      stableRef: row.stable_ref,
    });
    const raw = await provider.generateJson({
      ...prompt,
      maxTokens: 500,
      timeoutMs: AI_ASSISTANCE_POLICIES.grounded_explanation.timeoutMs,
      metadata: {
        requestId: c.get('requestId'),
        promptVersion: AI_ASSISTANCE_PROMPT_VERSION,
        releaseId: row.release_id,
        userBucket: bucket,
        feature: 'grounded_explanation',
      },
    });
    const explanation = parseGroundedExplanation(raw, { stableRef: row.stable_ref, sourceText: source.prompt });
    await recordAiCircuitSuccess(c.env.DB, 'topik-ko', 'grounded_explanation');
    await recordAiAuditEvent({
      db: c.env.DB, requestId: c.get('requestId'), learningTrack: 'topik-ko', releaseId: row.release_id,
      feature: 'grounded_explanation', provider: provider.kind, model: provider.model, userBucket: bucket,
      outcome: 'success', inputChars: source.prompt.length + source.explanation.length, outputChars: JSON.stringify(explanation).length,
    });
    return c.json({ data: explanation }, 200);
  } catch (error) {
    if (bucket) {
      if (shouldRecordAiCircuitFailure(error)) {
        await recordAiCircuitFailure(c.env.DB, 'topik-ko', 'grounded_explanation').catch(() => undefined);
      }
      await recordAiAuditEvent({
        db: c.env.DB, requestId: c.get('requestId'), learningTrack: 'topik-ko', releaseId: row.release_id,
        feature: 'grounded_explanation', provider: 'fallback', userBucket: bucket,
        outcome: error instanceof AiAssistanceFault && error.code === 'invalid_output' ? 'invalid_output' : 'fallback',
        inputChars: source.prompt.length + source.explanation.length, outputChars: source.explanation.length,
      }).catch(() => undefined);
    }
    // Learners always retain access to the reviewed explanation. Provider, model,
    // quota, and circuit failures never expose an answer or break the lesson.
    return c.json({ data: approvedExplanationFallback({ explanation: source.explanation, stableRef: row.stable_ref, instructionLanguage: input.instruction_language }) }, 200);
  }
});

const writingFeedbackRoute = createRoute({
  method: 'post',
  path: '/tracks/topik-ko/ai/writing-feedback',
  tags: ['AI', 'TOPIK Content'],
  summary: 'TOPIK II 쓰기 형성 피드백',
  description: '공식 채점이나 합격 예측을 하지 않습니다. 원문은 gateway log·cache·R2 evidence에 저장하지 않고, 저장 동의 시에도 hash와 구조화된 피드백만 30일 보관합니다.',
  request: { body: { content: { 'application/json': { schema: topikWritingFeedbackRequestSchema } } } },
  responses: {
    200: { description: 'formative feedback', content: { 'application/json': { schema: writingFeedbackResponseSchema } } },
    401: { description: 'authentication required', content: { 'application/json': { schema: problemSchema } } },
    404: { description: 'published writing item not found', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK track required', content: { 'application/json': { schema: problemSchema } } },
    422: { description: 'PII detected', content: { 'application/json': { schema: problemSchema } } },
    429: { description: 'usage limit', content: { 'application/json': { schema: problemSchema } } },
    503: { description: 'feature disabled', content: { 'application/json': { schema: problemSchema } } },
  },
});

aiLearningOA.openapi(writingFeedbackRoute, async (c) => {
  if (c.get('learningTrack') !== 'topik-ko') {
    return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  }
  const input = c.req.valid('json');
  const pii = detectSensitiveWritingInput(input.response_text);
  if (pii.length) {
    return c.json({ title: 'Sensitive data detected', status: 422, detail: '이메일, 전화번호, 식별번호, URL을 제거한 뒤 다시 제출하세요. 입력 원문은 저장되지 않았습니다.' }, 422);
  }
  const row = await publishedGroundedItem(c.env.DB, input.item_id);
  if (!row) return c.json({ title: 'Not found', status: 404, detail: '출시된 TOPIK 쓰기 콘텐츠를 찾을 수 없습니다.' }, 404);
  if (!isAiAssistanceEnabled(c.env)) {
    return c.json({ title: 'AI Assistance Unavailable', status: 503, detail: '쓰기 피드백은 운영자 검증 후 활성화됩니다. 현재는 공식 채점이 아닌 자가 점검 가이드를 이용해 주세요.' }, 503);
  }

  let bucket: string | undefined;
  try {
    bucket = await pseudonymousAiUserBucket(c.get('userId'), c.env.AI_ASSISTANCE_BUCKET_SECRET);
    await assertAiCircuitClosed(c.env.DB, 'topik-ko', 'topik_writing_feedback');
    await reserveAiUsage({ db: c.env.DB, learningTrack: 'topik-ko', feature: 'topik_writing_feedback', userBucket: bucket });
    const provider = createAiLearningProvider(c.env);
    const source = localized(row, input.instruction_language);
    const prompt = writingFeedbackPrompt({ instructionLanguage: input.instruction_language, rubricContext: source.prompt, responseText: input.response_text });
    const raw = await provider.generateJson({
      ...prompt,
      maxTokens: 650,
      timeoutMs: AI_ASSISTANCE_POLICIES.topik_writing_feedback.timeoutMs,
      metadata: {
        requestId: c.get('requestId'),
        promptVersion: AI_ASSISTANCE_PROMPT_VERSION,
        releaseId: row.release_id,
        userBucket: bucket,
        feature: 'topik_writing_feedback',
      },
    });
    const feedback = parseWritingFeedback(raw, input.response_text);
    await recordAiCircuitSuccess(c.env.DB, 'topik-ko', 'topik_writing_feedback');
    if (input.store_feedback) {
      await saveOptInWritingFeedback({ db: c.env.DB, userId: c.get('userId'), releaseId: row.release_id, itemId: row.id, sourceText: input.response_text, feedback });
    }
    await recordAiAuditEvent({
      db: c.env.DB, requestId: c.get('requestId'), learningTrack: 'topik-ko', releaseId: row.release_id,
      feature: 'topik_writing_feedback', provider: provider.kind, model: provider.model, userBucket: bucket,
      outcome: 'success', inputChars: input.response_text.length, outputChars: JSON.stringify(feedback).length,
    });
    return c.json({ data: { ...feedback, stored: input.store_feedback } }, 200);
  } catch (error) {
    if (bucket) {
      if (shouldRecordAiCircuitFailure(error)) {
        await recordAiCircuitFailure(c.env.DB, 'topik-ko', 'topik_writing_feedback').catch(() => undefined);
      }
      await recordAiAuditEvent({
        db: c.env.DB, requestId: c.get('requestId'), learningTrack: 'topik-ko', releaseId: row.release_id,
        feature: 'topik_writing_feedback', provider: 'fallback', userBucket: bucket,
        outcome: error instanceof AiAssistanceFault && error.code === 'invalid_output' ? 'invalid_output' : 'fallback',
        inputChars: input.response_text.length, outputChars: 0,
      }).catch(() => undefined);
    }
    const fallback = safeWritingFeedbackFallback();
    return c.json({ data: { ...fallback, stored: false } }, 200);
  }
});

const deleteWritingFeedbackRoute = createRoute({
  method: 'delete',
  path: '/tracks/topik-ko/ai/writing-feedback',
  tags: ['AI', 'TOPIK Content'],
  summary: '저장 동의한 TOPIK 쓰기 피드백 삭제',
  responses: {
    200: { description: 'deleted', content: { 'application/json': { schema: z.object({ data: z.object({ deleted: z.number().int().nonnegative() }) }) } } },
    401: { description: 'authentication required', content: { 'application/json': { schema: problemSchema } } },
    409: { description: 'TOPIK track required', content: { 'application/json': { schema: problemSchema } } },
  },
});

aiLearningOA.openapi(deleteWritingFeedbackRoute, async (c) => {
  if (c.get('learningTrack') !== 'topik-ko') {
    return c.json({ title: 'Track mismatch', status: 409, detail: 'TOPIK 학습 트랙으로 전환한 뒤 다시 시도하세요.' }, 409);
  }
  const deleted = await deleteOptInWritingFeedback(c.env.DB, c.get('userId'));
  return c.json({ data: { deleted } }, 200);
});

export { adminAiOA, aiLearningOA };
