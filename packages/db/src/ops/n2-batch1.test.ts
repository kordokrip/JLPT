import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildN2Batch1Plan,
  N2_BATCH_1_KANJI,
  N2_BATCH_1_PATH,
  N2_BATCH_1_SOURCE_ASSET_ID,
  n2Batch1ContentRowsSql,
} from '../seed/n2-batch1.js';

test('N2 Batch 1 has self-authored vocabulary, grammar, reading, and listening-script coverage', () => {
  const plan = buildN2Batch1Plan();
  assert.deepEqual(plan.manifest.counts, {
    categories: 14,
    vocab: 104,
    grammar: 20,
    kanji: 30,
    sentences: 80,
    reading: 8,
    readingQuestions: 16,
    stableRefs: 242,
    audioBindings: 222,
    contentRows: 258,
  });
  assert.match(plan.manifest.sourceSha256, /^[a-f0-9]{64}$/);

  const source = fs.readFileSync(N2_BATCH_1_PATH, 'utf8');
  assert.match(source, /공식 JLPT 문항·정답·지문·음원은 포함하거나\n+변형하지 않습니다/);
  assert.doesNotMatch(source, /기출|official JLPT question/i);

  const sql = plan.statements.join('\n');
  assert.match(sql, new RegExp(N2_BATCH_1_SOURCE_ASSET_ID));
  assert.match(sql, /learning_content_stable_refs/);
  assert.match(sql, /content_speech_bindings/);
  assert.match(sql, /'google-browser', 'ready'/);
  assert.match(sql, /curriculum-reference:jlpt:n2:batch1:kanji:対/);
  assert.doesNotMatch(sql, /content_releases|content_release_sources|first_reviewer|second_reviewer/i);
  assert.match(n2Batch1ContentRowsSql(), /reading_questions/);
  for (const char of N2_BATCH_1_KANJI) assert.match(sql, new RegExp(`'${char}'`));
});
