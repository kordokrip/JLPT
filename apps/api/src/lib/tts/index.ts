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
import { VoicevoxTts }       from './voicevox.js';
import { CLOUDFLARE_MELOTTS_MODEL } from './cloudflare-aura.js';
import type { TtsProviderId, TtsProviderInfo } from './types.js';

export type { TtsAdapter, TtsOptions, TtsProviderId, TtsProviderInfo } from './types.js';

interface TtsEnv {
  AI:                { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
  TTS_PROVIDER:      string;
  GOOGLE_TTS_API_KEY: string;
  AZURE_TTS_KEY:     string;
  AZURE_TTS_REGION:  string;
  VOICEVOX_URL?:      string;
  VOICEVOX_SPEAKER?:  string;
  VOICEVOX_SPEED_SCALE?: string;
  VOICEVOX_PITCH_SCALE?: string;
  VOICEVOX_INTONATION_SCALE?: string;
  STYLE_BERT_VITS2_URL?: string;
}

export function createTtsAdapter(env: TtsEnv, providerOverride?: TtsProviderId): TtsAdapter {
  const provider = normalizeProvider(providerOverride ?? env.TTS_PROVIDER);

  switch (provider) {
    case 'google':
      if (!env.GOOGLE_TTS_API_KEY) throw new Error('GOOGLE_TTS_API_KEY 가 설정되지 않았습니다');
      return new GoogleCloudTts(env.GOOGLE_TTS_API_KEY);

    case 'azure':
      if (!env.AZURE_TTS_KEY) throw new Error('AZURE_TTS_KEY 가 설정되지 않았습니다');
      return new AzureTts(env.AZURE_TTS_KEY, env.AZURE_TTS_REGION || 'japaneast');

    case 'voicevox':
      return new VoicevoxTts({
        baseUrl: env.VOICEVOX_URL ?? '',
        speaker: parseOptionalNumber(env.VOICEVOX_SPEAKER) ?? 3,
        speedScale: parseOptionalNumber(env.VOICEVOX_SPEED_SCALE) ?? 0.94,
        pitchScale: parseOptionalNumber(env.VOICEVOX_PITCH_SCALE) ?? 0,
        intonationScale: parseOptionalNumber(env.VOICEVOX_INTONATION_SCALE) ?? 1.12,
      });

    case 'style-bert-vits2':
      throw new Error(
        `Style-Bert-VITS2 provider는 별도 API 서버 URL 연결 후 활성화할 수 있습니다: ${
          env.STYLE_BERT_VITS2_URL || 'STYLE_BERT_VITS2_URL 미설정'
        }`,
      );

    default: // 'cloudflare'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new CloudflareMeloTts(env.AI as any);
  }
}

export function getTtsProviderInfo(env: TtsEnv, providerOverride?: TtsProviderId): TtsProviderInfo {
  const provider = normalizeProvider(providerOverride ?? env.TTS_PROVIDER);
  if (provider === 'voicevox') {
    const speaker = parseOptionalNumber(env.VOICEVOX_SPEAKER) ?? 3;
    return {
      provider,
      model: `voicevox:speaker-${speaker}`,
      audioVersion: 'voicevox-v1',
    };
  }
  if (provider === 'style-bert-vits2') {
    return { provider, model: 'style-bert-vits2:self-hosted', audioVersion: 'style-bert-vits2-v1' };
  }
  if (provider === 'google') return { provider, model: 'google-cloud-tts', audioVersion: 'google-v1' };
  if (provider === 'azure') return { provider, model: 'azure-tts', audioVersion: 'azure-v1' };
  return { provider: 'cloudflare', model: CLOUDFLARE_MELOTTS_MODEL, audioVersion: 'melotts-v2' };
}

function normalizeProvider(value: string | undefined): TtsProviderId {
  const provider = (value ?? 'cloudflare').toLowerCase();
  if (provider === 'google' || provider === 'azure' || provider === 'voicevox' || provider === 'style-bert-vits2') {
    return provider;
  }
  return 'cloudflare';
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
