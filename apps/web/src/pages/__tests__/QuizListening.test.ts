import { describe, expect, it } from 'vitest';
import { toSubmittedAnswers } from '../QuizListening';

describe('toSubmittedAnswers', () => {
  it('converts keyed answers to the API submit payload', () => {
    expect(toSubmittedAnswers({ q_1: 'choice-a', q_2: 'choice-b' })).toEqual([
      { question_id: 'q_1', answer: 'choice-a' },
      { question_id: 'q_2', answer: 'choice-b' },
    ]);
  });
});
