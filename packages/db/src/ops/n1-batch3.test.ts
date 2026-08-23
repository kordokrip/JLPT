import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildN1Batch3Plan,
  N1_BATCH_3_KANJI,
  N1_BATCH_3_PATH,
  N1_BATCH_3_SOURCE_ASSET_ID,
  n1Batch3ContentRowsSql,
} from '../seed/n1-batch3.js';

test('N1 Batch 3 adds self-authored argument, institution, and browser-speech critical-reading practice', () => {
  const plan = buildN1Batch3Plan();
  assert.deepEqual(plan.manifest.counts, {
    categories: 4, vocab: 24, grammar: 6, kanji: 9, sentences: 8,
    reading: 2, readingQuestions: 2, stableRefs: 49, audioBindings: 43, contentRows: 51,
  });
  const source = fs.readFileSync(N1_BATCH_3_PATH, 'utf8');
  assert.match(source, /공식 JLPT 문항.*포함하거나 변형하지 않습니다/u);
  assert.match(source, /Google 음성을 우선하고 같은 언어의 기기 음성을 사용한다/);
  const sql = plan.statements.join('\n');
  assert.match(sql, new RegExp(N1_BATCH_3_SOURCE_ASSET_ID));
  assert.match(sql, /Google browser speech only/i);
  assert.match(sql, /learning_content_stable_refs/);
  assert.match(sql, /content_speech_bindings/);
  assert.doesNotMatch(sql, /content_releases|content_release_sources|first_reviewer|second_reviewer/i);
  assert.match(n1Batch3ContentRowsSql(), /reading_questions/);
  for (const char of N1_BATCH_3_KANJI) assert.match(sql, new RegExp(`'${char}'`));
});
