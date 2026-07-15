/**
 * apps/api/src/jobs/generate-audio.ts
 *
 * Phase 8-A: TTS 오디오 자동 생성 파이프라인
 *
 * Cron: 매일 03:00 UTC ("0 3 * * *" in wrangler.toml)
 *
 * 처리 흐름:
 *   1. D1에서 승인 provider 성공 로그와 현재 key가 일치하지 않는 항목을 조회
 *   2. TTS 어댑터로 오디오 생성
 *   3. R2에 저장 (불변 키: audio/{type}/{level}/{id}-{contentHash}.{ext})
 *   4. D1 audio_r2_key 업데이트
 *
 * 단가 보호:
 *   - 1회 실행: 최대 50개 (BATCH_SIZE)
 *   - 일일 한도: 500개 (DAILY_LIMIT)
 *   - 같은 provider에서 3회 실패한 항목은 별도 검토 전까지 스킵
 *
 * 실행 순서:
 *   N5 -> N4 -> N3 level을 관리자 승인 단위로 분리
 *   각 level 안에서는 sentence -> vocab -> kanji
 */
import type { Env } from '../types.js';
import { createTtsAdapter, getTtsProviderInfo, type TtsProviderId } from '../lib/tts/index.js';
import { safeErrorName } from '../lib/safe-log.js';

const BATCH_SIZE  = 50;
const DAILY_LIMIT = 500;
const MAX_RETRIES = 3;

function detectAudioContentType(buffer: ArrayBuffer): 'audio/mpeg' | 'audio/wav' {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  const ascii = String.fromCharCode(...bytes);
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE') return 'audio/wav';
  return 'audio/mpeg';
}

interface AudioTask {
  id:       number;
  type:     'sentence' | 'vocab' | 'kanji';
  text:     string;
  level:    string;
  attempts: number;
  audio_r2_key: string | null;
}

export interface AudioGenerationOptions {
  provider?: Extract<TtsProviderId, 'cloudflare' | 'google' | 'voicevox'>;
  batchSize?: number;
  forceRegenerate?: boolean;
  level?: AudioBatchLevel;
}

export const AUDIO_BATCH_LEVELS = ['N5', 'N4', 'N3'] as const;
export type AudioBatchLevel = (typeof AUDIO_BATCH_LEVELS)[number];

/** 일일 생성 건수 조회 (R2 기반 카운터 대신 D1 review_logs 테이블 활용) */
async function getDailyCount(db: D1Database): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM audio_generation_log
       WHERE created_at >= ? AND success = 1`,
    )
    .bind(`${today}T00:00:00Z`)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

/** 생성 로그 기록 */
async function logGeneration(
  db: D1Database,
  task: AudioTask,
  success: boolean,
  r2Key: string | null,
  provider: string,
  contentHash: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO audio_generation_log
         (item_type, item_id, r2_key, success, provider, content_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .bind(task.type, task.id, r2Key, success ? 1 : 0, provider, contentHash)
    .run();
}

/** 오디오 생성 잡 메인 함수 */
export async function runAudioGeneration(
  env: Env,
  options: AudioGenerationOptions = {},
): Promise<{ processed: number; skipped: number }> {
  const db  = env.DB;
  const r2  = env.ASSETS;
  const tts = createTtsAdapter(env, options.provider);
  const providerInfo = getTtsProviderInfo(env, options.provider);
  const batchSize = clampInt(options.batchSize ?? BATCH_SIZE, 1, 200);
  if (options.forceRegenerate) {
    throw new Error('immutable 오디오는 덮어쓸 수 없습니다. 재생성하려면 audioVersion을 올리십시오.');
  }

  // 일일 한도 체크
  const dailyCount = await getDailyCount(db).catch(() => 0);
  if (dailyCount >= DAILY_LIMIT) {
    console.log({ event: 'audio_generation_limit_reached', generated_today: dailyCount, daily_limit: DAILY_LIMIT });
    return { processed: 0, skipped: 0 };
  }

  const remaining = Math.min(batchSize, DAILY_LIMIT - dailyCount);
  const levels = options.level ? [options.level] : [...AUDIO_BATCH_LEVELS];
  const sentenceRows = await loadAudioTasks(db, {
    table: 'sentences',
    type: 'sentence',
    textExpression: 'item.ja',
    levelColumn: 'item.level',
    levels,
    provider: providerInfo.provider,
    limit: remaining,
  });
  const vocabRows = await loadAudioTasks(db, {
    table: 'vocab',
    type: 'vocab',
    textExpression: 'item.ja',
    levelColumn: 'item.level',
    levels,
    provider: providerInfo.provider,
    limit: remaining,
  });
  const kanjiRows = await loadAudioTasks(db, {
    table: 'kanji',
    type: 'kanji',
    textExpression: 'COALESCE(item.on_yomi, item.kun_yomi, item.char)',
    levelColumn: 'item.jlpt_level',
    levels,
    provider: providerInfo.provider,
    limit: remaining,
  });

  const allTasks: AudioTask[] = [
    ...(sentenceRows.results ?? []),
    ...(vocabRows.results ?? []),
    ...(kanjiRows.results ?? []),
  ].slice(0, remaining);

  let processed = 0;
  let skipped   = 0;

  for (const task of allTasks) {
    if (!task.text?.trim()) { skipped++; continue; }

    const contentHash = await audioContentHash(task.text, providerInfo);
    const r2Key = await buildImmutableAudioKey(task, providerInfo, contentHash);

    // 이미 R2에 있으면 DB만 업데이트
    const existing = await r2.head(r2Key).catch(() => null);
    if (existing && isCurrentAudio(existing, providerInfo, task, contentHash)) {
      await updateR2Key(db, task, r2Key);
      await logGeneration(db, task, true, r2Key, providerInfo.provider, contentHash);
      processed++;
      continue;
    }
    if (existing) {
      console.error({
        event: 'audio_generation_immutable_collision',
        item_type: task.type,
        item_id: task.id,
      });
      await logGeneration(db, task, false, null, providerInfo.provider, contentHash);
      skipped++;
      continue;
    }

    try {
      const audioBuffer = await tts.generateAudio({ text: task.text, lang: 'ja' });
      const contentType = detectAudioContentType(audioBuffer);

      const stored = await r2.put(r2Key, audioBuffer, {
        onlyIf: new Headers({ 'If-None-Match': '*' }),
        httpMetadata: {
          contentType,
          cacheControl: 'public, max-age=2592000, immutable',
        },
        customMetadata: {
          itemType:  task.type,
          itemId:    String(task.id),
          level:     task.level,
          source:    'batch',
          provider:  providerInfo.provider,
          model:     providerInfo.model,
          lang:      'ja',
          audioVersion: providerInfo.audioVersion,
          contentHash,
          contentType,
          createdAt: new Date().toISOString(),
        },
      });
      if (!stored) throw new Error('immutable R2 key가 동시에 생성되어 쓰기를 중단했습니다');

      await updateR2Key(db, task, r2Key);
      await logGeneration(db, task, true, r2Key, providerInfo.provider, contentHash);
      processed++;
      console.log({ event: 'audio_generation_succeeded', item_type: task.type, item_id: task.id });
    } catch (err) {
      console.error({
        event: 'audio_generation_failed',
        item_type: task.type,
        item_id: task.id,
        error_name: safeErrorName(err),
      });
      await incrementAttempts(db, task);
      await logGeneration(db, task, false, null, providerInfo.provider, contentHash);
      skipped++;
    }
  }

  console.log({
    event: 'audio_generation_completed',
    provider: providerInfo.provider,
    force_regenerate: false,
    level: options.level ?? 'all',
    processed,
    skipped,
  });
  return { processed, skipped };
}

export async function audioContentHash(
  text: string,
  providerInfo: ReturnType<typeof getTtsProviderInfo>,
): Promise<string> {
  const payload = `${text.normalize('NFC')}\n${providerInfo.provider}\n${providerInfo.model}\n${providerInfo.audioVersion}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function buildImmutableAudioKey(
  task: Pick<AudioTask, 'id' | 'type' | 'level' | 'text'>,
  providerInfo: ReturnType<typeof getTtsProviderInfo>,
  knownHash?: string,
): Promise<string> {
  const contentHash = knownHash ?? await audioContentHash(task.text, providerInfo);
  const extension = providerInfo.provider === 'voicevox' ? 'wav' : 'mp3';
  return `audio/${task.type}/${task.level.toLowerCase()}/${task.id}-${contentHash.slice(0, 16)}.${extension}`;
}

function isCurrentAudio(
  object: Pick<R2Object, 'customMetadata'>,
  providerInfo: ReturnType<typeof getTtsProviderInfo>,
  task: AudioTask,
  contentHash: string,
): boolean {
  const meta = object.customMetadata;
  return meta?.provider === providerInfo.provider &&
    meta.model === providerInfo.model &&
    meta.audioVersion === providerInfo.audioVersion &&
    meta.contentHash === contentHash &&
    meta.itemType === task.type &&
    meta.itemId === String(task.id) &&
    meta.level === task.level;
}

async function loadAudioTasks(
  db: D1Database,
  options: {
    table: 'sentences' | 'vocab' | 'kanji';
    type: AudioTask['type'];
    textExpression: string;
    levelColumn: string;
    levels: AudioBatchLevel[];
    provider: string;
    limit: number;
  },
): Promise<D1Result<AudioTask>> {
  const placeholders = options.levels.map(() => '?').join(', ');
  const sql = `
    SELECT item.id, '${options.type}' AS type, ${options.textExpression} AS text,
           ${options.levelColumn} AS level, item.audio_r2_key,
           COALESCE(item.audio_generation_attempts, 0) AS attempts
    FROM ${options.table} AS item
    WHERE ${options.levelColumn} IN (${placeholders})
      AND ${options.textExpression} IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM audio_generation_log AS success_log
        WHERE success_log.item_type = ?
          AND success_log.item_id = item.id
          AND success_log.provider = ?
          AND success_log.success = 1
          AND success_log.r2_key = item.audio_r2_key
      )
      AND (
        SELECT COUNT(*)
        FROM audio_generation_log AS failure_log
        WHERE failure_log.item_type = ?
          AND failure_log.item_id = item.id
          AND failure_log.provider = ?
          AND failure_log.success = 0
      ) < ?
    ORDER BY CASE ${options.levelColumn} WHEN 'N5' THEN 1 WHEN 'N4' THEN 2 ELSE 3 END, item.id
    LIMIT ?`;
  return db.prepare(sql)
    .bind(
      ...options.levels,
      options.type,
      options.provider,
      options.type,
      options.provider,
      MAX_RETRIES,
      options.limit,
    )
    .all<AudioTask>();
}

async function updateR2Key(db: D1Database, task: AudioTask, r2Key: string): Promise<void> {
  const table = task.type === 'sentence' ? 'sentences' : task.type === 'vocab' ? 'vocab' : 'kanji';
  await db
    .prepare(`UPDATE ${table} SET audio_r2_key = ? WHERE id = ?`)
    .bind(r2Key, task.id)
    .run();
}

async function incrementAttempts(db: D1Database, task: AudioTask): Promise<void> {
  const table = task.type === 'sentence' ? 'sentences' : task.type === 'vocab' ? 'vocab' : 'kanji';
  await db
    .prepare(
      `UPDATE ${table}
       SET audio_generation_attempts = COALESCE(audio_generation_attempts, 0) + 1
       WHERE id = ?`,
    )
    .bind(task.id)
    .run();
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}
