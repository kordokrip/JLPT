import { describe, expect, it } from 'vitest';
import { audioPlayer } from '../../lib/audio';
import { initialListeningAudioSource, toSubmittedAnswers } from '../QuizListening';

describe('toSubmittedAnswers', () => {
  it('converts keyed answers to the API submit payload', () => {
    expect(toSubmittedAnswers({ q_1: 'choice-a', q_2: 'choice-b' })).toEqual([
      { question_id: 'q_1', answer: 'choice-a' },
      { question_id: 'q_2', answer: 'choice-b' },
    ]);
  });
});

describe('initialListeningAudioSource', () => {
  it('uses browser voice when the user preference is browser even if server audio exists', () => {
    audioPlayer.sourcePreference = 'browser';
    expect(initialListeningAudioSource(true)).toBe('browser');
  });

  it('keeps browser voice as the listening default even when the global preference is server', () => {
    audioPlayer.sourcePreference = 'server';
    expect(initialListeningAudioSource(true)).toBe('browser');
  });

  it('falls back to browser voice when no server audio exists', () => {
    audioPlayer.sourcePreference = 'server';
    expect(initialListeningAudioSource(false)).toBe('browser');
  });
});
