import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSettingsStore } from '../../stores/settings-store';

describe('useSettingsStore', () => {
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
});
