import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useKoreanAudio } from './useKoreanAudio';

describe('useKoreanAudio', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('speaks one exact Korean utterance with a Korean voice contract', () => {
    class MockUtterance {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      voice: SpeechSynthesisVoice | null = null;
      onend: ((event: SpeechSynthesisEvent) => void) | null = null;
      onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;
      constructor(text: string) { this.text = text; }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
    const speak = vi.fn();
    const cancel = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel,
        speak,
        getVoices: () => [{ lang: 'ko-KR', name: 'Korean', voiceURI: 'ko', localService: true, default: true }],
      },
    });

    const { result } = renderHook(() => useKoreanAudio());
    act(() => {
      expect(result.current.speakText('안녕하세요?')).toBe(true);
    });

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledTimes(1);
    const utterance = speak.mock.calls[0]?.[0] as SpeechSynthesisUtterance;
    expect(utterance.text).toBe('안녕하세요?');
    expect(utterance.lang).toBe('ko-KR');
    expect(utterance.rate).toBe(0.86);
  });

  it('does not fall back to an unrelated system-default voice', () => {
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor(_text: string) {}
    });
    const speak = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: vi.fn(),
        speak,
        getVoices: () => [{ lang: 'de-DE', name: 'German', voiceURI: 'de', localService: true, default: true }],
      },
    });

    const { result } = renderHook(() => useKoreanAudio());
    act(() => {
      expect(result.current.speakText('가방')).toBe(false);
    });

    expect(speak).not.toHaveBeenCalled();
    expect(result.current.error).toBe('voice-unavailable');
  });
});
