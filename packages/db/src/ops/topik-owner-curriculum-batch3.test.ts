import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildTopikOwnerBatch3Plan,
  TOPIK_OWNER_BATCH_3_PATH,
  TOPIK_OWNER_BATCH_3_SOURCE_ASSET_ID,
  topikOwnerBatch3ContentRowsSql,
} from '../seed/topik-owner-curriculum-batch3.js';

test('TOPIK 1–6 Batch 3 adds a third Google-speech item for every grade and section', () => {
  const plan = buildTopikOwnerBatch3Plan();
  assert.deepEqual(plan.manifest.counts, { units: 30, items: 30, stableRefs: 30, audioBindings: 30, contentRows: 60 });
  const source = fs.readFileSync(TOPIK_OWNER_BATCH_3_PATH, 'utf8');
  assert.match(source, /공식 TOPIK 기출 문항·정답·지문·음원·대본을 포함하거나 변형하지 않는다/);
  assert.match(source, /브라우저의 Google 한국어 음성으로만 재생한다/);
  const sql = plan.statements.join('\n');
  assert.match(sql, new RegExp(TOPIK_OWNER_BATCH_3_SOURCE_ASSET_ID));
  assert.match(sql, /audio_text_ko/);
  assert.match(sql, /Google browser speech only/i);
  assert.doesNotMatch(sql, /content_releases|topik_practice_questions/i);
  assert.match(topikOwnerBatch3ContentRowsSql(), /topik_owner_authored_curriculum_items/);
});
