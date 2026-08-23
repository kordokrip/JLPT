import { createHash } from 'node:crypto';

import type {
  IndependentReviewLedger,
  ItemReviewDecision,
} from '../../seed/jlpt-n3-practice-bank-v1.js';
import {
  JLPT_N1_PRACTICE_BANK_V1,
  JLPT_N2_PRACTICE_BANK_V1,
} from '../../seed/jlpt-n2-n1-practice-banks-v1.js';
import { TOPIK_OWNER_BATCH_6 } from '../../seed/topik-owner-curriculum-batch6.js';
import { NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256 } from '../../ops/next-content-expansion-quality.js';
import { NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256 } from '../../seed/next-content-expansion-source.js';
import { NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_A } from './next-content-expansion-adversarial-review-a.js';
import { NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_B } from './next-content-expansion-adversarial-review-b.js';

export function buildNextContentExpansionIndependentReviews() {
  const first = NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_A;
  const second = NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_B;
  if (String(first.reviewer_id) === String(second.reviewer_id)) throw new Error('Independent reviewer identities must be distinct');
  for (const review of [first, second]) {
    if (review.final_draft_sha256 !== NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256) {
      throw new Error(`Independent review is not bound to the exact final draft: ${review.reviewer_id}`);
    }
    if (review.source_evidence_sha256 !== NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256) {
      throw new Error(`Independent review source evidence mismatch: ${review.reviewer_id}`);
    }
  }

  const authoredAnswers = new Map<string, number | null>([
    ...JLPT_N2_PRACTICE_BANK_V1.map((item) => [item.id, item.answer_index] as const),
    ...JLPT_N1_PRACTICE_BANK_V1.map((item) => [item.id, item.answer_index] as const),
    ...TOPIK_OWNER_BATCH_6.map((item) => [item.id, item.answer_index ?? null] as const),
  ]);
  const firstById = new Map(first.decisions.map((decision) => [decision.item_id, decision]));
  const secondById = new Map(second.decisions.map((decision) => [decision.item_id, decision]));
  if (authoredAnswers.size !== 160 || firstById.size !== 160 || secondById.size !== 160) {
    throw new Error('Independent reviews must cover exactly 160 distinct expansion items');
  }

  const decisions = [...authoredAnswers].map(([itemId, answerIndex]) => {
    const firstDecision = firstById.get(itemId);
    const secondDecision = secondById.get(itemId);
    if (!firstDecision || !secondDecision) throw new Error(`Independent review coverage is incomplete: ${itemId}`);
    if (
      firstDecision.answer_index !== answerIndex
      || secondDecision.answer_index !== answerIndex
      || firstDecision.verdict !== 'approved'
      || secondDecision.verdict !== 'approved'
      || firstDecision.explanation_consistent !== true
      || secondDecision.explanation_consistent !== true
    ) throw new Error(`Independent reviewer decision mismatch: ${itemId}`);
    return {
      item_id: itemId,
      answer_index: answerIndex,
      reviewer_a_verdict: firstDecision.verdict,
      reviewer_b_verdict: secondDecision.verdict,
    } as const;
  });

  const body = {
    schema_version: 'next-content-expansion-independent-reviews-v1',
    passed: true,
    release_state: 'reviewed-draft',
    reviewed_at: '2026-08-23',
    final_draft_sha256: NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256,
    source_evidence_sha256: NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256,
    reviewers: [
      { reviewer_id: first.reviewer_id, artifact_sha256: first.artifact_sha256 },
      { reviewer_id: second.reviewer_id, artifact_sha256: second.artifact_sha256 },
    ],
    decisions,
  } as const;
  return {
    ...body,
    artifact_sha256: createHash('sha256').update(JSON.stringify(body)).digest('hex'),
  } as const;
}

export const NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS = buildNextContentExpansionIndependentReviews();

export function nextContentExpansionIndependentReviewLedger(): IndependentReviewLedger {
  const artifact = NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS;
  const [first, second] = artifact.reviewers;
  if (!first || !second) throw new Error('Two reviewer records are required');
  return Object.fromEntries(artifact.decisions.map((decision) => {
    const firstDecision: ItemReviewDecision = {
      reviewer_id: first.reviewer_id,
      verdict: 'approved',
      answer_index: decision.answer_index,
      explanation_consistent: true,
      reviewed_at: artifact.reviewed_at,
    };
    const secondDecision: ItemReviewDecision = {
      reviewer_id: second.reviewer_id,
      verdict: 'approved',
      answer_index: decision.answer_index,
      explanation_consistent: true,
      reviewed_at: artifact.reviewed_at,
    };
    return [decision.item_id, [firstDecision, secondDecision] as const];
  }));
}
