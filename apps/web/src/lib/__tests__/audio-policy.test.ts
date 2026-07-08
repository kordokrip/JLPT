import { describe, expect, it } from 'vitest';
import { getAudioPlaybackPolicy, prefersBrowserAudio } from '@nihongo-n3/shared';

describe('audio playback policy', () => {
  it('keeps kana and listening on browser Japanese voice by default', () => {
    expect(prefersBrowserAudio('kana')).toBe(true);
    expect(prefersBrowserAudio('listening')).toBe(true);
    expect(getAudioPlaybackPolicy('kana')).toMatchObject({
      primary: 'browser',
      slow: true,
      preferGoogleVoice: true,
    });
  });

  it('uses R2 first for fixed vocab and kanji audio', () => {
    expect(getAudioPlaybackPolicy('vocab').primary).toBe('r2');
    expect(getAudioPlaybackPolicy('kanji').primary).toBe('r2');
  });
});
