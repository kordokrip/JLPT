import { z } from "zod";
import { learningTrackSchema } from "./learning-tracks";

export const studyLevelSchema = z.enum([
  "N5",
  "N4",
  "N3",
  "N2",
  "N1",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
]);
export const learningProfileInputSchema = z.object({
  target_level: studyLevelSchema,
  instruction_language: z.enum(["ko", "ja", "en"]),
  daily_minutes: z
    .union([z.literal(10), z.literal(20), z.literal(30)])
    .default(20),
  timezone: z
    .string()
    .max(80)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }),
});
export const learningProfileSchema = learningProfileInputSchema.extend({
  learning_track: learningTrackSchema,
  configured: z.boolean(),
});
export const studyRefSchema = z.object({
  track: learningTrackSchema,
  type: z.enum([
    "vocab",
    "grammar",
    "kanji",
    "sentence",
    "sysprog",
    "homophone",
    "jlpt-practice",
    "topik-owner-item",
    "topik-practice",
  ]),
  id: z.string().min(1).max(160),
  version: z.string().min(1).max(160),
});
export type StudyRef = z.infer<typeof studyRefSchema>;
export function studyRefKey(ref: StudyRef): string {
  return [ref.track, ref.type, ref.id, ref.version]
    .map(encodeURIComponent)
    .join(":");
}
// 강성호 2026-10-11: 취득 시각과 음성 준비 상태는 내용 버전이 아니므로 환경별 ref 흔들림을 막는다.
export function studyContentVersionInput(row: Record<string, unknown>): string {
  return JSON.stringify(Object.fromEntries(Object.entries(row)
    .filter(([key])=>!['created_at','updated_at','binding_state'].includes(key)).sort(([a],[b])=>a<b?-1:a>b?1:0)));
}
export function levelBelongsToTrack(track: string, level: string): boolean {
  return track === "jlpt-ja" ? /^N[1-5]$/.test(level) : /^[1-6]$/.test(level);
}
export const studySubmissionSchema = z.object({
  request_id: z.string().uuid(),
  answer: z.string().max(5000).optional(),
  rating: z.enum(["again", "hard", "good", "easy"]).optional(),
  active_ms: z.number().int().min(0).max(1_800_000).default(0),
});
export const annotationInputSchema = z.object({
  scope: z.enum(["content", "day"]),
  ref: z.string().min(1).max(700),
  text: z.string().max(1000),
  revision: z.number().int().min(0),
});
export const studySolutionSchema = z.object({
  explanation: z.string(),
  answer: z.string().nullable(),
  sample: z.string().nullable(),
});
export const studyStepSchema = z.object({
  id: z.string(),
  ordinal: z.number(),
  phase: z.enum(["review", "learn", "practice", "retry"]),
  ref: studyRefSchema,
  section: z.string(),
  level: z.string(),
  prompt: z.string(),
  reading: z.string().nullable(),
  choices: z.array(z.string()),
  audio: z
    .object({ language: z.enum(["ja", "ko"]), text: z.string() })
    .nullable(),
  mode: z.enum(["recall", "choice", "writing"]),
  revealed: z.boolean(),
  submitted: z.boolean(),
  correct: z.boolean().nullable(),
  answer: z.string().nullable(),
  rating: z.string().nullable(),
  solution: studySolutionSchema.nullable(),
});
export const studySessionSchema = z.object({
  id: z.string(),
  learning_track: learningTrackSchema,
  level: studyLevelSchema,
  daily_minutes: z.number(),
  mode: z.enum(["quick", "daily"]).default("daily"),
  lesson_id: z.string().optional(),
  lesson_version: z.string().optional(),
  status: z.enum(["active", "paused", "completed", "abandoned"]),
  created_at: z.number(),
  updated_at: z.number(),
  steps: z.array(studyStepSchema),
  notices: z.array(z.string()),
});
export type LearningProfile = z.infer<typeof learningProfileSchema>;
export type StudySession = z.infer<typeof studySessionSchema>;
export type StudyStep = z.infer<typeof studyStepSchema>;
export type StudySubmission = z.infer<typeof studySubmissionSchema>;
// 강성호 2026-10-11: 목록에는 정답/본문 대신 공개 레슨과 수락된 세션 상태만 제공한다.
export const learningLessonCatalogSchema = z.object({
  level: studyLevelSchema,
  lessons: z.array(z.object({
    id: z.string(), version: z.string(), title: z.string(), ordinal: z.number().int(),
    completed: z.boolean(), active_session_id: z.string().nullable(),
  })),
  next_lesson_id: z.string().nullable(),
});
export type LearningLessonCatalog = z.infer<typeof learningLessonCatalogSchema>;
export const learningMotivationSchema = z.object({
  streak: z.number(),
  longest_streak: z.number(),
  xp: z.number(),
  level: z.number(),
  due_count: z.number(),
  badges: z.array(z.object({ id: z.string(), earned_at: z.string() })),
  rules: z.object({
    xp_scope: z.literal("guided-sessions"),
    daily_cap: z.literal(100),
    cap_scope: z.literal("track-local-day"),
    level_step: z.literal(100),
  }).optional(),
});
export type LearningMotivation = z.infer<typeof learningMotivationSchema>;
export type LearningAnnotation = {
  scope: "content" | "day";
  ref: string;
  text: string;
  revision: number;
};
export interface LearningRecords {
  window: "7d" | "30d";
  totals: {
    first_answers: number;
    first_correct: number;
    retry_answers: number;
    retry_correct: number;
    learned: number;
    reviews: number;
    active_ms: number;
  };
  days: Array<{
    date: string;
    completed: number;
    reviews: number;
    answers: number;
    correct: number;
    active_ms: number;
  }>;
  groups: Array<{
    level: string;
    section: string;
    answered: number;
    correct: number;
  }>;
  sessions: Array<{
    id: string;
    level: string;
    status: string;
    created_at: number;
    updated_at: number;
    done: number;
    total: number;
  }>;
  next_review_at: number | null;
}
export const learningRecordsSchema: z.ZodType<LearningRecords> = z.object({
  window: z.enum(["7d", "30d"]),
  totals: z.object({
    first_answers: z.number(),
    first_correct: z.number(),
    retry_answers: z.number(),
    retry_correct: z.number(),
    learned: z.number(),
    reviews: z.number(),
    active_ms: z.number(),
  }),
  days: z.array(
    z.object({
      date: z.string(),
      completed: z.number(),
      reviews: z.number(),
      answers: z.number(),
      correct: z.number(),
      active_ms: z.number(),
    }),
  ),
  groups: z.array(
    z.object({
      level: z.string(),
      section: z.string(),
      answered: z.number(),
      correct: z.number(),
    }),
  ),
  sessions: z.array(
    z.object({
      id: z.string(),
      level: z.string(),
      status: z.string(),
      created_at: z.number(),
      updated_at: z.number(),
      done: z.number(),
      total: z.number(),
    }),
  ),
  next_review_at: z.number().nullable(),
});
