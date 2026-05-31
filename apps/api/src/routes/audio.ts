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
import { createTtsAdapter } from '../lib/tts/index.js';
import { CLOUDFLARE_MELOTTS_MODEL } from '../lib/tts/cloudflare-aura.js';
const audio = new Hono<AppEnv>();

const CACHE_CONTROL = 'public, max-age=2592000, immutable';
const GENERATED_AUDIO_VERSION = 'melotts-v2';

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
      provider: 'cloudflare',
      model: CLOUDFLARE_MELOTTS_MODEL,
      lang: 'ja',
      audioVersion: GENERATED_AUDIO_VERSION,
      contentType,
      createdAt: new Date().toISOString(),
    },
  });
  await updateAudioKey(c, parsed.kind, parsed.id, key);
  return c.env.ASSETS.get(key);
}

function shouldRegenerateGeneratedAudio(key: string, object: Pick<R2Object, 'customMetadata'> | null): boolean {
  if (!parseGeneratedAudioKey(key)) return false;
  if (!object) return true;
  const meta = object.customMetadata;
  return meta?.source === 'on-demand' && (
    meta.model !== CLOUDFLARE_MELOTTS_MODEL ||
    meta.audioVersion !== GENERATED_AUDIO_VERSION
  );
}

// ── GET /audio/:key ───────────────────────────
audio.get('/audio/:key{.+}', async (c) => {
  const key = c.req.param('key');
  if (!key) return badRequest(c, '오디오 키가 없습니다');

  const rangeHeader = c.req.header('range');

  // Range 요청이면 R2 range 옵션 사용
  let r2obj: R2ObjectBody | null;
  if (rangeHeader) {
    // 먼저 HEAD로 크기 조회
    let head = await c.env.ASSETS.head(key);
    if (shouldRegenerateGeneratedAudio(key, head)) {
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
  if (!r2obj || shouldRegenerateGeneratedAudio(key, r2obj)) {
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
