import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2,
  CONTENT_EXPANSION_REVIEWED_DRAFT_SHA256,
  CONTENT_EXPANSION_REVIEWER_2_ID,
} from '../content/reviews/content-expansion-adversarial-review-2.js';
import { JLPT_N3_PRACTICE_BANK_V1 } from '../seed/jlpt-n3-practice-bank-v1.js';
import { TOPIK_OWNER_BATCH_5 } from '../seed/topik-owner-curriculum-batch5.js';

test('adversarial reviewer 2 binds a distinct, complete decision set to the final draft hash', () => {
  assert.notEqual(CONTENT_EXPANSION_REVIEWER_2_ID, 'adversarial-reviewer-1-codex-2026-08-19');
  assert.equal(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2.scope.draft_artifact_sha256, CONTENT_EXPANSION_REVIEWED_DRAFT_SHA256);
  assert.equal(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2.decisions.length, 140);
  assert.equal(new Set(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2.decisions.map((decision) => decision.item_id)).size, 140);
  assert.equal(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2.decisions.every((decision) => decision.verdict === 'approved'), true);
  assert.equal(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2.artifact_sha256.length, 64);
});

test('reviewer 2 independent expected answers match all authored answers without changing publication state', () => {
  const authored = new Map<string, number | null>([
    ...JLPT_N3_PRACTICE_BANK_V1.map((item) => [item.id, item.answer_index] as const),
    ...TOPIK_OWNER_BATCH_5.map((item) => [item.id, item.answer_index ?? null] as const),
  ]);
  for (const reviewed of CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2.decisions) {
    assert.equal(reviewed.answer_index, authored.get(reviewed.item_id), reviewed.item_id);
    assert.equal(reviewed.answer_unique, true, reviewed.item_id);
    assert.equal(reviewed.explanation_consistent, true, reviewed.item_id);
    assert.equal(reviewed.multilingual_alignment, true, reviewed.item_id);
    assert.equal(reviewed.distractors_unambiguous, true, reviewed.item_id);
    assert.equal(reviewed.level_appropriate, true, reviewed.item_id);
    assert.equal(reviewed.key_leakage_checked, true, reviewed.item_id);
    assert.equal(reviewed.speech_policy_passed, true, reviewed.item_id);
  }
  assert.equal(JLPT_N3_PRACTICE_BANK_V1.every((item) => item.is_published === 0), true);
  assert.equal(TOPIK_OWNER_BATCH_5.every((item) => item.release_state === 'draft'), true);
  assert.equal(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2.release_state, 'draft');
  assert.equal(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2.checks.publication_state_changed, false);
});

test('reviewer 2 verifies constructed-response and browser-speech/R2-free contracts', () => {
  const writing = TOPIK_OWNER_BATCH_5.filter((item) => item.section === 'writing');
  assert.equal(writing.length, 4);
  assert.equal(writing.every((item) => (
    item.choices === undefined
    && item.answer_index === undefined
    && Boolean(item.rubric?.ko.trim() && item.rubric.ja.trim() && item.rubric.en.trim())
  )), true);

  const allItems = [...JLPT_N3_PRACTICE_BANK_V1, ...TOPIK_OWNER_BATCH_5];
  assert.doesNotMatch(JSON.stringify(allItems), /audio_r2_key|r2:\/\/|r2-ready|r2-fallback/iu);
  assert.equal(JLPT_N3_PRACTICE_BANK_V1.filter((item) => item.mode === 'listening').every((item) => (
    item.speech_provider === 'google-browser' && Boolean(item.audio_script_ja?.trim())
  )), true);
  assert.equal(TOPIK_OWNER_BATCH_5.filter((item) => item.section === 'listening').every((item) => (
    item.speech_provider === 'google-browser' && Boolean(item.audio_text_ko?.trim())
  )), true);
  assert.equal(CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2.checks.active_r2_pronunciation_capability, 'absent');
});
