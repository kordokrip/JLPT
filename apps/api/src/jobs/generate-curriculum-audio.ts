/**
 * Generates durable R2 audio for the immutable curriculum-binding contract.
 *
 * A binding itself is evidence and intentionally cannot be changed.  This job
 * appends an immutable asset and an immutable activation after the R2 write
 * succeeds.  It is deliberately small-batch and Google Cloud TTS only: that
 * is the voice source selected for this personal learning app.
 */
import type { Env } from '../types.js';
import { createTtsAdapter, getTtsProviderInfo } from '../lib/tts/index.js';
import { safeErrorName } from '../lib/safe-log.js';

const PROVIDER = 'google' as const;
const MAX_BATCH_SIZE = 20;
const MAX_TEXT_LENGTH = 4_500;

export type CurriculumAudioTrack = 'jlpt-ja' | 'topik-ko';

type CurriculumAudioTask = {
  binding_id: string;
  stable_ref: string;
  item_type: 'jlpt-vocab' | 'jlpt-kanji' | 'jlpt-sentence' | 'jlpt-reading' | 'topik-owner-item';
  item_id: string;
  language: 'ja' | 'ko';
  audio_role: 'pronunciation' | 'listening';
  learning_track: CurriculumAudioTrack;
  level_tag: string;
  speech_text: string | null;
};

export interface CurriculumAudioGenerationOptions {
  batchSize?: number;
  track?: CurriculumAudioTrack;
}

export interface CurriculumAudioGenerationResult {
  processed: number;
  skipped: number;
  pending: number;
  track: CurriculumAudioTrack | 'all';
  provider: typeof PROVIDER;
}

export interface CurriculumAudioQueueStats {
  track: CurriculumAudioTrack;
  language: 'ja' | 'ko';
  role: 'pronunciation' | 'listening';
  pending: number;
}

function clampBatchSize(value: number | undefined): number {
  if (!Number.isFinite(value)) return MAX_BATCH_SIZE;
  return Math.max(1, Math.min(MAX_BATCH_SIZE, Math.trunc(value ?? MAX_BATCH_SIZE)));
}

export async function sha256Hex(value: string | ArrayBuffer): Promise<string> {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function curriculumAudioTextHash(text: string): Promise<string> {
  return sha256Hex(text.normalize('NFC'));
}

export async function curriculumAudioContentHash(
  task: Pick<CurriculumAudioTask, 'binding_id' | 'speech_text'>,
  provider: { provider: string; model: string; audioVersion: string },
): Promise<string> {
  return sha256Hex([
    task.binding_id,
    task.speech_text?.normalize('NFC') ?? '',
    provider.provider,
    provider.model,
    provider.audioVersion,
  ].join('\n'));
}

export function buildCurriculumAudioKey(
  task: Pick<CurriculumAudioTask, 'binding_id' | 'language'>,
  contentHash: string,
): string {
  const safeBinding = task.binding_id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 96);
  return `private-audio/${task.language}/${safeBinding}/${contentHash}.mp3`;
}

function sourceUrl(): string {
  return 'https://cloud.google.com/text-to-speech/docs';
}

function termsUrl(): string {
  return 'https://cloud.google.com/terms/service-terms';
}

function voiceFor(language: CurriculumAudioTask['language']): string {
  return language === 'ja' ? 'ja-JP-Neural2-B' : 'ko-KR-Neural2-A';
}

async function loadTasks(
  db: D1Database,
  options: CurriculumAudioGenerationOptions,
): Promise<CurriculumAudioTask[]> {
  const limit = clampBatchSize(options.batchSize);
  const result = await db.prepare(`
    WITH pending AS (
      SELECT b.id AS binding_id, b.stable_ref, b.item_type, b.item_id, b.language, b.audio_role,
             r.learning_track, r.level_tag,
             CASE b.item_type
               WHEN 'jlpt-vocab' THEN v.ja
               WHEN 'jlpt-kanji' THEN COALESCE(k.on_yomi, k.kun_yomi, k.char)
               WHEN 'jlpt-sentence' THEN s.ja
               WHEN 'jlpt-reading' THEN p.body_ja
               WHEN 'topik-owner-item' THEN t.audio_text_ko
             END AS speech_text
        FROM content_audio_bindings b
        JOIN learning_content_stable_refs r ON r.stable_ref = b.stable_ref
        LEFT JOIN content_audio_binding_activations activated ON activated.binding_id = b.id
        LEFT JOIN vocab v ON b.item_type = 'jlpt-vocab' AND CAST(v.id AS TEXT) = b.item_id
        LEFT JOIN kanji k ON b.item_type = 'jlpt-kanji' AND CAST(k.id AS TEXT) = b.item_id
        LEFT JOIN sentences s ON b.item_type = 'jlpt-sentence' AND CAST(s.id AS TEXT) = b.item_id
        LEFT JOIN reading_passages p ON b.item_type = 'jlpt-reading' AND CAST(p.id AS TEXT) = b.item_id
        LEFT JOIN topik_owner_authored_curriculum_items t ON b.item_type = 'topik-owner-item' AND t.id = b.item_id
       WHERE b.binding_state = 'preparing'
         AND activated.id IS NULL
         AND (? IS NULL OR r.learning_track = ?)
    )
    SELECT * FROM pending
     WHERE speech_text IS NOT NULL
       AND length(trim(speech_text)) BETWEEN 1 AND ?
     ORDER BY CASE learning_track WHEN 'topik-ko' THEN 1 ELSE 2 END, level_tag, binding_id
     LIMIT ?
  `).bind(options.track ?? null, options.track ?? null, MAX_TEXT_LENGTH, limit).all<CurriculumAudioTask>();
  return result.results ?? [];
}

/** Safe, read-only queue summary for the admin dry-run endpoint. */
export async function getCurriculumAudioQueueStats(db: D1Database): Promise<CurriculumAudioQueueStats[]> {
  const result = await db.prepare(`
    SELECT r.learning_track AS track, b.language, b.audio_role AS role, COUNT(*) AS pending
      FROM content_audio_bindings b
      JOIN learning_content_stable_refs r ON r.stable_ref = b.stable_ref
      LEFT JOIN content_audio_binding_activations activated ON activated.binding_id = b.id
     WHERE b.binding_state = 'preparing' AND activated.id IS NULL
     GROUP BY r.learning_track, b.language, b.audio_role
     ORDER BY r.learning_track, b.language, b.audio_role
  `).all<CurriculumAudioQueueStats>();
  return result.results ?? [];
}

async function attachAsset(
  db: D1Database,
  task: CurriculumAudioTask,
  inputTextHash: string,
  contentHash: string,
  r2Key: string,
  bytesHash: string,
  provider: { model: string; audioVersion: string },
): Promise<void> {
  const assetId = `audio-asset:${task.binding_id}:${contentHash}`;
  const activationId = `audio-activation:${task.binding_id}:${contentHash}`;
  const generatedAt = Math.floor(Date.now() / 1000);
  const voice = voiceFor(task.language);
  const selectionReason = `Google Cloud Neural2 ${voice} is the durable R2 voice for this self-authored ${task.learning_track} personal-learning item.`;
  await db.batch([
    db.prepare(`
      INSERT OR IGNORE INTO content_source_assets (
        id, asset_kind, source_url, license_id, license_url, attribution_text, allowed_use,
        source_sha256, generated_at, stored_audio_bytes_sha256, immutable_r2_key, mime_type,
        provider, model, language, voice, provider_version, input_text_sha256, selection_reason
      ) VALUES (?, 'tts-generated', ?, 'LicenseRef-google-cloud-tts-output', ?, ?, ?, ?, ?, ?, ?,
                'audio/mpeg', 'google', ?, ?, ?, ?, ?, ?)
    `).bind(
      assetId,
      sourceUrl(),
      termsUrl(),
      `Google Cloud Text-to-Speech generated from the self-authored text for ${task.stable_ref}.`,
      'Private personal learning playback only; generated from self-authored curriculum text.',
      inputTextHash,
      generatedAt,
      bytesHash,
      r2Key,
      provider.model,
      task.language,
      voice,
      provider.audioVersion,
      inputTextHash,
      selectionReason,
    ),
    db.prepare(`
      INSERT OR IGNORE INTO content_audio_binding_activations
        (id, binding_id, asset_id, selection_reason)
      VALUES (?, ?, ?, ?)
    `).bind(activationId, task.binding_id, assetId, selectionReason),
  ]);
}

function isMatchingObject(
  object: Pick<R2Object, 'customMetadata'>,
  task: CurriculumAudioTask,
  contentHash: string,
): string | null {
  const metadata = object.customMetadata;
  if (metadata?.bindingId !== task.binding_id || metadata.contentHash !== contentHash || metadata.provider !== PROVIDER) return null;
  const bytesHash = metadata.bytesHash;
  return bytesHash && /^[a-f0-9]{64}$/.test(bytesHash) ? bytesHash : null;
}

/**
 * This function performs writes only when its caller has already checked the
 * admin approval token.  It never replaces an R2 object, asset, or activation.
 */
export async function runCurriculumAudioGeneration(
  env: Env,
  options: CurriculumAudioGenerationOptions = {},
): Promise<CurriculumAudioGenerationResult> {
  if (!env.GOOGLE_TTS_API_KEY?.trim()) throw new Error('GOOGLE_TTS_API_KEY 가 설정되지 않았습니다');

  const tasks = await loadTasks(env.DB, options);
  const tts = createTtsAdapter(env, PROVIDER);
  let processed = 0;
  let skipped = 0;

  for (const task of tasks) {
    const speechText = task.speech_text?.trim();
    if (!speechText) {
      skipped += 1;
      continue;
    }
    const provider = getTtsProviderInfo(env, PROVIDER, task.language);
    const contentHash = await curriculumAudioContentHash({ ...task, speech_text: speechText }, provider);
    const inputTextHash = await curriculumAudioTextHash(speechText);
    const r2Key = buildCurriculumAudioKey(task, contentHash);
    try {
      const existing = await env.ASSETS.head(r2Key);
      const existingBytesHash = existing ? isMatchingObject(existing, task, contentHash) : null;
      if (existing && !existingBytesHash) {
        console.error({ event: 'curriculum_audio_immutable_collision', binding_id: task.binding_id });
        skipped += 1;
        continue;
      }

      if (existingBytesHash) {
        await attachAsset(env.DB, task, inputTextHash, contentHash, r2Key, existingBytesHash, provider);
        processed += 1;
        continue;
      }

      const audio = await tts.generateAudio({ text: speechText, lang: task.language, voice: voiceFor(task.language) });
      const bytesHash = await sha256Hex(audio);
      const stored = await env.ASSETS.put(r2Key, audio, {
        onlyIf: new Headers({ 'If-None-Match': '*' }),
        httpMetadata: { contentType: 'audio/mpeg', cacheControl: 'private, no-store' },
        customMetadata: {
          bindingId: task.binding_id,
          stableRef: task.stable_ref,
          provider: PROVIDER,
          model: provider.model,
          audioVersion: provider.audioVersion,
          language: task.language,
          voice: voiceFor(task.language),
          contentHash,
          inputTextHash,
          bytesHash,
          createdAt: new Date().toISOString(),
        },
      });
      if (!stored) throw new Error('immutable curriculum audio key collision');
      await attachAsset(env.DB, task, inputTextHash, contentHash, r2Key, bytesHash, provider);
      processed += 1;
    } catch (error) {
      console.error({ event: 'curriculum_audio_generation_failed', binding_id: task.binding_id, error_name: safeErrorName(error) });
      skipped += 1;
    }
  }

  return {
    processed,
    skipped,
    pending: tasks.length - processed,
    track: options.track ?? 'all',
    provider: PROVIDER,
  };
}
