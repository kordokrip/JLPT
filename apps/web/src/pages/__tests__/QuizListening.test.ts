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
  it('uses the Google/browser Japanese voice before a server asset', () => {
    expect(initialListeningAudioSource(true)).toBe('browser');
  });

  it('uses the browser Japanese voice when no server asset exists', () => {
    expect(initialListeningAudioSource(false)).toBe('browser');
  });
});
