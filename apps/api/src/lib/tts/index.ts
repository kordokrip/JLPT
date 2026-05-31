/**
 * apps/api/src/lib/tts/index.ts
 *
 * TTS 어댑터 팩토리
 * 환경변수 TTS_PROVIDER 에 따라 올바른 어댑터 반환
 */
import type { TtsAdapter } from './types.js';
import { CloudflareMeloTts } from './cloudflare-aura.js';
import { GoogleCloudTts }    from './google-cloud-tts.js';
import { AzureTts }          from './azure-tts.js';

export type { TtsAdapter, TtsOptions } from './types.js';

interface TtsEnv {
  AI:                { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
  TTS_PROVIDER:      string;
  GOOGLE_TTS_API_KEY: string;
  AZURE_TTS_KEY:     string;
  AZURE_TTS_REGION:  string;
}

export function createTtsAdapter(env: TtsEnv): TtsAdapter {
  const provider = (env.TTS_PROVIDER ?? 'cloudflare').toLowerCase();

  switch (provider) {
    case 'google':
      if (!env.GOOGLE_TTS_API_KEY) throw new Error('GOOGLE_TTS_API_KEY 가 설정되지 않았습니다');
      return new GoogleCloudTts(env.GOOGLE_TTS_API_KEY);

    case 'azure':
      if (!env.AZURE_TTS_KEY) throw new Error('AZURE_TTS_KEY 가 설정되지 않았습니다');
      return new AzureTts(env.AZURE_TTS_KEY, env.AZURE_TTS_REGION || 'japaneast');

    default: // 'cloudflare'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new CloudflareMeloTts(env.AI as any);
  }
}
