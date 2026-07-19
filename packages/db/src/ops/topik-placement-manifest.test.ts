import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTopikPlacementSeedPlan,
  TOPIK_PLACEMENT_QUESTIONS,
  validateTopikPlacementBank,
} from '../seed/topik-placement-bank.js';
import {
  buildTopikPlacementV2SeedPlan,
  TOPIK_PLACEMENT_V2_QUESTIONS,
  validateTopikPlacementV2Bank,
} from '../seed/topik-placement-bank-v2.js';

test('TOPIK placement bank has complete provenance and answer fields', () => {
  assert.deepEqual(validateTopikPlacementBank(), []);
  assert.equal(TOPIK_PLACEMENT_QUESTIONS.length, 12);
});

test('TOPIK placement V2 has reviewed listening and reading parity', () => {
  assert.deepEqual(validateTopikPlacementV2Bank(), []);
  assert.equal(TOPIK_PLACEMENT_V2_QUESTIONS.length, 24);
  assert.equal(TOPIK_PLACEMENT_V2_QUESTIONS.filter((item) => item.section === 'listening').length, 12);
  assert.equal(TOPIK_PLACEMENT_V2_QUESTIONS.filter((item) => item.section === 'reading').length, 12);
  assert.deepEqual(
    [0, 1, 2, 3].map((position) => TOPIK_PLACEMENT_V2_QUESTIONS.filter((item) => item.answerIndex === position).length),
    [6, 6, 6, 6],
  );
});

test('TOPIK placement V2 manifest is deterministic', () => {
  const first = buildTopikPlacementV2SeedPlan();
  const second = buildTopikPlacementV2SeedPlan();
  assert.equal(first.manifest.questions.expectedRows, 24);
  assert.equal(first.manifest.manifestSha256, second.manifest.manifestSha256);
  assert.equal(first.manifest.contentVersion, second.manifest.contentVersion);
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
