import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildN1Batch1Plan,
  N1_BATCH_1_KANJI,
  N1_BATCH_1_PATH,
  N1_BATCH_1_SOURCE_ASSET_ID,
  n1Batch1ContentRowsSql,
} from '../seed/n1-batch1.js';

test('N1 Batch 1 adds self-authored high-level learning data without official exam material', () => {
  const plan = buildN1Batch1Plan();
  assert.deepEqual(plan.manifest.counts, {
    categories: 6,
    vocab: 40,
    grammar: 8,
    kanji: 12,
    sentences: 18,
    reading: 3,
    readingQuestions: 6,
    stableRefs: 81,
    audioBindings: 73,
    contentRows: 87,
  });
  assert.match(plan.manifest.sourceSha256, /^[a-f0-9]{64}$/);

  const source = fs.readFileSync(N1_BATCH_1_PATH, 'utf8');
  assert.match(source, /공식 JLPT 문항·정답·지문·음원을 포함하거나 변형하지 않습니다/);
  assert.doesNotMatch(source, /기출|official JLPT question/i);

  const sql = plan.statements.join('\n');
  assert.match(sql, new RegExp(N1_BATCH_1_SOURCE_ASSET_ID));
  assert.match(sql, /learning_content_stable_refs/);
  assert.match(sql, /content_audio_bindings/);
  assert.match(sql, /Browser Google Japanese speech/);
  assert.doesNotMatch(sql, /content_releases|content_release_sources|first_reviewer|second_reviewer/i);
  assert.match(n1Batch1ContentRowsSql(), /reading_questions/);
  for (const char of N1_BATCH_1_KANJI) assert.match(sql, new RegExp(`'${char}'`));
});
