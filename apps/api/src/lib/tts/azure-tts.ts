/**
 * apps/api/src/lib/tts/azure-tts.ts
 *
 * Azure Cognitive Services — Speech 백업 어댑터
 *
 * 일본어 고품질 음성: ja-JP-NanamiNeural (여성), ja-JP-KeitaNeural (남성)
 * API 문서: https://learn.microsoft.com/azure/ai-services/speech-service/
 *
 * 환경변수: AZURE_TTS_KEY, AZURE_TTS_REGION (기본: japaneast)
 * 단가: Neural = $16/1M characters (2024 기준)
 */
import type { TtsAdapter, TtsOptions } from './types.js';

export class AzureTts implements TtsAdapter {
  constructor(
    private readonly key: string,
    private readonly region: string = 'japaneast',
  ) {}

  async generateAudio(opts: TtsOptions): Promise<ArrayBuffer> {
    const voice   = opts.voice ?? (opts.lang === 'ja' ? 'ja-JP-NanamiNeural' : 'en-US-JennyNeural');
    const locale  = opts.lang === 'ja' ? 'ja-JP' : 'en-US';
    const rateStr = opts.rate ? `${((opts.rate - 1) * 100).toFixed(0)}%` : '0%';

    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">
  <voice name="${voice}">
    <prosody rate="${rateStr}">${escapeXml(opts.text)}</prosody>
  </voice>
</speak>`;

    const endpoint = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
        'User-Agent': 'nihongo-n3-api',
      },
      body: ssml,
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`[AzureTts] HTTP ${resp.status}: ${err}`);
    }

    return await resp.arrayBuffer();
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
