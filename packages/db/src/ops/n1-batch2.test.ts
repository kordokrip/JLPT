import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildN1Batch2Plan,
  N1_BATCH_2_KANJI,
  N1_BATCH_2_PATH,
  N1_BATCH_2_SOURCE_ASSET_ID,
  n1Batch2ContentRowsSql,
} from '../seed/n1-batch2.js';

test('N1 Batch 2 adds a distinct self-authored policy, research, and risk unit', () => {
  const plan = buildN1Batch2Plan();
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
  const source = fs.readFileSync(N1_BATCH_2_PATH, 'utf8');
  assert.match(source, /공식 JLPT 문항·정답·지문·음원을 포함하거나 변형하지 않습니다/);
  assert.doesNotMatch(source, /기출|official JLPT question/i);
  const sql = plan.statements.join('\n');
  assert.match(sql, new RegExp(N1_BATCH_2_SOURCE_ASSET_ID));
  assert.match(sql, /learning_content_stable_refs/);
  assert.match(sql, /content_speech_bindings/);
  assert.match(sql, /'google-browser', 'ready'/);
  assert.match(sql, /browser Google Japanese pronunciation/i);
  assert.doesNotMatch(sql, /content_releases|content_release_sources|first_reviewer|second_reviewer/i);
  assert.match(n1Batch2ContentRowsSql(), /reading_questions/);
  for (const char of N1_BATCH_2_KANJI) assert.match(sql, new RegExp(`'${char}'`));
});
