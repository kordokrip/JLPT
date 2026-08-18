import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildTopikOwnerBatch4Plan,
  TOPIK_OWNER_BATCH_4_PATH,
  TOPIK_OWNER_BATCH_4_SOURCE_ASSET_ID,
  topikOwnerBatch4ContentRowsSql,
} from '../seed/topik-owner-curriculum-batch4.js';

test('TOPIK 1–6 Batch 4 expands every grade and section with Google-only audio-ready owner curriculum', () => {
  const plan = buildTopikOwnerBatch4Plan();
  assert.deepEqual(plan.manifest.counts, { units: 30, items: 30, stableRefs: 30, audioBindings: 30, contentRows: 60 });
  const source = fs.readFileSync(TOPIK_OWNER_BATCH_4_PATH, 'utf8');
  assert.match(source, /공식 TOPIK 기출 문항·정답·지문·음원·대본을 포함하거나 변형하지 않는다/);
  assert.match(source, /브라우저의 Google 한국어 음성으로만 재생한다/);
  assert.match(source, /practice bank나 공개 release lifecycle에는 넣지 않는다/);
  const sql = plan.statements.join('\n');
  assert.match(sql, new RegExp(TOPIK_OWNER_BATCH_4_SOURCE_ASSET_ID));
  assert.match(sql, /audio_text_ko/);
  assert.match(sql, /Google browser speech only/i);
  assert.doesNotMatch(sql, /content_releases|topik_practice_questions/i);
  assert.match(topikOwnerBatch4ContentRowsSql(), /topik_owner_authored_curriculum_items/);
});
