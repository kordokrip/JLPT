import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_B } from '../content/reviews/next-content-expansion-adversarial-review-b.js';
import { NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256 } from './next-content-expansion-quality.js';
import {
  JLPT_N1_PRACTICE_BANK_V1,
  JLPT_N2_PRACTICE_BANK_V1,
} from '../seed/jlpt-n2-n1-practice-banks-v1.js';
import { NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256 } from '../seed/next-content-expansion-source.js';
import { TOPIK_OWNER_BATCH_6 } from '../seed/topik-owner-curriculum-batch6.js';

test('Reviewer B independently approves the exact 160-item final draft', () => {
  const artifact = NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_B;
  assert.equal(artifact.reviewer_id, 'next-expansion-reviewer-b-2026-08-23');
  assert.equal(artifact.reviewed_at, '2026-08-23');
  assert.equal(artifact.final_draft_sha256, 'e95d4a7c814a850c770108183328904c85e4ea0bd4588a851ab97e7a5c33c070');
  assert.equal(artifact.final_draft_sha256, NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256);
  assert.equal(artifact.source_evidence_sha256, '85f29bd7c5a614d6dd234cba759cdf80f33e1a189f4ce6ed107aa66cac850502');
  assert.equal(artifact.source_evidence_sha256, NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256);
  assert.equal(artifact.verdict, 'approved');
  assert.equal(artifact.item_count, 160);
  assert.equal(artifact.decisions.length, 160);
  assert.equal(new Set(artifact.decisions.map((decision) => decision.item_id)).size, 160);

  const currentItems = [
    ...JLPT_N2_PRACTICE_BANK_V1,
    ...JLPT_N1_PRACTICE_BANK_V1,
    ...TOPIK_OWNER_BATCH_6,
  ];
  const authoredAnswers = new Map(currentItems.map((item) => [item.id, item.answer_index ?? null]));
  assert.deepEqual(
    [...artifact.decisions.map((decision) => decision.item_id)].sort(),
    [...authoredAnswers.keys()].sort(),
  );
  for (const decision of artifact.decisions) {
    assert.equal(decision.verdict, 'approved', decision.item_id);
    assert.equal(decision.explanation_consistent, true, decision.item_id);
    assert.equal(decision.answer_index, authoredAnswers.get(decision.item_id), decision.item_id);
    assert.ok(decision.rationale.length >= 140, decision.item_id);
  }
});

test('Reviewer B artifact hash covers the signed body and contains no R2 pronunciation path', () => {
  const { artifact_sha256: actual, ...body } = NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_B;
  assert.equal(actual, createHash('sha256').update(JSON.stringify(body)).digest('hex'));
  assert.match(actual, /^[a-f0-9]{64}$/u);
  assert.doesNotMatch(JSON.stringify(NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_B), /r2:\/\/|audio_r2|\/api\/v1\/audio\//iu);
});
