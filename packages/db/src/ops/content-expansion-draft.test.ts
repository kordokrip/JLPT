import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { assertContentExpansionDraft } from '../seed/content-expansion-quality.js';
import {
  buildJlptN3PracticeBankV1Statements,
  JLPT_N3_PRACTICE_BANK_V1,
  JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH,
  JLPT_N3_PRACTICE_SOURCE_SHA256,
} from '../seed/jlpt-n3-practice-bank-v1.js';
import {
  buildTopikOwnerBatch5Statements,
  buildTopikOwnerBatch5Plan,
  TOPIK_OWNER_BATCH_5,
} from '../seed/topik-owner-curriculum-batch5.js';

test('large JLPT N3 and TOPIK owner expansion passes deterministic draft checks', () => {
  const report = assertContentExpansionDraft();
  assert.equal(report.release_state, 'draft');
  assert.equal(report.reviewer_state, 'pending');
  assert.equal(report.checks.every((check) => check.passed), true);
  assert.match(report.artifact_sha256, /^[a-f0-9]{64}$/u);
});

test('tracked intake artifact independently binds the immutable author source hash', () => {
  const contentDir = path.resolve(import.meta.dirname, '../content');
  const sourceBytes = fs.readFileSync(path.join(contentDir, 'jlpt-n3-topik-owner-expansion-source.md'));
  assert.equal(createHash('sha256').update(sourceBytes).digest('hex'), JLPT_N3_PRACTICE_SOURCE_SHA256);

  const intake = JSON.parse(fs.readFileSync(path.join(contentDir, 'jlpt-n3-topik-owner-expansion-intake.json'), 'utf8')) as Record<string, unknown>;
  const { artifact_sha256: artifactSha256, ...canonicalRecord } = intake;
  assert.equal(artifactSha256, JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH);
  assert.equal(createHash('sha256').update(JSON.stringify(canonicalRecord)).digest('hex'), JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH);
});

test('JLPT N3 seed remains blocked until two independent reviews finish', () => {
  assert.equal(JLPT_N3_PRACTICE_BANK_V1.length, 120);
  assert.equal(JLPT_N3_PRACTICE_BANK_V1.every((item) => item.is_published === 0), true);
  assert.equal(JLPT_N3_PRACTICE_BANK_V1.every((item) => item.reviews.every((review) => review.status === 'pending')), true);
  assert.throws(() => buildJlptN3PracticeBankV1Statements({}), /Two independent reviews are required before seeding/u);
});

test('TOPIK owner Batch 5 seeds stable refs and Google-browser speech bindings without legacy audio bindings', () => {
  assert.equal(TOPIK_OWNER_BATCH_5.length, 20);
  assert.throws(() => buildTopikOwnerBatch5Statements({}), /Two independent reviews are required before seeding/u);
  const testReviewLedger = Object.fromEntries(TOPIK_OWNER_BATCH_5.map((item) => [item.id, [
    { reviewer_id: 'test-reviewer-a', verdict: 'approved', answer_index: item.answer_index ?? null, explanation_consistent: true, reviewed_at: '2026-08-19' },
    { reviewer_id: 'test-reviewer-b', verdict: 'approved', answer_index: item.answer_index ?? null, explanation_consistent: true, reviewed_at: '2026-08-19' },
  ] as const]));
  assert.deepEqual(buildTopikOwnerBatch5Plan(testReviewLedger).manifest.counts, {
    units: 20,
    items: 20,
    stableRefs: 20,
    speechBindings: 4,
    contentRows: 40,
  });
  const sql = buildTopikOwnerBatch5Statements(testReviewLedger).join('\n');
  assert.equal((sql.match(/INSERT OR IGNORE INTO `content_speech_bindings`/gu) ?? []).length, 4);
  assert.match(sql, /'google-browser', 'ready', 'audio-script'/u);
  assert.doesNotMatch(sql, /INSERT(?: OR IGNORE)? INTO `content_audio_bindings`/u);
  assert.doesNotMatch(sql, /audio_r2_key|r2-ready|r2:\/\//iu);
  const writingItems = TOPIK_OWNER_BATCH_5.filter((item) => item.section === 'writing');
  assert.equal(writingItems.length, 4);
  assert.equal(writingItems.every((item) => item.rubric && item.rubric.ko && item.rubric.ja && item.rubric.en), true);
  assert.match(sql, /rubric_ko/u);
});
