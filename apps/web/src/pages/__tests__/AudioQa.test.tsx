import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AudioQa from '../AudioQa';

// These controlled promises test UI bookkeeping only, not native playback or audibility.
const mocks = vi.hoisted(() => ({
  japanese: vi.fn(), korean: vi.fn(), stopJapanese: vi.fn(), stopKorean: vi.fn(),
}));
vi.mock('../../lib/audio', () => ({
  audioPlayer: { speakText: mocks.japanese, stop: mocks.stopJapanese },
}));
vi.mock('../../features/topik/useKoreanAudio', () => ({
  useKoreanAudio: () => ({ speakText: mocks.korean, stop: mocks.stopKorean, playing: false, error: null }),
}));

function deferredPlayback() {
  let resolve!: (played: boolean) => void;
  const promise = new Promise<boolean>((done) => { resolve = done; });
  return { promise, resolve };
}
const result = () => screen.getByRole('status', { name: '재생 진단 결과' });

describe('AudioQa completion evidence (mocked promise unit tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('speechSynthesis', {
      getVoices: vi.fn(() => [{ lang: 'ja-JP' }, { lang: 'ja-JP' }, { lang: 'ko-KR' }, { lang: 'en-US' }]),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([['ja', '일본어'], ['ko', '한국어']])('records %s completion only after its promise resolves true', async (language, label) => {
    const playback = deferredPlayback();
    const speak = language === 'ja' ? mocks.japanese : mocks.korean;
    speak.mockReturnValue(playback.promise);
    render(<AudioQa />);
    if (language === 'ko') fireEvent.click(screen.getByRole('tab', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: '브라우저 음성으로 재생' }));
    // A click must invoke the existing speech function without a preliminary await.
    expect(speak).toHaveBeenCalledTimes(1);
    expect(result()).toHaveTextContent('일본어 0회 · 한국어 0회');
    expect(result()).not.toHaveTextContent('정상 종료 확인');
    vi.mocked(window.speechSynthesis.getVoices).mockReturnValue([]);
    await act(async () => playback.resolve(true));
    expect(result()).toHaveTextContent('마지막 재생 언어: ' + label);
    expect(result()).toHaveTextContent('정상 종료 확인(실제 가청 여부는 별도 확인)');
    expect(result()).toHaveTextContent(language === 'ja' ? '일본어 1회 · 한국어 0회' : '일본어 0회 · 한국어 1회');
    expect(result()).toHaveTextContent('일본어 2개 · 한국어 1개');
    expect(result()).toHaveTextContent('enumerated-voice');
  });

  it.each([['ja', '일본어'], ['ko', '한국어']])('does not count a failed %s promise as completion', async (language, label) => {
    const playback = deferredPlayback();
    (language === 'ja' ? mocks.japanese : mocks.korean).mockReturnValue(playback.promise);
    render(<AudioQa />);
    if (language === 'ko') fireEvent.click(screen.getByRole('tab', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: '브라우저 음성으로 재생' }));
    await act(async () => playback.resolve(false));
    expect(result()).toHaveTextContent('재생 실패');
    expect(result()).toHaveTextContent('일본어 0회 · 한국어 0회');
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it.each([['ja', '일본어'], ['ko', '한국어']])('never counts a stopped %s operation even if its old promise later resolves true', async (language, label) => {
    const playback = deferredPlayback();
    (language === 'ja' ? mocks.japanese : mocks.korean).mockReturnValue(playback.promise);
    render(<AudioQa />);
    if (language === 'ko') fireEvent.click(screen.getByRole('tab', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: '브라우저 음성으로 재생' }));
    fireEvent.click(screen.getByRole('button', { name: '재생 중단' }));
    await act(async () => playback.resolve(true));
    expect(result()).toHaveTextContent('재생 중단');
    expect(result()).toHaveTextContent('일본어 0회 · 한국어 0회');
    expect(mocks.stopJapanese).toHaveBeenCalled();
    expect(mocks.stopKorean).toHaveBeenCalled();
  });

  it('keeps a language-change cancellation separate from the next successful operation', async () => {
    const oldPlayback = deferredPlayback(), newPlayback = deferredPlayback();
    mocks.japanese.mockReturnValue(oldPlayback.promise);
    mocks.korean.mockReturnValue(newPlayback.promise);
    vi.mocked(window.speechSynthesis.getVoices).mockReturnValue([]);
    render(<AudioQa />);
    fireEvent.click(screen.getByRole('button', { name: '브라우저 음성으로 재생' }));
    fireEvent.click(screen.getByRole('tab', { name: '한국어' }));
    fireEvent.click(screen.getByRole('button', { name: '브라우저 음성으로 재생' }));
    await act(async () => oldPlayback.resolve(true));
    expect(result()).toHaveTextContent('일본어 0회 · 한국어 0회');
    await act(async () => newPlayback.resolve(true));
    expect(result()).toHaveTextContent('마지막 재생 언어: 한국어');
    expect(result()).toHaveTextContent('일본어 0회 · 한국어 1회');
    expect(result()).toHaveTextContent('utterance-lang');
  });
});
