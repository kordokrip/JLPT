import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONTENT_EXPANSION_INDEPENDENT_REVIEWS,
  contentExpansionIndependentReviewLedger,
} from '../content/reviews/content-expansion-independent-reviews.js';
import { buildJlptN3PracticeBankV1Plan } from '../seed/jlpt-n3-practice-bank-v1.js';
import { buildTopikOwnerBatch5Plan } from '../seed/topik-owner-curriculum-batch5.js';

test('two distinct independent review artifacts cover the exact final 140-item draft', () => {
  const artifact = CONTENT_EXPANSION_INDEPENDENT_REVIEWS;
  assert.equal(artifact.reviewers.length, 2);
  assert.notEqual(artifact.reviewers[0]?.reviewer_id, artifact.reviewers[1]?.reviewer_id);
  assert.equal(artifact.decisions.length, 140);
  assert.equal(new Set(artifact.decisions.map((decision) => decision.item_id)).size, 140);
  assert.match(artifact.final_draft_sha256, /^[a-f0-9]{64}$/u);
  assert.match(artifact.artifact_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(artifact.decisions.every((decision) => (
    decision.reviewer_1_verdict === 'approved' && decision.reviewer_2_verdict === 'approved'
  )), true);
});

test('combined independent ledger unlocks draft SQL builders without publishing content', () => {
  const ledger = contentExpansionIndependentReviewLedger();
  const jlpt = buildJlptN3PracticeBankV1Plan(ledger);
  const topik = buildTopikOwnerBatch5Plan(ledger);
  assert.equal(jlpt.manifest.counts.questions, 120);
  assert.equal(topik.manifest.counts.items, 20);
  const sql = [...jlpt.statements, ...topik.statements].join('\n');
  assert.doesNotMatch(sql, /INSERT(?: OR IGNORE)? INTO `content_audio_bindings`/u);
  assert.doesNotMatch(sql, /audio_r2_key|r2-ready|r2:\/\//iu);
  assert.match(sql, /`is_published`[^\n]*\)\nVALUES[^;]+, 0\)/u);
});
