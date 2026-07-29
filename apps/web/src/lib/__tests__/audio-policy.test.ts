import { describe, expect, it } from 'vitest';
import { getAudioPlaybackPolicy, prefersBrowserAudio } from '@nihongo-n3/shared';

describe('audio playback policy', () => {
  it('uses the Japanese browser voice before an R2 fallback on learning surfaces', () => {
    expect(prefersBrowserAudio('kana')).toBe(true);
    expect(prefersBrowserAudio('listening')).toBe(true);
    expect(getAudioPlaybackPolicy('kana')).toMatchObject({
      primary: 'browser',
      fallback: 'r2',
      slow: true,
      preferGoogleVoice: true,
    });
  });

  it('uses the browser first for vocab and kanji audio', () => {
    expect(getAudioPlaybackPolicy('vocab').primary).toBe('browser');
    expect(getAudioPlaybackPolicy('kanji').primary).toBe('browser');
  });

  it('keeps QA on provenance-recorded R2 objects with a browser fallback', () => {
    expect(getAudioPlaybackPolicy('qa')).toMatchObject({
      primary: 'r2',
      fallback: 'browser',
      preferGoogleVoice: true,
    });
  });
});
