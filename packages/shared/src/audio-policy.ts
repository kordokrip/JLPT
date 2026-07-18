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
    fallback: 'browser',
    preferGoogleVoice: true,
    slow: true,
    descriptionKo: '문자 암기는 검수된 R2 고정 예시 단어 오디오를 우선하고, 없을 때만 일본어 브라우저 음성을 사용한다.',
  },
  vocab: {
    surface: 'vocab',
    primary: 'r2',
    fallback: 'browser',
    preferGoogleVoice: true,
    slow: false,
    descriptionKo: '단어 발음은 R2 고정 오디오를 우선하고, 없거나 실패하면 브라우저 일본어 음성으로 대체한다.',
  },
  kanji: {
    surface: 'kanji',
    primary: 'r2',
    fallback: 'browser',
    preferGoogleVoice: true,
    slow: true,
    descriptionKo: '한자 읽기는 R2 고정 오디오를 우선하되 읽기 구분이 필요하므로 느린 재생을 허용한다.',
  },
  sentence: {
    surface: 'sentence',
    primary: 'r2',
    fallback: 'browser',
    preferGoogleVoice: true,
    slow: false,
    descriptionKo: '문장/예문은 배치 생성된 R2 오디오를 우선하고 브라우저 일본어 음성으로 대체한다.',
  },
  example: {
    surface: 'example',
    primary: 'r2',
    fallback: 'browser',
    preferGoogleVoice: true,
    slow: false,
    descriptionKo: '예문은 승인된 R2 배치 오디오를 우선하고, 고정 오디오가 없을 때 브라우저 음성으로 대체한다.',
  },
  listening: {
    surface: 'listening',
    primary: 'r2',
    fallback: 'browser',
    preferGoogleVoice: true,
    slow: false,
    descriptionKo: '청해 퀴즈는 검수된 R2 고정 오디오를 기본으로 하며, 파일이 없거나 실패한 경우만 브라우저 일본어 음성을 표시한다.',
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
