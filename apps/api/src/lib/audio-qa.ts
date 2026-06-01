import type { Env } from '../types.js';
import { AUDIO_QA_SAMPLES } from './audio-qa-samples.js';
import { createTtsAdapter, getTtsProviderInfo, type TtsProviderId } from './tts/index.js';

export type AudioQaProvider = Extract<TtsProviderId, 'cloudflare' | 'voicevox'>;
export type AudioQaKey = { provider: AudioQaProvider; index: number };

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
  return value === 'cloudflare' || value === 'voicevox' ? value : null;
}

export function parseAudioQaKey(key: string): AudioQaKey | null {
  const match = key.match(/^audio\/qa\/([^/]+)\/(\d+)\.wav$/);
  if (!match) return null;
  const provider = parseAudioQaProvider(match[1] as string);
  const index = Number(match[2]);
  if (!provider || !isValidAudioQaIndex(index)) return null;
  return { provider, index };
}

export function isValidAudioQaIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 1 && index <= AUDIO_QA_SAMPLES.length;
}

export function buildAudioQaKey(provider: AudioQaProvider, index: number): string {
  return `audio/qa/${provider}/${index}.wav`;
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

export async function generateQaAudioObject(
  env: Env,
  provider: AudioQaProvider,
  index: number,
): Promise<R2ObjectBody | null> {
  const text = AUDIO_QA_SAMPLES[index - 1];
  if (!text) return null;

  const providerInfo = getTtsProviderInfo(env, provider);
  const key = buildAudioQaKey(provider, index);
  const tts = createTtsAdapter(env, provider);
  const audioBuffer = await tts.generateAudio({ text, lang: 'ja' });
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
      lang: 'ja',
      audioVersion: providerInfo.audioVersion,
      contentType,
      createdAt: new Date().toISOString(),
    },
  });
  return env.ASSETS.get(key);
}

export async function getOrGenerateQaAudio(
  env: Env,
  provider: AudioQaProvider,
  index: number,
  options: { force?: boolean } = {},
): Promise<R2ObjectBody | null> {
  const key = buildAudioQaKey(provider, index);
  const providerInfo = getTtsProviderInfo(env, provider);
  let r2obj = options.force ? null : await env.ASSETS.get(key);
  if (!r2obj || shouldRegenerateQaAudio(r2obj, providerInfo)) {
    r2obj = await generateQaAudioObject(env, provider, index);
  }
  return r2obj;
}

export async function warmupAudioQa(
  env: Env,
  provider: AudioQaProvider,
  options: { force?: boolean } = {},
): Promise<AudioQaWarmupResult[]> {
  if (provider === 'voicevox' && !env.VOICEVOX_URL.trim()) {
    return AUDIO_QA_SAMPLES.map((_, index) => ({
      provider,
      index: index + 1,
      key: buildAudioQaKey(provider, index + 1),
      status: 'skipped',
      error: 'VOICEVOX_URL 이 설정되지 않았습니다',
    }));
  }

  const providerInfo = getTtsProviderInfo(env, provider);
  const results: AudioQaWarmupResult[] = [];
  for (let i = 1; i <= AUDIO_QA_SAMPLES.length; i++) {
    const key = buildAudioQaKey(provider, i);
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

      const object = await generateQaAudioObject(env, provider, i);
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
