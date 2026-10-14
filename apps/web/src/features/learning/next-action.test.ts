import { describe, expect, it } from 'vitest';

import type { LearningActivityGroup } from '../../lib/api';
import { selectNextLearningAction } from './next-action';

function group(overrides: Partial<LearningActivityGroup>): LearningActivityGroup {
  return {
    learning_track: 'topik-ko',
    level_tag: 'TOPIK-I',
    section: 'reading',
    mode: null,
    events: 10,
    completed: 0,
    quiz_answered: 10,
    quiz_correct: 7,
    reviews: 0,
    speech_attempts: 0,
    speech_played: 0,
    speech_unavailable: 0,
    speech_errors: 0,
    ...overrides,
  };
}

describe('selectNextLearningAction', () => {
  it('prioritizes due review over incomplete owner content and weak areas', () => {
    expect(selectNextLearningAction({
      dueCount: 3,
      incompleteGrade: 1,
      groups: [group({ quiz_correct: 1 })],
    })).toEqual({ kind: 'due-review', to: '/track/topik-ko/review', count: 3 });
  });

  it('prioritizes incomplete owner content when no review is due', () => {
    expect(selectNextLearningAction({
      dueCount: 0,
      incompleteGrade: 2,
      groups: [group({ quiz_correct: 1 })],
    })).toEqual({
      kind: 'incomplete-owner',
      to: '/track/topik-ko/learn?grade=2#topik-owner-curriculum',
      grade: 2,
    });
  });

  it('chooses the lowest-accuracy area after review and owner work are complete', () => {
    expect(selectNextLearningAction({
      dueCount: 0,
      groups: [
        group({ section: 'reading', quiz_correct: 8 }),
        group({ section: 'listening', quiz_correct: 3 }),
      ],
    })).toEqual({
      kind: 'weakest-area',
      to: '/track/topik-ko/learn?section=listening#topik-practice',
      area: 'listening',
      accuracy: 0.3,
    });
  });
});
