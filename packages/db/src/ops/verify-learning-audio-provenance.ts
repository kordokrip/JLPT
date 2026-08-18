/**
 * Local verifier for the Google-only pronunciation contract. It never invokes
 * a TTS provider or R2.
 */
import { countSqlBatch, parseD1Target } from '../seed/d1-cli.js';

const target = parseD1Target();
if (target.remote) throw new Error('Audio provenance validation is local-only in this phase. Pass --local.');

const checks = [
  {
    name: 'no active legacy R2 pronunciation bindings remain',
    sql: `SELECT count(*) AS count
      FROM content_audio_bindings
      WHERE binding_state = 'r2-ready' OR asset_id IS NOT NULL`,
  },
  {
    name: 'speech bindings are Google browser only with valid state metadata',
    sql: `SELECT count(*) AS count FROM content_speech_bindings b
      WHERE b.provider <> 'google-browser'
         OR (b.binding_state = 'ready' AND b.unavailable_reason IS NOT NULL)
         OR (b.binding_state = 'unavailable' AND length(trim(COALESCE(b.unavailable_reason, ''))) = 0)`,
  },
  {
    name: 'no R2 pronunciation asset metadata remains',
    sql: `SELECT count(*) AS count FROM content_source_assets
      WHERE asset_kind IN ('licensed-web-audio', 'tts-generated')
         OR immutable_r2_key IS NOT NULL
         OR stored_audio_bytes_sha256 IS NOT NULL`,
  },
  {
    name: 'TOPIK 1-6 spoken items have a stable ref and matching Google speech binding',
    sql: `SELECT count(*) AS count
      FROM topik_owner_authored_curriculum_items i
      WHERE i.target_grade BETWEEN 1 AND 6 AND i.audio_required = 1
        AND NOT EXISTS (
          SELECT 1 FROM learning_content_stable_refs r
          JOIN content_speech_bindings b ON b.stable_ref = r.stable_ref
          WHERE r.learning_track = 'topik-ko'
            AND r.item_type = 'topik-owner-item'
            AND r.item_id = i.id
            AND b.item_type = 'topik-owner-item'
            AND b.item_id = i.id
            AND b.language = 'ko'
            AND b.speech_role = CASE WHEN i.item_type = 'listening' THEN 'listening' ELSE 'pronunciation' END
            AND b.provider = 'google-browser' AND b.binding_state = 'ready'
        )`,
  },
  {
    name: 'TOPIK owner curriculum has no public-review fields',
    sql: `SELECT count(*) AS count FROM pragma_table_info('topik_owner_authored_curriculum_items')
      WHERE lower(name) LIKE '%reviewer%' OR lower(name) LIKE '%reviewed%' OR lower(name) = 'release_id'`,
  },
  {
    name: 'speech binding identity remains anchored to the stable ref',
    sql: `SELECT count(*) AS count FROM content_speech_bindings b
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
