/**
 * Pronunciation storage is deliberately disabled.
 *
 * Google speech is selected by the client when a Google voice is available.
 * The server must never read or serve a pronunciation object from R2.
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

const audio = new Hono<AppEnv>();

function r2AudioDisabled(): Response {
  return Response.json({
    type: 'https://nihongo-n3.example.com/errors/r2-audio-disabled',
    title: 'Gone',
    status: 410,
    detail: 'R2 발음 저장소는 사용하지 않습니다. Google 음성만 사용할 수 있습니다.',
  }, {
    status: 410,
    headers: { 'Cache-Control': 'no-store' },
  });
}

audio.all('/audio/*', () => r2AudioDisabled());

export { audio };
