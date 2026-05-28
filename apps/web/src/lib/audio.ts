/**
 * apps/web/src/lib/audio.ts
 *
 * 단일 AudioContext 기반 큐 재생기.
 * - 현재 카드 + 다음 3장 자동 prefetch
 * - 재생 속도 0.75x / 1x / 1.25x
 * - R2 Range 요청 활용 (브라우저 자동 처리)
 */

const BASE = import.meta.env.VITE_API_URL ?? '';

export function buildAudioUrl(path: string): string {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${BASE}/api/v1/audio/${encodedPath}`;
}

export type PlaybackRate = 0.75 | 1.0 | 1.25;

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
  private _onEnd: (() => void) | null = null;

  get rate(): PlaybackRate { return this._rate; }
  set rate(v: PlaybackRate) { this._rate = v; }
  set onEnd(cb: () => void) { this._onEnd = cb; }

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

  speakText(text: string): void {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = this._rate;
    utterance.onend = () => this._onEnd?.();
    window.speechSynthesis.speak(utterance);
  }

  /** 즉시 재생. 미리 버퍼링 안 된 경우 로드 후 재생 */
  async play(path: string, fallbackText?: string): Promise<void> {
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
      if (fallbackText) this.speakText(fallbackText);
      return;
    }

    const ctx = this.getCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = entry.buffer;
    source.playbackRate.value = this._rate;
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

/** 싱글톤 플레이어 */
export const audioPlayer = new AudioPlayer();
