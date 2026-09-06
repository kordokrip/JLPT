export const GROWTH_READINESS_TARGETS = {
  n3QuizResponses: 50,
  topikOwnerCompletions: 10,
  topikOwnerFsrsReviews: 5,
} as const;

export interface GrowthThresholdRow {
  n3_quiz_responses: number | null;
  topik_owner_completions: number | null;
  topik_owner_fsrs_reviews: number | null;
}

export interface JlptAccuracyRow {
  level_tag: string;
  area: string;
  responses: number;
  correct: number;
}

export interface TopikOwnerActivityRow {
  target_grade: number;
  item_type: string;
  completions: number;
  reviews: number;
}

export interface SpeechOutcomeRow {
  learning_track: 'jlpt-ja' | 'topik-ko';
  speech_outcome: 'played' | 'unavailable' | 'error';
  attempts: number;
}

export function growthReadinessQueries(cutoff: number): readonly string[] {
  const acceptedWindow = `occurred_at >= ${Math.floor(cutoff)}`;
  return [
    `SELECT
       coalesce(sum(CASE
         WHEN learning_track = 'jlpt-ja' AND event_type = 'quiz_answered' AND level_tag = 'N3'
         THEN 1 ELSE 0 END), 0) AS n3_quiz_responses,
       coalesce(sum(CASE
         WHEN learning_track = 'topik-ko' AND event_type = 'content_completed'
          AND content_type = 'topik-owner-item'
         THEN 1 ELSE 0 END), 0) AS topik_owner_completions,
       coalesce(sum(CASE
         WHEN learning_track = 'topik-ko' AND event_type = 'review_rated'
          AND content_type = 'topik-owner-item'
         THEN 1 ELSE 0 END), 0) AS topik_owner_fsrs_reviews
     FROM learning_activity_events
     WHERE ${acceptedWindow}`,
    `SELECT coalesce(level_tag, 'unknown') AS level_tag,
            coalesce(mode, section, 'unknown') AS area,
            count(*) AS responses,
            sum(CASE WHEN correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM learning_activity_events
      WHERE ${acceptedWindow}
        AND learning_track = 'jlpt-ja' AND event_type = 'quiz_answered'
      GROUP BY coalesce(level_tag, 'unknown'), coalesce(mode, section, 'unknown')
      ORDER BY level_tag, area`,
    `SELECT item.target_grade, item.item_type,
            sum(CASE WHEN activity.event_type = 'content_completed' THEN 1 ELSE 0 END) AS completions,
            sum(CASE WHEN activity.event_type = 'review_rated' THEN 1 ELSE 0 END) AS reviews
       FROM learning_activity_events activity
       JOIN topik_owner_authored_curriculum_items item ON item.id = activity.content_id
      WHERE activity.${acceptedWindow}
        AND activity.learning_track = 'topik-ko'
        AND activity.content_type = 'topik-owner-item'
        AND activity.event_type IN ('content_completed', 'review_rated')
      GROUP BY item.target_grade, item.item_type
      ORDER BY item.target_grade, item.item_type`,
    `SELECT learning_track, speech_outcome, count(*) AS attempts
       FROM learning_activity_events
      WHERE ${acceptedWindow}
        AND event_type = 'speech_attempted'
      GROUP BY learning_track, speech_outcome
      ORDER BY learning_track, speech_outcome`,
  ];
}

function count(value: number | null | undefined): number {
  return Number(value ?? 0);
}

export function buildGrowthReadinessReport(input: {
  windowDays: 7 | 30;
  generatedAt: string;
  from: string;
  target: { remote: boolean; database: string; env?: string };
  threshold?: GrowthThresholdRow;
  jlptAccuracy: readonly JlptAccuracyRow[];
  topikOwnerActivity: readonly TopikOwnerActivityRow[];
  speechOutcomes: readonly SpeechOutcomeRow[];
}) {
  const threshold = {
    n3QuizResponses: {
      current: count(input.threshold?.n3_quiz_responses),
      target: GROWTH_READINESS_TARGETS.n3QuizResponses,
    },
    topikOwnerCompletions: {
      current: count(input.threshold?.topik_owner_completions),
      target: GROWTH_READINESS_TARGETS.topikOwnerCompletions,
    },
    topikOwnerFsrsReviews: {
      current: count(input.threshold?.topik_owner_fsrs_reviews),
      target: GROWTH_READINESS_TARGETS.topikOwnerFsrsReviews,
    },
  };
  const thresholds = Object.fromEntries(Object.entries(threshold).map(([key, value]) => [
    key,
    { ...value, reached: value.current >= value.target },
  ]));

  return {
    reportVersion: 1,
    generatedAt: input.generatedAt,
    window: `${input.windowDays}d`,
    from: input.from,
    target: input.target,
    thresholds,
    allThresholdsReached: Object.values(threshold).every((value) => value.current >= value.target),
    releaseBlocking: false,
    decisionPolicy: 'This first expansion is quality-gated; if thresholds remain unmet at D+30, improve learning-entry UX before Batch 7.',
    countingPolicy: {
      acceptedEventsOnly: true,
      duplicateRule: 'learning_activity_events UNIQUE(user_id,event_id)',
      topikOwnerCompletions: "topik-ko content_completed events with content_type='topik-owner-item'",
      topikOwnerFsrsReviews: "topik-ko review_rated events with content_type='topik-owner-item'",
      excludedFromOwnerCompletion: ['TOPIK practice quiz answers'],
    },
    jlptAccuracy: input.jlptAccuracy.map((row) => ({
      levelTag: row.level_tag,
      area: row.area,
      responses: count(row.responses),
      correct: count(row.correct),
      accuracy: count(row.responses) === 0 ? null : count(row.correct) / count(row.responses),
    })),
    topikOwnerActivity: input.topikOwnerActivity.map((row) => ({
      targetGrade: count(row.target_grade),
      itemType: row.item_type,
      completions: count(row.completions),
      reviews: count(row.reviews),
    })),
    speechOutcomes: input.speechOutcomes.map((row) => ({
      learningTrack: row.learning_track,
      speechOutcome: row.speech_outcome,
      attempts: count(row.attempts),
    })),
  };
}
