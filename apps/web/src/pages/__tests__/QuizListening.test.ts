import { describe, expect, it } from 'vitest';
import { initialListeningAudioSource, toSubmittedAnswers } from '../../features/quiz-listening/logic';

describe('toSubmittedAnswers', () => {
  it('converts keyed answers to the API submit payload', () => {
    expect(toSubmittedAnswers({ q_1: 'choice-a', q_2: 'choice-b' })).toEqual([
      { question_id: 'q_1', answer: 'choice-a' },
      { question_id: 'q_2', answer: 'choice-b' },
    ]);
  });
});

describe('initialListeningAudioSource', () => {
  it('uses approved R2 audio when the listening question has a fixed asset', () => {
    expect(initialListeningAudioSource(true)).toBe('server');
  });

  it('falls back to browser voice when no server audio exists', () => {
    expect(initialListeningAudioSource(false)).toBe('browser');
  });
});
