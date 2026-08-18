import { describe, expect, it } from 'vitest';
import { isGoogleJapaneseVoice, selectJapaneseVoice, voiceSortScore, type JapaneseVoiceOption } from '../audio';

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

  it('keeps Google Japanese as the default even if a different voice was saved previously', () => {
    const voices: JapaneseVoiceOption[] = [
      {
        voiceURI: 'Google 日本語',
        name: 'Google 日本語',
        lang: 'ja-JP',
        localService: false,
        default: false,
      },
      {
        voiceURI: 'com.apple.voice.premium.ja-JP.Kyoko',
        name: 'Kyoko Premium',
        lang: 'ja-JP',
        localService: true,
        default: false,
      },
    ];

    expect(selectJapaneseVoice(voices, {
      gender: 'female',
      voiceURI: 'com.apple.voice.premium.ja-JP.Kyoko',
      preferGoogleVoice: true,
    })?.name).toBe('Google 日本語');
  });

});
