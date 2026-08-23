import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import {
  JLPT_N1_PRACTICE_BANK_V1,
  JLPT_N1_PRACTICE_BANK_VERSION,
  JLPT_N2_PRACTICE_BANK_V1,
  JLPT_N2_PRACTICE_BANK_VERSION,
  buildJlptN1PracticeBankV1Plan,
  buildJlptN2PracticeBankV1Plan,
  type JlptNextPracticeDraft,
  type JlptNextPracticeMode,
  type IndependentReviewLedger,
} from '../seed/jlpt-n2-n1-practice-banks-v1.js';
import { NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256 } from '../seed/next-content-expansion-source.js';

const MODES: readonly JlptNextPracticeMode[] = ['vocab_mc', 'grammar_fill', 'kanji_reading', 'listening'];
const MODE_DISTRIBUTIONS: Readonly<Record<JlptNextPracticeMode, readonly number[]>> = {
  vocab_mc: [3, 4, 4, 4],
  grammar_fill: [4, 3, 4, 4],
  kanji_reading: [4, 4, 3, 4],
  listening: [4, 4, 4, 3],
};

function answerCounts(items: readonly JlptNextPracticeDraft[]): readonly number[] {
  return [0, 1, 2, 3].map((answerIndex) => items.filter((item) => item.answer_index === answerIndex).length);
}

function assertBankContract(
  items: readonly JlptNextPracticeDraft[],
  level: 'N2' | 'N1',
  bankVersion: string,
): void {
  assert.equal(items.length, 60);
  assert.equal(new Set(items.map((item) => item.id)).size, 60);
  assert.equal(new Set(items.map((item) => item.prompt.ja)).size, 60);
  assert.deepEqual(answerCounts(items), [15, 15, 15, 15]);

  for (const mode of MODES) {
    const section = items.filter((item) => item.mode === mode);
    assert.equal(section.length, 15, `${level}/${mode} count`);
    assert.deepEqual(answerCounts(section), MODE_DISTRIBUTIONS[mode], `${level}/${mode} answer balance`);
    assert.deepEqual(
      [1, 2, 3, 4, 5].map((difficulty) => section.filter((item) => item.difficulty === difficulty).length),
      [3, 3, 3, 3, 3],
      `${level}/${mode} difficulty balance`,
    );
  }

  for (const item of items) {
    assert.equal(item.level, level);
    assert.equal(item.bank_version, bankVersion);
    assert.equal(item.source_evidence_hash, NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256);
    assert.match(item.source_evidence_hash, /^[a-f0-9]{64}$/u);
    assert.equal(item.authorship, 'self-authored');
    assert.equal(item.is_published, 0);
    assert.deepEqual(item.reviews, [
      { reviewer_slot: 'adversarial-1', status: 'pending' },
      { reviewer_slot: 'adversarial-2', status: 'pending' },
    ]);
    assert.equal([item.prompt, item.explanation, ...item.choices].every((value) => (
      value.ko.trim().length > 0 && value.ja.trim().length > 0 && value.en.trim().length > 0
    )), true);
    assert.equal(item.choices.length, 4);
    for (const locale of ['ko', 'ja', 'en'] as const) {
      assert.equal(new Set(item.choices.map((choice) => choice[locale].normalize('NFKC').trim())).size, 4);
    }
    assert.ok(item.answer_index >= 0 && item.answer_index <= 3);
    if (item.mode === 'listening') {
      assert.equal(item.speech_provider, 'google-browser');
      assert.equal(item.speech_language, 'ja-JP');
      assert.ok(item.audio_script_ja?.trim());
    } else {
      assert.equal(item.speech_provider, 'unavailable');
      assert.equal(item.speech_language, null);
      assert.equal(item.audio_script_ja, null);
    }
  }
  assert.doesNotMatch(JSON.stringify(items), /r2:\/\/|audio_r2_key|content_audio_bindings|object_key/iu);
}

function approvedLedger(items: readonly JlptNextPracticeDraft[]): IndependentReviewLedger {
  return Object.fromEntries(items.map((item) => [item.id, [
    { reviewer_id: 'test-reviewer-a', verdict: 'approved', answer_index: item.answer_index, explanation_consistent: true, reviewed_at: '2026-08-23' },
    { reviewer_id: 'test-reviewer-b', verdict: 'approved', answer_index: item.answer_index, explanation_consistent: true, reviewed_at: '2026-08-23' },
  ] as const]));
}

test('N2 practice v1 has 60 balanced multilingual self-authored drafts', () => {
  assertBankContract(JLPT_N2_PRACTICE_BANK_V1, 'N2', JLPT_N2_PRACTICE_BANK_VERSION);
});

test('N1 practice v1 has 60 balanced multilingual self-authored drafts', () => {
  assertBankContract(JLPT_N1_PRACTICE_BANK_V1, 'N1', JLPT_N1_PRACTICE_BANK_VERSION);
});

test('reviewer-reported JLPT ambiguity, typo, and translation regressions remain fixed', () => {
  const serialized = JSON.stringify([JLPT_N2_PRACTICE_BANK_V1, JLPT_N1_PRACTICE_BANK_V1]);
  assert.doesNotMatch(serialized, /쓹니다|예외이 될|바꿘습니다|나탅니다|甲社|乙社|을\(乙\)|갑 회사|こととて|とあれば|しげんう|ぜいじゃくう|ほかはない|どころか|あげく|べきだけ|ないとも限らない|못 배긴다|日程に近づける/u);

  const n2InstitutionalRule = JLPT_N2_PRACTICE_BANK_V1.find((item) => item.prompt.ja.includes('すべての来館者'));
  assert.ok(n2InstitutionalRule);
  assert.equal(n2InstitutionalRule.choices.some((choice) => choice.ja === 'ことにしている'), false);

  const n1UnconsciousLook = JLPT_N1_PRACTICE_BANK_V1.find((item) => item.prompt.ja.includes('窓の外'));
  assert.ok(n1UnconsciousLook);
  assert.equal(n1UnconsciousLook.choices.some((choice) => choice.ja === 'とはいえ' || choice.ja === 'というものの'), false);

  const n1FormalVisit = JLPT_N1_PRACTICE_BANK_V1.find((item) => item.prompt.ja.includes('ご報告'));
  assert.ok(n1FormalVisit);
  assert.equal(n1FormalVisit.choices.some((choice) => choice.ja === 'がてら'), false);

  const manifestMeaning = JLPT_N1_PRACTICE_BANK_V1.find((item) => item.prompt.ja.includes('顕在'));
  assert.ok(manifestMeaning);
  assert.match(manifestMeaning.explanation.ko, /겉으로 분명히 드러나/u);

  const n1SafetyConcession = JLPT_N1_PRACTICE_BANK_V1.find((item) => item.prompt.ja.includes('災害時'));
  assert.ok(n1SafetyConcession);
  assert.equal(n1SafetyConcession.choices[n1SafetyConcession.answer_index]?.ja, 'といえども');

  const n1Purpose = JLPT_N1_PRACTICE_BANK_V1.find((item) => item.prompt.ja.includes('そのための追加実験'));
  assert.ok(n1Purpose);
  assert.equal(n1Purpose.choices[n1Purpose.answer_index]?.ja, 'べく');
  assert.equal(n1Purpose.choices.find((choice) => choice.ja === 'まじく')?.ko, '〜해서는 안 되며·〜할 리 없게');
  const n1InevitableEffect = JLPT_N1_PRACTICE_BANK_V1.find((item) => item.prompt.ja.includes('必ず揺さぶら'));
  assert.ok(n1InevitableEffect);
  assert.equal(n1InevitableEffect.choices[n1InevitableEffect.answer_index]?.ja, 'ずにはおかない');
  const n2RepeatedMemory = JLPT_N2_PRACTICE_BANK_V1.find((item) => item.prompt.ja.includes('毎回'));
  assert.ok(n2RepeatedMemory);
  assert.equal(n2RepeatedMemory.choices[n2RepeatedMemory.answer_index]?.ja, 'たびに');
  const n1ObviousFact = JLPT_N1_PRACTICE_BANK_V1.find((item) => item.prompt.ja.includes('全員が承知'));
  assert.ok(n1ObviousFact);
  assert.equal(n1ObviousFact.choices[n1ObviousFact.answer_index]?.ja, 'までもない');
  assert.equal(n1ObviousFact.choices.some((choice) => choice.ja === 'までのことだ'), false);
  const n1AbsentMinded = JLPT_N1_PRACTICE_BANK_V1.find((item) => item.prompt.ja.includes('特に意識せず'));
  assert.ok(n1AbsentMinded);
  assert.equal(n1AbsentMinded.choices[n1AbsentMinded.answer_index]?.ja, 'ともなく');
  const n2PositiveInference = JLPT_N2_PRACTICE_BANK_V1.find((item) => item.prompt.ja.includes('自治会の相談役'));
  assert.ok(n2PositiveInference);
  assert.equal(n2PositiveInference.choices[n2PositiveInference.answer_index]?.ja, 'に違いない');
  assert.equal(n2PositiveInference.choices.some((choice) => choice.ja === 'わけではない'), false);
  assert.equal(n2InstitutionalRule?.choices.find((choice) => choice.ja === 'ことに決めたばかりである')?.en, 'have only just decided to receive it');
  const n2CancellationRisk = JLPT_N2_PRACTICE_BANK_V1.find((item) => item.prompt.ja.includes('今夜の便'));
  assert.equal(n2CancellationRisk?.choices.find((choice) => choice.ja === 'ようになる')?.en, 'come to or start to');
  const n2Audibility = JLPT_N2_PRACTICE_BANK_V1.find((item) => item.prompt.ja.includes('後ろの人'));
  assert.match(n2Audibility?.explanation.ja ?? '', /後ろの人にも声が聞こえる/u);
  const n2Nickname = JLPT_N2_PRACTICE_BANK_V1.find((item) => item.prompt.ja.includes('水の都'));
  assert.equal(n2Nickname?.choices.find((choice) => choice.ja === 'ことには')?.en, 'as for the fact that');
  const n1Range = JLPT_N1_PRACTICE_BANK_V1.find((item) => item.prompt.ja.includes('古代文学'));
  assert.equal(n1Range?.choices.find((choice) => choice.ja === 'に至っては')?.en, 'when it comes to');
});

test('SQL plan generation is blocked until every item has two independent approvals', () => {
  assert.throws(() => buildJlptN2PracticeBankV1Plan({}), /Two independent reviews are required before seeding/u);
  const ledger = { ...approvedLedger(JLPT_N1_PRACTICE_BANK_V1) };
  const first = JLPT_N1_PRACTICE_BANK_V1[0]!;
  ledger[first.id] = [
    { reviewer_id: 'same-reviewer', verdict: 'approved', answer_index: first.answer_index, explanation_consistent: true, reviewed_at: '2026-08-23' },
    { reviewer_id: 'same-reviewer', verdict: 'approved', answer_index: first.answer_index, explanation_consistent: true, reviewed_at: '2026-08-23' },
  ];
  assert.throws(() => buildJlptN1PracticeBankV1Plan(ledger), /Reviewer identities must be non-empty and distinct/u);
});

test('draft SQL plans are idempotent, unpublished, and never overwrite a published row', async () => {
  const migration = await readFile(new URL('../../drizzle-v2/0025_jlpt_practice_questions.sql', import.meta.url), 'utf8');
  const db = new DatabaseSync(':memory:');
  db.exec(migration.replaceAll('--> statement-breakpoint', ''));

  const plans = [
    buildJlptN2PracticeBankV1Plan(approvedLedger(JLPT_N2_PRACTICE_BANK_V1)),
    buildJlptN1PracticeBankV1Plan(approvedLedger(JLPT_N1_PRACTICE_BANK_V1)),
  ];
  assert.deepEqual(plans.map((plan) => plan.manifest.counts.questions), [60, 60]);
  assert.equal(plans.every((plan) => plan.manifest.releaseState === 'draft'), true);
  assert.equal(plans.every((plan) => plan.manifest.reviewerState === 'pending'), true);
  assert.equal(plans.every((plan) => plan.manifest.speechPolicy === 'google-browser-only-no-persisted-audio'), true);

  const sql = plans.flatMap((plan) => plan.statements).join('\n');
  assert.equal((sql.match(/INSERT INTO `jlpt_practice_questions`/gu) ?? []).length, 120);
  assert.doesNotMatch(sql, /is_published`\s*=\s*1|content_audio_bindings|audio_r2_key|r2:\/\//iu);
  db.exec(sql);
  db.exec(sql);

  assert.deepEqual(db.prepare(`
    SELECT level, count(*) AS count, sum(is_published) AS published
    FROM jlpt_practice_questions GROUP BY level ORDER BY level
  `).all().map((row) => ({ ...row })), [
    { level: 'N1', count: 60, published: 0 },
    { level: 'N2', count: 60, published: 0 },
  ]);

  const lockedId = JLPT_N2_PRACTICE_BANK_V1[0]!.id;
  db.prepare('UPDATE jlpt_practice_questions SET is_published = 1, prompt_ko = ? WHERE id = ?')
    .run('PUBLISHED ROW MUST REMAIN UNCHANGED', lockedId);
  db.exec(buildJlptN2PracticeBankV1Plan(approvedLedger(JLPT_N2_PRACTICE_BANK_V1)).statements.join('\n'));
  assert.deepEqual(
    { ...db.prepare('SELECT is_published, prompt_ko FROM jlpt_practice_questions WHERE id = ?').get(lockedId) },
    { is_published: 1, prompt_ko: 'PUBLISHED ROW MUST REMAIN UNCHANGED' },
  );
  db.close();
});
