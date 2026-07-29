export type AudioSurface =
  | 'kana'
  | 'vocab'
  | 'kanji'
  | 'sentence'
  | 'example'
  | 'listening'
  | 'qa';

export type AudioPolicySource = 'browser' | 'r2';

export interface AudioPlaybackPolicy {
  surface: AudioSurface;
  primary: AudioPolicySource;
  fallback: AudioPolicySource;
  preferGoogleVoice: boolean;
  slow: boolean;
  descriptionKo: string;
}

export const AUDIO_PLAYBACK_POLICIES: Record<AudioSurface, AudioPlaybackPolicy> = {
  kana: {
    surface: 'kana',
    primary: 'r2',
    fallback: 'r2',
    preferGoogleVoice: false,
    slow: true,
    descriptionKo: '문자 암기는 출처와 bytes hash가 기록된 private R2 음원만 재생한다. 음원이 없으면 준비 상태를 표시한다.',
  },
  vocab: {
    surface: 'vocab',
    primary: 'r2',
    fallback: 'r2',
    preferGoogleVoice: false,
    slow: false,
    descriptionKo: '단어 발음은 출처·라이선스·hash가 연결된 private R2 음원만 재생한다.',
  },
  kanji: {
    surface: 'kanji',
    primary: 'r2',
    fallback: 'r2',
    preferGoogleVoice: false,
    slow: true,
    descriptionKo: '한자 읽기는 검증된 private R2 음원만 느리게 재생할 수 있다.',
  },
  sentence: {
    surface: 'sentence',
    primary: 'r2',
    fallback: 'r2',
    preferGoogleVoice: false,
    slow: false,
    descriptionKo: '문장/예문은 검증된 private R2 음원만 재생한다.',
  },
  example: {
    surface: 'example',
    primary: 'r2',
    fallback: 'r2',
    preferGoogleVoice: false,
    slow: false,
    descriptionKo: '예문은 검증된 private R2 음원만 재생한다.',
  },
  listening: {
    surface: 'listening',
    primary: 'r2',
    fallback: 'r2',
    preferGoogleVoice: false,
    slow: false,
    descriptionKo: '청해 퀴즈는 출처가 검증된 private R2 음원만 재생한다. 준비되지 않은 음원은 명시한다.',
  },
  qa: {
    surface: 'qa',
    primary: 'r2',
    fallback: 'r2',
    preferGoogleVoice: false,
    slow: false,
    descriptionKo: 'TTS QA 샘플도 provenance가 고정된 R2 후보만 재생한다. 브라우저 음성은 fallback이 아니다.',
  },
};

export function getAudioPlaybackPolicy(surface: AudioSurface | undefined): AudioPlaybackPolicy {
  return AUDIO_PLAYBACK_POLICIES[surface ?? 'vocab'];
}

export function prefersBrowserAudio(surface: AudioSurface | undefined): boolean {
  return getAudioPlaybackPolicy(surface).primary === 'browser';
}
