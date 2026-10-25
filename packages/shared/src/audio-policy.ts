export type AudioSurface =
  | 'kana'
  | 'vocab'
  | 'kanji'
  | 'sentence'
  | 'example'
  | 'listening'
  | 'qa';

/** Pronunciation uses browser speech; R2 is never a playback source. */
export type AudioPolicySource = 'browser-speech';

export interface AudioPlaybackPolicy {
  surface: AudioSurface;
  primary: AudioPolicySource;
  fallback: null;
  preferGoogleVoice: true;
  slow: boolean;
  descriptionKo: string;
}

export const AUDIO_PLAYBACK_POLICIES: Record<AudioSurface, AudioPlaybackPolicy> = {
  kana: {
    surface: 'kana',
    primary: 'browser-speech',
    fallback: null,
    preferGoogleVoice: true,
    slow: true,
    descriptionKo: '문자 발음은 Google 음성을 우선하고 같은 언어의 기기 음성을 사용한다. R2는 사용하지 않는다.',
  },
  vocab: {
    surface: 'vocab',
    primary: 'browser-speech',
    fallback: null,
    preferGoogleVoice: true,
    slow: false,
    descriptionKo: '단어 발음은 Google 음성을 우선하고 같은 언어의 기기 음성으로 재생한다. R2 fallback은 허용하지 않는다.',
  },
  kanji: {
    surface: 'kanji',
    primary: 'browser-speech',
    fallback: null,
    preferGoogleVoice: true,
    slow: true,
    descriptionKo: '한자 읽기는 Google 음성을 우선하고 같은 언어의 기기 음성과 느린 재생을 허용한다.',
  },
  sentence: {
    surface: 'sentence',
    primary: 'browser-speech',
    fallback: null,
    preferGoogleVoice: true,
    slow: false,
    descriptionKo: '문장/예문은 Google 음성을 우선하고 같은 언어의 기기 음성을 사용한다. R2 음원은 사용하지 않는다.',
  },
  example: {
    surface: 'example',
    primary: 'browser-speech',
    fallback: null,
    preferGoogleVoice: true,
    slow: false,
    descriptionKo: '예문은 Google 음성을 우선하고 같은 언어의 기기 음성을 사용한다. R2 음원은 사용하지 않는다.',
  },
  listening: {
    surface: 'listening',
    primary: 'browser-speech',
    fallback: null,
    preferGoogleVoice: true,
    slow: false,
    descriptionKo: '청해 퀴즈는 Google 음성을 우선하고 같은 언어의 기기 음성을 사용한다. R2 음원은 사용하지 않는다.',
  },
  qa: {
    surface: 'qa',
    primary: 'browser-speech',
    fallback: null,
    preferGoogleVoice: true,
    slow: false,
    descriptionKo: 'TTS QA도 Google 음성을 우선하고 같은 언어의 기기 음성을 사용한다. 고정 R2 QA 샘플은 사용하지 않는다.',
  },
};

export function getAudioPlaybackPolicy(surface: AudioSurface | undefined): AudioPlaybackPolicy {
  return AUDIO_PLAYBACK_POLICIES[surface ?? 'vocab'];
}

export function usesGoogleAudio(surface: AudioSurface | undefined): boolean {
  return getAudioPlaybackPolicy(surface).preferGoogleVoice;
}
