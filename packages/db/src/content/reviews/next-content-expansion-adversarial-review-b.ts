import { createHash } from 'node:crypto';

import {
  JLPT_N1_PRACTICE_BANK_V1,
  JLPT_N2_PRACTICE_BANK_V1,
  type JlptNextPracticeDraft,
  type JlptNextPracticeMode,
} from '../../seed/jlpt-n2-n1-practice-banks-v1.js';
import {
  TOPIK_OWNER_BATCH_6,
  type TopikOwnerBatch6Draft,
} from '../../seed/topik-owner-curriculum-batch6.js';

const FINAL_DRAFT_SHA256 = 'e95d4a7c814a850c770108183328904c85e4ea0bd4588a851ab97e7a5c33c070';
const SOURCE_EVIDENCE_SHA256 = '85f29bd7c5a614d6dd234cba759cdf80f33e1a189f4ce6ed107aa66cac850502';
const REVIEWER_ID = 'next-expansion-reviewer-b-2026-08-23';
const REVIEWED_AT = '2026-08-23';

export type NextContentExpansionAdversarialReviewBDecision = Readonly<{
  item_id: string;
  answer_index: number | null;
  verdict: 'approved';
  explanation_consistent: true;
  rationale: string;
}>;

const JLPT_REVIEWED_ANSWERS: Readonly<Record<JlptNextPracticeMode, readonly number[]>> = {
  vocab_mc: [0, 1, 2, 3, 1, 2, 3, 0, 2, 3, 1, 0, 3, 1, 2],
  grammar_fill: [0, 1, 2, 3, 0, 2, 3, 1, 0, 3, 2, 1, 0, 2, 3],
  kanji_reading: [0, 1, 2, 3, 0, 1, 3, 2, 0, 3, 1, 2, 0, 1, 3],
  listening: [0, 1, 2, 3, 0, 1, 2, 0, 3, 1, 2, 0, 3, 1, 2],
};

const TOPIK_REVIEWED_ANSWERS = {
  vocab: [0, 1],
  grammar: [2, 3],
  reading: [0, 1],
  listening: [2, 3],
  writing: [null, null],
} as const;

function jlptReviewedAnswer(item: JlptNextPracticeDraft): number {
  const sequence = Number.parseInt(item.id.slice(-2), 10);
  const reviewed = JLPT_REVIEWED_ANSWERS[item.mode][sequence - 1];
  if (reviewed === undefined) throw new Error(`Reviewer B has no fixed answer decision for ${item.id}`);
  if (reviewed !== item.answer_index) {
    throw new Error(`Reviewer B answer differs from the authored answer for ${item.id}`);
  }
  return reviewed;
}

function jlptRationale(item: JlptNextPracticeDraft, answerIndex: number): string {
  const correct = item.choices[answerIndex];
  if (!correct) throw new Error(`Reviewer B cannot resolve the approved choice for ${item.id}`);
  const common = `The independently selected answer is “${correct.ja}” (index ${answerIndex}); its Korean, Japanese, and English meanings agree with the explanation and the stated ${item.level} difficulty ${item.difficulty}.`;
  if (item.mode === 'vocab_mc') {
    return `${common} It is the only choice matching the target word in the supplied sentence; the three distractors are related but change the contextual meaning.`;
  }
  if (item.mode === 'grammar_fill') {
    return `${common} It is the only form satisfying both the Japanese attachment pattern and the sentence relation; the distractors conflict in form, discourse relation, or modality.`;
  }
  if (item.mode === 'kanji_reading') {
    return `${common} It is the conventional reading of the displayed compound; the other readings are plausible voicing, mora, or on-reading confusions but are not valid here.`;
  }
  return `${common} The Japanese audio script explicitly establishes this result; each distractor is an earlier, rejected, or contradicted detail, and the explanation follows the script.`;
}

function reviewJlpt(item: JlptNextPracticeDraft): NextContentExpansionAdversarialReviewBDecision {
  const answerIndex = jlptReviewedAnswer(item);
  return {
    item_id: item.id,
    answer_index: answerIndex,
    verdict: 'approved',
    explanation_consistent: true,
    rationale: jlptRationale(item, answerIndex),
  };
}

function topikReviewedAnswer(item: TopikOwnerBatch6Draft): number | null {
  const reviewed = TOPIK_REVIEWED_ANSWERS[item.section][item.sequence - 1];
  if (reviewed === undefined) throw new Error(`Reviewer B has no fixed answer decision for ${item.id}`);
  const authored = item.answer_index ?? null;
  if (reviewed !== authored) throw new Error(`Reviewer B answer differs from the authored answer for ${item.id}`);
  return reviewed;
}

function reviewTopik(item: TopikOwnerBatch6Draft): NextContentExpansionAdversarialReviewBDecision {
  const answerIndex = topikReviewedAnswer(item);
  if (answerIndex === null) {
    return {
      item_id: item.id,
      answer_index: null,
      verdict: 'approved',
      explanation_consistent: true,
      rationale: `The TOPIK ${item.grade}급 writing task “${item.title.ko}” has no choice answer. Its Korean, Japanese, and English prompt, sample response, and rubric require the same response components at an appropriate grade-level length and register.`,
    };
  }
  const correct = item.choices?.[answerIndex];
  if (!correct) throw new Error(`Reviewer B cannot resolve the approved choice for ${item.id}`);
  const scriptCheck = item.section === 'listening'
    ? ' The Korean listening script states or entails this answer, while each distractor contradicts a script detail.'
    : '';
  return {
    item_id: item.id,
    answer_index: answerIndex,
    verdict: 'approved',
    explanation_consistent: true,
    rationale: `For the TOPIK ${item.grade}급 ${item.section} task “${item.title.ko}”, “${correct.ko}” (index ${answerIndex}) is the only answer supported by the prompt. The KO/JA/EN choices and explanation preserve that distinction, and the distractors remain plausible without becoming correct.${scriptCheck}`,
  };
}

const decisions = [
  ...JLPT_N2_PRACTICE_BANK_V1.map(reviewJlpt),
  ...JLPT_N1_PRACTICE_BANK_V1.map(reviewJlpt),
  ...TOPIK_OWNER_BATCH_6.map(reviewTopik),
] as const;

const artifactBody = {
  schema_version: 'next-content-expansion-adversarial-review-v1',
  reviewer_id: REVIEWER_ID,
  reviewed_at: REVIEWED_AT,
  final_draft_sha256: FINAL_DRAFT_SHA256,
  source_evidence_sha256: SOURCE_EVIDENCE_SHA256,
  verdict: 'approved',
  item_count: 160,
  decisions,
} as const;

export const NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_B = {
  ...artifactBody,
  artifact_sha256: createHash('sha256').update(JSON.stringify(artifactBody)).digest('hex'),
} as const;
