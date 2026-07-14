export type StudyPlanId = 'annual-52-week' | 'intensive-16-week';

export interface StudyPlanReadiness {
  kanaAccuracyPct?: number;
  n5DiagnosticPct?: number;
  weeklyMinutes?: number;
  weeksUntilExam?: number;
}

export interface StudyPlanRecommendation {
  plan: StudyPlanId;
  eligibleForIntensive: boolean;
  unmet: Array<'kana' | 'n5-diagnostic' | 'weekly-time' | 'exam-window'>;
}

export function recommendStudyPlan(readiness: StudyPlanReadiness): StudyPlanRecommendation {
  const unmet: StudyPlanRecommendation['unmet'] = [];
  if ((readiness.kanaAccuracyPct ?? 0) < 90) unmet.push('kana');
  if ((readiness.n5DiagnosticPct ?? 0) < 80) unmet.push('n5-diagnostic');
  if ((readiness.weeklyMinutes ?? 0) < 420) unmet.push('weekly-time');
  if (readiness.weeksUntilExam === undefined || readiness.weeksUntilExam > 20) unmet.push('exam-window');

  return {
    plan: unmet.length === 0 ? 'intensive-16-week' : 'annual-52-week',
    eligibleForIntensive: unmet.length === 0,
    unmet,
  };
}
