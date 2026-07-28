import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import {
  type ContentReleaseProvenance,
  validateContentReleaseProvenance,
} from './content-release-contract.js';

export const TOPIK_I_PREVIEW_INPUT_PATH = path.join(
  REPO_ROOT,
  'docs/07_topik/data/topik-i-self-authored-preview-v1.json',
);

type ExamBand = 'beginner' | 'intermediate' | 'advanced';
type Section = 'listening' | 'writing' | 'reading';
type ItemKind = 'lesson' | 'vocab' | 'grammar' | 'character' | 'listening' | 'reading' | 'writing' | 'practice';

export interface TopikIPreviewUnit {
  id: string;
  stableRef: string;
  examLevel: 'TOPIK-I';
  examBand: ExamBand;
  section: Section;
  titleKo: string;
  titleJa: string;
  titleEn: string;
  instructionLanguages: readonly ['ko', 'ja', 'en'];
}

export interface TopikIPreviewItem {
  id: string;
  unitId: string;
  stableRef: string;
  examLevel: 'TOPIK-I';
  examBand: ExamBand;
  section: Section;
  itemKind: ItemKind;
  skill: string;
  difficulty: number;
  promptKo: string;
  promptJa: string;
  promptEn: string;
  answerPayloadJson: string;
  explanationKo: string;
  explanationJa: string;
  explanationEn: string;
}

export interface TopikIPreviewCandidate {
  release: {
    id: string;
    learningTrack: 'topik-ko';
    contentVersion: string;
    releaseState: 'draft';
    parserVersion: string;
    manifestSha256: string;
  };
  provenance: ContentReleaseProvenance;
  units: readonly TopikIPreviewUnit[];
  items: readonly TopikIPreviewItem[];
  manifest: {
    schemaVersion: 'topik-i-preview-manifest-v1';
    inputSha256: string;
    manifestSha256: string;
    sourceCode: string;
    contentVersion: string;
    parserVersion: string;
    reviewState: 'pending-two-human-signoffs';
    expectedRows: { units: number; items: number; bySection: Record<Section, number> };
    itemPayloadSha256: Readonly<Record<string, string>>;
  };
}

interface RawInput {
  schema_version: string;
  release: {
    id: string;
    learning_track: 'topik-ko';
    content_version: string;
    release_state: 'draft';
    parser_version: string;
  };
  source: {
    source_code: string;
    source_type: 'self-authored';
    source_url: string;
    retrieved_at: string;
    license_id: string;
    license_url: string;
    allowed_use: string;
    attribution_text: string;
    author: string;
    first_reviewer: string;
    second_reviewer: string;
    inventory_checked_at: string;
    first_review_status: 'pending';
    second_review_status: 'pending';
  };
  units: Array<{
    id: string;
    stable_ref: string;
    exam_level: 'TOPIK-I';
    exam_band: ExamBand;
    section: Section;
    title_ko: string;
    title_ja: string;
    title_en: string;
    instruction_languages: ['ko', 'ja', 'en'];
  }>;
  items: Array<{
    id: string;
    unit_id: string;
    stable_ref: string;
    exam_level: 'TOPIK-I';
    exam_band: ExamBand;
    section: Section;
    item_kind: ItemKind;
    skill: string;
    difficulty: number;
    prompt_ko: string;
    prompt_ja: string;
    prompt_en: string;
    answer_payload: unknown;
    explanation_ko: string;
    explanation_ja: string;
    explanation_en: string;
  }>;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

function sql(value: string | number | null): string {
  if (value === null) return 'NULL';
  return typeof value === 'number' ? String(value) : `'${value.replace(/'/g, "''")}'`;
}

function assertNonEmpty(label: string, value: string): void {
  if (!value.trim()) throw new Error(`${label} is required`);
}

function assertUnique(label: string, values: readonly string[]): void {
  if (new Set(values).size !== values.length) throw new Error(`${label} must be unique`);
}

export function loadTopikIPreviewCandidate(inputPath = TOPIK_I_PREVIEW_INPUT_PATH): TopikIPreviewCandidate {
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as RawInput;
  if (input.schema_version !== 'topik-i-preview-input-v1') throw new Error('Unsupported TOPIK I preview input schema');
  if (input.release.learning_track !== 'topik-ko' || input.release.release_state !== 'draft') {
    throw new Error('TOPIK I candidate must remain a draft on the TOPIK track');
  }
  if (input.source.source_type !== 'self-authored') throw new Error('P3 TOPIK I candidate must be self-authored');
  if (input.source.first_review_status !== 'pending' || input.source.second_review_status !== 'pending') {
    throw new Error('P3 candidate must wait for two human sign-offs');
  }

  const provenance: ContentReleaseProvenance = {
    sourceCode: input.source.source_code,
    sourceType: input.source.source_type,
    sourceUrl: input.source.source_url,
    retrievedAt: input.source.retrieved_at,
    sourceSha256: sha256(canonicalJson({ units: input.units, items: input.items })),
    licenseId: input.source.license_id,
    licenseUrl: input.source.license_url,
    allowedUse: input.source.allowed_use,
    attributionText: input.source.attribution_text,
    author: input.source.author,
    firstReviewer: input.source.first_reviewer,
    secondReviewer: input.source.second_reviewer,
    firstReviewStatus: input.source.first_review_status,
    firstReviewedAt: null,
    secondReviewStatus: input.source.second_review_status,
    secondReviewedAt: null,
    // Inventory review date only. It is not a human content sign-off.
    reviewedAt: input.source.inventory_checked_at,
  };
  const provenanceErrors = validateContentReleaseProvenance(provenance);
  if (provenanceErrors.length > 0) throw new Error(`Invalid TOPIK I provenance: ${provenanceErrors.join(', ')}`);

  const units: TopikIPreviewUnit[] = input.units.map((unit) => ({
    id: unit.id,
    stableRef: unit.stable_ref,
    examLevel: unit.exam_level,
    examBand: unit.exam_band,
    section: unit.section,
    titleKo: unit.title_ko,
    titleJa: unit.title_ja,
    titleEn: unit.title_en,
    instructionLanguages: unit.instruction_languages,
  }));
  const items: TopikIPreviewItem[] = input.items.map((item) => ({
    id: item.id,
    unitId: item.unit_id,
    stableRef: item.stable_ref,
    examLevel: item.exam_level,
    examBand: item.exam_band,
    section: item.section,
    itemKind: item.item_kind,
    skill: item.skill,
    difficulty: item.difficulty,
    promptKo: item.prompt_ko,
    promptJa: item.prompt_ja,
    promptEn: item.prompt_en,
    answerPayloadJson: JSON.stringify(item.answer_payload),
    explanationKo: item.explanation_ko,
    explanationJa: item.explanation_ja,
    explanationEn: item.explanation_en,
  }));

  assertUnique('unit ids', units.map((unit) => unit.id));
  assertUnique('unit stable refs', units.map((unit) => unit.stableRef));
  assertUnique('item ids', items.map((item) => item.id));
  assertUnique('item stable refs', items.map((item) => item.stableRef));
  assertUnique('Korean prompts', items.map((item) => item.promptKo));
  const unitIds = new Set(units.map((unit) => unit.id));
  for (const unit of units) {
    if (unit.instructionLanguages.join(',') !== 'ko,ja,en') throw new Error(`Unit ${unit.id} must support ko/ja/en`);
  }
  for (const item of items) {
    if (!unitIds.has(item.unitId)) throw new Error(`Item ${item.id} has an unknown unit`);
    if (item.difficulty < 1 || item.difficulty > 5) throw new Error(`Item ${item.id} has invalid difficulty`);
    for (const [label, value] of Object.entries({
      promptKo: item.promptKo,
      promptJa: item.promptJa,
      promptEn: item.promptEn,
      answerPayloadJson: item.answerPayloadJson,
      explanationKo: item.explanationKo,
      explanationJa: item.explanationJa,
      explanationEn: item.explanationEn,
    })) assertNonEmpty(`${item.id}.${label}`, value);
    JSON.parse(item.answerPayloadJson);
  }

  const bySection: Record<Section, number> = { listening: 0, writing: 0, reading: 0 };
  for (const item of items) bySection[item.section] += 1;
  const itemPayloadSha256 = Object.fromEntries(items.map((item) => [item.stableRef, sha256(canonicalJson(item))]));
  const inputSha256 = sha256(canonicalJson(input));
  const manifestWithoutHash = {
    schemaVersion: 'topik-i-preview-manifest-v1' as const,
    inputSha256,
    sourceCode: provenance.sourceCode,
    contentVersion: input.release.content_version,
    parserVersion: input.release.parser_version,
    reviewState: 'pending-two-human-signoffs' as const,
    expectedRows: { units: units.length, items: items.length, bySection },
    itemPayloadSha256,
  };
  const manifestSha256 = sha256(canonicalJson(manifestWithoutHash));

  return {
    release: {
      id: input.release.id,
      learningTrack: 'topik-ko',
      contentVersion: input.release.content_version,
      releaseState: 'draft',
      parserVersion: input.release.parser_version,
      manifestSha256,
    },
    provenance,
    units,
    items,
    manifest: { ...manifestWithoutHash, manifestSha256 },
  };
}

export function buildTopikIPreviewCandidateSql(): string[] {
  const candidate = loadTopikIPreviewCandidate();
  const { release, provenance } = candidate;
  return [
    `INSERT INTO content_releases (id, learning_track, content_version, release_state, manifest_sha256, parser_version)
     VALUES (${sql(release.id)}, 'topik-ko', ${sql(release.contentVersion)}, 'draft', ${sql(release.manifestSha256)}, ${sql(release.parserVersion)})
     ON CONFLICT DO NOTHING;`,
    `INSERT INTO content_release_sources (release_id, source_code, source_type, source_url, retrieved_at, source_sha256, license_id, license_url, allowed_use, attribution_text, author, first_reviewer, second_reviewer, reviewed_at, first_review_status, first_reviewed_at, second_review_status, second_reviewed_at)
     VALUES (${sql(release.id)}, ${sql(provenance.sourceCode)}, 'self-authored', ${sql(provenance.sourceUrl)}, ${sql(provenance.retrievedAt)}, ${sql(provenance.sourceSha256)}, ${sql(provenance.licenseId)}, ${sql(provenance.licenseUrl)}, ${sql(provenance.allowedUse)}, ${sql(provenance.attributionText)}, ${sql(provenance.author)}, ${sql(provenance.firstReviewer)}, ${sql(provenance.secondReviewer)}, ${sql(provenance.reviewedAt)}, 'pending', NULL, 'pending', NULL)
     ON CONFLICT DO NOTHING;`,
    ...candidate.units.map((unit) => `INSERT INTO topik_curriculum_units (id, release_id, learning_track, stable_ref, exam_level, exam_band, section, title_ko, title_ja, title_en, instruction_languages_json)
     VALUES (${sql(unit.id)}, ${sql(release.id)}, 'topik-ko', ${sql(unit.stableRef)}, 'TOPIK-I', ${sql(unit.examBand)}, ${sql(unit.section)}, ${sql(unit.titleKo)}, ${sql(unit.titleJa)}, ${sql(unit.titleEn)}, ${sql(JSON.stringify(unit.instructionLanguages))})
     ON CONFLICT DO NOTHING;`),
    ...candidate.items.map((item) => `INSERT INTO topik_content_items (id, release_id, unit_id, learning_track, stable_ref, exam_level, exam_band, section, item_kind, skill, difficulty, prompt_ko, prompt_ja, prompt_en, answer_payload_json, explanation_ko, explanation_ja, explanation_en, source_code)
     VALUES (${sql(item.id)}, ${sql(release.id)}, ${sql(item.unitId)}, 'topik-ko', ${sql(item.stableRef)}, 'TOPIK-I', ${sql(item.examBand)}, ${sql(item.section)}, ${sql(item.itemKind)}, ${sql(item.skill)}, ${sql(item.difficulty)}, ${sql(item.promptKo)}, ${sql(item.promptJa)}, ${sql(item.promptEn)}, ${sql(item.answerPayloadJson)}, ${sql(item.explanationKo)}, ${sql(item.explanationJa)}, ${sql(item.explanationEn)}, ${sql(provenance.sourceCode)})
     ON CONFLICT DO NOTHING;`),
  ];
}
