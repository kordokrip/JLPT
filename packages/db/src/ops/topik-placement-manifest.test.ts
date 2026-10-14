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
import {
  buildTopikPracticeSeedPlan,
  TOPIK_PRACTICE_QUESTIONS,
  validateTopikPracticeBank,
} from '../seed/topik-practice-bank.js';
import {
  buildTopikPracticeV2SeedPlan,
  TOPIK_PRACTICE_V2_QUESTIONS,
  validateTopikPracticeV2Bank,
} from '../seed/topik-practice-bank-v2.js';

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

test('historical TOPIK practice V1 remains available only for regression/audit evidence', () => {
  assert.deepEqual(validateTopikPracticeBank(), []);
  assert.equal(TOPIK_PRACTICE_QUESTIONS.length, 28);
  assert.equal(TOPIK_PRACTICE_QUESTIONS.filter((item) => item.examLevel === 'TOPIK-I' && item.section === 'listening').length, 6);
  assert.equal(TOPIK_PRACTICE_QUESTIONS.filter((item) => item.examLevel === 'TOPIK-II' && item.section === 'writing').length, 4);
  assert.ok(TOPIK_PRACTICE_QUESTIONS.every((item) => item.promptJa.length > 0 && item.explanationJa.length > 0));
  const first = buildTopikPracticeSeedPlan();
  const second = buildTopikPracticeSeedPlan();
  assert.equal(first.manifest.questions.expectedRows, 28);
  assert.equal(first.manifest.manifestSha256, second.manifest.manifestSha256);
});

test('TOPIK I/II practice V2 has 300 self-authored questions, exact answer-position parity, and a signed ledger candidate per item', () => {
  assert.deepEqual(validateTopikPracticeV2Bank(), []);
  assert.equal(TOPIK_PRACTICE_V2_QUESTIONS.length, 300);
  for (const [examLevel, section] of [['TOPIK-I', 'listening'], ['TOPIK-I', 'reading'], ['TOPIK-II', 'listening'], ['TOPIK-II', 'reading'], ['TOPIK-II', 'writing']] as const) {
    assert.equal(TOPIK_PRACTICE_V2_QUESTIONS.filter((item) => item.examLevel === examLevel && item.section === section).length, 60);
  }
  for (const [examLevel, section] of [['TOPIK-I', 'listening'], ['TOPIK-I', 'reading'], ['TOPIK-II', 'listening'], ['TOPIK-II', 'reading']] as const) {
    assert.deepEqual([0, 1, 2, 3].map((answerIndex) => TOPIK_PRACTICE_V2_QUESTIONS.filter((item) => item.examLevel === examLevel && item.section === section && item.answerIndex === answerIndex).length), [15, 15, 15, 15]);
  }
  const first = buildTopikPracticeV2SeedPlan();
  const second = buildTopikPracticeV2SeedPlan();
  assert.equal(first.manifest.questions.expectedRows, 300);
  assert.equal(first.qualityLedger.length, 300);
  assert.ok(first.qualityLedger.every((entry) => entry.automatedCheck === 'passed' && entry.releaseState === 'published' && entry.authorReviewer !== entry.secondReviewer));
  assert.equal(first.manifest.manifestSha256, second.manifest.manifestSha256);
  assert.ok(first.statements[0]?.includes("bank_version`='v1'"));
  assert.equal(first.statements.filter((statement) => statement.includes('INSERT INTO `content_quality_audits`')).length, 300);
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
