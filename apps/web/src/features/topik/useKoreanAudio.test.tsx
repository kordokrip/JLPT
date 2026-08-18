import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKoreanAudio } from './useKoreanAudio';

const activityMocks = vi.hoisted(() => ({ record: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../lib/activity-events', () => ({ recordLearningActivity: activityMocks.record }));

describe('useKoreanAudio', () => {
  beforeEach(() => {
    activityMocks.record.mockResolvedValue(undefined);
  });

  afterEach(() => {
    activityMocks.record.mockClear();
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

  it('plays a Google DTO through the Google Korean voice', () => {
    const speak = vi.fn();
    class MockUtterance { lang = ''; rate = 1; pitch = 1; voice: SpeechSynthesisVoice | null = null; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(public text: string) {} }
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel: vi.fn(), speak, getVoices: () => [{ lang: 'ko-KR', name: 'Google 한국어', voiceURI: 'google-ko', default: true }] } });
    const { result } = renderHook(() => useKoreanAudio());

    act(() => {
      expect(result.current.play({ kind: 'google', text_ko: '테스트입니다.' })).toBe(true);
    });

    expect(speak).toHaveBeenCalledOnce();
  });

  it('binds a Google speech outcome to the selected TOPIK content id without an audio request', async () => {
    class MockUtterance { lang = ''; rate = 1; pitch = 1; voice: SpeechSynthesisVoice | null = null; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(public text: string) {} }
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: vi.fn(),
        speak: vi.fn(),
        getVoices: () => [{ lang: 'ko-KR', name: 'Google 한국어', voiceURI: 'google-ko', default: true }],
      },
    });
    const { result } = renderHook(() => useKoreanAudio());
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    act(() => {
      expect(result.current.play(
        { kind: 'google', text_ko: '안녕하세요.' },
        { contentType: 'topik_owner_item', contentId: 'owner-item-1', levelTag: '1', section: 'vocab' },
      )).toBe(true);
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
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
