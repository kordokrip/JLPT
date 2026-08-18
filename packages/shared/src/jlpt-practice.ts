import { z } from 'zod';
import { jlptLevelSchema, quizModeSchema } from './api-schemas';

export const multilingualTextSchema = z.object({
  ko: z.string().trim().min(1),
  ja: z.string().trim().min(1),
  en: z.string().trim().min(1),
});

export const jlptPracticeQuestionSchema = z.object({
  id: z.string().trim().min(1).max(128),
  learning_track: z.literal('jlpt-ja').default('jlpt-ja'),
  level: jlptLevelSchema,
  mode: quizModeSchema,
  skill: z.string().trim().min(1),
  difficulty: z.number().int().min(1).max(5),
  question: multilingualTextSchema,
  choices: z.tuple([
    multilingualTextSchema,
    multilingualTextSchema,
    multilingualTextSchema,
    multilingualTextSchema,
  ]),
  answer_index: z.number().int().min(0).max(3),
  explanation: multilingualTextSchema,
  audio_script_ja: z.string().trim().min(1).optional(),
  source_code: z.string().trim().min(1),
  source_evidence_sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  bank_version: z.string().trim().min(1),
  is_published: z.boolean().default(false),
}).superRefine((question, ctx) => {
  if (question.mode === 'listening' && !question.audio_script_ja) {
    ctx.addIssue({ code: 'custom', path: ['audio_script_ja'], message: 'listening requires a Japanese browser-speech script' });
  }
  for (const language of ['ko', 'ja', 'en'] as const) {
    const normalized = question.choices.map((choice) => choice[language].trim().toLocaleLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      ctx.addIssue({ code: 'custom', path: ['choices'], message: `${language} choices must be distinct` });
    }
  }
});

export type JlptPracticeQuestion = z.infer<typeof jlptPracticeQuestionSchema>;
