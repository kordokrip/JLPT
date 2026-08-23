import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_A } from '../content/reviews/next-content-expansion-adversarial-review-a.js';
import {
  JLPT_N1_PRACTICE_BANK_V1,
  JLPT_N2_PRACTICE_BANK_V1,
} from '../seed/jlpt-n2-n1-practice-banks-v1.js';
import { TOPIK_OWNER_BATCH_6 } from '../seed/topik-owner-curriculum-batch6.js';
import { buildNextContentExpansionQualityReport } from './next-content-expansion-quality.js';

const EXPECTED_DRAFT_SHA256 = 'e95d4a7c814a850c770108183328904c85e4ea0bd4588a851ab97e7a5c33c070';
const EXPECTED_SOURCE_SHA256 = '85f29bd7c5a614d6dd234cba759cdf80f33e1a189f4ce6ed107aa66cac850502';

test('Reviewer A approval is pinned to the exact independently reviewed draft and source evidence', () => {
  const quality = buildNextContentExpansionQualityReport('2026-08-23T00:00:00.000Z');
  assert.equal(quality.passed, true);
  assert.equal(quality.final_draft_sha256, EXPECTED_DRAFT_SHA256);
  assert.equal(quality.source_evidence_sha256, EXPECTED_SOURCE_SHA256);
  assert.equal(NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_A.reviewer_id, 'next-expansion-reviewer-a-2026-08-23');
  assert.equal(NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_A.reviewed_at, '2026-08-23');
  assert.equal(NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_A.final_draft_sha256, EXPECTED_DRAFT_SHA256);
  assert.equal(NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_A.source_evidence_sha256, EXPECTED_SOURCE_SHA256);
});

test('Reviewer A records 160 complete decisions with the authored answer or null rubric result', () => {
  const expectedItems = [
    ...JLPT_N2_PRACTICE_BANK_V1,
    ...JLPT_N1_PRACTICE_BANK_V1,
    ...TOPIK_OWNER_BATCH_6,
  ];
  const decisions = NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_A.decisions;
  const byId = new Map(decisions.map((item) => [item.item_id, item]));

  assert.equal(decisions.length, 160);
  assert.equal(byId.size, 160);
  assert.deepEqual([...byId.keys()].sort(), expectedItems.map(({ id }) => id).sort());
  for (const item of expectedItems) {
    const reviewed = byId.get(item.id);
    assert.ok(reviewed, `missing review decision for ${item.id}`);
    assert.equal(reviewed.answer_index, item.answer_index ?? null, item.id);
    assert.equal(reviewed.verdict, 'approved', item.id);
    assert.equal(reviewed.explanation_consistent, true, item.id);
    assert.equal(reviewed.reviewer_id, 'next-expansion-reviewer-a-2026-08-23', item.id);
    assert.equal(reviewed.reviewed_at, '2026-08-23', item.id);
    assert.ok(reviewed.rationale.length >= 120, `non-specific rationale for ${item.id}`);
  }
});

test('Reviewer A artifact digest covers every decision and contains no pronunciation R2 path', () => {
  const { artifact_sha256: artifactSha256, ...artifact } = NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_A;
  assert.equal(createHash('sha256').update(JSON.stringify(artifact)).digest('hex'), artifactSha256);
  assert.match(artifactSha256, /^[a-f0-9]{64}$/u);
  assert.doesNotMatch(JSON.stringify(artifact), /(?:r2:\/\/|audio_r2|r2-ready|\/api\/v1\/audio\/)/iu);
});
