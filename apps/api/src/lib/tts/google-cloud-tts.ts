/**
 * apps/api/src/lib/tts/google-cloud-tts.ts
 *
 * Google Cloud Text-to-Speech 백업 어댑터
 *
 * 일본어 고품질 음성: ja-JP-Neural2-B (여성), ja-JP-Neural2-C (남성)
 * API 문서: https://cloud.google.com/text-to-speech/docs
 *
 * 환경변수: GOOGLE_TTS_API_KEY
 * 단가: Neural2 = $16/1M characters (2024 기준)
 */
import type { TtsAdapter, TtsOptions } from './types.js';

const GCP_TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

export class GoogleCloudTts implements TtsAdapter {
  constructor(private readonly apiKey: string) {}

  async generateAudio(opts: TtsOptions): Promise<ArrayBuffer> {
    const voice = opts.voice ?? (opts.lang === 'ja' ? 'ja-JP-Neural2-B' : 'en-US-Neural2-A');
    const languageCode = opts.lang === 'ja' ? 'ja-JP' : 'en-US';

    const body = {
      input: { text: opts.text },
      voice: { languageCode, name: voice },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: opts.rate ?? 1.0,
        sampleRateHertz: 24000,
      },
    };

    const resp = await fetch(`${GCP_TTS_ENDPOINT}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`[GoogleTts] HTTP ${resp.status}: ${err}`);
    }

    const json = await resp.json<{ audioContent: string }>();
    const bin = atob(json.audioContent);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }
}
