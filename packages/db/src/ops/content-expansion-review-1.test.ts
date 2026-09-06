import assert from 'node:assert/strict';
import test from 'node:test';

import { CONTENT_EXPANSION_ADVERSARIAL_REVIEW_1 } from '../content/reviews/content-expansion-adversarial-review-1.js';
import { JLPT_N3_PRACTICE_BANK_V1 } from '../seed/jlpt-n3-practice-bank-v1.js';
import { TOPIK_OWNER_BATCH_5 } from '../seed/topik-owner-curriculum-batch5.js';

test('adversarial reviewer 1 independently covers every expansion item without publishing it', () => {
  assert.equal(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_1.decisions.length, 140);
  assert.equal(new Set(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_1.decisions.map((decision) => decision.item_id)).size, 140);
  assert.equal(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_1.decisions.every((decision) => decision.verdict === 'approved'), true);
  assert.equal(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_1.checks.active_r2_pronunciation_capability, 'absent');
  assert.equal(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_1.checks.publication_state_changed, false);
  assert.equal(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_1.release_state, 'draft');
  assert.match(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_1.artifact_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(JLPT_N3_PRACTICE_BANK_V1.every((item) => item.is_published === 0), true);
  assert.equal(TOPIK_OWNER_BATCH_5.every((item) => item.release_state === 'draft'), true);
});

test('reviewer 1 decisions match the authored answer contract after semantic adjudication', () => {
  const authored = new Map([
    ...JLPT_N3_PRACTICE_BANK_V1.map((item) => [item.id, item.answer_index] as const),
    ...TOPIK_OWNER_BATCH_5.map((item) => [item.id, item.answer_index ?? null] as const),
  ]);
  for (const decision of CONTENT_EXPANSION_ADVERSARIAL_REVIEW_1.decisions) {
    assert.equal(decision.answer_index, authored.get(decision.item_id), decision.item_id);
    assert.equal(decision.explanation_consistent, true);
    assert.equal(decision.multilingual_alignment, true);
    assert.equal(decision.distractors_unambiguous, true);
    assert.equal(decision.speech_policy_passed, true);
  }
});
