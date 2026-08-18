import { createHash } from 'node:crypto';

import {
  JLPT_N3_PRACTICE_BANK_V1,
  JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH,
  type JlptN3PracticeDraft,
  type LocalizedText,
} from './jlpt-n3-practice-bank-v1.js';
import { TOPIK_OWNER_BATCH_5, type TopikOwnerBatch5Draft } from './topik-owner-curriculum-batch5.js';

export interface DraftQualityReport {
  validator_version: 'content-expansion-draft-validator-v1';
  artifact_sha256: string;
  release_state: 'draft';
  reviewer_state: 'pending';
  checks: readonly { name: string; passed: boolean; detail: string }[];
}

function normalized(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('und');
}

function complete(value: LocalizedText): boolean {
  return [value.ko, value.ja, value.en].every((text) => normalized(text).length > 0);
}

function fingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function answerCounts(items: readonly { answer_index?: number }[]): readonly number[] {
  return [0, 1, 2, 3].map((answerIndex) => items.filter((item) => item.answer_index === answerIndex).length);
}

function uniqueChoices(choices: readonly LocalizedText[]): boolean {
  return (['ko', 'ja', 'en'] as const).every((language) => (
    new Set(choices.map((choice) => normalized(choice[language]))).size === choices.length
  ));
}

function jlptChecks(items: readonly JlptN3PracticeDraft[]) {
  const kanji = items.filter((item) => item.mode === 'kanji_reading');
  const listening = items.filter((item) => item.mode === 'listening');
  const prompts = items.map((item) => fingerprint(item.prompt));
  return [
    { name: 'JLPT item count', passed: items.length === 120, detail: `expected=120 actual=${items.length}` },
    { name: 'JLPT section counts', passed: kanji.length === 60 && listening.length === 60, detail: `kanji=${kanji.length} listening=${listening.length}` },
    { name: 'JLPT kanji answer balance', passed: answerCounts(kanji).every((count) => count === 15), detail: answerCounts(kanji).join('/') },
    { name: 'JLPT listening answer balance', passed: answerCounts(listening).every((count) => count === 15), detail: answerCounts(listening).join('/') },
    { name: 'JLPT multilingual fields', passed: items.every((item) => complete(item.prompt) && complete(item.explanation) && item.choices.every(complete)), detail: 'prompt, explanation, and choices require ko/ja/en' },
    { name: 'JLPT choice uniqueness', passed: items.every((item) => item.choices.length === 4 && uniqueChoices(item.choices)), detail: 'four distinct choices in every locale' },
    { name: 'JLPT answer bounds', passed: items.every((item) => Number.isInteger(item.answer_index) && item.answer_index >= 0 && item.answer_index <= 3), detail: 'answer_index must be 0..3' },
    { name: 'JLPT prompt uniqueness', passed: new Set(prompts).size === prompts.length, detail: `unique=${new Set(prompts).size}` },
    { name: 'JLPT visible-order answer leakage', passed: [kanji, listening].every((section) => new Set(section.map((item, index) => (item.answer_index - (index % 4) + 4) % 4)).size > 1), detail: 'answer position must not be a direct 1,2,3,4 function of visible item order' },
    { name: 'JLPT intake evidence', passed: items.every((item) => item.source_evidence_hash === JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH && /^[a-f0-9]{64}$/u.test(item.source_evidence_hash)), detail: JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH },
    { name: 'JLPT authorship and draft state', passed: items.every((item) => item.authorship === 'self-authored' && item.is_published === 0), detail: 'all items must remain unpublished drafts' },
    { name: 'JLPT reviewer separation', passed: items.every((item) => item.reviews.length === 2 && item.reviews[0].reviewer_slot !== item.reviews[1].reviewer_slot && item.reviews.every((review) => review.status === 'pending')), detail: 'two distinct pending reviewer slots; no approval is authored' },
    { name: 'JLPT Google-only listening', passed: listening.every((item) => item.speech_provider === 'google-browser' && Boolean(item.audio_script_ja?.trim())) && kanji.every((item) => item.speech_provider === 'unavailable' && item.audio_script_ja === null), detail: 'listening uses Japanese text with browser Google speech; kanji has no audio asset' },
  ];
}

function topikChecks(items: readonly TopikOwnerBatch5Draft[]) {
  const choiceItems = items.filter((item) => item.section !== 'writing');
  const listening = items.filter((item) => item.section === 'listening');
  const sections = ['vocab', 'grammar', 'reading', 'listening', 'writing'] as const;
  const gradeSectionCounts = ([1, 2] as const).flatMap((grade) => sections.map((section) => ({
    grade,
    section,
    count: items.filter((item) => item.grade === grade && item.section === section).length,
  })));
  return [
    { name: 'TOPIK item count', passed: items.length === 20, detail: `expected=20 actual=${items.length}` },
    { name: 'TOPIK grade counts', passed: [1, 2].every((grade) => items.filter((item) => item.grade === grade).length === 10), detail: `grade1=${items.filter((item) => item.grade === 1).length} grade2=${items.filter((item) => item.grade === 2).length}` },
    { name: 'TOPIK section counts', passed: gradeSectionCounts.every((entry) => entry.count === 2), detail: gradeSectionCounts.map((entry) => `${entry.grade}:${entry.section}=${entry.count}`).join(' ') },
    { name: 'TOPIK choice answer balance', passed: answerCounts(choiceItems).every((count) => count === 4), detail: answerCounts(choiceItems).join('/') },
    { name: 'TOPIK multilingual fields', passed: items.every((item) => complete(item.title) && complete(item.prompt) && complete(item.explanation) && (!item.choices || item.choices.every(complete))), detail: 'title, prompt, explanation, and applicable choices require ko/ja/en' },
    { name: 'TOPIK choice contract', passed: choiceItems.every((item) => item.choices?.length === 4 && uniqueChoices(item.choices) && Number.isInteger(item.answer_index) && item.answer_index! >= 0 && item.answer_index! <= 3), detail: '16 choice items have four distinct choices and valid answers' },
    { name: 'TOPIK writing contract', passed: items.filter((item) => item.section === 'writing').every((item) => item.choices === undefined && item.answer_index === undefined && Boolean(item.rubric) && complete(item.rubric!)), detail: 'four constructed-response items have no answer index and have multilingual rubrics' },
    { name: 'TOPIK Google-only speech text', passed: listening.every((item) => item.speech_provider === 'google-browser' && Boolean(item.audio_text_ko?.trim())) && items.filter((item) => item.section !== 'listening').every((item) => item.speech_provider === 'unavailable' && item.audio_text_ko === null) && items.every((item) => !item.audio_text_ko || !/r2:\/\/|audio_r2_key/iu.test(item.audio_text_ko)), detail: 'only listening has Korean Google speech text; non-listening has no speech binding source' },
    { name: 'TOPIK intake evidence', passed: items.every((item) => item.source_evidence_hash === JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH), detail: JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH },
    { name: 'TOPIK reviewer separation', passed: items.every((item) => item.release_state === 'draft' && item.reviews[0].reviewer_slot !== item.reviews[1].reviewer_slot && item.reviews.every((review) => review.status === 'pending')), detail: 'two distinct pending reviewer slots; no approval is authored' },
  ];
}

export function validateContentExpansionDraft(): DraftQualityReport {
  const checks = [...jlptChecks(JLPT_N3_PRACTICE_BANK_V1), ...topikChecks(TOPIK_OWNER_BATCH_5)];
  const canonicalDraft = JSON.stringify({ jlpt: JLPT_N3_PRACTICE_BANK_V1, topik: TOPIK_OWNER_BATCH_5 });
  return {
    validator_version: 'content-expansion-draft-validator-v1',
    artifact_sha256: createHash('sha256').update(canonicalDraft).digest('hex'),
    release_state: 'draft',
    reviewer_state: 'pending',
    checks,
  };
}

export function assertContentExpansionDraft(): DraftQualityReport {
  const report = validateContentExpansionDraft();
  const failed = report.checks.filter((check) => !check.passed);
  if (failed.length > 0) {
    throw new Error(`Content expansion draft failed validation:\n${failed.map((check) => `- ${check.name}: ${check.detail}`).join('\n')}`);
  }
  return report;
}
