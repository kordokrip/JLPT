/**
 * Local D1 verifier for the provenance contract. It deliberately does not HEAD
 * R2 or invoke a TTS provider; remote object verification remains a separately
 * approved operation.
 */
import { countSqlBatch, parseD1Target } from '../seed/d1-cli.js';

const target = parseD1Target();
if (target.remote) throw new Error('Audio provenance validation is local-only in this phase. Pass --local.');

const checks = [
  {
    name: 'all r2-ready bindings have a private immutable audio asset',
    sql: `SELECT count(*) AS count
      FROM content_audio_bindings b
      LEFT JOIN content_source_assets a ON a.id = b.asset_id
      WHERE b.binding_state = 'r2-ready' AND (
        a.id IS NULL OR a.asset_kind NOT IN ('licensed-web-audio', 'tts-generated')
        OR a.immutable_r2_key IS NULL OR a.stored_audio_bytes_sha256 IS NULL
        OR length(trim(a.source_url)) = 0 OR length(trim(a.license_id)) = 0
        OR length(trim(a.license_url)) = 0 OR length(trim(a.allowed_use)) = 0
      )`,
  },
  {
    name: 'prepared bindings without an activation disclose why durable R2 audio is not ready',
    sql: `SELECT count(*) AS count FROM content_audio_bindings b
      LEFT JOIN content_audio_binding_activations activated ON activated.binding_id = b.id
      WHERE b.binding_state IN ('preparing', 'not-provided')
        AND activated.id IS NULL
        AND (b.asset_id IS NOT NULL OR length(trim(COALESCE(b.unavailable_reason, ''))) = 0)`,
  },
  {
    name: 'audio activations point to a complete immutable playable asset',
    sql: `SELECT count(*) AS count FROM content_audio_binding_activations activated
      JOIN content_audio_bindings b ON b.id = activated.binding_id
      LEFT JOIN content_source_assets a ON a.id = activated.asset_id
      WHERE b.binding_state NOT IN ('preparing', 'r2-ready')
        OR a.id IS NULL OR a.asset_kind NOT IN ('licensed-web-audio', 'tts-generated')
        OR a.immutable_r2_key IS NULL OR a.stored_audio_bytes_sha256 IS NULL
        OR length(trim(COALESCE(a.provider, ''))) = 0
        OR length(trim(COALESCE(a.model, ''))) = 0
        OR length(trim(COALESCE(a.language, ''))) = 0
        OR length(trim(COALESCE(a.voice, ''))) = 0
        OR a.input_text_sha256 IS NULL`,
  },
  {
    name: 'TTS assets carry provider, version, voice, input hash, and selection reason',
    sql: `SELECT count(*) AS count FROM content_source_assets
      WHERE asset_kind = 'tts-generated' AND (
        generated_at IS NULL OR immutable_r2_key IS NULL OR stored_audio_bytes_sha256 IS NULL
        OR length(trim(COALESCE(provider, ''))) = 0 OR length(trim(COALESCE(model, ''))) = 0
        OR length(trim(COALESCE(language, ''))) = 0 OR length(trim(COALESCE(voice, ''))) = 0
        OR length(trim(COALESCE(provider_version, ''))) = 0 OR input_text_sha256 IS NULL
        OR length(trim(COALESCE(selection_reason, ''))) = 0
      )`,
  },
  {
    name: 'TOPIK 1-6 required listening and vocabulary-pronunciation items have a stable ref and matching audio binding',
    sql: `SELECT count(*) AS count
      FROM topik_owner_authored_curriculum_items i
      WHERE i.target_grade BETWEEN 1 AND 6 AND i.audio_required = 1
        AND NOT EXISTS (
          SELECT 1 FROM learning_content_stable_refs r
          JOIN content_audio_bindings b ON b.stable_ref = r.stable_ref
          WHERE r.learning_track = 'topik-ko'
            AND r.item_type = 'topik-owner-item'
            AND r.item_id = i.id
            AND b.item_type = 'topik-owner-item'
            AND b.item_id = i.id
            AND b.language = 'ko'
            AND b.audio_role = CASE WHEN i.item_type = 'listening' THEN 'listening' ELSE 'pronunciation' END
        )`,
  },
  {
    name: 'TOPIK owner curriculum has no public-review fields',
    sql: `SELECT count(*) AS count FROM pragma_table_info('topik_owner_authored_curriculum_items')
      WHERE lower(name) LIKE '%reviewer%' OR lower(name) LIKE '%reviewed%' OR lower(name) = 'release_id'`,
  },
  {
    name: 'binding identity remains anchored to the stable ref',
    sql: `SELECT count(*) AS count FROM content_audio_bindings b
      LEFT JOIN learning_content_stable_refs r ON r.stable_ref = b.stable_ref
      WHERE r.stable_ref IS NULL OR r.item_type <> b.item_type OR r.item_id <> b.item_id`,
  },
] as const;

const counts = countSqlBatch(target, checks.map((check) => check.sql));
const failures = checks.flatMap((check, index) => {
  const count = counts[index] ?? Number.NaN;
  console.log(`${count === 0 ? 'OK  ' : 'FAIL'} ${check.name} count=${count}`);
  return count === 0 ? [] : [{ ...check, count }];
});

if (failures.length > 0) process.exit(1);
