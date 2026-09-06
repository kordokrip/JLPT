import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  CONTENT_EXPANSION_INDEPENDENT_REVIEWS,
  contentExpansionIndependentReviewLedger,
} from "../content/reviews/content-expansion-independent-reviews.js";
import { REPO_ROOT } from "./constants.js";
import {
  JLPT_N3_PRACTICE_BANK_V1,
  JLPT_N3_PRACTICE_BANK_VERSION,
  JLPT_N3_PRACTICE_SOURCE_CODE,
  JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH,
  JLPT_N3_PRACTICE_SOURCE_SHA256,
  buildJlptN3PracticeBankV1Plan,
} from "./jlpt-n3-practice-bank-v1.js";
import {
  TOPIK_OWNER_BATCH_5,
  TOPIK_OWNER_BATCH_5_SOURCE_CODE,
  buildTopikOwnerBatch5Plan,
} from "./topik-owner-curriculum-batch5.js";
import { esc } from "./utils.js";

export const CONTENT_EXPANSION_RELEASE_GROUP_ID =
  "content-expansion-2026-08-19";
export const JLPT_N3_PRACTICE_RELEASE_ID = "jlpt-n3-practice-v1-2026-08-19";
export const TOPIK_OWNER_BATCH_5_RELEASE_ID = "topik-owner-batch5-2026-08-19";
export const TOPIK_OWNER_BATCH_5_CONTENT_VERSION = "topik-owner-batch5-v1";
export const CONTENT_EXPANSION_VALIDATOR_VERSION =
  "content-expansion-quality-v1";

export type ContentExpansionEvidencePaths = Readonly<{
  G0: string;
  G1: string;
  G2: string;
  G3: string;
  G4: string;
}>;

type Gate = keyof ContentExpansionEvidencePaths;
type Artifact = Readonly<{ path: string; sha256: string }>;

export type ReviewedContentRelease = Readonly<{
  releaseId: string;
  learningTrack: "jlpt-ja" | "topik-ko";
  contentVersion: string;
  contentType: "jlpt-quiz" | "topik-owner";
  sourceCode: string;
  itemIds: readonly string[];
  manifestSha256: string;
}>;

export type ContentExpansionReviewedReleasePlan = Readonly<{
  groupId: typeof CONTENT_EXPANSION_RELEASE_GROUP_ID;
  releases: readonly [ReviewedContentRelease, ReviewedContentRelease];
  evidence: Readonly<Record<Gate, Artifact>>;
  statements: readonly string[];
}>;

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function manifestSha256(
  release: Omit<ReviewedContentRelease, "manifestSha256">,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        schema_version: "content-expansion-release-manifest-v1",
        release_id: release.releaseId,
        learning_track: release.learningTrack,
        content_version: release.contentVersion,
        content_type: release.contentType,
        source_code: release.sourceCode,
        source_evidence_sha256: JLPT_N3_PRACTICE_SOURCE_EVIDENCE_HASH,
        final_draft_sha256:
          CONTENT_EXPANSION_INDEPENDENT_REVIEWS.final_draft_sha256,
        independent_review_sha256:
          CONTENT_EXPANSION_INDEPENDENT_REVIEWS.artifact_sha256,
        reviewer_artifacts: CONTENT_EXPANSION_INDEPENDENT_REVIEWS.reviewers,
        item_ids: release.itemIds,
      }),
    )
    .digest("hex");
}

function releaseDefinition(
  input: Omit<ReviewedContentRelease, "manifestSha256">,
): ReviewedContentRelease {
  return { ...input, manifestSha256: manifestSha256(input) };
}

function evidenceKey(
  releaseId: string,
  kind: "manifest" | "report",
  sha256: string,
): string {
  return `evidence/${kind}/v1/${releaseId}/${sha256}/artifact.json`;
}

function absoluteEvidence(
  input: ContentExpansionEvidencePaths,
): Record<Gate, string> {
  return Object.fromEntries(
    Object.entries(input).map(([gate, filePath]) => [
      gate,
      path.resolve(REPO_ROOT, filePath),
    ]),
  ) as Record<Gate, string>;
}

function validateG4(filePath: string): void {
  let record: Record<string, unknown>;
  try {
    record = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    throw new Error(
      `G4 must be a valid release-gate JSON artifact: ${filePath}`,
    );
  }
  if (
    record.release_id !== CONTENT_EXPANSION_RELEASE_GROUP_ID ||
    record.passed !== true ||
    !["local", "preview", "production-predeploy"].includes(String(record.phase))
  ) {
    throw new Error(
      `G4 must be a passed local, preview, or production-predeploy gate for ${CONTENT_EXPANSION_RELEASE_GROUP_ID}`,
    );
  }
}

function sourceStatement(release: ReviewedContentRelease): string {
  const [first, second] = CONTENT_EXPANSION_INDEPENDENT_REVIEWS.reviewers;
  if (!first || !second)
    throw new Error("Two independent reviewer artifacts are required");
  return [
    "INSERT OR IGNORE INTO `content_release_sources`",
    "  (`release_id`, `source_code`, `source_type`, `source_url`, `retrieved_at`, `source_sha256`, `license_id`, `license_url`, `allowed_use`, `attribution_text`, `author`, `first_reviewer`, `second_reviewer`, `reviewed_at`, `first_review_status`, `first_reviewed_at`, `second_review_status`, `second_reviewed_at`)",
    `VALUES (${esc(release.releaseId)}, ${esc(release.sourceCode)}, 'self-authored', 'https://github.com/kordokrip/JLPT/blob/main/packages/db/src/content/jlpt-n3-topik-owner-expansion-source.md', '2026-08-19', ${esc(JLPT_N3_PRACTICE_SOURCE_SHA256)}, 'LicenseRef-nihongo-n3-self-authored', 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#학습-콘텐츠와-provenance',`,
    "  'Self-authored personal learning content; official exam questions, answers, transcripts, and audio are excluded.',",
    "  '© Nihongo N3 contributors; self-authored JLPT and TOPIK learning content.',",
    `  'JLPT-TOPIK Study item author', ${esc(first.reviewer_id)}, ${esc(second.reviewer_id)}, '2026-08-19', 'signed', '2026-08-19', 'signed', '2026-08-19');`,
  ].join("\n");
}

function auditStatements(release: ReviewedContentRelease): string[] {
  const [first, second] = CONTENT_EXPANSION_INDEPENDENT_REVIEWS.reviewers;
  if (!first || !second)
    throw new Error("Two independent reviewer artifacts are required");
  const reviewDetails = {
    final_draft_sha256:
      CONTENT_EXPANSION_INDEPENDENT_REVIEWS.final_draft_sha256,
    independent_review_sha256:
      CONTENT_EXPANSION_INDEPENDENT_REVIEWS.artifact_sha256,
    reviewer_1_artifact_sha256: first.artifact_sha256,
    reviewer_2_artifact_sha256: second.artifact_sha256,
    authorship: "self-authored",
    speech_provider: "google-browser",
    r2_pronunciation_references: 0,
  };
  return release.itemIds.map((itemId) =>
    [
      "INSERT OR IGNORE INTO `content_quality_audits`",
      "  (`id`, `learning_track`, `content_type`, `content_id`, `content_version`, `evidence_sha256`, `validator_version`, `automated_status`, `author_review_status`, `adversarial_review_status`, `author_reviewer`, `adversarial_reviewer`, `release_state`, `details_json`, `checked_at`)",
      `VALUES (${esc(`quality-audit:${release.releaseId}:${itemId}`)}, ${esc(release.learningTrack)}, ${esc(release.contentType)}, ${esc(itemId)}, ${esc(release.contentVersion)}, ${esc(CONTENT_EXPANSION_INDEPENDENT_REVIEWS.final_draft_sha256)}, ${esc(CONTENT_EXPANSION_VALIDATOR_VERSION)}, 'passed', 'signed', 'signed', ${esc(first.reviewer_id)}, ${esc(second.reviewer_id)}, 'approved', ${esc(JSON.stringify(reviewDetails))}, '2026-08-19');`,
    ].join("\n"),
  );
}

function releaseControlStatements(
  release: ReviewedContentRelease,
  evidence: Readonly<Record<Gate, Artifact>>,
): string[] {
  const artifactForJob = {
    ingest: evidence.G0,
    validate: evidence.G2,
    ai_draft: evidence.G1,
    qa: evidence.G2,
    human_approval: evidence.G3,
    preview_candidate: evidence.G4,
  } as const;
  return [
    [
      "INSERT OR IGNORE INTO `content_releases`",
      "  (`id`, `learning_track`, `content_version`, `release_state`, `manifest_sha256`, `parser_version`)",
      `VALUES (${esc(release.releaseId)}, ${esc(release.learningTrack)}, ${esc(release.contentVersion)}, 'draft', ${esc(release.manifestSha256)}, ${esc(CONTENT_EXPANSION_VALIDATOR_VERSION)});`,
    ].join("\n"),
    sourceStatement(release),
    ...Object.entries(artifactForJob).map(([jobKind, artifact]) =>
      [
        "INSERT OR IGNORE INTO `content_release_jobs`",
        "  (`id`, `release_id`, `job_kind`, `job_state`, `artifact_key`, `artifact_sha256`, `idempotency_key`, `queue_attempts`)",
        `VALUES (${esc(`${release.releaseId}-${jobKind}`)}, ${esc(release.releaseId)}, ${esc(jobKind)}, 'succeeded', ${esc(evidenceKey(release.releaseId, "report", artifact.sha256))}, ${esc(artifact.sha256)}, ${esc(`crcp:v1:${release.releaseId}:${jobKind}:${artifact.sha256}`)}, 1);`,
      ].join("\n"),
    ),
    [
      "INSERT OR IGNORE INTO `content_release_quality_requirements`",
      "  (`release_id`, `content_type`, `expected_audit_count`, `validator_version`)",
      `VALUES (${esc(release.releaseId)}, ${esc(release.contentType)}, ${release.itemIds.length}, ${esc(CONTENT_EXPANSION_VALIDATOR_VERSION)});`,
    ].join("\n"),
  ];
}

function approvalAndPublishStatements(
  release: ReviewedContentRelease,
  evidence: Readonly<Record<Gate, Artifact>>,
): string[] {
  return [
    [
      "INSERT OR IGNORE INTO `content_release_quality_audit_links` (`release_id`, `audit_id`)",
      `SELECT ${esc(release.releaseId)}, a.id FROM content_quality_audits a`,
      `WHERE a.learning_track = ${esc(release.learningTrack)} AND a.content_type = ${esc(release.contentType)}`,
      `  AND a.content_version = ${esc(release.contentVersion)} AND a.validator_version = ${esc(CONTENT_EXPANSION_VALIDATOR_VERSION)}`,
      "  AND a.automated_status = 'passed' AND a.author_review_status = 'signed'",
      "  AND a.adversarial_review_status = 'signed' AND a.author_reviewer <> a.adversarial_reviewer",
      "  AND a.release_state = 'approved';",
    ].join("\n"),
    `UPDATE content_releases SET release_state = 'automated_checked', updated_at = unixepoch() WHERE id = ${esc(release.releaseId)} AND release_state = 'draft';`,
    `UPDATE content_releases SET release_state = 'human_reviewed', updated_at = unixepoch() WHERE id = ${esc(release.releaseId)} AND release_state = 'automated_checked';`,
    `UPDATE content_releases SET release_state = 'preview', updated_at = unixepoch() WHERE id = ${esc(release.releaseId)} AND release_state = 'human_reviewed';`,
    `UPDATE content_releases SET release_state = 'approved', updated_at = unixepoch() WHERE id = ${esc(release.releaseId)} AND release_state = 'preview';`,
    [
      "INSERT OR IGNORE INTO `content_release_preview_candidates`",
      "  (`id`, `release_id`, `candidate_state`, `manifest_key`, `manifest_sha256`, `ready_at`)",
      `VALUES (${esc(`${release.releaseId}-preview`)}, ${esc(release.releaseId)}, 'ready', ${esc(evidenceKey(release.releaseId, "manifest", release.manifestSha256))}, ${esc(release.manifestSha256)}, unixepoch());`,
    ].join("\n"),
    ...Object.entries(evidence).map(([gate, artifact]) =>
      [
        "INSERT OR IGNORE INTO `content_release_gate_evidence`",
        "  (`release_id`, `gate`, `gate_state`, `artifact_key`, `artifact_sha256`, `recorded_by`)",
        `VALUES (${esc(release.releaseId)}, ${esc(gate)}, 'passed', ${esc(evidenceKey(release.releaseId, "report", artifact.sha256))}, ${esc(artifact.sha256)}, ${gate === "G3" ? "'operator'" : "'system'"});`,
      ].join("\n"),
    ),
    `UPDATE content_releases SET release_state = 'published', published_at = COALESCE(published_at, unixepoch()), updated_at = unixepoch() WHERE id = ${esc(release.releaseId)} AND release_state = 'approved';`,
    `UPDATE content_quality_audits SET release_state = 'published', updated_at = unixepoch() WHERE id IN (SELECT audit_id FROM content_release_quality_audit_links WHERE release_id = ${esc(release.releaseId)}) AND release_state = 'approved';`,
  ];
}

export function buildContentExpansionReviewedReleasePlan(
  input: ContentExpansionEvidencePaths,
): ContentExpansionReviewedReleasePlan {
  const absolute = absoluteEvidence(input);
  for (const [gate, filePath] of Object.entries(absolute)) {
    if (!fs.statSync(filePath, { throwIfNoEntry: false })?.isFile()) {
      throw new Error(`${gate} evidence file is missing: ${filePath}`);
    }
  }
  validateG4(absolute.G4);
  const evidence = Object.fromEntries(
    Object.entries(absolute).map(([gate, filePath]) => [
      gate,
      {
        path: path.relative(REPO_ROOT, filePath).split(path.sep).join("/"),
        sha256: sha256File(filePath),
      },
    ]),
  ) as Readonly<Record<Gate, Artifact>>;

  const jlpt = releaseDefinition({
    releaseId: JLPT_N3_PRACTICE_RELEASE_ID,
    learningTrack: "jlpt-ja",
    contentVersion: JLPT_N3_PRACTICE_BANK_VERSION,
    contentType: "jlpt-quiz",
    sourceCode: JLPT_N3_PRACTICE_SOURCE_CODE,
    itemIds: JLPT_N3_PRACTICE_BANK_V1.map((item) => item.id),
  });
  const topik = releaseDefinition({
    releaseId: TOPIK_OWNER_BATCH_5_RELEASE_ID,
    learningTrack: "topik-ko",
    contentVersion: TOPIK_OWNER_BATCH_5_CONTENT_VERSION,
    contentType: "topik-owner",
    sourceCode: TOPIK_OWNER_BATCH_5_SOURCE_CODE,
    itemIds: TOPIK_OWNER_BATCH_5.map((item) => item.id),
  });
  const ledger = contentExpansionIndependentReviewLedger();
  const jlptDraft = buildJlptN3PracticeBankV1Plan(ledger);
  const topikDraft = buildTopikOwnerBatch5Plan(ledger);

  const statements = [
    ...releaseControlStatements(jlpt, evidence),
    ...releaseControlStatements(topik, evidence),
    // Audits precede content rows so API publication filters keep the new
    // TOPIK owner items hidden throughout the staging portion of the seed.
    ...auditStatements(jlpt),
    ...auditStatements(topik),
    ...jlptDraft.statements,
    ...topikDraft.statements,
    ...approvalAndPublishStatements(jlpt, evidence),
    ...approvalAndPublishStatements(topik, evidence),
    `UPDATE jlpt_practice_questions SET is_published = 1, updated_at = unixepoch() WHERE bank_version = ${esc(jlpt.contentVersion)} AND is_published = 0;`,
  ];
  return {
    groupId: CONTENT_EXPANSION_RELEASE_GROUP_ID,
    releases: [jlpt, topik],
    evidence,
    statements,
  };
}

export function defaultContentExpansionEvidence(
  g4Path: string,
): ContentExpansionEvidencePaths {
  return {
    G0: ".artifacts/content-intake/jlpt-n3-topik-owner-expansion-2026-08-19.json",
    G1: "packages/db/src/content/jlpt-n3-topik-owner-expansion-source.md",
    G2: ".artifacts/content-quality/content-expansion-draft-2026-08-19.json",
    G3: ".artifacts/content-quality/content-expansion-independent-reviews-2026-08-19.json",
    G4: g4Path,
  };
}
