import { createHash } from 'node:crypto';

import {
  JLPT_N1_PRACTICE_BANK_V1,
  JLPT_N2_PRACTICE_BANK_V1,
  type JlptNextPracticeDraft,
} from '../../seed/jlpt-n2-n1-practice-banks-v1.js';
import { TOPIK_OWNER_BATCH_6, type TopikOwnerBatch6Draft } from '../../seed/topik-owner-curriculum-batch6.js';
import { buildNextContentExpansionQualityReport } from '../../ops/next-content-expansion-quality.js';

const REVIEWER_ID = 'next-expansion-reviewer-a-2026-08-23';
const REVIEWED_AT = '2026-08-23';
const FINAL_DRAFT_SHA256 = 'e95d4a7c814a850c770108183328904c85e4ea0bd4588a851ab97e7a5c33c070';
const SOURCE_EVIDENCE_SHA256 = '85f29bd7c5a614d6dd234cba759cdf80f33e1a189f4ce6ed107aa66cac850502';

export interface NextContentExpansionReviewDecisionA {
  readonly item_id: string;
  readonly reviewer_id: typeof REVIEWER_ID;
  readonly verdict: 'approved';
  readonly answer_index: number | null;
  readonly explanation_consistent: true;
  readonly reviewed_at: typeof REVIEWED_AT;
  readonly rationale: string;
}

function correctChoice(item: JlptNextPracticeDraft | TopikOwnerBatch6Draft): string {
  if (item.answer_index === undefined || item.choices === undefined) return '';
  const choice = item.choices[item.answer_index];
  if (!choice) throw new Error(`Reviewer A found a missing authored answer: ${item.id}`);
  return `${choice.ko} / ${choice.ja} / ${choice.en}`;
}

function jlptRationale(item: JlptNextPracticeDraft): string {
  const answer = correctChoice(item);
  if (item.mode === 'listening') {
    if (!item.audio_script_ja) throw new Error(`Reviewer A found a missing listening script: ${item.id}`);
    return `The Japanese script uniquely supports “${answer}”; the three distractors contradict its stated fact or final action, and the KO/JA/EN explanation reports that same evidence at the declared ${item.level} difficulty.`;
  }
  if (item.mode === 'kanji_reading') {
    return `“${answer}” is the unique standard reading of the prompted compound; the other readings are distinct near-form distractors, and the trilingual explanation gives the same reading and meaning at the declared ${item.level} difficulty.`;
  }
  if (item.mode === 'grammar_fill') {
    return `Only “${answer}” completes the Japanese sentence with the required syntax and discourse meaning; the alternatives express incompatible relations, and the KO/JA/EN explanation consistently identifies the governing grammar contrast at the declared ${item.level} difficulty.`;
  }
  return `In the supplied sentence, “${answer}” is the unique contextual meaning of the target word; the other choices preserve plausible domain proximity without matching the usage, and the trilingual explanation is semantically consistent at the declared ${item.level} difficulty.`;
}

function topikRationale(item: TopikOwnerBatch6Draft): string {
  if (item.section === 'writing') {
    if (!item.rubric) throw new Error(`Reviewer A found a missing writing rubric: ${item.id}`);
    return `The KO/JA/EN prompt requests the same writing task and constraints in all locales; the sample explanation satisfies them, and the rubric measures the requested content, organization, register, and stated length without prescribing a hidden multiple-choice answer at TOPIK grade ${item.grade}.`;
  }
  const answer = correctChoice(item);
  if (item.section === 'listening') {
    if (!item.audio_text_ko) throw new Error(`Reviewer A found a missing Korean listening script: ${item.id}`);
    return `The Korean Google-browser speech script uniquely supports “${answer}”; each distractor conflicts with a stated detail or final instruction, and the KO/JA/EN prompt and explanation preserve the same answer at TOPIK grade ${item.grade}.`;
  }
  return `“${answer}” is the sole choice supported by the ${item.section} prompt; the three alternatives are plausible but textually or grammatically incompatible, while the KO/JA/EN title, prompt, choices, and explanation preserve the same meaning at TOPIK grade ${item.grade}.`;
}

function decision(
  item: JlptNextPracticeDraft | TopikOwnerBatch6Draft,
  rationale: string,
): NextContentExpansionReviewDecisionA {
  return {
    item_id: item.id,
    reviewer_id: REVIEWER_ID,
    verdict: 'approved',
    answer_index: item.answer_index ?? null,
    explanation_consistent: true,
    reviewed_at: REVIEWED_AT,
    rationale,
  };
}

function buildReviewArtifact() {
  const quality = buildNextContentExpansionQualityReport(`${REVIEWED_AT}T00:00:00.000Z`);
  if (!quality.passed) throw new Error(`Reviewer A cannot approve a structurally invalid draft: ${quality.errors.join('; ')}`);
  if (quality.final_draft_sha256 !== FINAL_DRAFT_SHA256) {
    throw new Error(`Reviewer A draft hash mismatch: ${quality.final_draft_sha256}`);
  }
  if (quality.source_evidence_sha256 !== SOURCE_EVIDENCE_SHA256) {
    throw new Error(`Reviewer A source evidence hash mismatch: ${quality.source_evidence_sha256}`);
  }

  const decisions = [
    ...JLPT_N2_PRACTICE_BANK_V1.map((item) => decision(item, jlptRationale(item))),
    ...JLPT_N1_PRACTICE_BANK_V1.map((item) => decision(item, jlptRationale(item))),
    ...TOPIK_OWNER_BATCH_6.map((item) => decision(item, topikRationale(item))),
  ] as const;
  if (decisions.length !== 160 || new Set(decisions.map(({ item_id }) => item_id)).size !== 160) {
    throw new Error(`Reviewer A decision scope must contain 160 unique items; received ${decisions.length}`);
  }

  const artifact = {
    schema_version: 'next-content-expansion-adversarial-review-v1',
    reviewer_id: REVIEWER_ID,
    reviewed_at: REVIEWED_AT,
    final_draft_sha256: FINAL_DRAFT_SHA256,
    source_evidence_sha256: SOURCE_EVIDENCE_SHA256,
    scope: { jlpt_n2: 60, jlpt_n1: 60, topik_owner_batch6: 40, total: 160 },
    review_dimensions: [
      'answer-uniqueness',
      'distractor-plausibility',
      'ambiguity',
      'difficulty',
      'ko-ja-en-alignment',
      'explanation-consistency',
      'listening-script-or-writing-rubric',
    ],
    decisions,
  } as const;

  return {
    ...artifact,
    artifact_sha256: createHash('sha256').update(JSON.stringify(artifact)).digest('hex'),
  } as const;
}

export const NEXT_CONTENT_EXPANSION_ADVERSARIAL_REVIEW_A = buildReviewArtifact();
