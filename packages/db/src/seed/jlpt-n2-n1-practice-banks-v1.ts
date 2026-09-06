import {
  NEXT_CONTENT_EXPANSION_SOURCE_ASSET_ID,
  NEXT_CONTENT_EXPANSION_SOURCE_CODE,
  NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256,
  NEXT_CONTENT_EXPANSION_SOURCE_SHA256,
} from './next-content-expansion-source.js';
import {
  N1_GRAMMAR_SPECS,
  N1_KANJI_SPECS,
  N1_LISTENING_SPECS,
  N1_VOCABULARY_SPECS,
  N2_GRAMMAR_SPECS,
  N2_KANJI_SPECS,
  N2_LISTENING_SPECS,
  N2_VOCABULARY_SPECS,
  localized,
  type GrammarSpec,
  type KanjiSpec,
  type ListeningSpec,
  type LocalizedText,
  type VocabularySpec,
} from './jlpt-n2-n1-practice-content-v1.js';
import type {
  IndependentItemReview,
  IndependentReviewLedger,
} from './jlpt-n3-practice-bank-v1.js';
import { esc, escJson } from './utils.js';

export type { IndependentReviewLedger } from './jlpt-n3-practice-bank-v1.js';

export const JLPT_N2_PRACTICE_BANK_VERSION = 'jlpt-n2-practice-v1';
export const JLPT_N1_PRACTICE_BANK_VERSION = 'jlpt-n1-practice-v1';

export type JlptNextPracticeLevel = 'N2' | 'N1';
export type JlptNextPracticeMode = 'vocab_mc' | 'grammar_fill' | 'kanji_reading' | 'listening';
export type PendingReview = Readonly<{ reviewer_slot: 'adversarial-1' | 'adversarial-2'; status: 'pending' }>;

export interface JlptNextPracticeDraft {
  id: string;
  level: JlptNextPracticeLevel;
  mode: JlptNextPracticeMode;
  skill: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  difficulty_rationale: string;
  prompt: LocalizedText;
  choices: readonly [LocalizedText, LocalizedText, LocalizedText, LocalizedText];
  answer_index: 0 | 1 | 2 | 3;
  explanation: LocalizedText;
  audio_script_ja: string | null;
  speech_provider: 'google-browser' | 'unavailable';
  speech_language: 'ja-JP' | null;
  source_evidence_hash: string;
  bank_version: string;
  authorship: 'self-authored';
  reviews: readonly [PendingReview, PendingReview];
  is_published: 0;
}

const ANSWER_POSITIONS: Readonly<Record<JlptNextPracticeMode, readonly (0 | 1 | 2 | 3)[]>> = {
  vocab_mc: [0, 1, 2, 3, 1, 2, 3, 0, 2, 3, 1, 0, 3, 1, 2],
  grammar_fill: [0, 1, 2, 3, 0, 2, 3, 1, 0, 3, 2, 1, 0, 2, 3],
  kanji_reading: [0, 1, 2, 3, 0, 1, 3, 2, 0, 3, 1, 2, 0, 1, 3],
  listening: [0, 1, 2, 3, 0, 1, 2, 0, 3, 1, 2, 0, 3, 1, 2],
} as const;

const SKILLS: Readonly<Record<JlptNextPracticeMode, string>> = {
  vocab_mc: 'vocabulary-in-context',
  grammar_fill: 'grammar-in-context',
  kanji_reading: 'kanji-reading',
  listening: 'listening-comprehension',
};

const DIFFICULTY_CALIBRATION = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5] as const;

const DIFFICULTY_RATIONALES: Readonly<Record<JlptNextPracticeLevel, Readonly<Record<JlptNextPracticeMode, readonly string[]>>>> = {
  N2: {
    vocab_mc: ['frequent contextual adverb and condition verbs', 'workplace action and obligation vocabulary', 'organization and community vocabulary', 'pragmatic nuance in ambiguous or avoidance language', 'abstract demand and information-state vocabulary'],
    grammar_fill: ['high-frequency inference, partial negation, and rule forms', 'repetition, risk, and direct contrast', 'additive contrast and condition-sensitive forms', 'formal sequence, interruption, and factual-cause forms', 'register-sensitive exception and parallel-change forms'],
    kanji_reading: ['high-frequency two-kanji workplace words', 'voicing and long-vowel distinctions', 'less transparent readings in abstract nouns', 'formal resources and probability terminology', 'responsibility and disaster-policy compounds'],
    listening: ['single explicit time, order, or purchase fact', 'route and schedule revision across two facts', 'priority and reason selection with script-linked distractors', 'multi-step plan changes and delayed outcomes', 'constraint comparison and final-choice inference'],
  },
  N1: {
    vocab_mc: ['common formal evaluation and concern vocabulary', 'policy continuity, execution, and search vocabulary', 'institutional correction and information-state vocabulary', 'system vulnerability, deviation, and stakeholder consideration', 'formal document, process, and control vocabulary'],
    grammar_fill: ['formal sequence, contrast, and purpose patterns', 'counterfactual limits and inevitable-effect patterns', 'circumstantial and exclusivity patterns', 'range, compulsion, and obviousness patterns', 'literary adverbial and appearance patterns'],
    kanji_reading: ['formal execution and risk compounds', 'specialized promotion and comprehension compounds', 'less transparent policy and precedent readings', 'formal measure, validity, and prosperity readings', 'legal compensation, deviation, and descriptive-state readings'],
    listening: ['explicit conditional decision and evidence limitation', 'risk mitigation and policy-scope interpretation', 'customer continuity, contractual priority, and ordered tasks', 'competency inference, budget tradeoff, and statistical conclusion', 'editorial, legal, incident, procurement, and policy synthesis'],
  },
} as const;

const pendingReviews = (): readonly [PendingReview, PendingReview] => [
  { reviewer_slot: 'adversarial-1', status: 'pending' },
  { reviewer_slot: 'adversarial-2', status: 'pending' },
];

function difficultyAt(index: number): 1 | 2 | 3 | 4 | 5 {
  const difficulty = DIFFICULTY_CALIBRATION[index];
  if (difficulty === undefined) throw new Error(`Missing difficulty calibration: ${index}`);
  return difficulty;
}

function difficultyRationale(level: JlptNextPracticeLevel, mode: JlptNextPracticeMode, index: number): string {
  const difficulty = difficultyAt(index);
  const rationale = DIFFICULTY_RATIONALES[level][mode][difficulty - 1];
  if (!rationale) throw new Error(`Missing difficulty rationale: ${level}/${mode}/${difficulty}`);
  return `${level} ${mode} difficulty ${difficulty}: ${rationale}`;
}

function placeAnswer(
  answer: LocalizedText,
  distractors: readonly [LocalizedText, LocalizedText, LocalizedText],
  answerIndex: 0 | 1 | 2 | 3,
): readonly [LocalizedText, LocalizedText, LocalizedText, LocalizedText] {
  const choices = [...distractors.slice(0, answerIndex), answer, ...distractors.slice(answerIndex)];
  return choices as unknown as readonly [LocalizedText, LocalizedText, LocalizedText, LocalizedText];
}

function baseItem(
  level: JlptNextPracticeLevel,
  mode: JlptNextPracticeMode,
  index: number,
  prompt: LocalizedText,
  answer: LocalizedText,
  distractors: readonly [LocalizedText, LocalizedText, LocalizedText],
  explanation: LocalizedText,
  audioScriptJa: string | null,
): JlptNextPracticeDraft {
  const answerIndex = ANSWER_POSITIONS[mode][index];
  if (answerIndex === undefined) throw new Error(`Missing answer position: ${level}/${mode}/${index}`);
  const bankVersion = level === 'N2' ? JLPT_N2_PRACTICE_BANK_VERSION : JLPT_N1_PRACTICE_BANK_VERSION;
  return {
    id: `${bankVersion}:${mode}:${String(index + 1).padStart(2, '0')}`,
    level,
    mode,
    skill: SKILLS[mode],
    difficulty: difficultyAt(index),
    difficulty_rationale: difficultyRationale(level, mode, index),
    prompt,
    choices: placeAnswer(answer, distractors, answerIndex),
    answer_index: answerIndex,
    explanation,
    audio_script_ja: audioScriptJa,
    speech_provider: mode === 'listening' ? 'google-browser' : 'unavailable',
    speech_language: mode === 'listening' ? 'ja-JP' : null,
    source_evidence_hash: NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256,
    bank_version: bankVersion,
    authorship: 'self-authored',
    reviews: pendingReviews(),
    is_published: 0,
  };
}

function buildVocabulary(level: JlptNextPracticeLevel, specs: readonly VocabularySpec[]): JlptNextPracticeDraft[] {
  return specs.map((spec, index) => baseItem(
    level,
    'vocab_mc',
    index,
    localized(
      `「${spec.sentence}」에서 「${spec.word}」와 가장 가까운 뜻을 고르세요.`,
      `「${spec.sentence}」の「${spec.word}」に最も近い意味を選んでください。`,
      `In “${spec.sentence}”, choose the meaning closest to ${spec.word}.`,
    ),
    spec.answer,
    spec.distractors,
    localized(
      `이 문맥에서 「${spec.word}」의 뜻은 '${spec.answer.ko}'입니다.`,
      `この文脈で「${spec.word}」は「${spec.answer.ja}」という意味です。`,
      `In this context, ${spec.word} means “${spec.answer.en}.”`,
    ),
    null,
  ));
}

function buildGrammar(level: JlptNextPracticeLevel, specs: readonly GrammarSpec[]): JlptNextPracticeDraft[] {
  return specs.map((spec, index) => baseItem(
    level,
    'grammar_fill',
    index,
    localized(
      `문장 「${spec.sentence}」의 빈칸에 가장 알맞은 표현을 고르세요.`,
      `文「${spec.sentence}」の空欄に最も適切な表現を選んでください。`,
      `Choose the best expression for the blank in “${spec.sentence}”.`,
    ),
    spec.answer,
    spec.distractors,
    spec.explanation,
    null,
  ));
}

function readingChoice(reading: string): LocalizedText {
  return localized(reading, reading, reading);
}

function buildKanji(level: JlptNextPracticeLevel, specs: readonly KanjiSpec[]): JlptNextPracticeDraft[] {
  return specs.map((spec, index) => baseItem(
    level,
    'kanji_reading',
    index,
    localized(
      `「${spec.word}」의 올바른 읽기를 고르세요.`,
      `「${spec.word}」の正しい読み方を選んでください。`,
      `Choose the correct reading of ${spec.word}.`,
    ),
    readingChoice(spec.reading),
    spec.distractors.map(readingChoice) as [LocalizedText, LocalizedText, LocalizedText],
    localized(
      `「${spec.word}」의 읽기는 「${spec.reading}」이며, 뜻은 '${spec.meaning.ko}'입니다.`,
      `「${spec.word}」は「${spec.reading}」と読み、${spec.meaning.ja}を表します。`,
      `${spec.word} is read ${spec.reading} and means ${spec.meaning.en}.`,
    ),
    null,
  ));
}

function buildListening(level: JlptNextPracticeLevel, specs: readonly ListeningSpec[]): JlptNextPracticeDraft[] {
  return specs.map((spec, index) => baseItem(
    level,
    'listening',
    index,
    localized(
      `일본어 음성을 듣고 답하세요. ${spec.question.ko}`,
      `日本語の音声を聞いて答えてください。${spec.question.ja}`,
      `Listen to the Japanese audio and answer: ${spec.question.en}`,
    ),
    spec.answer,
    spec.distractors,
    spec.explanation,
    spec.audioScriptJa,
  ));
}

function buildBank(
  level: JlptNextPracticeLevel,
  specs: Readonly<{
    vocab: readonly VocabularySpec[];
    grammar: readonly GrammarSpec[];
    kanji: readonly KanjiSpec[];
    listening: readonly ListeningSpec[];
  }>,
): readonly JlptNextPracticeDraft[] {
  return [
    ...buildVocabulary(level, specs.vocab),
    ...buildGrammar(level, specs.grammar),
    ...buildKanji(level, specs.kanji),
    ...buildListening(level, specs.listening),
  ];
}

export const JLPT_N2_PRACTICE_BANK_V1 = buildBank('N2', {
  vocab: N2_VOCABULARY_SPECS,
  grammar: N2_GRAMMAR_SPECS,
  kanji: N2_KANJI_SPECS,
  listening: N2_LISTENING_SPECS,
});

export const JLPT_N1_PRACTICE_BANK_V1 = buildBank('N1', {
  vocab: N1_VOCABULARY_SPECS,
  grammar: N1_GRAMMAR_SPECS,
  kanji: N1_KANJI_SPECS,
  listening: N1_LISTENING_SPECS,
});

export function requireIndependentReview(
  itemId: string,
  expectedAnswerIndex: number,
  ledger: IndependentReviewLedger,
): IndependentItemReview {
  const decisions = ledger[itemId];
  if (!decisions || decisions.length !== 2) throw new Error(`Two independent reviews are required before seeding: ${itemId}`);
  const [first, second] = decisions;
  if (!first || !second || first.reviewer_id.trim() === '' || second.reviewer_id.trim() === '' || first.reviewer_id === second.reviewer_id) {
    throw new Error(`Reviewer identities must be non-empty and distinct: ${itemId}`);
  }
  if (first.verdict !== 'approved' || second.verdict !== 'approved' || !first.explanation_consistent || !second.explanation_consistent) {
    throw new Error(`Both reviewers must approve answer and explanation consistency: ${itemId}`);
  }
  if (first.answer_index !== expectedAnswerIndex || second.answer_index !== expectedAnswerIndex) {
    throw new Error(`Reviewer answer decisions do not match authored answer: ${itemId}`);
  }
  if (![first.reviewed_at, second.reviewed_at].every((date) => /^\d{4}-\d{2}-\d{2}$/u.test(date))) {
    throw new Error(`Reviewer decisions require ISO calendar dates: ${itemId}`);
  }
  return decisions;
}

function buildStatements(
  items: readonly JlptNextPracticeDraft[],
  ledger: IndependentReviewLedger,
): string[] {
  return items.map((item) => {
    requireIndependentReview(item.id, item.answer_index, ledger);
    return [
    'INSERT INTO `jlpt_practice_questions`',
    '  (`id`, `level`, `mode`, `skill`, `difficulty`, `prompt_ko`, `prompt_ja`, `prompt_en`, `choices_json`, `answer_index`, `explanation_ko`, `explanation_ja`, `explanation_en`, `audio_script_ja`, `source_code`, `source_evidence_sha256`, `bank_version`, `is_published`)',
    `VALUES (${esc(item.id)}, ${esc(item.level)}, ${esc(item.mode)}, ${esc(item.skill)}, ${item.difficulty}, ${esc(item.prompt.ko)}, ${esc(item.prompt.ja)}, ${esc(item.prompt.en)}, ${escJson([...item.choices])}, ${item.answer_index}, ${esc(item.explanation.ko)}, ${esc(item.explanation.ja)}, ${esc(item.explanation.en)}, ${item.audio_script_ja ? esc(item.audio_script_ja) : 'NULL'}, ${esc(NEXT_CONTENT_EXPANSION_SOURCE_CODE)}, ${esc(item.source_evidence_hash)}, ${esc(item.bank_version)}, 0)`,
    'ON CONFLICT(`id`) DO UPDATE SET',
    '  `skill` = excluded.`skill`, `difficulty` = excluded.`difficulty`,',
    '  `prompt_ko` = excluded.`prompt_ko`, `prompt_ja` = excluded.`prompt_ja`, `prompt_en` = excluded.`prompt_en`,',
    '  `choices_json` = excluded.`choices_json`, `answer_index` = excluded.`answer_index`,',
    '  `explanation_ko` = excluded.`explanation_ko`, `explanation_ja` = excluded.`explanation_ja`, `explanation_en` = excluded.`explanation_en`,',
    '  `audio_script_ja` = excluded.`audio_script_ja`, `source_code` = excluded.`source_code`,',
    '  `source_evidence_sha256` = excluded.`source_evidence_sha256`, `updated_at` = unixepoch()',
    'WHERE `jlpt_practice_questions`.`is_published` = 0;',
    ].join('\n');
  });
}

function answerCounts(items: readonly JlptNextPracticeDraft[]): readonly number[] {
  return [0, 1, 2, 3].map((answerIndex) => items.filter((item) => item.answer_index === answerIndex).length);
}

function buildPlan(
  level: JlptNextPracticeLevel,
  items: readonly JlptNextPracticeDraft[],
  ledger: IndependentReviewLedger,
) {
  const bankVersion = level === 'N2' ? JLPT_N2_PRACTICE_BANK_VERSION : JLPT_N1_PRACTICE_BANK_VERSION;
  return {
    statements: buildStatements(items, ledger),
    manifest: {
      level,
      bankVersion,
      sourceCode: NEXT_CONTENT_EXPANSION_SOURCE_CODE,
      sourceAssetId: NEXT_CONTENT_EXPANSION_SOURCE_ASSET_ID,
      sourceEvidenceSha256: NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256,
      sourceSha256: NEXT_CONTENT_EXPANSION_SOURCE_SHA256,
      counts: {
        questions: items.length,
        vocabMc: items.filter((item) => item.mode === 'vocab_mc').length,
        grammarFill: items.filter((item) => item.mode === 'grammar_fill').length,
        kanjiReading: items.filter((item) => item.mode === 'kanji_reading').length,
        listening: items.filter((item) => item.mode === 'listening').length,
      },
      answerCounts: answerCounts(items),
      releaseState: 'draft' as const,
      reviewerState: 'pending' as const,
      speechPolicy: 'google-browser-only-no-persisted-audio' as const,
    },
  };
}

export const buildJlptN2PracticeBankV1Plan = (ledger: IndependentReviewLedger) => (
  buildPlan('N2', JLPT_N2_PRACTICE_BANK_V1, ledger)
);
export const buildJlptN1PracticeBankV1Plan = (ledger: IndependentReviewLedger) => (
  buildPlan('N1', JLPT_N1_PRACTICE_BANK_V1, ledger)
);
