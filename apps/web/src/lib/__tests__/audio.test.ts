import { describe, expect, it } from 'vitest';
import { isGoogleJapaneseVoice, voiceSortScore, type JapaneseVoiceOption } from '../audio';

describe('audio voice selection', () => {
  it('prioritizes Google Japanese voices over other Japanese voices', () => {
    const googleVoice: JapaneseVoiceOption = {
      voiceURI: 'Google 日本語',
      name: 'Google 日本語',
      lang: 'ja-JP',
      localService: false,
      default: false,
    };
    const localVoice: JapaneseVoiceOption = {
      voiceURI: 'com.apple.voice.compact.ja-JP.Kyoko',
      name: 'Kyoko',
      lang: 'ja-JP',
      localService: true,
      default: true,
    };

    expect(isGoogleJapaneseVoice(googleVoice)).toBe(true);
    expect(voiceSortScore(googleVoice)).toBeGreaterThan(voiceSortScore(localVoice));
  });

  it('does not classify non-Japanese Google voices as Japanese pronunciation voices', () => {
    expect(isGoogleJapaneseVoice({
      voiceURI: 'Google US English',
      name: 'Google US English',
      lang: 'en-US',
    })).toBe(false);
  });
});
