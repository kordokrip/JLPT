import { describe, expect, it } from 'vitest';
import { getAudioPlaybackPolicy, prefersBrowserAudio } from '@nihongo-n3/shared';

describe('audio playback policy', () => {
  it('uses the Japanese browser voice before a reviewed R2 fallback', () => {
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
});
