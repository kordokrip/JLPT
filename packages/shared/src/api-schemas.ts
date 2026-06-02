/**
 * packages/shared/src/api-schemas.ts
 *
 * 모든 API 요청/응답 zod 스키마.
 * apps/api (서버 검증) 과 apps/web (클라이언트 타입) 양쪽에서 공유.
 */
import { z } from 'zod';

// ─────────────────────────────────────────────
// 공통
// ─────────────────────────────────────────────
export const jlptLevelSchema = z.enum(['N5', 'N4', 'N3', 'N2', 'N1']);
export type JlptLevel = z.infer<typeof jlptLevelSchema>;

export const registerSchema = z.enum(['conversation', 'newspaper', 'business']);

export const itemTypeSchema = z.enum([
  'vocab', 'grammar', 'kanji', 'sentence', 'sysprog', 'homophone',
]);

export const ratingSchema = z.enum(['again', 'hard', 'good', 'easy']);

export const domainSchema = z.enum([
  'programming', 'architecture', 'ml',
  'semiconductor_front', 'semiconductor_back',
  'manufacturing', 'automotive', 'pm', 'business',
]);

// ─────────────────────────────────────────────
// 페이지네이션 (cursor 기반)
// ─────────────────────────────────────────────
export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const cursorMetaSchema = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
});
export type CursorMeta = z.infer<typeof cursorMetaSchema>;

// ─────────────────────────────────────────────
// 콘텐츠 쿼리 스키마
// ─────────────────────────────────────────────
export const vocabQuerySchema = paginationQuerySchema.extend({
  level: jlptLevelSchema.optional(),
  category: z.string().optional(),
  source: z.string().optional(),
});
export type VocabQuery = z.infer<typeof vocabQuerySchema>;

export const vocabSearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type VocabSearchQuery = z.infer<typeof vocabSearchQuerySchema>;

export const grammarQuerySchema = paginationQuerySchema.extend({
  level: jlptLevelSchema.optional(),
  category: z.string().optional(),
});

export const kanjiQuerySchema = paginationQuerySchema.extend({
  level: jlptLevelSchema.optional(),
});

export const sentencesQuerySchema = paginationQuerySchema.extend({
  level: jlptLevelSchema.optional(),
  register: registerSchema.optional(),
});

export const sysProgQuerySchema = paginationQuerySchema.extend({
  domain: domainSchema.optional(),
  star: z.coerce.boolean().optional(),
});

export const homophonesQuerySchema = z.object({
  level: jlptLevelSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const weekParamSchema = z.object({
  week: z.coerce.number().int().min(1).max(52),
});

// ─────────────────────────────────────────────
// SRS
// ─────────────────────────────────────────────
export const srsInitBodySchema = z.object({
  item_type: itemTypeSchema,
  item_ids: z.array(z.number().int().positive()).min(1).max(100),
});
export type SrsInitBody = z.infer<typeof srsInitBodySchema>;

export const srsReviewBodySchema = z.object({
  card_id: z.number().int().positive(),
  rating: ratingSchema,
  response_ms: z.number().int().positive().optional(),
});
export type SrsReviewBody = z.infer<typeof srsReviewBodySchema>;

export const srsDueQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  item_type: itemTypeSchema.optional(),
});

// ─────────────────────────────────────────────
// 일일 로그
// ─────────────────────────────────────────────
export const dailyLogBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다'),
  source_code: z.string().optional(),
  items_new: z.number().int().nonnegative().default(0),
  items_review: z.number().int().nonnegative().default(0),
  accuracy: z.number().min(0).max(1).optional(),
  time_min: z.number().nonnegative().default(0),
  audio_min: z.number().nonnegative().default(0),
  notes: z.string().max(1000).optional(),
});
export type DailyLogBody = z.infer<typeof dailyLogBodySchema>;

export const dailyLogQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ─────────────────────────────────────────────
// 퀴즈 & 자가진단
// ─────────────────────────────────────────────
export const quizModeSchema = z.enum(['vocab_mc', 'grammar_fill', 'kanji_reading', 'listening']);
export type QuizMode = z.infer<typeof quizModeSchema>;

export const quizGenerateBodySchema = z.object({
  mode:  quizModeSchema,
  level: jlptLevelSchema,
  count: z.coerce.number().int().min(1).max(20).default(5),
});
export type QuizGenerateBody = z.infer<typeof quizGenerateBodySchema>;

export const quizAnswerSchema = z.object({
  question_id: z.string(),
  answer:      z.string(),
});

export const quizSubmitBodySchema = z.object({
  quiz_id: z.number().int().positive(),
  answers: z.array(quizAnswerSchema).min(1).max(20),
});
export type QuizSubmitBody = z.infer<typeof quizSubmitBodySchema>;

export const quizAttemptBodySchema = z.object({
  quiz_type: z.string().min(1).max(50),
  week_no: z.number().int().positive().optional(),
  total: z.number().int().positive(),
  correct: z.number().int().nonnegative(),
  duration_sec: z.number().int().positive().optional(),
  detail_json: z.record(z.unknown()).optional(),
});
export type QuizAttemptBody = z.infer<typeof quizAttemptBodySchema>;

export const selfCheckBodySchema = z.object({
  week_no: z.number().int().min(1).max(52),
  vocab_score: z.number().int().min(0).max(100).optional(),
  grammar_score: z.number().int().min(0).max(100).optional(),
  listening_score: z.number().int().min(0).max(100).optional(),
  writing_score: z.number().int().min(0).max(100).optional(),
  domain_score: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
});
export type SelfCheckBody = z.infer<typeof selfCheckBodySchema>;

// ─────────────────────────────────────────────
// 오프라인 동기화
// ─────────────────────────────────────────────
export const syncOperationSchema = z.object({
  op_id: z.string().uuid(),
  type: z.enum(['review', 'daily_log', 'quiz', 'self_check']),
  payload: z.record(z.unknown()),
  occurred_at: z.string().datetime(),
});
export type SyncOperation = z.infer<typeof syncOperationSchema>;

export const syncBodySchema = z.object({
  client_id: z.string().min(1).max(100),
  last_synced_at: z.string().datetime(),
  operations: z.array(syncOperationSchema).max(500),
});
export type SyncBody = z.infer<typeof syncBodySchema>;

// ─────────────────────────────────────────────
// API 응답 래퍼
// ─────────────────────────────────────────────
export interface ApiSuccess<T> {
  data: T;
  meta?: CursorMeta;
}

/** RFC 7807 Problem Details */
export interface ApiProblem {
  type: string;
  title: string;
  status: number;
  detail: string;
}
