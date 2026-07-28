import type { Env } from '../types.js';
import { AUDIO_QA_SAMPLES, AUDIO_QA_KOREAN_SAMPLES, type AudioQaLanguage } from '@nihongo-n3/shared';
import { createTtsAdapter, getTtsProviderInfo, getVoicevoxUrl, type TtsProviderId } from './tts/index.js';

export type AudioQaProvider = Extract<TtsProviderId, 'cloudflare' | 'google' | 'voicevox'>;
export type AudioQaKey = { provider: AudioQaProvider; index: number; language: AudioQaLanguage };

export type AudioQaWarmupResult = {
  provider: AudioQaProvider;
  index: number;
  key: string;
  status: 'cached' | 'generated' | 'failed' | 'skipped';
  bytes?: number;
  contentType?: 'audio/mpeg' | 'audio/wav';
  error?: string;
};

const CACHE_CONTROL = 'public, max-age=2592000, immutable';

export function detectAudioContentType(buffer: ArrayBuffer): 'audio/mpeg' | 'audio/wav' {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  const ascii = String.fromCharCode(...bytes);
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE') return 'audio/wav';
  return 'audio/mpeg';
}

export function parseAudioQaProvider(value: string): AudioQaProvider | null {
  return value === 'cloudflare' || value === 'google' || value === 'voicevox' ? value : null;
}

export function parseAudioQaKey(key: string): AudioQaKey | null {
  const match = key.match(/^audio\/qa\/(?:([a-z]{2})\/)?([^/]+)\/(\d+)\.wav$/);
  if (!match) return null;
  const language = (match[1] || 'ja') as AudioQaLanguage;
  const provider = parseAudioQaProvider(match[2] as string);
  const index = Number(match[3]);
  if ((language !== 'ja' && language !== 'ko') || !provider || !isValidAudioQaIndex(index, language)) return null;
  return { provider, index, language };
}

function samplesFor(language: AudioQaLanguage): readonly string[] {
  return language === 'ko' ? AUDIO_QA_KOREAN_SAMPLES : AUDIO_QA_SAMPLES;
}

export function isValidAudioQaIndex(index: number, language: AudioQaLanguage = 'ja'): boolean {
  return Number.isInteger(index) && index >= 1 && index <= samplesFor(language).length;
}

export function buildAudioQaKey(provider: AudioQaProvider, index: number, language: AudioQaLanguage = 'ja'): string {
  return language === 'ja' ? `audio/qa/${provider}/${index}.wav` : `audio/qa/${language}/${provider}/${index}.wav`;
}

export function shouldRegenerateQaAudio(
  object: Pick<R2Object, 'customMetadata'> | null,
  providerInfo: ReturnType<typeof getTtsProviderInfo>,
): boolean {
  if (!object) return true;
  const meta = object.customMetadata;
  return meta?.source !== 'qa' ||
    meta.provider !== providerInfo.provider ||
    meta.model !== providerInfo.model ||
    meta.audioVersion !== providerInfo.audioVersion;
}

async function generateQaAudioObject(
  env: Env,
  provider: AudioQaProvider,
  index: number,
  language: AudioQaLanguage,
): Promise<R2ObjectBody | null> {
  const text = samplesFor(language)[index - 1];
  if (!text) return null;

  const providerInfo = getTtsProviderInfo(env, provider, language);
  const key = buildAudioQaKey(provider, index, language);
  const tts = createTtsAdapter(env, provider);
  const audioBuffer = await tts.generateAudio({ text, lang: language });
  const contentType = detectAudioContentType(audioBuffer);
  await env.ASSETS.put(key, audioBuffer, {
    httpMetadata: {
      contentType,
      cacheControl: CACHE_CONTROL,
    },
    customMetadata: {
      itemType: 'qa',
      itemId: String(index),
      source: 'qa',
      provider: providerInfo.provider,
      model: providerInfo.model,
      lang: language,
      audioVersion: providerInfo.audioVersion,
      contentType,
      createdAt: new Date().toISOString(),
    },
  });
  return env.ASSETS.get(key);
}

export async function warmupAudioQa(
  env: Env,
  provider: AudioQaProvider,
  options: { force?: boolean; language?: AudioQaLanguage } = {},
): Promise<AudioQaWarmupResult[]> {
  const language = options.language ?? 'ja';
  const samples = samplesFor(language);
  if (provider === 'voicevox' && language !== 'ja') {
    return samples.map((_, index) => ({ provider, index: index + 1, key: buildAudioQaKey(provider, index + 1, language), status: 'skipped', error: 'VOICEVOX QA는 일본어만 지원합니다' }));
  }
  if (provider === 'voicevox' && !getVoicevoxUrl(env).trim()) {
    return samples.map((_, index) => ({
      provider,
      index: index + 1,
      key: buildAudioQaKey(provider, index + 1, language),
      status: 'skipped',
      error: 'VOICEVOX_URL 이 설정되지 않았습니다',
    }));
  }

  const providerInfo = getTtsProviderInfo(env, provider, language);
  const results: AudioQaWarmupResult[] = [];
  for (let i = 1; i <= samples.length; i++) {
    const key = buildAudioQaKey(provider, i, language);
    try {
      const existing = options.force ? null : await env.ASSETS.head(key);
      if (existing && !shouldRegenerateQaAudio(existing, providerInfo)) {
        const result: AudioQaWarmupResult = {
          provider,
          index: i,
          key,
          status: 'cached',
          bytes: existing.size,
        };
        const contentType = existing.customMetadata?.contentType;
        if (contentType === 'audio/mpeg' || contentType === 'audio/wav') result.contentType = contentType;
        results.push(result);
        continue;
      }

      const object = await generateQaAudioObject(env, provider, i, language);
      const result: AudioQaWarmupResult = {
        provider,
        index: i,
        key,
        status: 'generated',
      };
      if (object) {
        result.bytes = object.size;
        const contentType = object.httpMetadata?.contentType;
        if (contentType === 'audio/mpeg' || contentType === 'audio/wav') result.contentType = contentType;
      }
      results.push(result);
    } catch (err) {
      results.push({
        provider,
        index: i,
        key,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}
