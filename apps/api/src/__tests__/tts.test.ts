import { describe, expect, it } from 'vitest';
import { CLOUDFLARE_MELOTTS_MODEL, CloudflareMeloTts } from '../lib/tts/cloudflare-aura.js';

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
