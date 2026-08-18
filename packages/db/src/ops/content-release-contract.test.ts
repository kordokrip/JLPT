import assert from 'node:assert/strict';
import test from 'node:test';

import { buildContentSeedPlan } from '../seed/content-manifest.js';
import {
  canTransitionContentRelease,
  hasTwoSignedContentReviews,
  TOPIK_CONTENT_CONTRACT_FIXTURE,
  validateContentReleaseProvenance,
  assertTopikContentContractFixture,
} from '../seed/content-release-contract.js';
import { N2_N1_SOURCE_INTAKE_TEMPLATES } from '../seed/n2-n1-source-intake-template.js';

test('content release fixture is complete but draft-only', () => {
  assert.doesNotThrow(() => assertTopikContentContractFixture(TOPIK_CONTENT_CONTRACT_FIXTURE));
  assert.equal(TOPIK_CONTENT_CONTRACT_FIXTURE.release.releaseState, 'draft');
  assert.equal(TOPIK_CONTENT_CONTRACT_FIXTURE.provenance.allowedUse, 'test-fixture-only');
});

test('provenance validation rejects missing legal and review evidence', () => {
  const invalid = {
    ...TOPIK_CONTENT_CONTRACT_FIXTURE.provenance,
    sourceUrl: '',
    sourceSha256: '',
    secondReviewer: TOPIK_CONTENT_CONTRACT_FIXTURE.provenance.firstReviewer,
  };
  const errors = validateContentReleaseProvenance(invalid);
  assert.ok(errors.some((error) => error.includes('sourceUrl')));
  assert.ok(errors.some((error) => error.includes('sourceSha256')));
  assert.ok(errors.some((error) => error.includes('reviewers')));
});

test('only dated signatures from two distinct reviewers satisfy the human-review gate', () => {
  assert.equal(hasTwoSignedContentReviews(TOPIK_CONTENT_CONTRACT_FIXTURE.provenance), true);
  const pending = {
    ...TOPIK_CONTENT_CONTRACT_FIXTURE.provenance,
    firstReviewStatus: 'pending' as const,
    firstReviewedAt: null,
  };
  assert.equal(hasTwoSignedContentReviews(pending), false);
    assert.ok(validateContentReleaseProvenance({ ...pending, firstReviewedAt: '2026-07-27' })
      .some((error) => error.includes('pending review')));
});

test('release lifecycle is strictly forward-only and withdraws published content', () => {
  assert.equal(canTransitionContentRelease('draft', 'automated_checked'), true);
  assert.equal(canTransitionContentRelease('approved', 'published'), true);
  assert.equal(canTransitionContentRelease('published', 'withdrawn'), true);
  assert.equal(canTransitionContentRelease('draft', 'published'), false);
  assert.equal(canTransitionContentRelease('withdrawn', 'draft'), false);
});

test('N2 Batches 1–5 and N1 Batches 1–4 are operating self-authored sources', () => {
  assert.equal(N2_N1_SOURCE_INTAKE_TEMPLATES.length, 6);
  assert.ok(N2_N1_SOURCE_INTAKE_TEMPLATES.every((template) => template.intakeState === 'source-required'));
  const seeded = buildContentSeedPlan().manifest.entries;
  const n2Batches = seeded.filter((entry) => /^N2-A[1-5]$/.test(entry.sourceCode));
  assert.deepEqual(n2Batches.map((entry) => entry.sourceCode), ['N2-A1', 'N2-A2', 'N2-A3', 'N2-A4', 'N2-A5']);
  assert.deepEqual(n2Batches.map((entry) => entry.table), Array(5).fill('n2_curriculum'));
  assert.deepEqual(n2Batches.map((entry) => entry.expectedRows), [258, 112, 101, 51, 61]);
  const n1Batches = seeded.filter((entry) => /^N1-A[1-4]$/.test(entry.sourceCode));
  assert.deepEqual(n1Batches.map((entry) => entry.table), Array(4).fill('n2_curriculum'));
  assert.deepEqual(n1Batches.map((entry) => entry.expectedRows), [87, 87, 51, 61]);
});
