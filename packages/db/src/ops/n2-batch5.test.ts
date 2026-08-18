import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildN2Batch5Plan,
  N2_BATCH_5_KANJI,
  N2_BATCH_5_PATH,
  N2_BATCH_5_SOURCE_ASSET_ID,
  n2Batch5ContentRowsSql,
} from '../seed/n2-batch5.js';

test('N2 Batch 5 adds self-authored public-service and opinion-coordination density with Google-only speech', () => {
  const plan = buildN2Batch5Plan();
  assert.deepEqual(plan.manifest.counts, {
    categories: 5, vocab: 24, grammar: 6, kanji: 10, sentences: 12,
    reading: 3, readingQuestions: 6, stableRefs: 55, audioBindings: 49, contentRows: 61,
  });
  const source = fs.readFileSync(N2_BATCH_5_PATH, 'utf8');
  assert.match(source, /공식 JLPT 문항.*포함하거나 변형하지 않습니다/u);
  assert.match(source, /Google 일본어 음성이 있을 때만 재생한다/u);
  assert.match(source, /독해 3, 독해 문항 6/u);
  const sql = plan.statements.join('\n');
  assert.match(sql, new RegExp(N2_BATCH_5_SOURCE_ASSET_ID));
  assert.match(sql, /Google browser speech only/i);
  assert.match(sql, /learning_content_stable_refs/);
  assert.match(sql, /content_speech_bindings/);
  assert.doesNotMatch(sql, /content_releases|content_release_sources|first_reviewer|second_reviewer/i);
  assert.match(n2Batch5ContentRowsSql(), /reading_questions/);
  for (const char of N2_BATCH_5_KANJI) assert.match(sql, new RegExp(`'${char}'`));
});
