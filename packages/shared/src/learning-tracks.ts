import { z } from 'zod';

export const LEARNING_TRACK_IDS = ['jlpt-ja', 'topik-ko'] as const;
export type LearningTrackId = (typeof LEARNING_TRACK_IDS)[number];
export const learningTrackSchema = z.enum(LEARNING_TRACK_IDS);

export const TOPIK_EXAM_LEVELS = ['TOPIK-I', 'TOPIK-II'] as const;
export type TopikExamLevel = (typeof TOPIK_EXAM_LEVELS)[number];

export const TOPIK_CONTENT_RELEASES = [
  'foundation-only',
  'placement-v2',
  'topik-i',
  'topik-i-ii',
] as const;
export type TopikContentRelease = (typeof TOPIK_CONTENT_RELEASES)[number];

export const TOPIK_SECTIONS = ['listening', 'writing', 'reading'] as const;
export type TopikSection = (typeof TOPIK_SECTIONS)[number];

/** Immutable content-release lifecycle. A published release may only be withdrawn. */
export const CONTENT_PUBLISH_STATES = [
  'draft',
  'automated_checked',
  'human_reviewed',
  'preview',
  'approved',
  'published',
  'withdrawn',
] as const;
export type ContentPublishState = (typeof CONTENT_PUBLISH_STATES)[number];

/** TOPIK bands are independent of JLPT N-levels. */
export const TOPIK_EXAM_BANDS = ['beginner', 'intermediate', 'advanced'] as const;
export type TopikExamBand = (typeof TOPIK_EXAM_BANDS)[number];

export const TOPIK_CONTENT_ITEM_KINDS = [
  'lesson',
  'vocab',
  'grammar',
  'character',
  'listening',
  'reading',
  'writing',
  'practice',
] as const;
export type TopikContentItemKind = (typeof TOPIK_CONTENT_ITEM_KINDS)[number];

export const INSTRUCTION_LANGUAGES = ['ko', 'en', 'ja'] as const;
export type InstructionLanguage = (typeof INSTRUCTION_LANGUAGES)[number];

export const TOPIK_INSTRUCTION_LANGUAGES = ['en', 'ko', 'ja'] as const;
export type TopikInstructionLanguage = (typeof TOPIK_INSTRUCTION_LANGUAGES)[number];

export interface LearningTrackDefinition {
  id: LearningTrackId;
  learningLanguage: 'ja' | 'ko';
  defaultInstructionLanguage: InstructionLanguage;
  homePath: string;
  labelKo: string;
  labelEn: string;
  shortLabel: string;
}

export const LEARNING_TRACK_DEFINITIONS = {
  'jlpt-ja': {
    id: 'jlpt-ja',
    learningLanguage: 'ja',
    defaultInstructionLanguage: 'ko',
    homePath: '/',
    labelKo: '일본어 · JLPT',
    labelEn: 'Japanese · JLPT',
    shortLabel: 'JLPT',
  },
  'topik-ko': {
    id: 'topik-ko',
    learningLanguage: 'ko',
    defaultInstructionLanguage: 'en',
    homePath: '/track/topik-ko',
    labelKo: '한국어 · TOPIK',
    labelEn: 'Korean · TOPIK',
    shortLabel: 'TOPIK',
  },
} as const satisfies Record<LearningTrackId, LearningTrackDefinition>;

export function learningTrackDefinition(track: LearningTrackId): LearningTrackDefinition {
  return LEARNING_TRACK_DEFINITIONS[track];
}
