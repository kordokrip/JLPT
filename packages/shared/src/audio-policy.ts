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
    primary: 'browser',
    fallback: 'r2',
    preferGoogleVoice: true,
    slow: true,
    descriptionKo: '문자 암기는 Google 일본어 브라우저 음성을 우선한다. 검수된 불변 R2 오디오는 일본어 음성이 없는 경우에만 보조로 사용한다.',
  },
  vocab: {
    surface: 'vocab',
    primary: 'browser',
    fallback: 'r2',
    preferGoogleVoice: true,
    slow: false,
    descriptionKo: '단어 발음은 Google 일본어 브라우저 음성을 우선한다. 구형 또는 출처를 확인할 수 없는 R2 파일은 재생하지 않는다.',
  },
  kanji: {
    surface: 'kanji',
    primary: 'browser',
    fallback: 'r2',
    preferGoogleVoice: true,
    slow: true,
    descriptionKo: '한자 읽기는 Google 일본어 브라우저 음성을 우선하고 느린 재생을 허용한다.',
  },
  sentence: {
    surface: 'sentence',
    primary: 'browser',
    fallback: 'r2',
    preferGoogleVoice: true,
    slow: false,
    descriptionKo: '문장/예문은 Google 일본어 브라우저 음성을 우선한다. 검수된 불변 R2 오디오는 보조 경로다.',
  },
  example: {
    surface: 'example',
    primary: 'browser',
    fallback: 'r2',
    preferGoogleVoice: true,
    slow: false,
    descriptionKo: '예문은 Google 일본어 브라우저 음성을 우선한다. 검수된 불변 R2 오디오는 보조 경로다.',
  },
  listening: {
    surface: 'listening',
    primary: 'browser',
    fallback: 'r2',
    preferGoogleVoice: true,
    slow: false,
    descriptionKo: '청해 퀴즈는 Google 일본어 브라우저 음성을 기본으로 한다. 검수된 불변 R2 오디오는 사용자가 직접 선택하는 보조 경로다.',
  },
  qa: {
    surface: 'qa',
    primary: 'r2',
    fallback: 'browser',
    preferGoogleVoice: true,
    slow: false,
    descriptionKo: 'TTS QA 샘플은 provider 비교를 위해 R2 고정 샘플을 우선한다.',
  },
};

export function getAudioPlaybackPolicy(surface: AudioSurface | undefined): AudioPlaybackPolicy {
  return AUDIO_PLAYBACK_POLICIES[surface ?? 'vocab'];
}

export function prefersBrowserAudio(surface: AudioSurface | undefined): boolean {
  return getAudioPlaybackPolicy(surface).primary === 'browser';
}
