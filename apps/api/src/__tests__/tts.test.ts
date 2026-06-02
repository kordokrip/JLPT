import { describe, expect, it } from 'vitest';
import { CLOUDFLARE_MELOTTS_MODEL, CloudflareMeloTts } from '../lib/tts/cloudflare-aura.js';
import { createTtsAdapter, getTtsProviderInfo } from '../lib/tts/index.js';
import { VoicevoxTts, probeVoicevoxEngine } from '../lib/tts/voicevox.js';

describe('CloudflareMeloTts', () => {
  it('uses MeloTTS with Japanese language input and decodes base64 MP3 payloads', async () => {
    const calls: Array<{ model: string; input: Record<string, unknown> }> = [];
    const adapter = new CloudflareMeloTts({
      run: async (model, input) => {
        calls.push({ model, input });
        return { audio: btoa('mp3-bytes') };
      },
    });

    const audio = await adapter.generateAudio({ text: 'こんにちは', lang: 'ja' });

    expect(calls).toEqual([
      { model: CLOUDFLARE_MELOTTS_MODEL, input: { prompt: 'こんにちは', lang: 'ja' } },
    ]);
    expect(new TextDecoder().decode(audio)).toBe('mp3-bytes');
  });
});

describe('VoicevoxTts', () => {
  it('calls audio_query then synthesis and returns WAV bytes', async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const wav = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 65, 86, 69]).buffer;
    const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/audio_query')) {
        return Response.json({
          speedScale: 1,
          pitchScale: 0,
          intonationScale: 1,
          volumeScale: 1,
          prePhonemeLength: 0.1,
          postPhonemeLength: 0.1,
          outputSamplingRate: 24000,
          outputStereo: false,
          accent_phrases: [],
        });
      }
      return new Response(wav, { headers: { 'content-type': 'audio/wav' } });
    }) as typeof fetch;

    const adapter = new VoicevoxTts({
      baseUrl: 'https://voicevox.example.com/',
      speaker: 8,
      fetcher,
      intonationScale: 1.2,
    });

    const audio = await adapter.generateAudio({ text: 'こんにちは', lang: 'ja', rate: 0.9 });

    expect(new TextDecoder().decode(audio.slice(0, 12))).toBe('RIFF\u0000\u0000\u0000\u0000WAVE');
    expect(calls[0]?.url).toBe('https://voicevox.example.com/audio_query?text=%E3%81%93%E3%82%93%E3%81%AB%E3%81%A1%E3%81%AF&speaker=8');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(calls[1]?.url).toBe('https://voicevox.example.com/synthesis?speaker=8&enable_interrogative_upspeak=true');
    expect(calls[1]?.init?.method).toBe('POST');
    expect(JSON.parse(String(calls[1]?.init?.body))).toMatchObject({
      speedScale: 0.9,
      intonationScale: 1.2,
      outputSamplingRate: 44100,
      outputStereo: false,
    });
  });

  it('probes VOICEVOX engine version and speaker list', async () => {
    const fetcher = (async (url: string | URL | Request) => {
      if (String(url).endsWith('/version')) return new Response('0.16.0');
      if (String(url).endsWith('/speakers')) return Response.json([{ name: '四国めたん', styles: [] }]);
      return new Response(null, { status: 404 });
    }) as typeof fetch;

    await expect(probeVoicevoxEngine('https://voicevox.example.com/', { fetcher })).resolves.toEqual({
      configured: true,
      ok: true,
      version: '0.16.0',
      speakerCount: 1,
    });
  });

  it('reports disabled VOICEVOX when URL is empty', async () => {
    await expect(probeVoicevoxEngine('')).resolves.toEqual({
      configured: false,
      ok: false,
      error: 'VOICEVOX_URL 이 설정되지 않았습니다',
    });
  });
});

describe('createTtsAdapter', () => {
  it('creates VOICEVOX adapter when VOICEVOX_URL is configured', () => {
    const env = {
      AI: { run: async () => ({ audio: '' }) },
      TTS_PROVIDER: 'voicevox',
      GOOGLE_TTS_API_KEY: '',
      AZURE_TTS_KEY: '',
      AZURE_TTS_REGION: '',
      VOICEVOX_URL: 'https://voicevox.example.com',
      VOICEVOX_SPEAKER: '8',
      VOICEVOX_SPEED_SCALE: '0.94',
      VOICEVOX_PITCH_SCALE: '0',
      VOICEVOX_INTONATION_SCALE: '1.12',
      STYLE_BERT_VITS2_URL: '',
    };

    expect(createTtsAdapter(env)).toBeInstanceOf(VoicevoxTts);
    expect(getTtsProviderInfo(env)).toEqual({
      provider: 'voicevox',
      model: 'voicevox:speaker-8',
      audioVersion: 'voicevox-v1',
    });
  });
});
