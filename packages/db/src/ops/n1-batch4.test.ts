import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildN1Batch4Plan,
  N1_BATCH_4_KANJI,
  N1_BATCH_4_PATH,
  N1_BATCH_4_SOURCE_ASSET_ID,
  n1Batch4ContentRowsSql,
} from '../seed/n1-batch4.js';

test('N1 Batch 4 adds self-authored academic argument, policy, and browser-speech critical-reading practice', () => {
  const plan = buildN1Batch4Plan();
  assert.deepEqual(plan.manifest.counts, {
    categories: 4, vocab: 24, grammar: 6, kanji: 10, sentences: 12,
    reading: 3, readingQuestions: 6, stableRefs: 55, audioBindings: 49, contentRows: 61,
  });
  const source = fs.readFileSync(N1_BATCH_4_PATH, 'utf8');
  assert.match(source, /공식 JLPT 문항.*포함하거나 변형하지 않습니다/u);
  assert.match(source, /Google 음성을 우선.*R2 발음 저장.*fallback은 사용하지 않/u);
  const sql = plan.statements.join('\n');
  assert.match(sql, new RegExp(N1_BATCH_4_SOURCE_ASSET_ID));
  assert.match(sql, /content_speech_bindings/);
  assert.match(sql, /'google-browser', 'ready'/);
  assert.match(sql, /learning_content_stable_refs/);
  assert.match(sql, /content_speech_bindings/);
  assert.doesNotMatch(sql, /content_releases|content_release_sources|first_reviewer|second_reviewer/i);
  assert.match(n1Batch4ContentRowsSql(), /reading_questions/);
  for (const char of N1_BATCH_4_KANJI) assert.match(sql, new RegExp(`'${char}'`));
});
