import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isGoogleKoreanVoice, useKoreanAudio, waitForGoogleKoreanVoice } from './useKoreanAudio';

const activityMocks = vi.hoisted(() => ({ record: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../lib/activity-events', () => ({ recordLearningActivity: activityMocks.record }));

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

const googleKorean = {
  lang: 'ko-KR',
  name: 'Google 한국어',
  voiceURI: 'google-ko',
  default: true,
} as SpeechSynthesisVoice;

describe('useKoreanAudio', () => {
  beforeEach(() => {
    activityMocks.record.mockResolvedValue(undefined);
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
  });

  afterEach(() => {
    activityMocks.record.mockClear();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('recognizes only a Korean Google voice', () => {
    expect(isGoogleKoreanVoice(googleKorean)).toBe(true);
    expect(isGoogleKoreanVoice({ lang: 'ko-KR', name: 'Korean system', voiceURI: 'ko-system' })).toBe(false);
    expect(isGoogleKoreanVoice({ lang: 'ja-JP', name: 'Google 日本語', voiceURI: 'google-ja' })).toBe(false);
  });

  it('reports an unavailable DTO without invoking browser speech', async () => {
    const speech = { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [googleKorean] };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: speech });
    const { result } = renderHook(() => useKoreanAudio());

    await act(async () => {
      expect(await result.current.play({ kind: 'unavailable', reason: 'preparing' })).toBe(false);
    });

    expect(speech.speak).not.toHaveBeenCalled();
    expect(result.current.error).toBe('unavailable');
  });

  it('waits for Chromium voiceschanged before selecting Google Korean', async () => {
    let voices: SpeechSynthesisVoice[] = [];
    let voicesChanged: (() => void) | null = null;
    const speak = vi.fn((utterance: MockUtterance) => utterance.onend?.());
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: vi.fn(),
        resume: vi.fn(),
        speak,
        getVoices: () => voices,
        addEventListener: (_name: string, listener: () => void) => { voicesChanged = listener; },
        removeEventListener: vi.fn(),
      },
    });
    const { result } = renderHook(() => useKoreanAudio());

    await act(async () => {
      const playback = result.current.speakText('안녕하세요');
      voices = [googleKorean];
      voicesChanged?.();
      expect(await playback).toBe(true);
    });

    const utterance = speak.mock.calls[0]?.[0] as MockUtterance;
    expect(utterance.text).toBe('안녕하세요');
    expect(utterance.lang).toBe('ko-KR');
    expect(utterance.voice?.voiceURI).toBe('google-ko');
  });

  it('does not fall back to a non-Google Korean voice', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [{ lang: 'ko-KR', name: 'Korean system', voiceURI: 'ko-system' }],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    const pending = waitForGoogleKoreanVoice(100);
    await vi.advanceTimersByTimeAsync(100);
    await expect(pending).resolves.toBeNull();
  });

  it('records played only after real playback completion', async () => {
    let utterance: MockUtterance | null = null;
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: vi.fn(),
        resume: vi.fn(),
        speak: vi.fn((value: MockUtterance) => { utterance = value; }),
        getVoices: () => [googleKorean],
      },
    });
    const { result } = renderHook(() => useKoreanAudio());
    let playback: Promise<boolean> | undefined;

    act(() => {
      playback = result.current.play(
        { kind: 'google', text_ko: '안녕하세요.' },
        { contentType: 'topik_owner_item', contentId: 'owner-item-1', levelTag: '1', section: 'vocab' },
      );
    });
    expect(activityMocks.record).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(utterance).not.toBeNull());
    await act(async () => {
      utterance?.onend?.();
      expect(await playback).toBe(true);
    });

    await vi.waitFor(() => expect(activityMocks.record).toHaveBeenCalledWith({
      event_type: 'speech_attempted',
      learning_track: 'topik-ko',
      content_type: 'topik_owner_item',
      content_id: 'owner-item-1',
      level_tag: '1',
      section: 'vocab',
      speech_outcome: 'played',
    }));
  });

  it('records an error instead of a false played result when synthesis fails', async () => {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: vi.fn(),
        resume: vi.fn(),
        speak: vi.fn((utterance: MockUtterance) => utterance.onerror?.()),
        getVoices: () => [googleKorean],
      },
    });
    const { result } = renderHook(() => useKoreanAudio());

    await act(async () => {
      expect(await result.current.play(
        { kind: 'google', text_ko: '재생 실패' },
        { contentType: 'topik_practice_question', contentId: 'question-1' },
      )).toBe(false);
    });

    expect(result.current.error).toBe('playback-failed');
    await vi.waitFor(() => expect(activityMocks.record).toHaveBeenCalledWith(expect.objectContaining({
      content_id: 'question-1',
      speech_outcome: 'error',
    })));
    expect(activityMocks.record).not.toHaveBeenCalledWith(expect.objectContaining({ speech_outcome: 'played' }));
  });
});
