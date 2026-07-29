import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildTopikOwnerBatch2Plan,
  TOPIK_OWNER_BATCH_2_PATH,
  TOPIK_OWNER_BATCH_2_SOURCE_ASSET_ID,
  topikOwnerBatch2ContentRowsSql,
} from '../seed/topik-owner-curriculum-batch2.js';

test('TOPIK 1–6 Batch 2 adds a second browser-ready item for every grade and section', () => {
  const plan = buildTopikOwnerBatch2Plan();
  assert.deepEqual(plan.manifest.counts, { units: 30, items: 30, stableRefs: 30, audioBindings: 30, contentRows: 60 });
  assert.match(plan.manifest.sourceSha256, /^[a-f0-9]{64}$/);
  const source = fs.readFileSync(TOPIK_OWNER_BATCH_2_PATH, 'utf8');
  assert.match(source, /공식 TOPIK 기출 문항·정답·지문·음원·대본을 포함하거나 변형하지 않는다/);
  const sql = plan.statements.join('\n');
  assert.match(sql, new RegExp(TOPIK_OWNER_BATCH_2_SOURCE_ASSET_ID));
  assert.match(sql, /audio_text_ko/);
  assert.match(sql, /browser Korean voice/);
  assert.match(sql, /self-authored TOPIK learning content\.',\n\s*'Personal learning content/);
  assert.match(sql, /not official TOPIK material\.',\n\s*'[a-f0-9]{64}'/);
  assert.doesNotMatch(sql, /content_releases|topik_practice_questions/i);
  assert.match(topikOwnerBatch2ContentRowsSql(), /topik_owner_authored_curriculum_items/);
});
