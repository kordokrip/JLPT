import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS,
  nextContentExpansionIndependentReviewLedger,
} from '../content/reviews/next-content-expansion-independent-reviews.js';
import {
  NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256,
  NEXT_CONTENT_EXPANSION_VALIDATOR_VERSION,
} from '../ops/next-content-expansion-quality.js';
import {
  JLPT_N1_PRACTICE_BANK_V1,
  JLPT_N1_PRACTICE_BANK_VERSION,
  JLPT_N2_PRACTICE_BANK_V1,
  JLPT_N2_PRACTICE_BANK_VERSION,
  buildJlptN1PracticeBankV1Plan,
  buildJlptN2PracticeBankV1Plan,
} from './jlpt-n2-n1-practice-banks-v1.js';
import {
  NEXT_CONTENT_EXPANSION_ALLOWED_USE,
  NEXT_CONTENT_EXPANSION_ATTRIBUTION,
  NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256,
  NEXT_CONTENT_EXPANSION_INTAKE_FILE_SHA256,
  NEXT_CONTENT_EXPANSION_LICENSE_ID,
  NEXT_CONTENT_EXPANSION_LICENSE_URL,
  NEXT_CONTENT_EXPANSION_RETRIEVED_AT,
  NEXT_CONTENT_EXPANSION_SOURCE_CODE,
  NEXT_CONTENT_EXPANSION_SOURCE_SHA256,
  NEXT_CONTENT_EXPANSION_SOURCE_URL,
} from './next-content-expansion-source.js';
import { REPO_ROOT } from './constants.js';
import {
  TOPIK_OWNER_BATCH_6,
  buildTopikOwnerBatch6Plan,
} from './topik-owner-curriculum-batch6.js';
import { esc } from './utils.js';

export const NEXT_CONTENT_EXPANSION_RELEASE_GROUP_ID = 'next-content-expansion-2026-08-23';
export const JLPT_N2_PRACTICE_RELEASE_ID = 'jlpt-n2-practice-v1-2026-08-23';
export const JLPT_N1_PRACTICE_RELEASE_ID = 'jlpt-n1-practice-v1-2026-08-23';
export const TOPIK_OWNER_BATCH_6_RELEASE_ID = 'topik-owner-batch6-2026-08-23';
export const TOPIK_OWNER_BATCH_6_CONTENT_VERSION = 'topik-owner-batch6-v1';

export type NextContentExpansionEvidencePaths = Readonly<{
  G0: string;
  G1: string;
  G2: string;
  G3: string;
  G4: string;
}>;

type Gate = keyof NextContentExpansionEvidencePaths;
type Artifact = Readonly<{ path: string; sha256: string }>;

export type NextContentExpansionRelease = Readonly<{
  releaseId: string;
  learningTrack: 'jlpt-ja' | 'topik-ko';
  contentVersion: string;
  contentType: 'jlpt-quiz' | 'topik-owner';
  itemIds: readonly string[];
  manifestSha256: string;
}>;

export type NextContentExpansionReviewedReleasePlan = Readonly<{
  groupId: typeof NEXT_CONTENT_EXPANSION_RELEASE_GROUP_ID;
  releases: readonly [NextContentExpansionRelease, NextContentExpansionRelease, NextContentExpansionRelease];
  evidence: Readonly<Record<Gate, Artifact>>;
  statements: readonly string[];
}>;

function sha256File(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readRecord(filePath: string, name: string): Record<string, unknown> {
  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object');
    return value as Record<string, unknown>;
  } catch {
    throw new Error(`${name} must be a valid JSON object: ${filePath}`);
  }
}

function validateEvidence(paths: Record<Gate, string>): void {
  if (sha256File(paths.G0) !== NEXT_CONTENT_EXPANSION_INTAKE_FILE_SHA256) {
    throw new Error('G0 does not match the validated tracked intake artifact');
  }
  if (sha256File(paths.G1) !== NEXT_CONTENT_EXPANSION_SOURCE_SHA256) {
    throw new Error('G1 does not match the immutable self-authored source');
  }
  const quality = readRecord(paths.G2, 'G2');
  if (
    quality.passed !== true
    || quality.final_draft_sha256 !== NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256
    || quality.validator_version !== NEXT_CONTENT_EXPANSION_VALIDATOR_VERSION
  ) throw new Error('G2 must be a passed quality report for the exact final draft');

  const reviews = readRecord(paths.G3, 'G3');
  if (
    reviews.passed !== true
    || reviews.final_draft_sha256 !== NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256
    || reviews.artifact_sha256 !== NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS.artifact_sha256
    || reviews.source_evidence_sha256 !== NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256
  ) throw new Error('G3 must contain two passed independent reviews for the exact final draft');

  const gate = readRecord(paths.G4, 'G4');
  if (
    gate.release_id !== NEXT_CONTENT_EXPANSION_RELEASE_GROUP_ID
    || gate.passed !== true
    || !['local', 'preview', 'production-predeploy'].includes(String(gate.phase))
  ) throw new Error(`G4 must be a passed release gate for ${NEXT_CONTENT_EXPANSION_RELEASE_GROUP_ID}`);
}

function manifestSha256(input: Omit<NextContentExpansionRelease, 'manifestSha256'>): string {
  return createHash('sha256').update(JSON.stringify({
    schema_version: 'next-content-expansion-release-manifest-v1',
    release_id: input.releaseId,
    learning_track: input.learningTrack,
    content_version: input.contentVersion,
    content_type: input.contentType,
    source_code: NEXT_CONTENT_EXPANSION_SOURCE_CODE,
    source_evidence_sha256: NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256,
    final_draft_sha256: NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256,
    independent_review_sha256: NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS.artifact_sha256,
    reviewer_artifacts: NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS.reviewers,
    item_ids: input.itemIds,
  })).digest('hex');
}

function releaseDefinition(input: Omit<NextContentExpansionRelease, 'manifestSha256'>): NextContentExpansionRelease {
  return { ...input, manifestSha256: manifestSha256(input) };
}

function evidenceKey(releaseId: string, kind: 'manifest' | 'report', sha256: string): string {
  return `evidence/${kind}/v1/${releaseId}/${sha256}/artifact.json`;
}

function sourceStatement(release: NextContentExpansionRelease): string {
  const [first, second] = NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS.reviewers;
  if (!first || !second) throw new Error('Two independent reviewer artifacts are required');
  return [
    'INSERT OR IGNORE INTO `content_release_sources`',
    '  (`release_id`, `source_code`, `source_type`, `source_url`, `retrieved_at`, `source_sha256`, `license_id`, `license_url`, `allowed_use`, `attribution_text`, `author`, `first_reviewer`, `second_reviewer`, `reviewed_at`, `first_review_status`, `first_reviewed_at`, `second_review_status`, `second_reviewed_at`)',
    `VALUES (${esc(release.releaseId)}, ${esc(NEXT_CONTENT_EXPANSION_SOURCE_CODE)}, 'self-authored', ${esc(NEXT_CONTENT_EXPANSION_SOURCE_URL)}, ${esc(NEXT_CONTENT_EXPANSION_RETRIEVED_AT.slice(0, 10))}, ${esc(NEXT_CONTENT_EXPANSION_SOURCE_SHA256)}, ${esc(NEXT_CONTENT_EXPANSION_LICENSE_ID)}, ${esc(NEXT_CONTENT_EXPANSION_LICENSE_URL)},`,
    `  ${esc(NEXT_CONTENT_EXPANSION_ALLOWED_USE)}, ${esc(NEXT_CONTENT_EXPANSION_ATTRIBUTION)},`,
    `  'JLPT-TOPIK Study item author', ${esc(first.reviewer_id)}, ${esc(second.reviewer_id)}, '2026-08-23', 'signed', '2026-08-23', 'signed', '2026-08-23');`,
  ].join('\n');
}

function auditStatements(release: NextContentExpansionRelease): string[] {
  const [first, second] = NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS.reviewers;
  if (!first || !second) throw new Error('Two independent reviewer artifacts are required');
  const details = JSON.stringify({
    final_draft_sha256: NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256,
    independent_review_sha256: NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS.artifact_sha256,
    reviewer_a_artifact_sha256: first.artifact_sha256,
    reviewer_b_artifact_sha256: second.artifact_sha256,
    authorship: 'self-authored',
    speech_provider: 'google-browser',
    r2_pronunciation_references: 0,
  });
  return release.itemIds.map((itemId) => [
    'INSERT OR IGNORE INTO `content_quality_audits`',
    '  (`id`, `learning_track`, `content_type`, `content_id`, `content_version`, `evidence_sha256`, `validator_version`, `automated_status`, `author_review_status`, `adversarial_review_status`, `author_reviewer`, `adversarial_reviewer`, `release_state`, `details_json`, `checked_at`)',
    `VALUES (${esc(`quality-audit:${release.releaseId}:${itemId}`)}, ${esc(release.learningTrack)}, ${esc(release.contentType)}, ${esc(itemId)}, ${esc(release.contentVersion)}, ${esc(NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256)}, ${esc(NEXT_CONTENT_EXPANSION_VALIDATOR_VERSION)}, 'passed', 'signed', 'signed', ${esc(first.reviewer_id)}, ${esc(second.reviewer_id)}, 'approved', ${esc(details)}, '2026-08-23');`,
  ].join('\n'));
}

function releaseControlStatements(
  release: NextContentExpansionRelease,
  evidence: Readonly<Record<Gate, Artifact>>,
): string[] {
  const jobArtifacts = {
    ingest: evidence.G0,
    validate: evidence.G2,
    ai_draft: evidence.G1,
    qa: evidence.G2,
    human_approval: evidence.G3,
    preview_candidate: evidence.G4,
  } as const;
  return [
    [
      'INSERT OR IGNORE INTO `content_releases`',
      '  (`id`, `learning_track`, `content_version`, `release_state`, `manifest_sha256`, `parser_version`)',
      `VALUES (${esc(release.releaseId)}, ${esc(release.learningTrack)}, ${esc(release.contentVersion)}, 'draft', ${esc(release.manifestSha256)}, ${esc(NEXT_CONTENT_EXPANSION_VALIDATOR_VERSION)});`,
    ].join('\n'),
    sourceStatement(release),
    ...Object.entries(jobArtifacts).map(([kind, artifact]) => [
      'INSERT OR IGNORE INTO `content_release_jobs`',
      '  (`id`, `release_id`, `job_kind`, `job_state`, `artifact_key`, `artifact_sha256`, `idempotency_key`, `queue_attempts`)',
      `VALUES (${esc(`${release.releaseId}-${kind}`)}, ${esc(release.releaseId)}, ${esc(kind)}, 'succeeded', ${esc(evidenceKey(release.releaseId, 'report', artifact.sha256))}, ${esc(artifact.sha256)}, ${esc(`crcp:v1:${release.releaseId}:${kind}:${artifact.sha256}`)}, 1);`,
    ].join('\n')),
    [
      'INSERT OR IGNORE INTO `content_release_quality_requirements`',
      '  (`release_id`, `content_type`, `expected_audit_count`, `validator_version`)',
      `VALUES (${esc(release.releaseId)}, ${esc(release.contentType)}, ${release.itemIds.length}, ${esc(NEXT_CONTENT_EXPANSION_VALIDATOR_VERSION)});`,
    ].join('\n'),
  ];
}

function approvalAndPublishStatements(
  release: NextContentExpansionRelease,
  evidence: Readonly<Record<Gate, Artifact>>,
): string[] {
  return [
    [
      'INSERT OR IGNORE INTO `content_release_quality_audit_links` (`release_id`, `audit_id`)',
      `SELECT ${esc(release.releaseId)}, a.id FROM content_quality_audits a`,
      `WHERE a.learning_track = ${esc(release.learningTrack)} AND a.content_type = ${esc(release.contentType)}`,
      `  AND a.content_version = ${esc(release.contentVersion)} AND a.validator_version = ${esc(NEXT_CONTENT_EXPANSION_VALIDATOR_VERSION)}`,
      "  AND a.automated_status = 'passed' AND a.author_review_status = 'signed'",
      "  AND a.adversarial_review_status = 'signed' AND a.author_reviewer <> a.adversarial_reviewer",
      "  AND a.release_state = 'approved';",
    ].join('\n'),
    `UPDATE content_releases SET release_state = 'automated_checked', updated_at = unixepoch() WHERE id = ${esc(release.releaseId)} AND release_state = 'draft';`,
    `UPDATE content_releases SET release_state = 'human_reviewed', updated_at = unixepoch() WHERE id = ${esc(release.releaseId)} AND release_state = 'automated_checked';`,
    `UPDATE content_releases SET release_state = 'preview', updated_at = unixepoch() WHERE id = ${esc(release.releaseId)} AND release_state = 'human_reviewed';`,
    `UPDATE content_releases SET release_state = 'approved', updated_at = unixepoch() WHERE id = ${esc(release.releaseId)} AND release_state = 'preview';`,
    [
      'INSERT OR IGNORE INTO `content_release_preview_candidates`',
      '  (`id`, `release_id`, `candidate_state`, `manifest_key`, `manifest_sha256`, `ready_at`)',
      `VALUES (${esc(`${release.releaseId}-preview`)}, ${esc(release.releaseId)}, 'ready', ${esc(evidenceKey(release.releaseId, 'manifest', release.manifestSha256))}, ${esc(release.manifestSha256)}, unixepoch());`,
    ].join('\n'),
    ...Object.entries(evidence).map(([gate, artifact]) => [
      'INSERT OR IGNORE INTO `content_release_gate_evidence`',
      '  (`release_id`, `gate`, `gate_state`, `artifact_key`, `artifact_sha256`, `recorded_by`)',
      `VALUES (${esc(release.releaseId)}, ${esc(gate)}, 'passed', ${esc(evidenceKey(release.releaseId, 'report', artifact.sha256))}, ${esc(artifact.sha256)}, ${gate === 'G3' ? "'operator'" : "'system'"});`,
    ].join('\n')),
    `UPDATE content_releases SET release_state = 'published', published_at = COALESCE(published_at, unixepoch()), updated_at = unixepoch() WHERE id = ${esc(release.releaseId)} AND release_state = 'approved';`,
    `UPDATE content_quality_audits SET release_state = 'published', updated_at = unixepoch() WHERE id IN (SELECT audit_id FROM content_release_quality_audit_links WHERE release_id = ${esc(release.releaseId)}) AND release_state = 'approved';`,
  ];
}

export function buildNextContentExpansionReviewedReleasePlan(
  input: NextContentExpansionEvidencePaths,
): NextContentExpansionReviewedReleasePlan {
  const absolute = Object.fromEntries(Object.entries(input).map(([gate, filePath]) => [
    gate,
    path.resolve(REPO_ROOT, filePath),
  ])) as Record<Gate, string>;
  for (const [gate, filePath] of Object.entries(absolute)) {
    if (!fs.statSync(filePath, { throwIfNoEntry: false })?.isFile()) {
      throw new Error(`${gate} evidence file is missing: ${filePath}`);
    }
  }
  validateEvidence(absolute);
  const evidence = Object.fromEntries(Object.entries(absolute).map(([gate, filePath]) => [
    gate,
    { path: path.relative(REPO_ROOT, filePath).split(path.sep).join('/'), sha256: sha256File(filePath) },
  ])) as Readonly<Record<Gate, Artifact>>;

  const n2 = releaseDefinition({
    releaseId: JLPT_N2_PRACTICE_RELEASE_ID,
    learningTrack: 'jlpt-ja',
    contentVersion: JLPT_N2_PRACTICE_BANK_VERSION,
    contentType: 'jlpt-quiz',
    itemIds: JLPT_N2_PRACTICE_BANK_V1.map((item) => item.id),
  });
  const n1 = releaseDefinition({
    releaseId: JLPT_N1_PRACTICE_RELEASE_ID,
    learningTrack: 'jlpt-ja',
    contentVersion: JLPT_N1_PRACTICE_BANK_VERSION,
    contentType: 'jlpt-quiz',
    itemIds: JLPT_N1_PRACTICE_BANK_V1.map((item) => item.id),
  });
  const topik = releaseDefinition({
    releaseId: TOPIK_OWNER_BATCH_6_RELEASE_ID,
    learningTrack: 'topik-ko',
    contentVersion: TOPIK_OWNER_BATCH_6_CONTENT_VERSION,
    contentType: 'topik-owner',
    itemIds: TOPIK_OWNER_BATCH_6.map((item) => item.id),
  });

  const ledger = nextContentExpansionIndependentReviewLedger();
  const n2Draft = buildJlptN2PracticeBankV1Plan(ledger);
  const n1Draft = buildJlptN1PracticeBankV1Plan(ledger);
  const topikDraft = buildTopikOwnerBatch6Plan(ledger);
  const statements = [
    ...releaseControlStatements(n2, evidence),
    ...releaseControlStatements(n1, evidence),
    ...releaseControlStatements(topik, evidence),
    ...auditStatements(n2),
    ...auditStatements(n1),
    ...auditStatements(topik),
    ...n2Draft.statements,
    ...n1Draft.statements,
    ...topikDraft.statements,
    ...approvalAndPublishStatements(n2, evidence),
    ...approvalAndPublishStatements(n1, evidence),
    ...approvalAndPublishStatements(topik, evidence),
    `UPDATE jlpt_practice_questions SET is_published = 1, updated_at = unixepoch() WHERE bank_version = ${esc(n2.contentVersion)} AND is_published = 0;`,
    `UPDATE jlpt_practice_questions SET is_published = 1, updated_at = unixepoch() WHERE bank_version = ${esc(n1.contentVersion)} AND is_published = 0;`,
  ];
  return {
    groupId: NEXT_CONTENT_EXPANSION_RELEASE_GROUP_ID,
    releases: [n2, n1, topik],
    evidence,
    statements,
  };
}

export function defaultNextContentExpansionEvidence(g4Path: string): NextContentExpansionEvidencePaths {
  return {
    G0: 'packages/db/src/content/next-content-expansion-intake.json',
    G1: 'packages/db/src/content/next-content-expansion-source.md',
    G2: '.artifacts/content-quality/next-content-expansion-draft-2026-08-23.json',
    G3: '.artifacts/content-quality/next-content-expansion-independent-reviews-2026-08-23.json',
    G4: g4Path,
  };
}
