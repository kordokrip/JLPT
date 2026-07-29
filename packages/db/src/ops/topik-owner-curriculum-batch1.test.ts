import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildTopikOwnerBatch1Plan,
  TOPIK_OWNER_BATCH_1_PATH,
  TOPIK_OWNER_BATCH_1_SOURCE_ASSET_ID,
} from '../seed/topik-owner-curriculum-batch1.js';

test('TOPIK 1–6 Batch 1 is operating self-authored content with browser-ready Korean texts', () => {
  const plan = buildTopikOwnerBatch1Plan();
  assert.deepEqual(plan.manifest.counts, { units: 30, items: 30, stableRefs: 30, audioBindings: 30, contentRows: 60 });
  assert.match(plan.manifest.sourceSha256, /^[a-f0-9]{64}$/);
  assert.match(fs.readFileSync(TOPIK_OWNER_BATCH_1_PATH, 'utf8'), /공식 TOPIK 기출 문항/);

  const sql = plan.statements.join('\n');
  assert.match(sql, new RegExp(TOPIK_OWNER_BATCH_1_SOURCE_ASSET_ID));
  assert.match(sql, /topik_owner_authored_curriculum_units/);
  assert.match(sql, /topik_owner_authored_curriculum_items/);
  assert.match(sql, /audio_text_ko/);
  assert.match(sql, /TOPIK-1/);
  assert.match(sql, /TOPIK-6/);
  assert.match(sql, /browser Korean voice/);
  assert.doesNotMatch(sql, /topik_practice_questions|content_releases/);
});
