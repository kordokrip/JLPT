import { describe, expect, it } from 'vitest';
import { getAudioPlaybackPolicy, prefersBrowserAudio } from '@nihongo-n3/shared';

describe('audio playback policy', () => {
  it('uses reviewed private R2 audio without a browser fallback on learning surfaces', () => {
    expect(prefersBrowserAudio('kana')).toBe(false);
    expect(prefersBrowserAudio('listening')).toBe(false);
    expect(getAudioPlaybackPolicy('kana')).toMatchObject({
      primary: 'r2',
      fallback: 'r2',
      slow: true,
      preferGoogleVoice: false,
    });
  });

  it('uses R2 first for vocab and kanji audio', () => {
    expect(getAudioPlaybackPolicy('vocab').primary).toBe('r2');
    expect(getAudioPlaybackPolicy('kanji').primary).toBe('r2');
  });

  it('keeps QA on provenance-recorded R2 objects with no browser fallback', () => {
    expect(getAudioPlaybackPolicy('qa')).toMatchObject({
      primary: 'r2',
      fallback: 'r2',
      preferGoogleVoice: false,
    });
  });
});
