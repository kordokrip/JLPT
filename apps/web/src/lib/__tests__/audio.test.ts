import { afterEach, describe, expect, it, vi } from 'vitest';
import { audioPlayer, isGoogleJapaneseVoice, selectJapaneseVoice, voiceSortScore, type JapaneseVoiceOption } from '../audio';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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

  it('waits for a delayed Google Japanese voice instead of accepting an early system voice', async () => {
    class MockUtterance {
      lang = '';
      rate = 1;
      pitch = 1;
      volume = 1;
      voice: SpeechSynthesisVoice | null = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
    let voices = [{ lang: 'ja-JP', name: 'Kyoko', voiceURI: 'apple-ja', default: true }] as SpeechSynthesisVoice[];
    const voiceListeners: Array<() => void> = [];
    const speak = vi.fn((utterance: MockUtterance) => utterance.onend?.());
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: vi.fn(),
        speak,
        getVoices: () => voices,
        addEventListener: (_name: string, listener: () => void) => { voiceListeners.push(listener); },
        removeEventListener: vi.fn(),
      },
    });

    const playback = audioPlayer.speakText('こんにちは。');
    expect(speak).not.toHaveBeenCalled();
    voices = [{ lang: 'ja-JP', name: 'Google 日本語', voiceURI: 'google-ja' }] as SpeechSynthesisVoice[];
    voiceListeners.forEach((listener) => listener());

    await expect(playback).resolves.toBe(true);
    expect((speak.mock.calls[0]?.[0] as MockUtterance).voice?.voiceURI).toBe('google-ja');
  });

});
