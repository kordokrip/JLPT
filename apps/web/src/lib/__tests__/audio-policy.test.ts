import { describe, expect, it } from 'vitest';
import { getAudioPlaybackPolicy, prefersBrowserAudio } from '@nihongo-n3/shared';

describe('audio playback policy', () => {
  it('uses approved R2 assets before browser Japanese fallback', () => {
    expect(prefersBrowserAudio('kana')).toBe(false);
    expect(prefersBrowserAudio('listening')).toBe(false);
    expect(getAudioPlaybackPolicy('kana')).toMatchObject({
      primary: 'r2',
      fallback: 'browser',
      slow: true,
      preferGoogleVoice: true,
    });
  });

  it('uses R2 first for fixed vocab and kanji audio', () => {
    expect(getAudioPlaybackPolicy('vocab').primary).toBe('r2');
    expect(getAudioPlaybackPolicy('kanji').primary).toBe('r2');
  });
});
