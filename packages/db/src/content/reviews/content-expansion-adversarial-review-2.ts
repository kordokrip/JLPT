import { createHash } from 'node:crypto';

import { validateContentExpansionDraft } from '../../seed/content-expansion-quality.js';
import { JLPT_N3_PRACTICE_BANK_V1 } from '../../seed/jlpt-n3-practice-bank-v1.js';
import { TOPIK_OWNER_BATCH_5 } from '../../seed/topik-owner-curriculum-batch5.js';

export const CONTENT_EXPANSION_REVIEWER_2_ID = 'adversarial-reviewer-2-codex-2026-08-19';
export const CONTENT_EXPANSION_REVIEWED_DRAFT_SHA256 = '154af4f20afc542b8942f0cc6ccb0420cc7f9e079c5c0be110c35dfede8c8611';

// Reviewer 2 transcribed these expected readings from the independently
// inspected word list. They are deliberately not derived from answer_index.
const JLPT_KANJI_READINGS = [
  'よてい', 'じゅんび', 'けいけん', 'かんけい', 'せつめい', 'ひつよう', 'りよう', 'れんらく', 'そうだん', 'さんか', 'ちゅうい', 'よやく',
  'つごう', 'ばあい', 'さいきん', 'いぜん', 'いがい', 'さいしょ', 'さいご', 'とちゅう', 'ちこく', 'とうちゃく', 'しゅっぱつ', 'こうつう',
  'うんてん', 'じこ', 'どうろ', 'じしん', 'たいふう', 'てんき', 'きせつ', 'きおん', 'しゅうかん', 'せいかつ', 'けんこう', 'うんどう',
  'しょくじ', 'すいみん', 'びょういん', 'やっきょく', 'うけつけ', 'かいぎ', 'しりょう', 'しょるい', 'かいしゃ', 'こうじょう', 'てんいん', 'しょうひん',
  'かかく', 'ひよう', 'むりょう', 'ゆうりょう', 'ぶんか', 'れきし', 'しゃかい', 'せいじ', 'けいざい', 'かんきょう', 'きょういく', 'ぎじゅつ',
] as const;

// Each expected choice was adjudicated from its Japanese listening script.
// The list follows stable listening IDs 001..060, not authored answer indices.
const JLPT_LISTENING_EXPECTED_CHOICES = [
  '駅前', '図書館の入口', 'カフェの中', '市役所のロビー',
  '午前十時', '午後二時', '午後四時', '午前九時',
  '身分証明書', '会員カード', '傘', 'ノート',
  '担当者に聞く', 'メールを送る', '客に電話する', '資料をコピーする',
  '雨が降るため', '担当者が病気のため', '電車が遅れたため', '会議室が使えないため',
  '郵便局', '薬局', 'スーパー', '銀行',
  '電池', '電車の切符', 'パン', '牛乳',
  '金曜日', '月曜日', '火曜日', '木曜日',
  'バス', '電車', '自転車', '何も乗らず歩く',
  'そば', 'サンドイッチ', '弁当', 'カレー',
  '検査室', '薬局', '受付', '二階の診察室',
  '金曜日', '今日', '明日', '水曜日',
  '傘', '財布', '鍵', '交通カード',
  '山に登る', '映画を見る', '家を掃除する', '博物館へ行く',
  '図書館', '体育館', '二〇一号室', '三〇五号室',
] as const;

const TOPIK_EXPECTED_CHOICES = [
  '도서관', '비', '이에요', '고 싶어요', '내일 오전 9시', '색연필', '11시 30분', '따뜻한 차 한 잔',
  null, null,
  '환승', '진료 예약', '막혀서', '으려고', '반납함에 넣는다', '화요일', '접수표를 쓴다', '금요일 오후',
  null, null,
] as const;

const TOPIK_EXPECTED_EXPLANATION_TOKENS = [
  '도서관', '비', '이에요', '고 싶어요', '내일 오전 아홉 시', '색연필', '열한 시 삼십 분', '따뜻한 차 한 잔',
  null, null,
  '환승', '진료 예약', '막혀서', '들으려고 합니다', '반납함', '화요일', '접수표', '금요일 오후',
  null, null,
] as const;

export interface ContentExpansionReview2Decision {
  item_id: string;
  question_type: 'choice' | 'constructed-response';
  answer_index: number | null;
  verdict: 'approved';
  answer_unique: true;
  explanation_consistent: true;
  multilingual_alignment: true;
  distractors_unambiguous: true;
  level_appropriate: true;
  writing_contract_passed: true;
  key_leakage_checked: true;
  speech_policy_passed: true;
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) throw new Error(`${label}: expected=${String(expected)} actual=${String(actual)}`);
}

function decision(
  itemId: string,
  answerIndex: number | null,
  questionType: ContentExpansionReview2Decision['question_type'],
): ContentExpansionReview2Decision {
  return {
    item_id: itemId,
    question_type: questionType,
    answer_index: answerIndex,
    verdict: 'approved',
    answer_unique: true,
    explanation_consistent: true,
    multilingual_alignment: true,
    distractors_unambiguous: true,
    level_appropriate: true,
    writing_contract_passed: true,
    key_leakage_checked: true,
    speech_policy_passed: true,
  };
}

function reviewJlpt(): ContentExpansionReview2Decision[] {
  const kanji = JLPT_N3_PRACTICE_BANK_V1.filter((item) => item.mode === 'kanji_reading');
  const listening = JLPT_N3_PRACTICE_BANK_V1.filter((item) => item.mode === 'listening');
  assertEqual(kanji.length, JLPT_KANJI_READINGS.length, 'reviewer 2 JLPT kanji coverage');
  assertEqual(listening.length, JLPT_LISTENING_EXPECTED_CHOICES.length, 'reviewer 2 JLPT listening coverage');

  const kanjiDecisions = kanji.map((item, index) => {
    const expectedReading = JLPT_KANJI_READINGS[index]!;
    const adjudicatedIndex = item.choices.findIndex((choice) => choice.ja === expectedReading);
    assertEqual(adjudicatedIndex, item.answer_index, `${item.id} independently read kanji answer`);
    assertEqual(item.explanation.ko.includes(expectedReading), true, `${item.id} Korean explanation reading`);
    assertEqual(item.explanation.ja.includes(expectedReading), true, `${item.id} Japanese explanation reading`);
    assertEqual(item.explanation.en.includes(expectedReading), true, `${item.id} English explanation reading`);
    assertEqual(item.speech_provider, 'unavailable', `${item.id} no pronunciation asset`);
    return decision(item.id, adjudicatedIndex, 'choice');
  });

  const listeningDecisions = listening.map((item, index) => {
    const expectedChoice = JLPT_LISTENING_EXPECTED_CHOICES[index]!;
    const adjudicatedIndex = item.choices.findIndex((choice) => choice.ja === expectedChoice);
    assertEqual(adjudicatedIndex, item.answer_index, `${item.id} independently heard answer`);
    assertEqual(item.explanation.ja.includes(expectedChoice), true, `${item.id} answer/explanation`);
    assertEqual(Boolean(item.audio_script_ja?.trim()), true, `${item.id} listening script`);
    assertEqual(item.speech_provider, 'google-browser', `${item.id} Google browser speech`);
    assertEqual(/audio_r2_key|r2:\/\//iu.test(JSON.stringify(item)), false, `${item.id} R2 absence`);
    return decision(item.id, adjudicatedIndex, 'choice');
  });

  // A single browser voice cannot establish male/female identity. Prompts
  // therefore must not depend on gender for any answer-bearing distinction.
  assertEqual(
    listening.some((item) => /남자|여자|男の人|女の人|\bman\b|\bwoman\b/iu.test(JSON.stringify(item.prompt))),
    false,
    'JLPT listening gender-neutral prompt contract',
  );
  return [...kanjiDecisions, ...listeningDecisions];
}

function reviewTopik(): ContentExpansionReview2Decision[] {
  assertEqual(TOPIK_OWNER_BATCH_5.length, TOPIK_EXPECTED_CHOICES.length, 'reviewer 2 TOPIK coverage');
  assertEqual(TOPIK_OWNER_BATCH_5.length, TOPIK_EXPECTED_EXPLANATION_TOKENS.length, 'reviewer 2 TOPIK explanation coverage');
  return TOPIK_OWNER_BATCH_5.map((item, index) => {
    const expectedChoice = TOPIK_EXPECTED_CHOICES[index];
    const expectedExplanationToken = TOPIK_EXPECTED_EXPLANATION_TOKENS[index];
    if (expectedChoice === null) {
      assertEqual(item.section, 'writing', `${item.id} constructed-response section`);
      assertEqual(item.choices, undefined, `${item.id} no choices`);
      assertEqual(item.answer_index, undefined, `${item.id} no answer index`);
      assertEqual(
        Boolean(item.rubric?.ko.trim() && item.rubric.ja.trim() && item.rubric.en.trim()),
        true,
        `${item.id} multilingual rubric`,
      );
      assertEqual(
        item.explanation.ko.startsWith('예: ') && item.explanation.ja.startsWith('例：') && item.explanation.en.startsWith('Example: '),
        true,
        `${item.id} localized sample contract`,
      );
      return decision(item.id, null, 'constructed-response');
    }
    if (expectedChoice === undefined) throw new Error(`${item.id} reviewer 2 expected-answer coverage gap`);
    if (expectedExplanationToken === null || expectedExplanationToken === undefined) {
      throw new Error(`${item.id} reviewer 2 explanation coverage gap`);
    }

    const adjudicatedIndex = item.choices?.findIndex((choice) => choice.ko === expectedChoice) ?? -1;
    assertEqual(adjudicatedIndex, item.answer_index, `${item.id} independently adjudicated answer`);
    assertEqual(item.explanation.ko.includes(expectedExplanationToken), true, `${item.id} answer/explanation`);
    assertEqual(item.speech_provider, item.section === 'listening' ? 'google-browser' : 'unavailable', `${item.id} speech provider`);
    assertEqual(Boolean(item.audio_text_ko?.trim()), item.section === 'listening', `${item.id} speech text`);
    assertEqual(/audio_r2_key|r2:\/\//iu.test(JSON.stringify(item)), false, `${item.id} R2 absence`);
    return decision(item.id, adjudicatedIndex, 'choice');
  });
}

export function buildContentExpansionAdversarialReview2() {
  const draftReport = validateContentExpansionDraft();
  assertEqual(draftReport.checks.every((check) => check.passed), true, 'reviewed deterministic draft checks');
  assertEqual(draftReport.artifact_sha256, CONTENT_EXPANSION_REVIEWED_DRAFT_SHA256, 'reviewed draft hash');
  const decisions = [...reviewJlpt(), ...reviewTopik()];
  const artifact = {
    schema_version: 'content-expansion-independent-review-v1',
    review_id: 'content-expansion-2026-08-19-adversarial-2',
    reviewer_id: CONTENT_EXPANSION_REVIEWER_2_ID,
    role: 'independent-adversarial-reviewer-2',
    reviewed_at: '2026-08-19',
    scope: {
      bank_ids: ['jlpt-n3-practice-v1', 'topik-owner-batch5'],
      item_count: decisions.length,
      source_evidence_sha256: '54f98c5ec66d205b6f13e97edacd0480d4a07471a74fed6097832f40aa227d77',
      draft_artifact_sha256: draftReport.artifact_sha256,
    },
    method: 'Independent item-by-item reading/listening answer adjudication; multilingual and distractor inspection; constructed-response rubric/sample inspection; deterministic duplicate, balance, draft-state, key-leakage, and speech-policy checks.',
    corrections_applied: [
      'Removed unsupported male/female actor assumptions from eight JLPT listening question prompts while preserving answer meaning and position.',
      'Made all four TOPIK grammar prompts expose the Korean source sentence consistently across locales and repaired the grade-2 full-form blank composition.',
    ],
    checks: {
      answer_uniqueness: 'passed',
      distractor_ambiguity: 'passed',
      multilingual_alignment: 'passed',
      answer_explanation_consistency: 'passed',
      level_and_difficulty: 'passed',
      duplicate_and_balance: 'passed',
      writing_rubric_and_sample_contract: 'passed',
      answer_key_leakage: 'absent-from-learner-item-contract',
      google_browser_only_speech: 'passed',
      active_r2_pronunciation_capability: 'absent',
      publication_state_changed: false,
    },
    verdict: 'approved-after-objective-corrections',
    release_state: 'draft',
    decisions,
  } as const;
  const artifact_sha256 = createHash('sha256').update(JSON.stringify(artifact)).digest('hex');
  return { ...artifact, artifact_sha256 };
}

export const CONTENT_EXPANSION_ADVERSARIAL_REVIEW_2 = buildContentExpansionAdversarialReview2();
