import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSettingsStore } from '../../stores/settings-store';

describe('useSettingsStore', () => {
  it('suggests Japanese for new TOPIK users but preserves an explicit English choice', () => {
    useSettingsStore.setState({language:'ko',languageExplicit:false});
    useSettingsStore.getState().suggestLanguage('ja');
    expect(useSettingsStore.getState().language).toBe('ja');
    useSettingsStore.getState().setLanguage('en');
    useSettingsStore.getState().suggestLanguage('ja');
    expect(useSettingsStore.getState().language).toBe('en');
    useSettingsStore.getState().setLanguage('ko');
  });
  beforeEach(() => {
    // Zustand persist 스토어 초기화
    useSettingsStore.setState({
      theme: 'system',
      furiganaMode: 'always',
      playbackRate: 1.0,
      autoPronounce: false,
      dailyNewLimit: 20,
      lastSyncedAt: new Date(0).toISOString(),
    });
  });

  it('기본값이 올바르게 설정된다', () => {
    const { result } = renderHook(() => useSettingsStore());
    expect(result.current.theme).toBe('system');
    expect(result.current.furiganaMode).toBe('always');
    expect(result.current.dailyNewLimit).toBe(20);
  });

  it('테마 변경이 스토어에 반영된다', () => {
    const { result } = renderHook(() => useSettingsStore());
    act(() => result.current.setTheme('dark'));
    expect(result.current.theme).toBe('dark');
  });

  it('재생 속도 변경이 스토어에 반영된다', () => {
    const { result } = renderHook(() => useSettingsStore());
    act(() => result.current.setPlaybackRate(0.75));
    expect(result.current.playbackRate).toBe(0.75);
  });

  it('dailyNewLimit 변경이 스토어에 반영된다', () => {
    const { result } = renderHook(() => useSettingsStore());
    act(() => result.current.setDailyNewLimit(50));
    expect(result.current.dailyNewLimit).toBe(50);
  });

  it('autoPronounce 토글이 작동한다', () => {
    const { result } = renderHook(() => useSettingsStore());
    act(() => result.current.setAutoPronounce(true));
    expect(result.current.autoPronounce).toBe(true);
    act(() => result.current.setAutoPronounce(false));
    expect(result.current.autoPronounce).toBe(false);
  });

  it('rehydrates stored version 6 preferences without replacing explicit choices', async () => {
    const priorPreferences = {
      learningTrack: 'topik-ko',
      language: 'en',
      instructionLanguages: { 'jlpt-ja': 'ja', 'topik-ko': 'ko' },
      theme: 'dark',
      furiganaMode: 'never',
      playbackRate: 0.75,
      autoPronounce: false,
      dailyNewLimit: 35,
      lastSyncedAt: '2026-08-01T01:02:03.000Z',
    };
    localStorage.setItem('nihongo-n3-settings', JSON.stringify({ version: 6, state: priorPreferences }));

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.persist.hasHydrated()).toBe(true);
    expect(useSettingsStore.getState()).toMatchObject({ ...priorPreferences, languageExplicit: true });
    expect(JSON.parse(localStorage.getItem('nihongo-n3-settings')!)).toMatchObject({
      version: 7,
      state: { ...priorPreferences, languageExplicit: true },
    });
    useSettingsStore.getState().suggestLanguage('ja');
    expect(useSettingsStore.getState().language).toBe('en');
  });

  it('rehydrates version 6 with only missing instruction-language defaults filled', async () => {
    localStorage.setItem('nihongo-n3-settings', JSON.stringify({
      version: 6,
      state: { language: 'ko', languageExplicit: false, instructionLanguages: { 'jlpt-ja': 'en' } },
    }));

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState()).toMatchObject({
      language: 'ko',
      languageExplicit: false,
      instructionLanguages: { 'jlpt-ja': 'en', 'topik-ko': 'ja' },
    });
  });
});
