import { describe, expect, it } from 'vitest';
import { getAudioPlaybackPolicy, usesGoogleAudio } from '@nihongo-n3/shared';

describe('audio playback policy', () => {
  it('prefers Google and uses browser speech without an R2 fallback', () => {
    expect(usesGoogleAudio('kana')).toBe(true);
    expect(usesGoogleAudio('listening')).toBe(true);
    expect(getAudioPlaybackPolicy('kana')).toMatchObject({
      primary: 'browser-speech',
      fallback: null,
      slow: true,
      preferGoogleVoice: true,
    });
  });

  it('uses browser speech for vocab and kanji audio', () => {
    expect(getAudioPlaybackPolicy('vocab').primary).toBe('browser-speech');
    expect(getAudioPlaybackPolicy('kanji').primary).toBe('browser-speech');
  });

  it('prefers Google for QA without an R2 fallback', () => {
    expect(getAudioPlaybackPolicy('qa')).toMatchObject({
      primary: 'browser-speech',
      fallback: null,
      preferGoogleVoice: true,
    });
  });
});
