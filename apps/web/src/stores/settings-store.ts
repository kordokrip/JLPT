/**
 * Zustand 설정 스토어 — 사용자 환경 설정 (localStorage 영속)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlaybackRate, TtsProviderId, VoiceGender } from '../lib/audio';
import type { SupportedLang } from '../i18n';

interface SettingsState {
  // 언어
  language:    SupportedLang;
  setLanguage: (l: SupportedLang) => void;

  // 외관
  theme:         'light' | 'dark' | 'system';
  setTheme:      (t: SettingsState['theme']) => void;

  // 후리가나
  furiganaMode:  'always' | 'hover' | 'never';
  setFurigana:   (m: SettingsState['furiganaMode']) => void;

  // 오디오
  playbackRate:    PlaybackRate;
  setPlaybackRate: (r: PlaybackRate) => void;
  voiceGender:     VoiceGender;
  setVoiceGender:  (v: VoiceGender) => void;
  selectedVoiceURI:    string | null;
  setSelectedVoiceURI: (v: string | null) => void;
  ttsProvider:     TtsProviderId;
  setTtsProvider:  (v: TtsProviderId) => void;
  autoPronounce:   boolean;
  setAutoPronounce:(v: boolean) => void;

  // SRS
  dailyNewLimit:  number;
  setDailyNewLimit:(n: number) => void;

  // 마지막 동기화
  lastSyncedAt:  string;
  setLastSyncedAt:(t: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language:    'ko',
      setLanguage: (l) => set({ language: l }),

      theme:        'system',
      setTheme:     (t) => set({ theme: t }),

      furiganaMode: 'hover',
      setFurigana:  (m) => set({ furiganaMode: m }),

      playbackRate:    1.0,
      setPlaybackRate: (r) => set({ playbackRate: r }),
      voiceGender:     'female',
      setVoiceGender:  (v) => set({ voiceGender: v }),
      selectedVoiceURI:    null,
      setSelectedVoiceURI: (v) => set({ selectedVoiceURI: v }),
      ttsProvider:     'browser',
      setTtsProvider:  (v) => set({ ttsProvider: v }),
      autoPronounce:   true,
      setAutoPronounce:(v) => set({ autoPronounce: v }),

      dailyNewLimit:  20,
      setDailyNewLimit:(n) => set({ dailyNewLimit: n }),

      lastSyncedAt:  new Date(0).toISOString(),
      setLastSyncedAt:(t) => set({ lastSyncedAt: t }),
    }),
    { name: 'nihongo-n3-settings' },
  ),
);
