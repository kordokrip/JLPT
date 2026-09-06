import type { LearningActivityGroup } from '../../lib/api';

export type NextLearningAction =
  | { kind: 'due-review'; to: string; count: number }
  | { kind: 'incomplete-owner'; to: string; grade: number }
  | { kind: 'weakest-area'; to: string; area: string; accuracy: number }
  | { kind: 'start-learning'; to: string };

function groupAccuracy(group: LearningActivityGroup): number | null {
  return group.quiz_answered > 0 ? group.quiz_correct / group.quiz_answered : null;
}

export function findWeakestArea(groups: LearningActivityGroup[]): {
  area: string;
  accuracy: number;
} | null {
  return groups
    .filter((group) => group.learning_track === 'topik-ko'
      && (group.section !== null || group.mode !== null)
      && group.quiz_answered > 0)
    .map((group) => ({ area: group.section ?? group.mode ?? 'reading', accuracy: groupAccuracy(group) ?? 1 }))
    .sort((a, b) => a.accuracy - b.accuracy || a.area.localeCompare(b.area))[0] ?? null;
}

/** Priority is product policy: due review, incomplete owner item, weakest area. */
export function selectNextLearningAction(input: {
  dueCount: number;
  incompleteGrade?: number;
  groups: LearningActivityGroup[];
}): NextLearningAction {
  if (input.dueCount > 0) {
    return { kind: 'due-review', to: '/track/topik-ko/review', count: input.dueCount };
  }
  if (input.incompleteGrade !== undefined) {
    return {
      kind: 'incomplete-owner',
      to: `/track/topik-ko/learn?grade=${input.incompleteGrade}#topik-owner-curriculum`,
      grade: input.incompleteGrade,
    };
  }
  const weakest = findWeakestArea(input.groups);
  if (weakest) {
    const section = ['listening', 'writing', 'reading'].includes(weakest.area)
      ? weakest.area
      : weakest.area === 'listening' ? 'listening' : 'reading';
    return {
      kind: 'weakest-area',
      to: `/track/topik-ko/learn?section=${section}#topik-practice`,
      ...weakest,
    };
  }
  return { kind: 'start-learning', to: '/track/topik-ko/learn#topik-owner-curriculum' };
}
