import { createHash } from 'node:crypto';

import {
  JLPT_N1_PRACTICE_BANK_V1,
  JLPT_N2_PRACTICE_BANK_V1,
  type JlptNextPracticeDraft,
  type JlptNextPracticeMode,
} from '../seed/jlpt-n2-n1-practice-banks-v1.js';
import { NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256 } from '../seed/next-content-expansion-source.js';
import {
  TOPIK_OWNER_BATCH_6,
  type TopikOwnerBatch6Draft,
} from '../seed/topik-owner-curriculum-batch6.js';

const JLPT_MODES: readonly JlptNextPracticeMode[] = [
  'vocab_mc',
  'grammar_fill',
  'kanji_reading',
  'listening',
];
const EXPECTED_MODE_DISTRIBUTION: Readonly<Record<JlptNextPracticeMode, readonly number[]>> = {
  vocab_mc: [3, 4, 4, 4],
  grammar_fill: [4, 3, 4, 4],
  kanji_reading: [4, 4, 3, 4],
  listening: [4, 4, 4, 3],
};
const TOPIK_SECTIONS = ['vocab', 'grammar', 'reading', 'listening', 'writing'] as const;

export const NEXT_CONTENT_EXPANSION_VALIDATOR_VERSION = 'next-content-expansion-quality-v1';

export type NextContentExpansionQualityReport = Readonly<{
  schema_version: 'next-content-expansion-quality-report-v1';
  validator_version: typeof NEXT_CONTENT_EXPANSION_VALIDATOR_VERSION;
  generated_at: string;
  passed: boolean;
  final_draft_sha256: string;
  source_evidence_sha256: string;
  counts: Readonly<{
    jlpt_n2: number;
    jlpt_n1: number;
    topik: number;
    total: number;
    topik_listening: number;
    topik_writing: number;
    r2_pronunciation_references: number;
  }>;
  checks: readonly Readonly<{ id: string; passed: boolean; details: string }>[];
  errors: readonly string[];
}>;

function stableDraftBody() {
  const jlpt = [...JLPT_N2_PRACTICE_BANK_V1, ...JLPT_N1_PRACTICE_BANK_V1]
    .map(({ reviews: _reviews, ...item }) => item)
    .sort((a, b) => a.id.localeCompare(b.id));
  const topik = TOPIK_OWNER_BATCH_6
    .map(({ reviews: _reviews, ...item }) => item)
    .sort((a, b) => a.id.localeCompare(b.id));
  return {
    schema_version: 'next-content-expansion-final-draft-v1',
    source_evidence_sha256: NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256,
    jlpt,
    topik,
  } as const;
}

export const NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256 = createHash('sha256')
  .update(JSON.stringify(stableDraftBody()))
  .digest('hex');

function localizedComplete(value: { ko: string; ja: string; en: string } | undefined): boolean {
  return Boolean(value && value.ko.trim() && value.ja.trim() && value.en.trim());
}

function sentenceCount(value: string): number {
  return value
    .split(/[.!?。！？]+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean).length;
}

function countsByAnswer(items: readonly { answer_index: number }[]): number[] {
  return [0, 1, 2, 3].map((answer) => items.filter((item) => item.answer_index === answer).length);
}

function sameCounts(actual: readonly number[], expected: readonly number[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function validateJlpt(items: readonly JlptNextPracticeDraft[], level: 'N2' | 'N1', errors: string[]): void {
  if (items.length !== 60) errors.push(`${level}: expected 60 questions, found ${items.length}`);
  if (!sameCounts(countsByAnswer(items), [15, 15, 15, 15])) {
    errors.push(`${level}: total answer distribution is ${countsByAnswer(items).join('/')}`);
  }
  for (const mode of JLPT_MODES) {
    const modeItems = items.filter((item) => item.mode === mode);
    if (modeItems.length !== 15) errors.push(`${level}/${mode}: expected 15 questions, found ${modeItems.length}`);
    const distribution = countsByAnswer(modeItems);
    if (!sameCounts(distribution, EXPECTED_MODE_DISTRIBUTION[mode])) {
      errors.push(`${level}/${mode}: answer distribution is ${distribution.join('/')}`);
    }
    for (const difficulty of [1, 2, 3, 4, 5]) {
      const count = modeItems.filter((item) => item.difficulty === difficulty).length;
      if (count !== 3) errors.push(`${level}/${mode}/difficulty-${difficulty}: expected 3, found ${count}`);
    }
  }
  for (const item of items) {
    if (!localizedComplete(item.prompt) || !localizedComplete(item.explanation)) {
      errors.push(`${item.id}: prompt/explanation translations are incomplete`);
    }
    if (item.choices.length !== 4 || item.answer_index < 0 || item.answer_index > 3) {
      errors.push(`${item.id}: choices or answer index are invalid`);
    }
    for (const language of ['ko', 'ja', 'en'] as const) {
      const values = item.choices.map((choice) => choice[language].trim());
      if (values.some((value) => !value) || new Set(values).size !== 4) {
        errors.push(`${item.id}: ${language} choices are empty or duplicated`);
      }
    }
    if (item.source_evidence_hash !== NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256) {
      errors.push(`${item.id}: source evidence hash mismatch`);
    }
    if (item.mode === 'listening') {
      if (!item.audio_script_ja?.trim() || item.speech_provider !== 'google-browser' || item.speech_language !== 'ja-JP') {
        errors.push(`${item.id}: Japanese listening speech contract is invalid`);
      }
    } else if (item.audio_script_ja !== null || item.speech_provider !== 'unavailable' || item.speech_language !== null) {
      errors.push(`${item.id}: non-listening item has a speech binding`);
    }
    if (item.is_published !== 0 || item.authorship !== 'self-authored') {
      errors.push(`${item.id}: draft/authorship state is invalid`);
    }
    if (/쓹니다|바꿘습니다|나탭니다|나탑니다|나탩니다|나탅니다|예외이 될|안좋은|눈에 띠는/u.test(JSON.stringify(item))) {
      errors.push(`${item.id}: known Korean spelling or spacing defect remains`);
    }
  }
}

function validateTopik(items: readonly TopikOwnerBatch6Draft[], errors: string[]): void {
  if (items.length !== 40) errors.push(`TOPIK: expected 40 items, found ${items.length}`);
  for (const grade of [3, 4, 5, 6] as const) {
    const gradeItems = items.filter((item) => item.grade === grade);
    if (gradeItems.length !== 10) errors.push(`TOPIK-${grade}: expected 10 items, found ${gradeItems.length}`);
    const choiceItems = gradeItems.filter((item): item is TopikOwnerBatch6Draft & { answer_index: number } => item.answer_index !== undefined);
    if (!sameCounts(countsByAnswer(choiceItems), [2, 2, 2, 2])) {
      errors.push(`TOPIK-${grade}: answer distribution is ${countsByAnswer(choiceItems).join('/')}`);
    }
    for (const section of TOPIK_SECTIONS) {
      const count = gradeItems.filter((item) => item.section === section).length;
      if (count !== 2) errors.push(`TOPIK-${grade}/${section}: expected 2 items, found ${count}`);
    }
  }
  for (const item of items) {
    if (!localizedComplete(item.title) || !localizedComplete(item.prompt) || !localizedComplete(item.explanation)) {
      errors.push(`${item.id}: title/prompt/explanation translations are incomplete`);
    }
    if (item.source_evidence_hash !== NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256) {
      errors.push(`${item.id}: source evidence hash mismatch`);
    }
    if (item.section === 'writing') {
      if (!localizedComplete(item.rubric) || item.choices || item.answer_index !== undefined) {
        errors.push(`${item.id}: writing rubric or response contract is invalid`);
      }
      for (const language of ['ko', 'ja', 'en'] as const) {
        const actual = sentenceCount(item.explanation[language]);
        if (actual !== item.grade) {
          errors.push(`${item.id}: ${language} sample requires ${item.grade} sentences, found ${actual}`);
        }
      }
    } else if (!item.choices || item.choices.length !== 4 || item.answer_index === undefined || item.answer_index < 0 || item.answer_index > 3) {
      errors.push(`${item.id}: choice contract is invalid`);
    }
    if (item.choices) {
      for (const language of ['ko', 'ja', 'en'] as const) {
        const values = item.choices.map((choice) => choice[language].trim());
        if (values.some((value) => !value) || new Set(values).size !== 4) {
          errors.push(`${item.id}: ${language} choices are empty or duplicated`);
        }
      }
      if (item.section === 'grammar' && item.choices.some((choice) => (
        choice.ko.trim() === choice.ja.trim() || choice.ko.trim() === choice.en.trim()
      ))) {
        errors.push(`${item.id}: grammar choices require independent Japanese and English glosses`);
      }
    }
    if (item.section === 'listening') {
      if (!item.audio_text_ko?.trim() || item.speech_provider !== 'google-browser') {
        errors.push(`${item.id}: Korean listening speech contract is invalid`);
      }
    } else if (item.audio_text_ko !== null || item.speech_provider !== 'unavailable') {
      errors.push(`${item.id}: non-listening item has a speech binding`);
    }
    if (item.is_published !== 0 || item.release_state !== 'draft' || item.authorship !== 'self-authored') {
      errors.push(`${item.id}: draft/authorship state is invalid`);
    }
  }
}

export function buildNextContentExpansionQualityReport(generatedAt = new Date().toISOString()): NextContentExpansionQualityReport {
  const errors: string[] = [];
  validateJlpt(JLPT_N2_PRACTICE_BANK_V1, 'N2', errors);
  validateJlpt(JLPT_N1_PRACTICE_BANK_V1, 'N1', errors);
  validateTopik(TOPIK_OWNER_BATCH_6, errors);

  const allItems = [...JLPT_N2_PRACTICE_BANK_V1, ...JLPT_N1_PRACTICE_BANK_V1, ...TOPIK_OWNER_BATCH_6];
  const ids = allItems.map((item) => item.id);
  if (new Set(ids).size !== ids.length) errors.push('Expansion item IDs are not unique');
  const prompts = allItems.map((item) => item.prompt.ja.trim().replace(/\s+/gu, ' '));
  if (new Set(prompts).size !== prompts.length) errors.push('Japanese prompts are duplicated');
  const serialized = JSON.stringify(stableDraftBody());
  const r2Matches = serialized.match(/(?:r2:\/\/|audio_r2|r2-ready|\/api\/v1\/audio\/)/giu) ?? [];
  if (r2Matches.length > 0) errors.push(`R2 pronunciation references found: ${r2Matches.length}`);

  const counts = {
    jlpt_n2: JLPT_N2_PRACTICE_BANK_V1.length,
    jlpt_n1: JLPT_N1_PRACTICE_BANK_V1.length,
    topik: TOPIK_OWNER_BATCH_6.length,
    total: allItems.length,
    topik_listening: TOPIK_OWNER_BATCH_6.filter((item) => item.section === 'listening').length,
    topik_writing: TOPIK_OWNER_BATCH_6.filter((item) => item.section === 'writing').length,
    r2_pronunciation_references: r2Matches.length,
  } as const;
  const checks = [
    { id: 'counts-and-distributions', passed: !errors.some((error) => /expected|distribution/u.test(error)), details: 'N2/N1 60 each and TOPIK 40 with required answer distributions' },
    { id: 'multilingual-and-unique', passed: !errors.some((error) => /translations|duplicated|choices/u.test(error)), details: 'Korean, Japanese, and English fields plus unique choices/prompts' },
    { id: 'speech-google-only', passed: !errors.some((error) => /speech|R2/u.test(error)), details: 'Google browser speech scripts only; no persisted or R2 pronunciation path' },
    { id: 'source-and-draft-state', passed: !errors.some((error) => /source evidence|draft\/authorship/u.test(error)), details: 'Exact intake evidence hash and unpublished self-authored state' },
  ] as const;
  return {
    schema_version: 'next-content-expansion-quality-report-v1',
    validator_version: NEXT_CONTENT_EXPANSION_VALIDATOR_VERSION,
    generated_at: generatedAt,
    passed: errors.length === 0,
    final_draft_sha256: NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256,
    source_evidence_sha256: NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256,
    counts,
    checks,
    errors,
  };
}
