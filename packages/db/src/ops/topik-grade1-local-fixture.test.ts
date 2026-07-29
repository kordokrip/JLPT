import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildTopikGrade1LocalFixturePlan,
  TOPIK_GRADE1_LOCAL_FIXTURE_PATH,
  TOPIK_GRADE1_LOCAL_FIXTURE_SOURCE_ASSET_ID,
} from '../seed/topik-grade1-local-fixture.js';

test('TOPIK grade 1 local fixture stays self-authored, R2-only, and separate from review-gated records', () => {
  const plan = buildTopikGrade1LocalFixturePlan();
  assert.deepEqual(plan.manifest.counts, { units: 1, items: 2, stableRefs: 2, audioBindings: 2 });
  assert.match(plan.manifest.sourceSha256, /^[a-f0-9]{64}$/);
  assert.match(fs.readFileSync(TOPIK_GRADE1_LOCAL_FIXTURE_PATH, 'utf8'), /공식 TOPIK 기출 문항/);

  const sql = plan.statements.join('\n');
  assert.match(sql, new RegExp(TOPIK_GRADE1_LOCAL_FIXTURE_SOURCE_ASSET_ID));
  assert.match(sql, /topik_owner_authored_curriculum_units/);
  assert.match(sql, /topik_owner_authored_curriculum_items/);
  assert.match(sql, /learning_content_stable_refs/);
  assert.match(sql, /'pronunciation',\n  'preparing'/);
  assert.match(sql, /'listening',\n  'preparing'/);
  assert.doesNotMatch(sql, /topik_practice_questions|content_releases|content_release_sources|author_reviewer|second_reviewer/i);
});
