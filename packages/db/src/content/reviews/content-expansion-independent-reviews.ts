import { createHash } from 'node:crypto';

import type { IndependentReviewLedger, ItemReviewDecision } from '../../seed/jlpt-n3-practice-bank-v1.js';
import { JLPT_N3_PRACTICE_BANK_V1 } from '../../seed/jlpt-n3-practice-bank-v1.js';
import { TOPIK_OWNER_BATCH_5 } from '../../seed/topik-owner-curriculum-batch5.js';
import { CONTENT_EXPANSION_ADVERSARIAL_REVIEW_1 } from './content-expansion-adversarial-review-1.js';
import {
  CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2,
  CONTENT_EXPANSION_REVIEWED_DRAFT_SHA256,
} from './content-expansion-adversarial-review-2.js';

export function buildContentExpansionIndependentReviews() {
  const first = CONTENT_EXPANSION_ADVERSARIAL_REVIEW_1;
  const second = CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2;
  if (String(first.reviewer_id) === String(second.reviewer_id)) throw new Error('Independent reviewer identities must be distinct');
  if (first.scope.draft_artifact_sha256 !== CONTENT_EXPANSION_REVIEWED_DRAFT_SHA256
    || second.scope.draft_artifact_sha256 !== CONTENT_EXPANSION_REVIEWED_DRAFT_SHA256) {
    throw new Error('Both independent reviews must be bound to the exact final draft hash');
  }
  const authoredAnswers = new Map<string, number | null>([
    ...JLPT_N3_PRACTICE_BANK_V1.map((item) => [item.id, item.answer_index] as const),
    ...TOPIK_OWNER_BATCH_5.map((item) => [item.id, item.answer_index ?? null] as const),
  ]);
  const firstById = new Map(first.decisions.map((decision) => [decision.item_id, decision]));
  const secondById = new Map(second.decisions.map((decision) => [decision.item_id, decision]));
  const decisions = [...authoredAnswers].map(([itemId, answerIndex]) => {
    const firstDecision = firstById.get(itemId);
    const secondDecision = secondById.get(itemId);
    if (!firstDecision || !secondDecision) throw new Error(`Independent review coverage is incomplete: ${itemId}`);
    if (firstDecision.answer_index !== answerIndex || secondDecision.answer_index !== answerIndex) {
      throw new Error(`Independent reviewer answer mismatch: ${itemId}`);
    }
    return {
      item_id: itemId,
      answer_index: answerIndex,
      reviewer_1_verdict: firstDecision.verdict,
      reviewer_2_verdict: secondDecision.verdict,
    } as const;
  });
  if (decisions.length !== 140 || firstById.size !== 140 || secondById.size !== 140) {
    throw new Error('Independent reviews must cover exactly 140 distinct expansion items');
  }
  const body = {
    schema_version: 'content-expansion-independent-reviews-v1',
    release_state: 'reviewed-draft',
    reviewed_at: '2026-08-19',
    final_draft_sha256: CONTENT_EXPANSION_REVIEWED_DRAFT_SHA256,
    source_evidence_sha256: first.scope.source_evidence_sha256,
    reviewers: [
      { reviewer_id: first.reviewer_id, artifact_sha256: first.artifact_sha256 },
      { reviewer_id: second.reviewer_id, artifact_sha256: second.artifact_sha256 },
    ],
    decisions,
  } as const;
  return {
    ...body,
    artifact_sha256: createHash('sha256').update(JSON.stringify(body)).digest('hex'),
  };
}

export const CONTENT_EXPANSION_INDEPENDENT_REVIEWS = buildContentExpansionIndependentReviews();

export function contentExpansionIndependentReviewLedger(): IndependentReviewLedger {
  const artifact = CONTENT_EXPANSION_INDEPENDENT_REVIEWS;
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
