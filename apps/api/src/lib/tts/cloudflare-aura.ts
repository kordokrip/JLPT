/**
 * apps/api/src/lib/tts/cloudflare-aura.ts
 *
 * Cloudflare Workers AI — MeloTTS 어댑터 (기본 공급자)
 *
 * 모델: @cf/myshell-ai/melotts
 * 참고: https://developers.cloudflare.com/workers-ai/models/melotts/
 * MeloTTS 원본은 일본어를 포함한 다국어 TTS를 지원한다.
 */
import type { TtsAdapter, TtsOptions } from './types.js';

type AiRun = (model: string, input: Record<string, unknown>) => Promise<
  { audio: string } | string | ReadableStream | ArrayBuffer
>;

export const CLOUDFLARE_MELOTTS_MODEL = '@cf/myshell-ai/melotts';

export class CloudflareMeloTts implements TtsAdapter {
  constructor(private readonly ai: { run: AiRun }) {}

  async generateAudio(opts: TtsOptions): Promise<ArrayBuffer> {
    const result = await (this.ai.run as AiRun)(
      CLOUDFLARE_MELOTTS_MODEL,
      {
        prompt: opts.text,
        lang: opts.lang === 'ja' ? 'ja' : 'en',
      },
    );

    if (result instanceof ArrayBuffer) return result;

    // ReadableStream → ArrayBuffer 변환
    if (result instanceof ReadableStream) {
      const reader = result.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value as Uint8Array);
      }
      const total = chunks.reduce((s, c) => s + c.byteLength, 0);
      const buf = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        buf.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return buf.buffer;
    }

    const audio = typeof result === 'string' ? result : (result as { audio?: string }).audio;
    if (typeof audio === 'string') {
      const b64 = audio.includes(',') ? audio.split(',').pop() ?? audio : audio;
      const bin = atob(b64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      return buf.buffer;
    }

    throw new Error('[CloudflareMeloTts] 알 수 없는 응답 형식');
  }
}
