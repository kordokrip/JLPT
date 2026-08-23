import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGrowthReadinessReport, growthReadinessQueries } from './growth-readiness.js';

test('growth readiness counts only strict N3 and TOPIK owner event contracts', () => {
  const sql = growthReadinessQueries(1_700_000_000).join('\n');
  assert.match(sql, /level_tag = 'N3'/);
  assert.match(sql, /content_type = 'topik-owner-item'/);
  assert.match(sql, /event_type = 'content_completed'/);
  assert.match(sql, /event_type = 'review_rated'/);
  assert.doesNotMatch(sql, /topik_practice_question/);
  assert.doesNotMatch(sql, /email|display_name|prompt_ko/);
});

test('first expansion metrics are observational and preserve the 50/10/5 decision rule', () => {
  const report = buildGrowthReadinessReport({
    windowDays: 30,
    generatedAt: '2026-08-23T00:00:00.000Z',
    from: '2026-07-24T00:00:00.000Z',
    target: { remote: true, database: 'nihongo-n3-prod-v2' },
    threshold: {
      n3_quiz_responses: 50,
      topik_owner_completions: 9,
      topik_owner_fsrs_reviews: 5,
    },
    jlptAccuracy: [{ level_tag: 'N3', area: 'kanji_reading', responses: 50, correct: 35 }],
    topikOwnerActivity: [{ target_grade: 3, item_type: 'vocab', completions: 3, reviews: 1 }],
    speechOutcomes: [{ learning_track: 'topik-ko', speech_outcome: 'played', attempts: 2 }],
  });

  assert.equal(report.releaseBlocking, false);
  assert.equal(report.allThresholdsReached, false);
  assert.deepEqual(report.thresholds, {
    n3QuizResponses: { current: 50, target: 50, reached: true },
    topikOwnerCompletions: { current: 9, target: 10, reached: false },
    topikOwnerFsrsReviews: { current: 5, target: 5, reached: true },
  });
  assert.equal(report.jlptAccuracy[0]?.accuracy, 0.7);
  assert.deepEqual(report.countingPolicy.excludedFromOwnerCompletion, ['TOPIK practice quiz answers']);
});
