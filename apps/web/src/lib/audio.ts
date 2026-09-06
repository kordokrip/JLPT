/**
 * apps/web/src/lib/audio.ts
 *
 * Browser speech playback helper.
 * - 같은 언어의 Google voice를 우선하고 설치된 같은 언어 voice로 복구
 * - 재생 속도 0.75x / 1x / 1.25x
 * - R2 요청·저장·fallback은 사용하지 않음
 */

import { getAudioPlaybackPolicy, type AudioSurface } from '@nihongo-n3/shared';
import { isGoogleVoiceForLanguage, isVoiceForLanguage, waitForBrowserVoice } from './google-browser-speech';

export type PlaybackRate = 0.75 | 1.0 | 1.25;
export type VoiceGender = 'female' | 'male';
export const KANA_PRONUNCIATION_PLAYBACK_RATE = 0.45;

export interface JapaneseVoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

interface SpeechOptions {
  voiceGender?: VoiceGender;
  voiceURI?: string | null | undefined;
  lang?: string;
  rate?: number;
  pitch?: number;
  preferGoogleVoice?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

interface PronunciationOptions {
  text?: string | undefined;
  surface?: AudioSurface;
  slow?: boolean;
  repeat?: number;
  preferGoogleVoice?: boolean;
}

class AudioPlayer {
  private _rate: PlaybackRate = 1.0;
  private _voiceGender: VoiceGender = 'female';
  private _voiceURI: string | null = null;
  private _onEnd: (() => void) | null = null;

  get rate(): PlaybackRate { return this._rate; }
  set rate(v: PlaybackRate) { this._rate = v; }
  get voiceGender(): VoiceGender { return this._voiceGender; }
  set voiceGender(v: VoiceGender) { this._voiceGender = v; }
  get voiceURI(): string | null { return this._voiceURI; }
  set voiceURI(v: string | null) { this._voiceURI = v; }
  set onEnd(cb: () => void) { this._onEnd = cb; }

  configure(options: {
    rate?: PlaybackRate;
    voiceGender?: VoiceGender;
    voiceURI?: string | null;
  }): void {
    if (options.rate !== undefined) this._rate = options.rate;
    if (options.voiceGender !== undefined) this._voiceGender = options.voiceGender;
    if (options.voiceURI !== undefined) this._voiceURI = options.voiceURI;
  }

  async warmVoices(language = 'ja'): Promise<void> {
    await waitForBrowserVoice(language);
  }

  async getJapaneseVoices(): Promise<JapaneseVoiceOption[]> {
    if (!('speechSynthesis' in window)) return [];
    await this.warmVoices('ja');
    return window.speechSynthesis
      .getVoices()
      .filter((voice) => voice.lang.toLowerCase().startsWith('ja'))
      .map((voice) => ({
        voiceURI: voice.voiceURI,
        name: voice.name,
        lang: voice.lang,
        localService: voice.localService,
        default: voice.default,
      }))
      .sort((a, b) => voiceSortScore(b) - voiceSortScore(a) || a.name.localeCompare(b.name));
  }

  async getResolvedJapaneseVoice(options: {
    voiceGender?: VoiceGender;
    voiceURI?: string | null;
    lang?: string;
    preferGoogleVoice?: boolean;
  } = {}): Promise<JapaneseVoiceOption | null> {
    if (!('speechSynthesis' in window)) return null;
    await this.warmVoices('ja');
    const voice = this.pickVoice(
      options.voiceGender ?? this._voiceGender,
      options.lang ?? 'ja-JP',
      options.voiceURI ?? this._voiceURI,
      options.preferGoogleVoice ?? true,
    );
    return voice ? toJapaneseVoiceOption(voice) : null;
  }

  private pickVoice(
    gender: VoiceGender,
    lang = 'ja-JP',
    voiceURI: string | null = this._voiceURI,
    preferGoogleVoice = true,
  ): SpeechSynthesisVoice | undefined {
    if (!('speechSynthesis' in window)) return undefined;
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = lang.split('-')[0]?.toLowerCase() ?? 'ja';
    const matching = voices.filter((voice) => voice.lang.toLowerCase().startsWith(langPrefix));
    if (langPrefix === 'ja') return selectJapaneseVoice(matching, { gender, voiceURI, preferGoogleVoice });
    return matching.find((voice) => voice.voiceURI === voiceURI)
      ?? matching.find((voice) => voice.default)
      ?? matching[0];
  }

  async speakText(text: string, options: SpeechOptions = {}): Promise<boolean> {
    if (!text.trim() || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return false;
    const language = options.lang ?? 'ja-JP';
    // Do not await voice discovery here. WebKit and some installed-PWA
    // contexts require speechSynthesis.speak() to run in the original click
    // task. Waiting for Chromium's asynchronous voice list can consume that
    // user activation and turn the first click into silence.
    void this.warmVoices(language);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = Math.min(1.2, Math.max(0.45, options.rate ?? this._rate * 0.95));
    const selectedGender = options.voiceGender ?? this._voiceGender;
    utterance.pitch = options.pitch ?? (selectedGender === 'male' ? 0.94 : 1.02);
    utterance.volume = 1;
    const voice = this.pickVoice(
      options.voiceGender ?? this._voiceGender,
      utterance.lang,
      options.voiceURI ?? this._voiceURI,
      options.preferGoogleVoice ?? true,
    );
    // Keep the old working behavior: prefer Google, then use an installed
    // voice for the same language. Never read Japanese with another language.
    if (voice && !isVoiceForLanguage(voice, language)) {
      options.onError?.();
      this._onEnd?.();
      return false;
    }
    // Some browsers synthesize the requested utterance language even while
    // getVoices() is empty. In that case, leave voice unset and let the browser
    // resolve ja-JP/ko-KR instead of turning a playable utterance into silence.
    if (voice) utterance.voice = voice;
    return new Promise<boolean>((resolve) => {
      let settled = false;
      let started = false;
      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(startupTimeoutId);
        window.clearTimeout(timeoutId);
        if (result) options.onEnd?.();
        else options.onError?.();
        this._onEnd?.();
        resolve(result);
      };
      utterance.onstart = () => {
        started = true;
        window.clearTimeout(startupTimeoutId);
        options.onStart?.();
      };
      utterance.onend = () => finish(true);
      utterance.onerror = () => finish(false);
      const timeoutMs = Math.min(120_000, Math.max(15_000, text.length * 500));
      const startupTimeoutId = window.setTimeout(() => {
        if (started) return;
        window.speechSynthesis.cancel();
        finish(false);
      }, 8_000);
      const timeoutId = window.setTimeout(() => {
        window.speechSynthesis.cancel();
        finish(false);
      }, timeoutMs);
      try {
        window.speechSynthesis.resume?.();
        window.speechSynthesis.speak(utterance);
      } catch {
        finish(false);
      }
    });
  }

  async playPronunciation({
    text,
    surface,
    slow = false,
    repeat = 1,
    preferGoogleVoice = true,
  }: PronunciationOptions): Promise<boolean> {
    const normalized = text?.trim();
    const policy = getAudioPlaybackPolicy(surface);
    const useSlow = slow || policy.slow;
    const spokenText = normalized && repeat > 1 ? Array.from({ length: repeat }, () => normalized).join('、') : normalized;
    return spokenText ? this.speakText(spokenText, {
      ...(useSlow ? { rate: surface === 'kana' ? KANA_PRONUNCIATION_PLAYBACK_RATE : 0.5 } : {}),
      preferGoogleVoice: preferGoogleVoice && policy.preferGoogleVoice,
    }) : false;
  }

  stop(): void {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
}

export function isGoogleJapaneseVoice(voice: Pick<SpeechSynthesisVoice, 'name' | 'voiceURI' | 'lang'>): boolean {
  return isGoogleVoiceForLanguage(voice, 'ja-JP');
}

export function voiceSortScore(voice: JapaneseVoiceOption): number {
  const haystack = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  return (
    (voice.lang.toLowerCase() === 'ja-jp' ? 10 : 0) +
    (haystack.includes('google') ? 30 : 0) +
    (haystack.includes('natural') || haystack.includes('neural') || haystack.includes('premium') ? 6 : 0) +
    (voice.localService ? 2 : 0) +
    (voice.default ? 1 : 0)
  );
}

export function selectJapaneseVoice<T extends JapaneseVoiceOption>(
  voices: T[],
  options: { gender: VoiceGender; voiceURI: string | null; preferGoogleVoice: boolean },
): T | undefined {
  if (voices.length === 0) return undefined;

  const googleVoice = options.preferGoogleVoice ? voices.find(isGoogleJapaneseVoice) : undefined;
  if (googleVoice) return googleVoice;

  if (options.voiceURI) {
    const selected = voices.find((voice) => voice.voiceURI === options.voiceURI);
    if (selected) return selected;
  }

  const femaleHints = ['female', 'woman', 'kyoko', 'kyouko', 'nanami', 'haruka', 'sayaka', 'mei', 'mio', 'yui', 'sakura', 'hikari'];
  const maleHints = ['male', 'man', 'otoya', 'ichiro', 'takumi', 'kyohei', 'daichi', 'keita', 'show', 'hattori'];
  const naturalHints = ['premium', 'enhanced', 'siri', 'natural', 'neural', 'apple', 'google'];
  const hints = options.gender === 'female' ? femaleHints : maleHints;
  const oppositeHints = options.gender === 'female' ? maleHints : femaleHints;

  return voices
    .map((voice) => {
      const haystack = `${voice.name} ${voice.voiceURI}`.toLowerCase();
      const score =
        (voice.lang.toLowerCase() === 'ja-jp' ? 8 : 0) +
        (isGoogleJapaneseVoice(voice) ? 20 : 0) +
        (voice.localService ? 3 : 0) +
        (voice.default ? 2 : 0) +
        (naturalHints.some((hint) => haystack.includes(hint)) ? 3 : 0) +
        (hints.some((hint) => haystack.includes(hint)) ? 4 : 0) +
        (oppositeHints.some((hint) => haystack.includes(hint)) ? -3 : 0);
      return { voice, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.voice;
}

function toJapaneseVoiceOption(voice: Pick<SpeechSynthesisVoice, 'voiceURI' | 'name' | 'lang' | 'localService' | 'default'>): JapaneseVoiceOption {
  return {
    voiceURI: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
    localService: voice.localService,
    default: voice.default,
  };
}

/** 싱글톤 플레이어 */
export const audioPlayer = new AudioPlayer();
