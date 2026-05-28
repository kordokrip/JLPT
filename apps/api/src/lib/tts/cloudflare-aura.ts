/**
 * apps/api/src/lib/tts/cloudflare-aura.ts
 *
 * Cloudflare Workers AI — Aura TTS 어댑터 (기본 공급자)
 *
 * 모델: @cf/deepgram/aura-2-asteria-en
 * 참고: https://developers.cloudflare.com/workers-ai/models/
 *
 * 일본어 지원 현황:
 *   - Aura-2 는 영어 전용 모델 (일본어 미지원)
 *   - 임시 대안: Hugging Face Kokoro / OpenAI TTS 호환 엔드포인트 (향후)
 *   - 현재: 알파벳 변환(ローマ字) → 영어 TTS (품질 낮음, 개발 테스트용)
 *
 * 프로덕션 권장: google | azure 어댑터로 전환 (TTS_PROVIDER 환경변수)
 */
import type { TtsAdapter, TtsOptions } from './types.js';

type AiRun = (model: string, input: Record<string, unknown>) => Promise<{ audio: string } | ReadableStream | ArrayBuffer>;

export class CloudflareAuraTts implements TtsAdapter {
  constructor(private readonly ai: { run: AiRun }) {}

  async generateAudio(opts: TtsOptions): Promise<ArrayBuffer> {
    // Aura-2 는 영어 전용 — 일본어 텍스트를 그대로 전달 (발음 근사치)
    const result = await (this.ai.run as AiRun)(
      '@cf/deepgram/aura-2-asteria-en',
      {
        text: opts.text,
        // speed, voice 파라미터는 모델에 따라 다름
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

    // { audio: base64 } 형식
    if (typeof (result as { audio?: string }).audio === 'string') {
      const b64 = (result as { audio: string }).audio;
      const bin = atob(b64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      return buf.buffer;
    }

    throw new Error('[CloudflareAuraTts] 알 수 없는 응답 형식');
  }
}
