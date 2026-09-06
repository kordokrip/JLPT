/**
 * Zustand 설정 스토어 — 사용자 환경 설정 (localStorage 영속)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlaybackRate } from '../lib/audio';
import type { SupportedLang } from '../i18n';
import {
  LEARNING_TRACK_DEFINITIONS,
  type InstructionLanguage,
  type LearningTrackId,
} from '@nihongo-n3/shared';

interface SettingsState {
  learningTrack: LearningTrackId;
  setLearningTrack: (track: LearningTrackId) => void;
  instructionLanguages: Record<LearningTrackId, InstructionLanguage>;
  setInstructionLanguage: (track: LearningTrackId, language: InstructionLanguage) => void;
  // 언어
  language:    SupportedLang;
  languageExplicit: boolean;
  suggestLanguage: (language: SupportedLang) => void;
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
      learningTrack: 'jlpt-ja',
      setLearningTrack: (learningTrack) => set({ learningTrack }),
      instructionLanguages: {
        'jlpt-ja': LEARNING_TRACK_DEFINITIONS['jlpt-ja'].defaultInstructionLanguage,
        'topik-ko': 'ja',
      },
      setInstructionLanguage: (track, language) => set((state) => ({
        instructionLanguages: { ...state.instructionLanguages, [track]: language },
      })),
      language:    'ko',
      languageExplicit: false,
      suggestLanguage: (language) => set(state => state.languageExplicit ? {} : { language }),
      setLanguage: (l) => set({ language: l, languageExplicit: true }),

      theme:        'system',
      setTheme:     (t) => set({ theme: t }),

      furiganaMode: 'hover',
      setFurigana:  (m) => set({ furiganaMode: m }),

      playbackRate:    1.0,
      setPlaybackRate: (r) => set({ playbackRate: r }),
      autoPronounce:   true,
      setAutoPronounce:(v) => set({ autoPronounce: v }),

      dailyNewLimit:  20,
      setDailyNewLimit:(n) => set({ dailyNewLimit: n }),

      lastSyncedAt:  new Date(0).toISOString(),
      setLastSyncedAt:(t) => set({ lastSyncedAt: t }),
    }),
    {
      name: 'nihongo-n3-settings',
      version: 7,
      migrate: (persisted) => {
        const state = persisted && typeof persisted === 'object'
          ? persisted as Partial<SettingsState>
          : {};
        return {
          ...state,
          languageExplicit: state.languageExplicit ?? state.language !== undefined,
          instructionLanguages: {
            'jlpt-ja': state.instructionLanguages?.['jlpt-ja']
              ?? LEARNING_TRACK_DEFINITIONS['jlpt-ja'].defaultInstructionLanguage,
            'topik-ko': state.instructionLanguages?.['topik-ko']
              ?? 'ja',
          },
        };
      },
    },
  ),
);
