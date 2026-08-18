import { describe, expect, it } from 'vitest';
import { getAudioPlaybackPolicy, usesGoogleAudio } from '@nihongo-n3/shared';

describe('audio playback policy', () => {
  it('uses Google only and has no R2 fallback on learning surfaces', () => {
    expect(usesGoogleAudio('kana')).toBe(true);
    expect(usesGoogleAudio('listening')).toBe(true);
    expect(getAudioPlaybackPolicy('kana')).toMatchObject({
      primary: 'google',
      fallback: null,
      slow: true,
      preferGoogleVoice: true,
    });
  });

  it('uses Google for vocab and kanji audio', () => {
    expect(getAudioPlaybackPolicy('vocab').primary).toBe('google');
    expect(getAudioPlaybackPolicy('kanji').primary).toBe('google');
  });

  it('uses Google for QA without an R2 fallback', () => {
    expect(getAudioPlaybackPolicy('qa')).toMatchObject({
      primary: 'google',
      fallback: null,
      preferGoogleVoice: true,
    });
  });
});
