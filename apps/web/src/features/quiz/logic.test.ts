import { describe, expect, it } from 'vitest';
import { isQuizMode, toQuizAnswers } from './logic';

describe('quiz feature logic', () => {
  it('accepts only supported route modes', () => {
    expect(isQuizMode('vocab_mc')).toBe(true);
    expect(isQuizMode('listening')).toBe(true);
    expect(isQuizMode('unsupported')).toBe(false);
    expect(isQuizMode(undefined)).toBe(false);
  });

  it('keeps selected answers in the existing submit wire format', () => {
    expect(toQuizAnswers({ question_1: 'A', question_2: 'B' })).toEqual([
      { question_id: 'question_1', answer: 'A' },
      { question_id: 'question_2', answer: 'B' },
    ]);
  });
});
