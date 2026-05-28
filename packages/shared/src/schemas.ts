import { z } from 'zod';

// ─────────────────────────────────────────────
// JLPT 레벨
// ─────────────────────────────────────────────
export const jlptLevelSchema = z.enum(['N5', 'N4', 'N3']);
export type JlptLevel = z.infer<typeof jlptLevelSchema>;

// ─────────────────────────────────────────────
// 단어 DTO
// ─────────────────────────────────────────────
export const vocabularyDtoSchema = z.object({
  id: z.number().int().positive(),
  level: jlptLevelSchema,
  word: z.string().min(1),
  reading: z.string().min(1),
  meaning: z.string().min(1),
  partOfSpeech: z.string().min(1),
  exampleSentence: z.string().nullable(),
  audioKey: z.string().nullable(),
});
export type VocabularyDto = z.infer<typeof vocabularyDtoSchema>;

// ─────────────────────────────────────────────
// 한자 DTO
// ─────────────────────────────────────────────
export const kanjiDtoSchema = z.object({
  id: z.number().int().positive(),
  level: jlptLevelSchema,
  character: z.string().length(1),
  onyomi: z.string().nullable(),
  kunyomi: z.string().nullable(),
  meaning: z.string().min(1),
  strokeCount: z.number().int().positive().nullable(),
});
export type KanjiDto = z.infer<typeof kanjiDtoSchema>;

// ─────────────────────────────────────────────
// 학습 진도 DTO
// ─────────────────────────────────────────────
export const progressDtoSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string().min(1),
  itemType: z.enum(['vocabulary', 'kanji', 'grammar']),
  itemId: z.number().int().positive(),
  ease: z.number().min(1.3).max(5.0),
  interval: z.number().int().nonnegative(),
  repetitions: z.number().int().nonnegative(),
  nextReview: z.coerce.date(),
});
export type ProgressDto = z.infer<typeof progressDtoSchema>;

// ─────────────────────────────────────────────
// API 응답 래퍼
// ─────────────────────────────────────────────
export const paginationMetaSchema = z.object({
  page: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export const apiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: paginationMetaSchema.optional(),
  });

export const apiErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

// ─────────────────────────────────────────────
// FSRS 설정 스키마 (Phase B OpenAPI 자동 생성용)
// ─────────────────────────────────────────────
export const FsrsOptionsSchema = z.object({
  request_retention:  z.number().min(0.7).max(0.99).optional(),
  maximum_interval:   z.number().int().positive().optional(),
  enable_fuzz:        z.boolean().optional(),
  enable_short_term:  z.boolean().optional(),
});
export type FsrsOptionsInput = z.infer<typeof FsrsOptionsSchema>;
