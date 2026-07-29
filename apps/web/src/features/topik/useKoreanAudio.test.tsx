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
