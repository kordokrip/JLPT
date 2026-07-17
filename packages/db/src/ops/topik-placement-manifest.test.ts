import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTopikPlacementSeedPlan,
  TOPIK_PLACEMENT_QUESTIONS,
  validateTopikPlacementBank,
} from '../seed/topik-placement-bank.js';

test('TOPIK placement bank has complete provenance and answer fields', () => {
  assert.deepEqual(validateTopikPlacementBank(), []);
  assert.equal(TOPIK_PLACEMENT_QUESTIONS.length, 12);
});

test('TOPIK placement manifest is deterministic and matches the question bank', () => {
  const first = buildTopikPlacementSeedPlan();
  const second = buildTopikPlacementSeedPlan();

  assert.equal(first.manifest.learningTrack, 'topik-ko');
  assert.equal(first.manifest.questions.expectedRows, TOPIK_PLACEMENT_QUESTIONS.length);
  assert.equal(first.manifest.manifestSha256, second.manifest.manifestSha256);
  assert.equal(first.manifest.seedRunId, second.manifest.seedRunId);
  assert.ok(first.statements.length > TOPIK_PLACEMENT_QUESTIONS.length);
});
