import { z } from 'zod';
import { learningTrackSchema } from './learning-tracks';
import { quizModeSchema } from './api-schemas';

export const learningActivityEventTypeSchema = z.enum([
  'content_opened',
  'content_completed',
  'quiz_answered',
  'review_rated',
  'speech_attempted',
]);

export const learningActivityEventSchema = z.object({
  event_id: z.string().trim().min(1).max(128),
  event_type: learningActivityEventTypeSchema,
  learning_track: learningTrackSchema,
  content_type: z.string().trim().min(1).max(64).optional(),
  content_id: z.string().trim().min(1).max(128).optional(),
  level_tag: z.string().trim().min(1).max(32).optional(),
  section: z.string().trim().min(1).max(32).optional(),
  mode: quizModeSchema.optional(),
  correct: z.boolean().optional(),
  rating: z.enum(['again', 'hard', 'good', 'easy']).optional(),
  duration_ms: z.number().int().nonnegative().optional(),
  speech_outcome: z.enum(['played', 'unavailable', 'error']).optional(),
  occurred_at: z.string().datetime({ offset: true }),
}).superRefine((event, ctx) => {
  if (['quiz_answered', 'review_rated', 'speech_attempted'].includes(event.event_type)) {
    if (!event.content_type) ctx.addIssue({ code: 'custom', path: ['content_type'], message: 'content_type is required for this event' });
    if (!event.content_id) ctx.addIssue({ code: 'custom', path: ['content_id'], message: 'content_id is required for this event' });
  }
  if (event.event_type === 'quiz_answered' && event.correct === undefined) {
    ctx.addIssue({ code: 'custom', path: ['correct'], message: 'correct is required for quiz_answered' });
  }
  if (event.event_type === 'review_rated' && event.rating === undefined) {
    ctx.addIssue({ code: 'custom', path: ['rating'], message: 'rating is required for review_rated' });
  }
  if (event.event_type === 'speech_attempted' && event.speech_outcome === undefined) {
    ctx.addIssue({ code: 'custom', path: ['speech_outcome'], message: 'speech_outcome is required for speech_attempted' });
  }
});

export const learningActivityEventsBodySchema = z.object({
  events: z.array(learningActivityEventSchema).min(1).max(100),
});

export const learningActivitySummaryQuerySchema = z.object({
  window: z.enum(['7d', '30d']).default('7d'),
});

export const learningActivityCountersSchema = z.object({
  events: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  quiz_answered: z.number().int().nonnegative(),
  quiz_correct: z.number().int().nonnegative(),
  reviews: z.number().int().nonnegative(),
  speech_attempts: z.number().int().nonnegative(),
  speech_played: z.number().int().nonnegative(),
  speech_unavailable: z.number().int().nonnegative(),
  speech_errors: z.number().int().nonnegative(),
});

export const learningActivitySummaryGroupSchema = learningActivityCountersSchema.extend({
  learning_track: learningTrackSchema,
  level_tag: z.string().nullable(),
  section: z.string().nullable(),
  mode: quizModeSchema.nullable(),
});

export const learningActivitySummarySchema = z.object({
  window: z.enum(['7d', '30d']),
  from: z.string().datetime(),
  totals: learningActivityCountersSchema,
  groups: z.array(learningActivitySummaryGroupSchema),
});

export type LearningActivityEvent = z.infer<typeof learningActivityEventSchema>;
export type LearningActivityEventsBody = z.infer<typeof learningActivityEventsBodySchema>;
export type LearningActivitySummary = z.infer<typeof learningActivitySummarySchema>;

