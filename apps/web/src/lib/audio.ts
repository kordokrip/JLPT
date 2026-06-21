/**
 * apps/web/src/lib/audio.ts
 *
 * 단일 AudioContext 기반 큐 재생기.
 * - 현재 카드 + 다음 3장 자동 prefetch
 * - 재생 속도 0.75x / 1x / 1.25x
 * - R2 Range 요청 활용 (브라우저 자동 처리)
 */

import { apiUrl } from './api-base';

export function buildAudioUrl(path: string): string {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return apiUrl(`/audio/${encodedPath}`);
}

export type PlaybackRate = 0.75 | 1.0 | 1.25;
export type VoiceGender = 'female' | 'male';
export type AudioSourcePreference = 'browser' | 'server';
export type TtsProviderId = 'browser' | 'cloudflare' | 'voicevox' | 'style-bert-vits2';
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
  private _sourcePreference: AudioSourcePreference = 'browser';
  private _onEnd: (() => void) | null = null;
  private voicesReady: Promise<void> | null = null;

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

  async warmVoices(): Promise<void> {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.getVoices().length > 0) return;
    if (this.voicesReady) return this.voicesReady;

    this.voicesReady = new Promise((resolve) => {
      const timer = window.setTimeout(resolve, 600);
      window.speechSynthesis.addEventListener(
        'voiceschanged',
        () => {
          window.clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
    return this.voicesReady;
  }

  async getJapaneseVoices(): Promise<JapaneseVoiceOption[]> {
    if (!('speechSynthesis' in window)) return [];
    await this.warmVoices();
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

  private pickJapaneseVoice(
    gender: VoiceGender,
    lang = 'ja-JP',
    voiceURI: string | null = this._voiceURI,
    preferGoogleVoice = true,
  ): SpeechSynthesisVoice | undefined {
    if (!('speechSynthesis' in window)) return undefined;
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = lang.split('-')[0]?.toLowerCase() ?? 'ja';
    const japaneseVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(langPrefix));
    if (japaneseVoices.length === 0) return undefined;
    const googleVoice = preferGoogleVoice ? japaneseVoices.find(isGoogleJapaneseVoice) : undefined;
    if (googleVoice) return googleVoice;

    if (voiceURI) {
      const selected = japaneseVoices.find((voice) => voice.voiceURI === voiceURI);
      if (selected) return selected;
    }

    const femaleHints = ['female', 'woman', 'kyoko', 'kyouko', 'nanami', 'haruka', 'sayaka', 'mei', 'mio', 'yui', 'sakura', 'hikari'];
    const maleHints = ['male', 'man', 'otoya', 'ichiro', 'takumi', 'kyohei', 'daichi', 'keita', 'show', 'hattori'];
    const naturalHints = ['premium', 'enhanced', 'siri', 'natural', 'neural', 'apple', 'google'];
    const hints = gender === 'female' ? femaleHints : maleHints;
    const oppositeHints = gender === 'female' ? maleHints : femaleHints;

    const scored = japaneseVoices
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
      .sort((a, b) => b.score - a.score);

    return scored[0]?.voice;
  }

  async speakText(text: string, options: SpeechOptions = {}): Promise<void> {
    if (!text.trim() || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
    await this.warmVoices();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang ?? 'ja-JP';
    utterance.rate = Math.min(1.2, Math.max(0.45, options.rate ?? this._rate * 0.95));
    const selectedGender = options.voiceGender ?? this._voiceGender;
    utterance.pitch = options.pitch ?? (selectedGender === 'male' ? 0.94 : 1.02);
    utterance.volume = 1;
    const voice = this.pickJapaneseVoice(
      options.voiceGender ?? this._voiceGender,
      utterance.lang,
      options.voiceURI ?? this._voiceURI,
      options.preferGoogleVoice ?? true,
    );
    if (voice) utterance.voice = voice;
    await new Promise<void>((resolve) => {
      utterance.onstart = options.onStart ?? null;
      utterance.onend = () => {
        options.onEnd?.();
        this._onEnd?.();
        resolve();
      };
      utterance.onerror = () => {
        options.onError?.();
        this._onEnd?.();
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  async playPronunciation({
    text,
    audioPath,
    prefer = this._sourcePreference,
    forceBrowser = false,
    slow = false,
    repeat = 1,
    preferGoogleVoice = true,
  }: PronunciationOptions): Promise<void> {
    const normalized = text?.trim();
    if ((forceBrowser || prefer === 'browser') && normalized) {
      const spokenText = repeat > 1 ? Array.from({ length: repeat }, () => normalized).join('、') : normalized;
      await this.speakText(spokenText, {
        ...(slow ? { rate: 0.5 } : {}),
        preferGoogleVoice,
      });
      return;
    }
    if (audioPath) {
      await this.play(audioPath, normalized, slow ? { rate: KANA_PRONUNCIATION_PLAYBACK_RATE } : undefined);
      return;
    }
    if (normalized) await this.speakText(normalized);
  }

  /** 즉시 재생. 미리 버퍼링 안 된 경우 로드 후 재생 */
  async play(path: string, fallbackText?: string, options: { rate?: number } = {}): Promise<void> {
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

    if (!entry.buffer) {
      if (fallbackText) await this.speakText(fallbackText);
      return;
    }

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

/** 싱글톤 플레이어 */
export const audioPlayer = new AudioPlayer();
