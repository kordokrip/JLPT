/**
 * packages/shared/src/api-schemas.ts
 *
 * 모든 API 요청/응답 zod 스키마.
 * apps/api (서버 검증) 과 apps/web (클라이언트 타입) 양쪽에서 공유.
 */
import { z } from 'zod';
import {
  CONTENT_RELEASES,
  JLPT_LEVELS,
  type ContentRelease,
  type JlptLevel,
} from './jlpt-levels';
import {
  LEARNING_TRACK_IDS,
  CONTENT_PUBLISH_STATES,
  TOPIK_CONTENT_ITEM_KINDS,
  TOPIK_CONTENT_RELEASES,
  TOPIK_EXAM_BANDS,
  TOPIK_EXAM_LEVELS,
  TOPIK_INSTRUCTION_LANGUAGES,
  TOPIK_SECTIONS,
  type LearningTrackId,
  type ContentPublishState,
  type TopikContentItemKind,
  type TopikContentRelease,
  type TopikExamBand,
  type TopikExamLevel,
  type TopikSection,
} from './learning-tracks';

// ─────────────────────────────────────────────
// 공통
// ─────────────────────────────────────────────
export const jlptLevelSchema = z.enum([...JLPT_LEVELS] as [JlptLevel, ...JlptLevel[]]);
export type { JlptLevel } from './jlpt-levels';

export const contentReleaseSchema = z.enum(
  [...CONTENT_RELEASES] as [ContentRelease, ...ContentRelease[]],
);
export type { ContentRelease } from './jlpt-levels';

export const learningTrackIdSchema = z.enum(
  [...LEARNING_TRACK_IDS] as [LearningTrackId, ...LearningTrackId[]],
);
export type { LearningTrackId } from './learning-tracks';

export interface JlptTrackStatusDto {
  track: 'jlpt-ja';
  available: boolean;
  content_release: ContentRelease;
  available_levels: JlptLevel[];
  write_enabled: boolean;
}

/** TOPIK content uses its own exam-level taxonomy; it is not a JLPT level alias. */
export const topikExamLevelSchema = z.enum(
  [...TOPIK_EXAM_LEVELS] as [TopikExamLevel, ...TopikExamLevel[]],
);
export type { TopikExamLevel } from './learning-tracks';

export const topikContentReleaseSchema = z.enum(
  [...TOPIK_CONTENT_RELEASES] as [TopikContentRelease, ...TopikContentRelease[]],
);
export type { TopikContentRelease } from './learning-tracks';

export const topikSectionSchema = z.enum(
  [...TOPIK_SECTIONS] as [TopikSection, ...TopikSection[]],
);
export type { TopikSection } from './learning-tracks';

export const contentPublishStateSchema = z.enum(
  [...CONTENT_PUBLISH_STATES] as [ContentPublishState, ...ContentPublishState[]],
);
export type { ContentPublishState } from './learning-tracks';

export const topikExamBandSchema = z.enum(
  [...TOPIK_EXAM_BANDS] as [TopikExamBand, ...TopikExamBand[]],
);
export type { TopikExamBand } from './learning-tracks';

export const topikContentItemKindSchema = z.enum(
  [...TOPIK_CONTENT_ITEM_KINDS] as [TopikContentItemKind, ...TopikContentItemKind[]],
);
export type { TopikContentItemKind } from './learning-tracks';

export interface TopikTrackStatusDto {
  track: 'topik-ko';
  available: boolean;
  content_release: TopikContentRelease;
  available_levels: TopikExamLevel[];
  available_sections: TopikSection[];
  write_enabled: boolean;
}

export type TrackStatusDto = JlptTrackStatusDto | TopikTrackStatusDto;

/** Public NIIED reference data only. It deliberately contains no official questions or answers. */
export const topikOfficialBlueprintSchema = z.object({
  exam_level: topikExamLevelSchema,
  delivery_mode: z.string().min(1),
  section: topikSectionSchema,
  question_count: z.number().int().positive(),
  section_score: z.number().int().positive(),
  total_score: z.number().int().positive(),
  grade_min: z.number().int().positive(),
  grade_max: z.number().int().positive(),
});
export type TopikOfficialBlueprintDto = z.infer<typeof topikOfficialBlueprintSchema>;

export const topikOfficialReferenceSchema = z.object({
  source: z.object({
    code: z.string().min(1),
    title: z.string().min(1),
    source_url: z.string().url(),
    source_version: z.string().min(1),
    statistics_rows: z.number().int().nonnegative(),
  }),
  blueprints: z.array(topikOfficialBlueprintSchema).min(5),
  applicant_totals: z.array(z.object({
    exam_level: topikExamLevelSchema,
    applicants: z.number().int().nonnegative(),
  })).length(2),
});
export type TopikOfficialReferenceDto = z.infer<typeof topikOfficialReferenceSchema>;

export const topikPlacementAudioSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('r2'), url: z.string().min(1) }),
  z.object({ kind: z.literal('browser-fallback'), text_ko: z.string().min(1) }),
]);
export type TopikPlacementAudioDto = z.infer<typeof topikPlacementAudioSchema>;

export const topikPlacementQuestionSchema = z.object({
  id: z.string().min(1),
  section: topikSectionSchema,
  skill: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  prompt_ko: z.string().min(1),
  prompt_ja: z.string().min(1),
  prompt_en: z.string().min(1),
  choices: z.array(z.string().min(1)).length(4),
  audio: topikPlacementAudioSchema.nullable(),
});
export type TopikPlacementQuestionDto = z.infer<typeof topikPlacementQuestionSchema>;

export const topikPlacementStartBodySchema = z.object({
  instruction_language: z.enum([...TOPIK_INSTRUCTION_LANGUAGES]).default('en'),
});
export type TopikPlacementStartBody = z.infer<typeof topikPlacementStartBodySchema>;

export const topikPlacementAttemptSchema = z.object({
  id: z.string().min(1),
  bank_version: z.string().min(1),
  status: z.enum(['in_progress', 'completed']),
  instruction_language: z.enum([...TOPIK_INSTRUCTION_LANGUAGES]),
  questions: z.array(topikPlacementQuestionSchema),
  started_at: z.number().int(),
});
export type TopikPlacementAttemptDto = z.infer<typeof topikPlacementAttemptSchema>;

export const topikPlacementSubmitBodySchema = z.object({
  answers: z.array(z.object({
    question_id: z.string().min(1),
    selected_index: z.number().int().min(0).max(3),
  })).min(1).max(100),
});
export type TopikPlacementSubmitBody = z.infer<typeof topikPlacementSubmitBodySchema>;

export const topikPlacementResultSchema = z.object({
  attempt_id: z.string().min(1),
  score_total: z.number().int().min(0).max(100),
  score_listening: z.number().int().min(0).max(100),
  score_reading: z.number().int().min(0).max(100),
  result_band: z.enum(['starter', 'foundation', 'ready']),
  answers: z.array(z.object({
    question_id: z.string().min(1),
    selected_index: z.number().int().min(0).max(3),
    answer_index: z.number().int().min(0).max(3),
    is_correct: z.boolean(),
    explanation_en: z.string().min(1),
    explanation_ko: z.string().min(1),
    explanation_ja: z.string().min(1),
  })),
});
export type TopikPlacementResultDto = z.infer<typeof topikPlacementResultSchema>;

export const topikPracticeQuestionSchema = z.object({
  id: z.string().min(1),
  exam_level: topikExamLevelSchema,
  section: topikSectionSchema,
  question_type: z.enum(['choice', 'writing']),
  skill: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  prompt_ko: z.string().min(1),
  prompt_ja: z.string().min(1),
  prompt_en: z.string().min(1),
  choices: z.array(z.string().min(1)).max(4),
  audio: topikPlacementAudioSchema.nullable(),
});
export type TopikPracticeQuestionDto = z.infer<typeof topikPracticeQuestionSchema>;

export const topikPracticeListSchema = z.object({
  bank_version: z.string().min(1),
  exam_level: topikExamLevelSchema,
  section: topikSectionSchema,
  questions: z.array(topikPracticeQuestionSchema),
});
export type TopikPracticeListDto = z.infer<typeof topikPracticeListSchema>;

export const topikPracticeSolutionSchema = z.object({
  question_id: z.string().min(1),
  question_type: z.enum(['choice', 'writing']),
  answer_index: z.number().int().min(0).max(3).nullable(),
  explanation_ko: z.string().min(1),
  explanation_ja: z.string().min(1),
  explanation_en: z.string().min(1),
  sample_answer_ko: z.string().min(1).nullable(),
  sample_answer_ja: z.string().min(1).nullable(),
  sample_answer_en: z.string().min(1).nullable(),
});
export type TopikPracticeSolutionDto = z.infer<typeof topikPracticeSolutionSchema>;

/**
 * Public contract for the release-controlled TOPIK curriculum. Answers,
 * explanations, review metadata, and source evidence intentionally stay out
 * of this response.
 */
export const topikReleasedContentItemSchema = z.object({
  id: z.string().min(1),
  stable_ref: z.string().min(1),
  content_release: z.string().min(1),
  exam_level: topikExamLevelSchema,
  exam_band: topikExamBandSchema,
  section: topikSectionSchema,
  item_kind: topikContentItemKindSchema,
  skill: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  prompt_ko: z.string().min(1),
  prompt_ja: z.string().min(1),
  prompt_en: z.string().min(1),
});
export type TopikReleasedContentItemDto = z.infer<typeof topikReleasedContentItemSchema>;

export const topikReleasedContentListSchema = z.object({
  content_release: z.string().min(1),
  exam_level: topikExamLevelSchema,
  section: topikSectionSchema,
  items: z.array(topikReleasedContentItemSchema),
});
export type TopikReleasedContentListDto = z.infer<typeof topikReleasedContentListSchema>;

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
  reading_score: z.number().int().min(0).max(100).optional(),
  listening_score: z.number().int().min(0).max(100).optional(),
  speaking_score: z.number().int().min(0).max(100).optional(),
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
