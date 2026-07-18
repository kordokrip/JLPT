import { describe, expect, it } from 'vitest';
import { recommendStudyPlan } from '@nihongo-n3/shared';

describe('study plan recommendation policy', () => {
  it('keeps the 52-week plan as the safe default when readiness is unknown', () => {
    expect(recommendStudyPlan({})).toMatchObject({
      plan: 'annual-52-week',
      eligibleForIntensive: false,
      unmet: ['kana', 'n5-diagnostic', 'weekly-time', 'exam-window'],
    });
  });

  it('recommends 16 weeks only when every readiness gate is met', () => {
    expect(recommendStudyPlan({
      kanaAccuracyPct: 90,
      n5DiagnosticPct: 80,
      weeklyMinutes: 420,
      weeksUntilExam: 20,
    })).toEqual({
      plan: 'intensive-16-week',
      eligibleForIntensive: true,
      unmet: [],
    });
  });

  it('does not waive the other gates for a near exam date', () => {
    expect(recommendStudyPlan({
      kanaAccuracyPct: 89,
      n5DiagnosticPct: 95,
      weeklyMinutes: 600,
      weeksUntilExam: 4,
    }).plan).toBe('annual-52-week');
  });
});
