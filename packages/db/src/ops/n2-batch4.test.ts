import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildN2Batch4Plan,
  N2_BATCH_4_KANJI,
  N2_BATCH_4_PATH,
  N2_BATCH_4_SOURCE_ASSET_ID,
  n2Batch4ContentRowsSql,
} from '../seed/n2-batch4.js';

test('N2 Batch 4 adds a self-authored digital-service and Google-only operations unit', () => {
  const plan = buildN2Batch4Plan();
  assert.deepEqual(plan.manifest.counts, {
    categories: 4, vocab: 24, grammar: 6, kanji: 9, sentences: 8,
    reading: 2, readingQuestions: 2, stableRefs: 49, audioBindings: 43, contentRows: 51,
  });
  const source = fs.readFileSync(N2_BATCH_4_PATH, 'utf8');
  assert.match(source, /공식 JLPT 문항.*포함하거나 변형하지 않습니다/u);
  assert.match(source, /Google 일본어 음성이 있으면 즉시 재생한다/);
  const sql = plan.statements.join('\n');
  assert.match(sql, new RegExp(N2_BATCH_4_SOURCE_ASSET_ID));
  assert.match(sql, /Google browser speech only/i);
  assert.match(sql, /learning_content_stable_refs/);
  assert.match(sql, /content_speech_bindings/);
  assert.doesNotMatch(sql, /content_releases|content_release_sources|first_reviewer|second_reviewer/i);
  assert.match(n2Batch4ContentRowsSql(), /reading_questions/);
  for (const char of N2_BATCH_4_KANJI) assert.match(sql, new RegExp(`'${char}'`));
});
