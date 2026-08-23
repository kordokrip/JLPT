import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS,
  nextContentExpansionIndependentReviewLedger,
} from '../content/reviews/next-content-expansion-independent-reviews.js';
import { buildJlptN1PracticeBankV1Plan, buildJlptN2PracticeBankV1Plan } from '../seed/jlpt-n2-n1-practice-banks-v1.js';
import { buildTopikOwnerBatch6Plan } from '../seed/topik-owner-curriculum-batch6.js';

test('two distinct exact-hash reviews approve all 160 final items', () => {
  const artifact = NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS;
  assert.equal(artifact.passed, true);
  assert.equal(artifact.reviewers.length, 2);
  assert.notEqual(artifact.reviewers[0]?.reviewer_id, artifact.reviewers[1]?.reviewer_id);
  assert.equal(artifact.decisions.length, 160);
  assert.equal(new Set(artifact.decisions.map((decision) => decision.item_id)).size, 160);
  assert.equal(artifact.decisions.every((decision) => (
    decision.reviewer_a_verdict === 'approved' && decision.reviewer_b_verdict === 'approved'
  )), true);
  assert.match(artifact.final_draft_sha256, /^[a-f0-9]{64}$/u);
  assert.match(artifact.source_evidence_sha256, /^[a-f0-9]{64}$/u);
  const { artifact_sha256: actual, ...body } = artifact;
  assert.equal(actual, createHash('sha256').update(JSON.stringify(body)).digest('hex'));
  assert.doesNotMatch(JSON.stringify(artifact), /audio_r2_key|r2-ready|r2:\/\/|\/api\/v1\/audio\//iu);
});

test('combined review ledger unlocks only the three reviewed draft builders', () => {
  const ledger = nextContentExpansionIndependentReviewLedger();
  const n2 = buildJlptN2PracticeBankV1Plan(ledger);
  const n1 = buildJlptN1PracticeBankV1Plan(ledger);
  const topik = buildTopikOwnerBatch6Plan(ledger);
  assert.equal(n2.manifest.counts.questions, 60);
  assert.equal(n1.manifest.counts.questions, 60);
  assert.equal(topik.manifest.counts.items, 40);
  const sql = [...n2.statements, ...n1.statements, ...topik.statements].join('\n');
  assert.doesNotMatch(sql, /INSERT(?: OR IGNORE)? INTO `content_audio_bindings`/u);
  assert.doesNotMatch(sql, /audio_r2_key|r2-ready|r2:\/\//iu);
  assert.match(sql, /`is_published`[^;]+, 0\)/u);
});
