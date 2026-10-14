import { z } from 'zod';

/**
 * Server-side AI assistance contract. These features are deliberately
 * separate from the content-release lifecycle: a model may draft or explain,
 * but it may never publish a release or determine an official exam result.
 */
export const AI_ASSISTANCE_FEATURES = [
  'content_lint',
  'content_draft',
  'grounded_explanation',
  'topik_writing_feedback',
] as const;
export type AiAssistanceFeature = (typeof AI_ASSISTANCE_FEATURES)[number];

export const instructionLanguageSchema = z.enum(['ko', 'ja', 'en']);

const translatedTextSchema = z.string().trim().max(4_000);

export const aiContentLintItemSchema = z.object({
  stable_ref: z.string().trim().min(3).max(160),
  prompt_ko: translatedTextSchema,
  prompt_ja: translatedTextSchema,
  prompt_en: translatedTextSchema,
  explanation_ko: translatedTextSchema,
  explanation_ja: translatedTextSchema,
  explanation_en: translatedTextSchema,
  distractors: z.array(z.string().trim().max(500)).max(8).default([]),
});
export type AiContentLintItem = z.infer<typeof aiContentLintItemSchema>;

export const aiContentLintRequestSchema = z.object({
  learning_track: z.literal('topik-ko'),
  release_id: z.string().trim().min(3).max(128),
  source: z.object({
    source_type: z.enum(['self-authored', 'licensed-external', 'official-reference', 'fixture']),
    source_url: z.string().trim().url().max(2_048),
    license_id: z.string().trim().max(200),
    allowed_use: z.string().trim().max(500),
  }),
  items: z.array(aiContentLintItemSchema).min(1).max(50),
});
export type AiContentLintRequest = z.infer<typeof aiContentLintRequestSchema>;

export const aiContentLintIssueSchema = z.object({
  severity: z.enum(['error', 'warning']),
  code: z.enum([
    'translation_missing',
    'explanation_length',
    'distractor_duplicate',
    'language_mismatch',
    'prohibited_source',
  ]),
  stable_ref: z.string(),
  field: z.string(),
  detail: z.string(),
});
export type AiContentLintIssue = z.infer<typeof aiContentLintIssueSchema>;

export const aiContentDraftSchema = z.object({
  prompt_ko: z.string().trim().min(1).max(1_200),
  prompt_ja: z.string().trim().min(1).max(1_200),
  prompt_en: z.string().trim().min(1).max(1_200),
  explanation_ko: z.string().trim().min(20).max(1_500),
  explanation_ja: z.string().trim().min(20).max(1_500),
  explanation_en: z.string().trim().min(20).max(1_500),
  distractors: z.array(z.string().trim().min(1).max(500)).min(2).max(4),
});
export type AiContentDraft = z.infer<typeof aiContentDraftSchema>;

export const groundedExplanationRequestSchema = z.object({
  item_id: z.string().trim().min(3).max(128),
  instruction_language: instructionLanguageSchema.default('ja'),
});
export type GroundedExplanationRequest = z.infer<typeof groundedExplanationRequestSchema>;

export const groundedExplanationSchema = z.object({
  summary: z.string().trim().min(1).max(700),
  study_points: z.array(z.string().trim().min(1).max(300)).min(1).max(4),
  citation_stable_ref: z.string().trim().min(1).max(160),
  prompt_version: z.string().trim().min(1).max(80),
  mode: z.enum(['ai_grounded', 'approved_fallback']),
  notice: z.string().trim().min(1).max(300).optional(),
});
export type GroundedExplanation = z.infer<typeof groundedExplanationSchema>;

export const topikWritingFeedbackRequestSchema = z.object({
  item_id: z.string().trim().min(3).max(128),
  instruction_language: instructionLanguageSchema.default('ja'),
  response_text: z.string().trim().min(20).max(1_500),
  store_feedback: z.boolean().default(false),
});
export type TopikWritingFeedbackRequest = z.infer<typeof topikWritingFeedbackRequestSchema>;

export const topikWritingFeedbackSchema = z.object({
  disclaimer: z.literal('이 피드백은 공식 TOPIK 채점이나 합격 예측이 아닌 형성 평가용 학습 보조입니다.'),
  rubric: z.object({
    task_response: z.number().int().min(1).max(5),
    organization: z.number().int().min(1).max(5),
    grammar: z.number().int().min(1).max(5),
    vocabulary: z.number().int().min(1).max(5),
  }),
  strengths: z.array(z.string().trim().min(1).max(280)).max(3),
  next_steps: z.array(z.string().trim().min(1).max(280)).min(1).max(3),
  requires_human_review: z.boolean(),
  human_escalation_path: z.literal('/support/writing-feedback'),
  prompt_version: z.string().trim().min(1).max(80),
  mode: z.enum(['ai_formative', 'safe_fallback']),
});
export type TopikWritingFeedback = z.infer<typeof topikWritingFeedbackSchema>;
