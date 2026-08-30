import assert from 'node:assert/strict';
import test from 'node:test';

import { R2_PRONUNCIATION_REFERENCE_QUERIES } from './verify-audio-r2.js';

test('R2 absence verifier covers every legacy pronunciation reference surface', () => {
  const references = [
    'vocab.audio_r2_key',
    'kanji.audio_r2_key',
    'sentences.audio_r2_key',
    'reading_passages.audio_r2_key',
    'audio_generation_log.r2_key',
    'topik_placement_questions.audio_r2_key',
    'topik_practice_questions.audio_r2_key',
    'content_source_assets.r2_fields',
    'content_audio_bindings.asset_id',
  ];
  assert.deepEqual(R2_PRONUNCIATION_REFERENCE_QUERIES.map(({ source }) => source), references);
  assert.equal(new Set(R2_PRONUNCIATION_REFERENCE_QUERIES.map(({ sql }) => sql)).size, references.length);

  const sql = R2_PRONUNCIATION_REFERENCE_QUERIES.map(({ sql: statement }) => statement).join('\n');
  assert.match(sql, /immutable_r2_key IS NOT NULL/u);
  assert.match(sql, /stored_audio_bytes_sha256 IS NOT NULL/u);
  assert.match(sql, /binding_state = 'r2-ready'/u);
  assert.doesNotMatch(sql, /UNION/u);
});
