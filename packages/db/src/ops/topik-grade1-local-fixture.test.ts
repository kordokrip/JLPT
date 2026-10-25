import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildTopikGrade1LocalFixturePlan,
  TOPIK_GRADE1_LOCAL_FIXTURE_PATH,
  TOPIK_GRADE1_LOCAL_FIXTURE_SOURCE_ASSET_ID,
} from '../seed/topik-grade1-local-fixture.js';

test('TOPIK grade 1 local fixture stays self-authored, speaks only its supplied Korean text, and remains separate from review-gated records', () => {
  const plan = buildTopikGrade1LocalFixturePlan();
  assert.deepEqual(plan.manifest.counts, { units: 1, items: 3, stableRefs: 3, audioBindings: 3 });
  assert.match(plan.manifest.sourceSha256, /^[a-f0-9]{64}$/);
  assert.match(fs.readFileSync(TOPIK_GRADE1_LOCAL_FIXTURE_PATH, 'utf8'), /공식 TOPIK 기출 문항/);

  const sql = plan.statements.join('\n');
  assert.match(sql, new RegExp(TOPIK_GRADE1_LOCAL_FIXTURE_SOURCE_ASSET_ID));
  assert.match(sql, /topik_owner_authored_curriculum_units/);
  assert.match(sql, /topik_owner_authored_curriculum_items/);
  assert.match(sql, /learning_content_stable_refs/);
  assert.match(sql, /'pronunciation',[\s\S]*'google-browser', 'ready'/);
  assert.match(sql, /'listening',[\s\S]*'google-browser', 'unavailable'/);
  assert.match(sql, /audio_text_ko/);
  assert.match(sql, /안녕하세요\. 저는 유나예요\. 처음 뵙겠습니다\./);
  assert.match(sql, /audio-unavailable/);
  assert.match(sql, /발음 텍스트가 없으면 브라우저 Google 음성을 제공하지 않으며 unavailable 상태를 안내합니다/);
  assert.doesNotMatch(sql, /topik_practice_questions|content_releases|content_release_sources|author_reviewer|second_reviewer/i);
});
