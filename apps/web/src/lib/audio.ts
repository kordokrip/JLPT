/**
 * apps/web/src/lib/audio.ts
 *
 * 단일 AudioContext 기반 큐 재생기.
 * - 현재 카드 + 다음 3장 자동 prefetch
 * - 재생 속도 0.75x / 1x / 1.25x
 * - R2 Range 요청 활용 (브라우저 자동 처리)
 */

import { apiUrl } from './api-base';
import { getAudioPlaybackPolicy, type AudioSurface } from '@nihongo-n3/shared';

export function buildAudioUrl(path: string): string {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return apiUrl(`/audio/${encodedPath}`);
}

export type PlaybackRate = 0.75 | 1.0 | 1.25;
export type VoiceGender = 'female' | 'male';
/** Normal learning playback is served only by the authenticated audio endpoint. */
export type AudioSourcePreference = 'server';
export type TtsProviderId = 'browser' | 'cloudflare' | 'google' | 'voicevox' | 'style-bert-vits2';
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
  audioPath?: string | undefined;
  surface?: AudioSurface;
  prefer?: AudioSourcePreference;
  forceBrowser?: boolean;
  slow?: boolean;
  repeat?: number;
  preferGoogleVoice?: boolean;
}

interface AudioEntry {
  path: string;
  buffer?: AudioBuffer;
  loading: boolean;
  error: boolean;
}

class AudioPlayer {
  private ctx: AudioContext | null = null;
  private cache = new Map<string, AudioEntry>();
  private currentSource: AudioBufferSourceNode | null = null;
  private _rate: PlaybackRate = 1.0;
  private _voiceGender: VoiceGender = 'female';
  private _voiceURI: string | null = null;
  private _sourcePreference: AudioSourcePreference = 'server';
  private _onEnd: (() => void) | null = null;
  private voicesReady = new Map<string, Promise<void>>();

  get rate(): PlaybackRate { return this._rate; }
  set rate(v: PlaybackRate) { this._rate = v; }
  get voiceGender(): VoiceGender { return this._voiceGender; }
  set voiceGender(v: VoiceGender) { this._voiceGender = v; }
  get voiceURI(): string | null { return this._voiceURI; }
  set voiceURI(v: string | null) { this._voiceURI = v; }
  get sourcePreference(): AudioSourcePreference { return this._sourcePreference; }
  set sourcePreference(v: AudioSourcePreference) { this._sourcePreference = v; }
  set onEnd(cb: () => void) { this._onEnd = cb; }

  configure(options: {
    rate?: PlaybackRate;
    voiceGender?: VoiceGender;
    voiceURI?: string | null;
    sourcePreference?: AudioSourcePreference;
  }): void {
    if (options.rate !== undefined) this._rate = options.rate;
    if (options.voiceGender !== undefined) this._voiceGender = options.voiceGender;
    if (options.voiceURI !== undefined) this._voiceURI = options.voiceURI;
    if (options.sourcePreference !== undefined) this._sourcePreference = options.sourcePreference;
  }

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  /** 오디오 파일을 AudioBuffer로 프리페치 */
  async prefetch(paths: string[]): Promise<void> {
    for (const path of paths) {
      if (this.cache.has(path)) continue;
      const entry: AudioEntry = { path, loading: true, error: false };
      this.cache.set(path, entry);
      this._load(path, entry).catch(() => void 0);
    }
  }

  private async _load(path: string, entry: AudioEntry): Promise<void> {
    const url = buildAudioUrl(path);
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const ctx = this.getCtx();
      entry.buffer = await ctx.decodeAudioData(arrayBuffer);
      entry.loading = false;
    } catch (e) {
      entry.loading = false;
      entry.error = true;
      this.cache.delete(path);
    }
  }

  async warmVoices(language = 'ja'): Promise<void> {
    if (!('speechSynthesis' in window)) return;
    const prefix = language.split('-')[0]?.toLowerCase() || 'ja';
    if (window.speechSynthesis.getVoices().some((voice) => voice.lang.toLowerCase().startsWith(prefix))) return;
    const pending = this.voicesReady.get(prefix);
    if (pending) return pending;

    const ready = new Promise<void>((resolve) => {
      const finish = () => {
        window.clearTimeout(timer);
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        this.voicesReady.delete(prefix);
        resolve();
      };
      const onVoicesChanged = () => {
        if (window.speechSynthesis.getVoices().some((voice) => voice.lang.toLowerCase().startsWith(prefix))) finish();
      };
      const timer = window.setTimeout(finish, 1_500);
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    });
    this.voicesReady.set(prefix, ready);
    return ready;
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
    await this.warmVoices(language);
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
    // Never fall through to an unrelated system default voice. This prevents
    // Japanese text from being read by a German or English voice while voices
    // are still loading or Japanese is unavailable on the device.
    if (language.toLowerCase().startsWith('ja') && !voice) {
      options.onError?.();
      this._onEnd?.();
      return false;
    }
    if (voice) utterance.voice = voice;
    return new Promise<boolean>((resolve) => {
      utterance.onstart = options.onStart ?? null;
      utterance.onend = () => {
        options.onEnd?.();
        this._onEnd?.();
        resolve(true);
      };
      utterance.onerror = () => {
        options.onError?.();
        this._onEnd?.();
        resolve(false);
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  async playPronunciation({
    audioPath,
    surface,
    slow = false,
  }: PronunciationOptions): Promise<boolean> {
    const policy = getAudioPlaybackPolicy(surface);
    const approvedAudioPath = audioPath && isReviewedImmutableAudioPath(audioPath) ? audioPath : undefined;
    const useSlow = slow || policy.slow;
    if (!approvedAudioPath) return false;
    return this.play(approvedAudioPath, undefined, useSlow ? { rate: KANA_PRONUNCIATION_PLAYBACK_RATE } : undefined);
  }

  /** 즉시 재생. 미리 버퍼링 안 된 경우 로드 후 재생 */
  async play(path: string, _fallbackText?: string, options: { rate?: number } = {}): Promise<boolean> {
    this.stop();

    let entry = this.cache.get(path);
    if (!entry) {
      entry = { path, loading: true, error: false };
      this.cache.set(path, entry);
      await this._load(path, entry);
    } else if (entry.loading) {
      // 로딩 중이면 완료 대기
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (!entry!.loading) { clearInterval(check); resolve(); }
        }, 50);
      });
    }

    if (!entry.buffer) return false;

    const ctx = this.getCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = entry.buffer;
    source.playbackRate.value = options.rate ?? this._rate;
    source.connect(ctx.destination);
    source.onended = () => {
      this.currentSource = null;
      this._onEnd?.();
    };
    source.start();
    this.currentSource = source;
    return true;
  }

  stop(): void {
    try { this.currentSource?.stop(); } catch { /* already stopped */ }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.currentSource = null;
  }

  /** 캐시 상태 조회 */
  isCached(path: string): boolean {
    const e = this.cache.get(path);
    return !!e?.buffer;
  }

  /** 오래된 캐시 정리 (최대 100개) */
  pruneCache(max = 100): void {
    if (this.cache.size <= max) return;
    const keys = [...this.cache.keys()];
    for (const k of keys.slice(0, this.cache.size - max)) {
      this.cache.delete(k);
    }
  }
}

export function isGoogleJapaneseVoice(voice: Pick<SpeechSynthesisVoice, 'name' | 'voiceURI' | 'lang'>): boolean {
  const haystack = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  return voice.lang.toLowerCase().startsWith('ja') && haystack.includes('google');
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

export function isReviewedImmutableAudioPath(path: string): boolean {
  return /^audio\/(?:vocab|kanji|sentence)\/n[1-5]\/\d+-[a-f0-9]{16}\.mp3$/i.test(path)
    || /^private-audio\/(?:ja|ko)\/[a-z0-9-]+\/[a-f0-9]{16,64}\.(?:mp3|wav|ogg)$/i.test(path);
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
