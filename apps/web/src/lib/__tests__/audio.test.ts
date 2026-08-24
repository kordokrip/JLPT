import { afterEach, describe, expect, it, vi } from 'vitest';
import { audioPlayer, isGoogleJapaneseVoice, selectJapaneseVoice, voiceSortScore, type JapaneseVoiceOption } from '../audio';

afterEach(() => {
  vi.useRealTimers();
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

  it('uses an installed Japanese voice when a Google voice is unavailable', async () => {
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
    const voices = [{ lang: 'ja-JP', name: 'Kyoko', voiceURI: 'apple-ja', default: true }] as SpeechSynthesisVoice[];
    const speak = vi.fn((utterance: MockUtterance) => utterance.onend?.());
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: vi.fn(),
        speak,
        getVoices: () => voices,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    await expect(audioPlayer.speakText('こんにちは。')).resolves.toBe(true);
    expect((speak.mock.calls[0]?.[0] as MockUtterance).voice?.voiceURI).toBe('apple-ja');
  });

  it('lets the browser resolve ja-JP when the voice list stays empty', async () => {
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
    const speak = vi.fn((utterance: MockUtterance) => utterance.onend?.());
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: vi.fn(),
        resume: vi.fn(),
        speak,
        getVoices: () => [],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    const playback = audioPlayer.speakText('こんにちは。');
    expect(speak).toHaveBeenCalledTimes(1);
    await expect(playback).resolves.toBe(true);
    const utterance = speak.mock.calls[0]?.[0] as MockUtterance;
    expect(utterance.lang).toBe('ja-JP');
    expect(utterance.voice).toBeNull();
  });

  it('starts Japanese speech synchronously so the click activation is preserved', async () => {
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
    const speak = vi.fn((utterance: MockUtterance) => utterance.onend?.());
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: vi.fn(),
        resume: vi.fn(),
        speak,
        getVoices: () => [],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    const playback = audioPlayer.speakText('最初のクリックで再生します。');
    expect(speak).toHaveBeenCalledTimes(1);
    await expect(playback).resolves.toBe(true);
  });

});
