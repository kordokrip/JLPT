/**
 * VOICEVOX Engine adapter.
 *
 * API flow:
 *   1. POST /audio_query?text=...&speaker=...
 *   2. POST /synthesis?speaker=... with the returned audio query JSON
 */
import type { TtsAdapter, TtsOptions } from './types.js';

type FetchLike = typeof fetch;

interface VoicevoxAudioQuery {
  speedScale?: number;
  pitchScale?: number;
  intonationScale?: number;
  volumeScale?: number;
  prePhonemeLength?: number;
  postPhonemeLength?: number;
  outputSamplingRate?: number;
  outputStereo?: boolean;
  [key: string]: unknown;
}

export interface VoicevoxOptions {
  baseUrl: string;
  speaker?: number;
  speedScale?: number;
  pitchScale?: number;
  intonationScale?: number;
  fetcher?: FetchLike;
}

export class VoicevoxTts implements TtsAdapter {
  private readonly baseUrl: string;
  private readonly speaker: number;
  private readonly speedScale: number;
  private readonly pitchScale: number;
  private readonly intonationScale: number;
  private readonly fetcher: FetchLike;

  constructor(options: VoicevoxOptions) {
    if (!options.baseUrl.trim()) throw new Error('VOICEVOX_URL 이 설정되지 않았습니다');
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.speaker = options.speaker ?? 3;
    this.speedScale = options.speedScale ?? 0.94;
    this.pitchScale = options.pitchScale ?? 0;
    this.intonationScale = options.intonationScale ?? 1.12;
    this.fetcher = options.fetcher ?? fetch;
  }

  async generateAudio(opts: TtsOptions): Promise<ArrayBuffer> {
    if (opts.lang !== 'ja') throw new Error('VOICEVOX provider는 일본어 합성만 지원합니다');

    const speaker = parseVoicevoxSpeaker(opts.voice) ?? this.speaker;
    const queryUrl = new URL(`${this.baseUrl}/audio_query`);
    queryUrl.searchParams.set('text', opts.text);
    queryUrl.searchParams.set('speaker', String(speaker));

    const queryRes = await this.fetcher(queryUrl.toString(), { method: 'POST' });
    if (!queryRes.ok) {
      throw new Error(`VOICEVOX audio_query 실패: HTTP ${queryRes.status}`);
    }

    const query = await queryRes.json<VoicevoxAudioQuery>();
    query.speedScale = clamp(opts.rate ?? this.speedScale, 0.5, 2);
    query.pitchScale = clamp(this.pitchScale, -0.15, 0.15);
    query.intonationScale = clamp(this.intonationScale, 0, 2);
    query.outputSamplingRate = 44100;
    query.outputStereo = false;

    const synthesisUrl = new URL(`${this.baseUrl}/synthesis`);
    synthesisUrl.searchParams.set('speaker', String(speaker));
    synthesisUrl.searchParams.set('enable_interrogative_upspeak', 'true');

    const synthesisRes = await this.fetcher(synthesisUrl.toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(query),
    });
    if (!synthesisRes.ok) {
      throw new Error(`VOICEVOX synthesis 실패: HTTP ${synthesisRes.status}`);
    }

    return synthesisRes.arrayBuffer();
  }
}

function parseVoicevoxSpeaker(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
