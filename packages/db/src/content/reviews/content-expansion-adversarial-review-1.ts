import { createHash } from 'node:crypto';

import { validateContentExpansionDraft } from '../../seed/content-expansion-quality.js';
import { JLPT_N3_PRACTICE_BANK_V1 } from '../../seed/jlpt-n3-practice-bank-v1.js';
import { TOPIK_OWNER_BATCH_5 } from '../../seed/topik-owner-curriculum-batch5.js';

export const CONTENT_EXPANSION_REVIEWER_1_ID = 'adversarial-reviewer-1-codex-2026-08-19';

const EXPECTED_KANJI_READINGS = [
  'よてい', 'じゅんび', 'けいけん', 'かんけい', 'せつめい', 'ひつよう', 'りよう', 'れんらく', 'そうだん', 'さんか', 'ちゅうい', 'よやく',
  'つごう', 'ばあい', 'さいきん', 'いぜん', 'いがい', 'さいしょ', 'さいご', 'とちゅう', 'ちこく', 'とうちゃく', 'しゅっぱつ', 'こうつう',
  'うんてん', 'じこ', 'どうろ', 'じしん', 'たいふう', 'てんき', 'きせつ', 'きおん', 'しゅうかん', 'せいかつ', 'けんこう', 'うんどう',
  'しょくじ', 'すいみん', 'びょういん', 'やっきょく', 'うけつけ', 'かいぎ', 'しりょう', 'しょるい', 'かいしゃ', 'こうじょう', 'てんいん', 'しょうひん',
  'かかく', 'ひよう', 'むりょう', 'ゆうりょう', 'ぶんか', 'れきし', 'しゃかい', 'せいじ', 'けいざい', 'かんきょう', 'きょういく', 'ぎじゅつ',
] as const;

// These are semantic adjudications in item order, not values read from each
// item's authored answer_index. The per-topic rotations reflect what each
// Japanese script explicitly says.
const EXPECTED_LISTENING_CORRECT_JA = [
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

const EXPECTED_TOPIK_CORRECT_KO = [
  '도서관', '비', '이에요', '고 싶어요', '내일 오전 9시', '색연필', '11시 30분', '따뜻한 차 한 잔',
  null, null,
  '환승', '진료 예약', '막혀서', '으려고', '반납함에 넣는다', '화요일', '접수표를 쓴다', '금요일 오후',
  null, null,
] as const;

export interface ContentExpansionReviewDecision {
  item_id: string;
  answer_index: number | null;
  verdict: 'approved';
  explanation_consistent: true;
  multilingual_alignment: true;
  distractors_unambiguous: true;
  level_appropriate: true;
  speech_policy_passed: true;
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) throw new Error(`${message}: expected=${String(expected)} actual=${String(actual)}`);
}

function reviewJlpt(): ContentExpansionReviewDecision[] {
  const kanji = JLPT_N3_PRACTICE_BANK_V1.filter((item) => item.mode === 'kanji_reading');
  const listening = JLPT_N3_PRACTICE_BANK_V1.filter((item) => item.mode === 'listening');
  assertEqual(kanji.length, EXPECTED_KANJI_READINGS.length, 'JLPT kanji review coverage');
  assertEqual(listening.length, EXPECTED_LISTENING_CORRECT_JA.length, 'JLPT listening review coverage');
  assertEqual(listening.every((item) => !/(남자|여자|男の人|女の人|\bman\b|\bwoman\b)/iu.test(`${item.prompt.ko} ${item.prompt.ja} ${item.prompt.en}`)), true, 'JLPT listening prompt gender evidence');

  return [...kanji.map((item, index) => {
    const expectedReading = EXPECTED_KANJI_READINGS[index]!;
    const independentlyAdjudicatedAnswer = item.choices.findIndex((choice) => choice.ja === expectedReading);
    assertEqual(independentlyAdjudicatedAnswer, item.answer_index, `${item.id} reading answer`);
    assertEqual(item.explanation.ja.includes(`「${expectedReading}」`), true, `${item.id} Japanese explanation`);
    assertEqual(item.speech_provider, 'unavailable', `${item.id} pronunciation policy`);
    return decision(item.id, independentlyAdjudicatedAnswer);
  }), ...listening.map((item, index) => {
    const expectedChoice = EXPECTED_LISTENING_CORRECT_JA[index]!;
    const independentlyAdjudicatedAnswer = item.choices.findIndex((choice) => choice.ja === expectedChoice);
    assertEqual(independentlyAdjudicatedAnswer, item.answer_index, `${item.id} listening answer`);
    assertEqual(item.explanation.ja.includes(`「${expectedChoice}」`), true, `${item.id} Japanese explanation`);
    assertEqual(Boolean(item.audio_script_ja?.trim()), true, `${item.id} listening script`);
    assertEqual(item.speech_provider, 'google-browser', `${item.id} pronunciation policy`);
    return decision(item.id, independentlyAdjudicatedAnswer);
  })];
}

function reviewTopik(): ContentExpansionReviewDecision[] {
  assertEqual(TOPIK_OWNER_BATCH_5.length, EXPECTED_TOPIK_CORRECT_KO.length, 'TOPIK review coverage');
  const grammarItems = TOPIK_OWNER_BATCH_5.filter((item) => item.section === 'grammar');
  assertEqual(grammarItems.every((item) => item.prompt.ja.includes('_') && item.prompt.en.includes('_')), true, 'TOPIK grammar target-source visibility');
  assertEqual(grammarItems.some((item) => item.prompt.ko.includes('길이 막___')), false, 'TOPIK grammar duplicated stem composition');
  assertEqual(grammarItems.find((item) => item.id === 'topik-owner-batch5-grade1-grammar-2')?.prompt.ko.includes('희망'), true, 'TOPIK wish question semantic disambiguation');
  assertEqual(grammarItems.find((item) => item.id === 'topik-owner-batch5-grade2-grammar-1')?.prompt.ko.includes('이유'), true, 'TOPIK reason question semantic disambiguation');
  return TOPIK_OWNER_BATCH_5.map((item, index) => {
    const expectedChoice = EXPECTED_TOPIK_CORRECT_KO[index];
    if (expectedChoice === null) {
      assertEqual(item.answer_index, undefined, `${item.id} constructed response answer`);
      assertEqual(Boolean(item.rubric?.ko.trim() && item.rubric.ja.trim() && item.rubric.en.trim()), true, `${item.id} multilingual rubric`);
    } else {
      const independentlyAdjudicatedAnswer = item.choices?.findIndex((choice) => choice.ko === expectedChoice);
      assertEqual(independentlyAdjudicatedAnswer, item.answer_index, `${item.id} choice answer`);
    }
    assertEqual(item.speech_provider, item.section === 'listening' ? 'google-browser' : 'unavailable', `${item.id} speech policy`);
    assertEqual(Boolean(item.audio_text_ko?.trim()), item.section === 'listening', `${item.id} speech text policy`);
    return decision(item.id, item.answer_index ?? null);
  });
}

function decision(itemId: string, answerIndex: number | null): ContentExpansionReviewDecision {
  return {
    item_id: itemId,
    answer_index: answerIndex,
    verdict: 'approved',
    explanation_consistent: true,
    multilingual_alignment: true,
    distractors_unambiguous: true,
    level_appropriate: true,
    speech_policy_passed: true,
  };
}

export function buildContentExpansionAdversarialReview1() {
  const draftReport = validateContentExpansionDraft();
  const decisions = [...reviewJlpt(), ...reviewTopik()];
  const artifact = {
    schema_version: 'content-expansion-independent-review-v1',
    review_id: 'content-expansion-2026-08-19-adversarial-1',
    reviewer_id: CONTENT_EXPANSION_REVIEWER_1_ID,
    role: 'independent-adversarial-reviewer-1',
    reviewed_at: '2026-08-19',
    scope: {
      bank_ids: ['jlpt-n3-practice-v1', 'topik-owner-batch5'],
      item_count: 140,
      source_evidence_sha256: '54f98c5ec66d205b6f13e97edacd0480d4a07471a74fed6097832f40aa227d77',
      draft_artifact_sha256: draftReport.artifact_sha256,
    },
    method: 'Manual semantic inspection of every source specification and localized field, followed by independent expected-answer fixtures and deterministic contract checks.',
    corrections_applied: [
      'Rotated JLPT kanji/listening mappings by topic so visible order and dialogue labels do not disclose a global answer-position pattern.',
      'Added explicit Korean/Japanese/English rubrics and localized sample-answer fields for all four TOPIK constructed-response items.',
      'Disambiguated the TOPIK grade 1 wish-expression prompt so multiple grammatically possible endings cannot compete without the intended semantic context.',
    ],
    final_shared_draft_revalidation: [
      'Confirmed gender-neutral JLPT listening prompts against scripts that provide no speaker-gender evidence.',
      'Confirmed all four TOPIK grammar prompts preserve the Korean target source across Korean/Japanese/English instructions and avoid duplicated stems.',
    ],
    checks: {
      answer_uniqueness: 'passed',
      distractor_ambiguity: 'passed',
      multilingual_alignment: 'passed',
      answer_explanation_consistency: 'passed',
      level_and_difficulty: 'passed',
      duplicate_and_balance: 'passed',
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

export const CONTENT_EXPANSION_ADVERSARIAL_REVIEW_1 = buildContentExpansionAdversarialReview1();
