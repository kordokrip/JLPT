import assert from 'node:assert/strict';
import test from 'node:test';

import { NEXT_CONTENT_EXPANSION_SOURCE_EVIDENCE } from '../seed/next-content-expansion-source.js';
import {
  TOPIK_OWNER_BATCH_6,
  buildTopikOwnerBatch6Plan,
  buildTopikOwnerBatch6Statements,
  type TopikOwnerBatch6Draft,
} from '../seed/topik-owner-curriculum-batch6.js';

const grades = [3, 4, 5, 6] as const;
const sections = ['vocab', 'grammar', 'reading', 'listening', 'writing'] as const;
const locales = ['ko', 'ja', 'en'] as const;

function normalized(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('und');
}

function answerCounts(items: readonly TopikOwnerBatch6Draft[]): number[] {
  return [0, 1, 2, 3].map((answerIndex) => items.filter((item) => item.answer_index === answerIndex).length);
}

function sentenceCount(value: string, locale: 'ko' | 'ja' | 'en'): number {
  if (locale === 'ja') return (value.match(/。/gu) ?? []).length;
  return (value.match(/[.!?](?=\s|$)/gu) ?? []).length;
}

function approvedLedger() {
  return Object.fromEntries(TOPIK_OWNER_BATCH_6.map((item) => [item.id, [
    {
      reviewer_id: 'batch6-test-reviewer-a',
      verdict: 'approved',
      answer_index: item.answer_index ?? null,
      explanation_consistent: true,
      reviewed_at: '2026-08-23',
    },
    {
      reviewer_id: 'batch6-test-reviewer-b',
      verdict: 'approved',
      answer_index: item.answer_index ?? null,
      explanation_consistent: true,
      reviewed_at: '2026-08-23',
    },
  ] as const]));
}

test('TOPIK owner Batch 6 has ten self-authored draft items per grade and two per section', () => {
  assert.equal(TOPIK_OWNER_BATCH_6.length, 40);
  assert.equal(new Set(TOPIK_OWNER_BATCH_6.map((item) => item.id)).size, 40);
  assert.equal(new Set(TOPIK_OWNER_BATCH_6.map((item) => normalized(item.prompt.ko))).size, 40);
  for (const grade of grades) {
    const gradeItems = TOPIK_OWNER_BATCH_6.filter((item) => item.grade === grade);
    assert.equal(gradeItems.length, 10, `TOPIK ${grade}급 item count`);
    for (const section of sections) {
      assert.equal(gradeItems.filter((item) => item.section === section).length, 2, `TOPIK ${grade}급 ${section}`);
    }
  }
  assert.equal(TOPIK_OWNER_BATCH_6.every((item) => (
    item.authorship === 'self-authored'
    && item.source_evidence_hash === NEXT_CONTENT_EXPANSION_SOURCE_EVIDENCE.intakeArtifactSha256
    && item.release_state === 'draft'
    && item.is_published === 0
    && item.reviews[0].reviewer_slot !== item.reviews[1].reviewer_slot
    && item.reviews.every((review) => review.status === 'pending')
  )), true);
});

test('each grade has eight choice items with an exact 2/2/2/2 answer distribution', () => {
  const choiceItems = TOPIK_OWNER_BATCH_6.filter((item) => item.section !== 'writing');
  assert.equal(choiceItems.length, 32);
  for (const grade of grades) {
    const gradeChoices = choiceItems.filter((item) => item.grade === grade);
    assert.deepEqual(answerCounts(gradeChoices), [2, 2, 2, 2], `TOPIK ${grade}급 answer distribution`);
  }
  for (const item of choiceItems) {
    assert.equal(item.choices?.length, 4, item.id);
    assert.equal(Number.isInteger(item.answer_index) && item.answer_index! >= 0 && item.answer_index! <= 3, true, item.id);
    for (const locale of locales) {
      const localizedChoices: string[] = item.choices!.map((candidate) => normalized(candidate[locale]));
      assert.equal(new Set(localizedChoices).size, 4, `${item.id}:${locale}`);
    }
  }
});

test('all content is multilingual and writing items carry multilingual rubrics without answer indexes', () => {
  for (const item of TOPIK_OWNER_BATCH_6) {
    for (const locale of locales) {
      assert.ok(normalized(item.title[locale]), `${item.id}:title:${locale}`);
      assert.ok(normalized(item.prompt[locale]), `${item.id}:prompt:${locale}`);
      assert.ok(normalized(item.explanation[locale]), `${item.id}:explanation:${locale}`);
      for (const candidate of item.choices ?? []) assert.ok(normalized(candidate[locale]), `${item.id}:choice:${locale}`);
    }
  }
  const writingItems = TOPIK_OWNER_BATCH_6.filter((item) => item.section === 'writing');
  assert.equal(writingItems.length, 8);
  assert.equal(writingItems.every((item) => (
    item.choices === undefined
    && item.answer_index === undefined
    && locales.every((locale) => Boolean(item.rubric && normalized(item.rubric[locale])))
  )), true);
});

test('grammar choices contain translated Japanese and English glosses and natural quoted Korean explanations', () => {
  const grammarItems = TOPIK_OWNER_BATCH_6.filter((item) => item.section === 'grammar');
  assert.equal(grammarItems.length, 8);
  for (const item of grammarItems) {
    assert.match(item.explanation.ko, /^‘-[^’]+’[은는]/u, item.id);
    for (const candidate of item.choices ?? []) {
      assert.notEqual(normalized(candidate.ja), normalized(candidate.ko), `${item.id}:ja:${candidate.ko}`);
      assert.notEqual(normalized(candidate.en), normalized(candidate.ko), `${item.id}:en:${candidate.ko}`);
    }
  }
});

test('grade 4-6 writing samples have the requested and locale-aligned sentence counts', () => {
  for (const grade of [4, 5, 6] as const) {
    const writingItems = TOPIK_OWNER_BATCH_6.filter((item) => item.grade === grade && item.section === 'writing');
    assert.equal(writingItems.length, 2);
    for (const item of writingItems) {
      for (const locale of locales) {
        assert.equal(sentenceCount(item.explanation[locale], locale), grade, `${item.id}:${locale}`);
      }
    }
  }
});

test('reviewer-blocked wording and implausible advanced distractors cannot regress', () => {
  const serialized = JSON.stringify(TOPIK_OWNER_BATCH_6);
  for (const blocked of [
    '별관 이 층',
    '追加ですること',
    '실효性',
    '제안의 결정을',
    '버스의 외부 색상이 무엇인지',
    '모든 절차를 비밀로 하는 규칙',
    '회의 자료의 글자 크기가 작기 때문에',
    '분석 프로그램이 유료이기 때문에',
  ]) {
    assert.equal(serialized.includes(blocked), false, blocked);
  }
  assert.equal(serialized.includes('는 법입니다'), false, 'ambiguous -는 법이다 distractor');
  const grade4Proposal = TOPIK_OWNER_BATCH_6.find((item) => item.id === 'topik-owner-batch6-grade4-writing-1');
  assert.ok(grade4Proposal);
  assert.match(grade4Proposal.prompt.ko, /개선 방법 두 가지/u);
  assert.match(grade4Proposal.prompt.ja, /改善方法二つ/u);
  assert.match(grade4Proposal.prompt.en, /two specific improvements/u);
  const grade6Concession = TOPIK_OWNER_BATCH_6.find((item) => item.id === 'topik-owner-batch6-grade6-grammar-1');
  assert.ok(grade6Concession);
  assert.equal(grade6Concession.title.en, 'Even if ... still');
});

test('only the eight listening items use Korean Google browser speech text', () => {
  const listeningItems = TOPIK_OWNER_BATCH_6.filter((item) => item.section === 'listening');
  const otherItems = TOPIK_OWNER_BATCH_6.filter((item) => item.section !== 'listening');
  assert.equal(listeningItems.length, 8);
  assert.equal(listeningItems.every((item) => item.speech_provider === 'google-browser' && Boolean(item.audio_text_ko?.trim())), true);
  assert.equal(otherItems.every((item) => item.speech_provider === 'unavailable' && item.audio_text_ko === null), true);
  assert.doesNotMatch(JSON.stringify(TOPIK_OWNER_BATCH_6), /audio_r2_key|r2:\/\/|r2-ready|r2-fallback/iu);
});

test('Batch 6 SQL is independent-review gated and seeds only Google speech bindings', () => {
  assert.throws(() => buildTopikOwnerBatch6Statements({}), /Two independent reviews are required before seeding/u);

  const plan = buildTopikOwnerBatch6Plan(approvedLedger());
  assert.deepEqual(plan.manifest.counts, {
    units: 40,
    items: 40,
    stableRefs: 40,
    speechBindings: 8,
    contentRows: 80,
  });
  assert.equal(plan.manifest.releaseState, 'draft');
  assert.equal(plan.manifest.reviewerState, 'pending');
  assert.equal(plan.manifest.sourceCode, NEXT_CONTENT_EXPANSION_SOURCE_EVIDENCE.sourceCode);
  assert.equal(plan.manifest.sourceAssetId, NEXT_CONTENT_EXPANSION_SOURCE_EVIDENCE.sourceAssetId);
  assert.equal(plan.manifest.sourceSha256, NEXT_CONTENT_EXPANSION_SOURCE_EVIDENCE.sourceSha256);
  assert.equal(plan.manifest.sourceEvidenceSha256, NEXT_CONTENT_EXPANSION_SOURCE_EVIDENCE.intakeArtifactSha256);

  const sql = plan.statements.join('\n');
  assert.equal((sql.match(/INSERT OR IGNORE INTO `topik_owner_authored_curriculum_units`/gu) ?? []).length, 40);
  assert.equal((sql.match(/INSERT OR IGNORE INTO `topik_owner_authored_curriculum_items`/gu) ?? []).length, 40);
  assert.equal((sql.match(/INSERT OR IGNORE INTO `learning_content_stable_refs`/gu) ?? []).length, 40);
  assert.equal((sql.match(/INSERT OR IGNORE INTO `content_speech_bindings`/gu) ?? []).length, 8);
  assert.equal((sql.match(/'ko', 'listening', 'google-browser', 'ready', 'audio-script', NULL/gu) ?? []).length, 8);
  assert.match(sql, /rubric_ko/u);
  assert.match(sql, /JLPT N2\/N1 Practice v1 · TOPIK Owner Batch 6 자체 저작/u);
  assert.doesNotMatch(sql, /INSERT(?: OR IGNORE)? INTO `content_audio_bindings`/u);
  assert.doesNotMatch(sql, /audio_r2_key|r2:\/\/|r2-ready|r2-fallback/iu);
  assert.doesNotMatch(sql, /UPDATE `?content_releases`?.*published/iu);
});
