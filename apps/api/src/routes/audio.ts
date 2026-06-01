/**
 * apps/api/src/routes/audio.ts
 *
 * R2 오디오 프록시.
 *
 * GET  /audio/:key  — Range 요청 지원 (206 Partial Content)
 * HEAD /audio/:key  — 메타데이터만 반환
 *
 * 캐시 전략: Cache-Control: public, max-age=2592000, immutable (30일)
 */
import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppEnv } from '../types.js';
import { notFound, badRequest } from '../lib/response.js';
import { createTtsAdapter, getTtsProviderInfo, type TtsProviderId } from '../lib/tts/index.js';
import { AUDIO_QA_SAMPLES } from '../lib/audio-qa-samples.js';
const audio = new Hono<AppEnv>();

const CACHE_CONTROL = 'public, max-age=2592000, immutable';

function detectAudioContentType(buffer: ArrayBuffer): 'audio/mpeg' | 'audio/wav' {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  const ascii = String.fromCharCode(...bytes);
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE') return 'audio/wav';
  return 'audio/mpeg';
}

/** Range 헤더 파싱: "bytes=start-end?" → {start, end?} */
function parseRange(header: string, totalSize: number): { start: number; end: number } | null {
  const m = header.match(/^bytes=(\d*)-(\d*)$/);
  if (!m) return null;

  const rawStart = m[1] as string;
  const rawEnd   = m[2] as string;

  const start = rawStart.length > 0 ? parseInt(rawStart, 10) : totalSize - parseInt(rawEnd, 10);
  const end   = rawEnd.length > 0   ? parseInt(rawEnd, 10)   : totalSize - 1;

  if (start > end || start < 0 || end >= totalSize) return null;
  return { start, end };
}

type AudioKind = 'sentence' | 'vocab' | 'kanji';
type AudioQaProvider = Extract<TtsProviderId, 'cloudflare' | 'voicevox'>;

function parseAudioQaProvider(value: string): AudioQaProvider | null {
  return value === 'cloudflare' || value === 'voicevox' ? value : null;
}

function parseGeneratedAudioKey(key: string): { kind: AudioKind; level: string; id: number } | null {
  const match = key.match(/^audio\/(sentence|vocab|kanji)\/(n[1-5])\/(\d+)\.mp3$/i);
  if (!match) return null;
  return {
    kind: match[1] as AudioKind,
    level: match[2]!.toUpperCase(),
    id: Number(match[3]),
  };
}

async function getSourceText(c: Context<AppEnv>, kind: AudioKind, id: number): Promise<string | null> {
  if (kind === 'sentence') {
    const row = await c.env.DB.prepare('SELECT ja AS text FROM sentences WHERE id = ?')
      .bind(id)
      .first<{ text: string | null }>();
    return row?.text?.trim() || null;
  }
  if (kind === 'vocab') {
    const row = await c.env.DB.prepare('SELECT ja AS text FROM vocab WHERE id = ?')
      .bind(id)
      .first<{ text: string | null }>();
    return row?.text?.trim() || null;
  }
  const row = await c.env.DB.prepare(
    "SELECT COALESCE(NULLIF(on_yomi, ''), NULLIF(kun_yomi, ''), char) AS text FROM kanji WHERE id = ?",
  )
    .bind(id)
    .first<{ text: string | null }>();
  return row?.text?.trim() || null;
}

async function updateAudioKey(c: Context<AppEnv>, kind: AudioKind, id: number, key: string): Promise<void> {
  const table = kind === 'sentence' ? 'sentences' : kind === 'vocab' ? 'vocab' : 'kanji';
  await c.env.DB.prepare(`UPDATE ${table} SET audio_r2_key = ? WHERE id = ?`)
    .bind(key, id)
    .run()
    .catch(() => undefined);
}

async function generateAudioObject(
  c: Context<AppEnv>,
  key: string,
): Promise<R2ObjectBody | null> {
  const parsed = parseGeneratedAudioKey(key);
  if (!parsed) return null;

  const text = await getSourceText(c, parsed.kind, parsed.id);
  if (!text) return null;

  const providerInfo = getTtsProviderInfo(c.env);
  const tts = createTtsAdapter(c.env);
  const audioBuffer = await tts.generateAudio({ text, lang: 'ja' });
  const contentType = detectAudioContentType(audioBuffer);
  await c.env.ASSETS.put(key, audioBuffer, {
    httpMetadata: {
      contentType,
      cacheControl: CACHE_CONTROL,
    },
    customMetadata: {
      itemType: parsed.kind,
      itemId: String(parsed.id),
      level: parsed.level,
      source: 'on-demand',
      provider: providerInfo.provider,
      model: providerInfo.model,
      lang: 'ja',
      audioVersion: providerInfo.audioVersion,
      contentType,
      createdAt: new Date().toISOString(),
    },
  });
  await updateAudioKey(c, parsed.kind, parsed.id, key);
  return c.env.ASSETS.get(key);
}

function shouldRegenerateGeneratedAudio(
  key: string,
  object: Pick<R2Object, 'customMetadata'> | null,
  providerInfo: ReturnType<typeof getTtsProviderInfo>,
): boolean {
  if (!parseGeneratedAudioKey(key)) return false;
  if (!object) return true;
  const meta = object.customMetadata;
  return meta?.source === 'on-demand' && (
    meta.model !== providerInfo.model ||
    meta.audioVersion !== providerInfo.audioVersion
  );
}

async function generateQaAudioObject(
  c: Context<AppEnv>,
  provider: AudioQaProvider,
  index: number,
): Promise<R2ObjectBody | null> {
  const text = AUDIO_QA_SAMPLES[index - 1];
  if (!text) return null;

  const providerInfo = getTtsProviderInfo(c.env, provider);
  const key = `audio/qa/${provider}/${index}.wav`;
  const tts = createTtsAdapter(c.env, provider);
  const audioBuffer = await tts.generateAudio({ text, lang: 'ja' });
  const contentType = detectAudioContentType(audioBuffer);
  await c.env.ASSETS.put(key, audioBuffer, {
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
  return c.env.ASSETS.get(key);
}

function shouldRegenerateQaAudio(
  object: Pick<R2Object, 'customMetadata'> | null,
  providerInfo: ReturnType<typeof getTtsProviderInfo>,
): boolean {
  if (!object) return true;
  const meta = object.customMetadata;
  return meta?.source === 'qa' && (
    meta.model !== providerInfo.model ||
    meta.audioVersion !== providerInfo.audioVersion
  );
}

// ── GET /audio/qa/:provider/:index.wav ───────
audio.get('/audio/qa/:provider/:index.wav', async (c) => {
  const provider = parseAudioQaProvider(c.req.param('provider'));
  const index = Number(c.req.param('index'));
  if (!provider || !Number.isInteger(index) || index < 1 || index > AUDIO_QA_SAMPLES.length) {
    return badRequest(c, 'QA 오디오 provider 또는 index가 올바르지 않습니다');
  }

  const key = `audio/qa/${provider}/${index}.wav`;
  const providerInfo = getTtsProviderInfo(c.env, provider);
  let r2obj = await c.env.ASSETS.get(key);
  if (!r2obj || shouldRegenerateQaAudio(r2obj, providerInfo)) {
    try {
      r2obj = await generateQaAudioObject(c, provider, index);
    } catch (err) {
      console.error('[audio/qa]', err);
      return notFound(c, `QA 오디오를 아직 생성할 수 없습니다: ${provider}#${index}`);
    }
  }
  if (!r2obj) return notFound(c, `QA 오디오 파일을 찾을 수 없습니다: ${key}`);

  return new Response(r2obj.body as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': r2obj.httpMetadata?.contentType ?? 'audio/wav',
      'Content-Length': String(r2obj.size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': CACHE_CONTROL,
      'ETag': r2obj.httpEtag,
      'Last-Modified': r2obj.uploaded.toUTCString(),
    },
  });
});

// ── GET /audio/:key ───────────────────────────
audio.get('/audio/:key{.+}', async (c) => {
  const key = c.req.param('key');
  if (!key) return badRequest(c, '오디오 키가 없습니다');

  const rangeHeader = c.req.header('range');
  const providerInfo = getTtsProviderInfo(c.env);

  // Range 요청이면 R2 range 옵션 사용
  let r2obj: R2ObjectBody | null;
  if (rangeHeader) {
    // 먼저 HEAD로 크기 조회
    let head = await c.env.ASSETS.head(key);
    if (shouldRegenerateGeneratedAudio(key, head, providerInfo)) {
      await generateAudioObject(c, key);
      head = await c.env.ASSETS.head(key);
    }
    if (!head) return notFound(c, `오디오 파일을 찾을 수 없습니다: ${key}`);

    const totalSize = head.size;
    const range = parseRange(rangeHeader, totalSize);
    if (!range) {
      return c.text('Range Not Satisfiable', 416, {
        'Content-Range': `bytes */${totalSize}`,
      });
    }

    r2obj = await c.env.ASSETS.get(key, {
      range: { offset: range.start, length: range.end - range.start + 1 },
    });
    if (!r2obj) return notFound(c, `오디오 파일을 찾을 수 없습니다: ${key}`);

    const length = range.end - range.start + 1;
    const etag = r2obj.httpEtag ?? head.httpEtag;
    const lastModified = (r2obj.uploaded ?? head.uploaded).toUTCString();

    return new Response(r2obj.body as ReadableStream, {
      status: 206,
      headers: {
        'Content-Type': r2obj.httpMetadata?.contentType ?? 'audio/mpeg',
        'Content-Range': `bytes ${range.start}-${range.end}/${totalSize}`,
        'Content-Length': String(length),
        'Accept-Ranges': 'bytes',
        'Cache-Control': CACHE_CONTROL,
        'ETag': etag,
        'Last-Modified': lastModified,
      },
    });
  }

  // ── 일반 요청 (전체 파일) ─────────────────
  r2obj = await c.env.ASSETS.get(key);
  if (!r2obj || shouldRegenerateGeneratedAudio(key, r2obj, providerInfo)) {
    try {
      r2obj = await generateAudioObject(c, key);
    } catch (err) {
      console.error('[audio/on-demand]', err);
      return notFound(c, `오디오 파일을 아직 생성할 수 없습니다: ${key}`);
    }
  }
  if (!r2obj) return notFound(c, `오디오 파일을 찾을 수 없습니다: ${key}`);

  const etag = r2obj.httpEtag;
  const lastModified = r2obj.uploaded.toUTCString();

  // ETag / If-None-Match 조건부 요청
  const ifNoneMatch = c.req.header('if-none-match');
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        'ETag': etag,
        'Cache-Control': CACHE_CONTROL,
      },
    });
  }

  return new Response(r2obj.body as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': r2obj.httpMetadata?.contentType ?? 'audio/mpeg',
      'Content-Length': String(r2obj.size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': CACHE_CONTROL,
      'ETag': etag,
      'Last-Modified': lastModified,
    },
  });
});

// ── HEAD /audio/:key ──────────────────────────
audio.on('HEAD', '/audio/:key{.+}', async (c) => {
  const key = c.req.param('key');
  if (!key) return badRequest(c, '오디오 키가 없습니다');

  const head = await c.env.ASSETS.head(key);
  if (!head) return notFound(c, `오디오 파일을 찾을 수 없습니다: ${key}`);

  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': head.httpMetadata?.contentType ?? 'audio/mpeg',
      'Content-Length': String(head.size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': CACHE_CONTROL,
      'ETag': head.httpEtag,
      'Last-Modified': head.uploaded.toUTCString(),
    },
  });
});

export { audio };
