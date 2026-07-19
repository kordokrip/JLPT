export const LEARNING_TRACK_IDS = ['jlpt-ja', 'topik-ko'] as const;
export type LearningTrackId = (typeof LEARNING_TRACK_IDS)[number];

export const TOPIK_EXAM_LEVELS = ['TOPIK-I', 'TOPIK-II'] as const;
export type TopikExamLevel = (typeof TOPIK_EXAM_LEVELS)[number];

export const TOPIK_CONTENT_RELEASES = [
  'foundation-only',
  'placement-preview',
  'topik-i',
] as const;
export type TopikContentRelease = (typeof TOPIK_CONTENT_RELEASES)[number];

export const TOPIK_SECTIONS = ['listening', 'reading'] as const;
export type TopikSection = (typeof TOPIK_SECTIONS)[number];

export const INSTRUCTION_LANGUAGES = ['ko', 'en', 'ja'] as const;
export type InstructionLanguage = (typeof INSTRUCTION_LANGUAGES)[number];

export const TOPIK_INSTRUCTION_LANGUAGES = ['en', 'ko'] as const;
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
