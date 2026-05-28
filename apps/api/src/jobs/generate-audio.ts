/**
 * apps/api/src/jobs/generate-audio.ts
 *
 * Phase 8-A: TTS 오디오 자동 생성 파이프라인
 *
 * Cron: 매일 03:00 UTC ("0 3 * * *" in wrangler.toml)
 *
 * 처리 흐름:
 *   1. D1에서 audio_r2_key IS NULL 인 항목 최대 50개 조회 (우선순위 순)
 *   2. TTS 어댑터로 MP3 생성
 *   3. R2에 저장 (키: audio/{type}/{level}/{id}.mp3)
 *   4. D1 audio_r2_key 업데이트
 *
 * 단가 보호:
 *   - 1회 실행: 최대 50개 (BATCH_SIZE)
 *   - 일일 한도: 500개 (DAILY_LIMIT)
 *   - 3회 실패 카드는 audio_generation_attempts = 99로 스킵 처리
 *
 * 우선순위:
 *   P1 sentences (1,100개)
 *   P2 vocab N3 (1,500개)
 *   P3 vocab N4/N5
 *   P4 kanji 音読み
 */
import type { Env } from '../types.js';
import { createTtsAdapter } from '../lib/tts/index.js';

const BATCH_SIZE  = 50;
const DAILY_LIMIT = 500;
const MAX_RETRIES = 3;

interface AudioTask {
  id:       number;
  type:     'sentence' | 'vocab' | 'kanji';
  text:     string;
  level:    string;
  attempts: number;
}

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
): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO audio_generation_log
         (item_type, item_id, r2_key, success, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
    )
    .bind(task.type, task.id, r2Key, success ? 1 : 0)
    .run();
}

/** 오디오 생성 잡 메인 함수 */
export async function runAudioGeneration(env: Env): Promise<{ processed: number; skipped: number }> {
  const db  = env.DB;
  const r2  = env.ASSETS;
  const tts = createTtsAdapter(env);

  // 일일 한도 체크
  const dailyCount = await getDailyCount(db).catch(() => 0);
  if (dailyCount >= DAILY_LIMIT) {
    console.log(`[audio-gen] 일일 한도 초과 (${dailyCount}/${DAILY_LIMIT}) → 종료`);
    return { processed: 0, skipped: 0 };
  }

  const remaining = Math.min(BATCH_SIZE, DAILY_LIMIT - dailyCount);

  // ── 우선순위별 미생성 항목 조회 ─────────────────────────────────
  // P1: sentences
  const sentenceRows = await db
    .prepare(
      `SELECT id, 'sentence' AS type, ja AS text, level,
              COALESCE(audio_generation_attempts, 0) AS attempts
       FROM sentences
       WHERE audio_r2_key IS NULL
         AND COALESCE(audio_generation_attempts, 0) < ?
       ORDER BY id
       LIMIT ?`,
    )
    .bind(MAX_RETRIES, remaining)
    .all<AudioTask>();

  // P2: vocab N3
  const vocabN3Rows = await db
    .prepare(
      `SELECT id, 'vocab' AS type, ja AS text, level,
              COALESCE(audio_generation_attempts, 0) AS attempts
       FROM vocab
       WHERE audio_r2_key IS NULL
         AND level = 'N3'
         AND COALESCE(audio_generation_attempts, 0) < ?
       ORDER BY id
       LIMIT ?`,
    )
    .bind(MAX_RETRIES, remaining)
    .all<AudioTask>();

  // P3: vocab N4/N5
  const vocabRestRows = await db
    .prepare(
      `SELECT id, 'vocab' AS type, ja AS text, level,
              COALESCE(audio_generation_attempts, 0) AS attempts
       FROM vocab
       WHERE audio_r2_key IS NULL
         AND level IN ('N4', 'N5')
         AND COALESCE(audio_generation_attempts, 0) < ?
       ORDER BY id
       LIMIT ?`,
    )
    .bind(MAX_RETRIES, remaining)
    .all<AudioTask>();

  // P4: kanji (音読み)
  const kanjiRows = await db
    .prepare(
      `SELECT id, 'kanji' AS type, COALESCE(on_yomi, kun_yomi, char) AS text, jlpt_level AS level,
              COALESCE(audio_generation_attempts, 0) AS attempts
       FROM kanji
       WHERE audio_r2_key IS NULL
         AND COALESCE(on_yomi, kun_yomi, char) IS NOT NULL
         AND COALESCE(audio_generation_attempts, 0) < ?
       ORDER BY id
       LIMIT ?`,
    )
    .bind(MAX_RETRIES, remaining)
    .all<AudioTask>();

  // 우선순위 병합 (총 remaining 개 이내)
  const allTasks: AudioTask[] = [
    ...(sentenceRows.results ?? []),
    ...(vocabN3Rows.results ?? []),
    ...(vocabRestRows.results ?? []),
    ...(kanjiRows.results ?? []),
  ].slice(0, remaining);

  let processed = 0;
  let skipped   = 0;

  for (const task of allTasks) {
    if (!task.text?.trim()) { skipped++; continue; }

    const r2Key = `audio/${task.type}/${task.level.toLowerCase()}/${task.id}.mp3`;

    // 이미 R2에 있으면 DB만 업데이트
    const existing = await r2.head(r2Key).catch(() => null);
    if (existing) {
      await updateR2Key(db, task, r2Key);
      processed++;
      continue;
    }

    try {
      const audioBuffer = await tts.generateAudio({ text: task.text, lang: 'ja' });

      await r2.put(r2Key, audioBuffer, {
        httpMetadata: {
          contentType: 'audio/mpeg',
          cacheControl: 'public, max-age=2592000, immutable',
        },
        customMetadata: {
          itemType:  task.type,
          itemId:    String(task.id),
          level:     task.level,
          createdAt: new Date().toISOString(),
        },
      });

      await updateR2Key(db, task, r2Key);
      await logGeneration(db, task, true, r2Key);
      processed++;
      console.log(`[audio-gen] ✓ ${task.type}#${task.id} → ${r2Key}`);
    } catch (err) {
      console.error(`[audio-gen] ✗ ${task.type}#${task.id}`, err);
      await incrementAttempts(db, task);
      await logGeneration(db, task, false, null);
      skipped++;
    }
  }

  console.log(`[audio-gen] 완료: 생성=${processed} 스킵=${skipped}`);
  return { processed, skipped };
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
