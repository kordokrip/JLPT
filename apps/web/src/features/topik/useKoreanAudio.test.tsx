import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useKoreanAudio } from './useKoreanAudio';

describe('useKoreanAudio', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reports an unavailable DTO without invoking browser SpeechSynthesis', () => {
    const speech = { cancel: vi.fn(), speak: vi.fn() };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: speech });
    const { result } = renderHook(() => useKoreanAudio());

    act(() => {
      expect(result.current.play({ kind: 'unavailable', reason: 'preparing' })).toBe(false);
    });

    expect(speech.speak).not.toHaveBeenCalled();
    expect(result.current.error).toBe('unavailable');
  });

  it('prefers a Google Korean browser voice and never uses an unrelated default voice', () => {
    class MockUtterance {
      lang = '';
      rate = 1;
      pitch = 1;
      voice: SpeechSynthesisVoice | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
    const speak = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: vi.fn(),
        speak,
        getVoices: () => [
          { lang: 'en-US', name: 'English', voiceURI: 'en', default: true },
          { lang: 'ko-KR', name: 'Korean system', voiceURI: 'ko-system', default: true },
          { lang: 'ko-KR', name: 'Google 한국의', voiceURI: 'google-ko-kr', default: false },
        ],
      },
    });
    const { result } = renderHook(() => useKoreanAudio());

    act(() => {
      expect(result.current.speakText('안녕하세요')).toBe(true);
    });

    const utterance = speak.mock.calls[0]?.[0] as MockUtterance;
    expect(utterance.text).toBe('안녕하세요');
    expect(utterance.lang).toBe('ko-KR');
    expect(utterance.voice?.voiceURI).toBe('google-ko-kr');
  });

  it('plays only an R2 DTO through an HTML audio element', () => {
    const play = vi.fn().mockResolvedValue(undefined);
    class MockAudio {
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      currentTime = 0;
      constructor(public src: string) {}
      pause = vi.fn();
      play = play;
    }
    vi.stubGlobal('Audio', MockAudio);
    const { result } = renderHook(() => useKoreanAudio());

    act(() => {
      expect(result.current.play({ kind: 'r2', url: '/api/v1/audio/private-audio/ko/listening/test.mp3' })).toBe(true);
    });

    expect(play).toHaveBeenCalledOnce();
  });
});
