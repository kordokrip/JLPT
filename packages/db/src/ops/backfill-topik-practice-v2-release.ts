import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { REPO_ROOT } from '../seed/constants.js';
import { argValue, executeSqlFile, parseD1Target, querySql } from '../seed/d1-cli.js';
import {
  buildTopikPracticeV2SeedPlan,
  TOPIK_PRACTICE_V2_PARSER_VERSION,
  TOPIK_PRACTICE_V2_SOURCE_CODE,
} from '../seed/topik-practice-bank-v2.js';
import { esc } from '../seed/utils.js';

export const TOPIK_PRACTICE_V2_RELEASE_ID = 'topik-practice-v2-2026-08-17';
const PRODUCTION_TARGET = 'nihongo-n3-prod-v2';

export type HistoricalEvidencePaths = Readonly<{
  G0: string;
  G1: string;
  G2: string;
  G3: string;
  G4: string;
}>;

export type HistoricalReleasePlan = Readonly<{
  releaseId: string;
  contentVersion: string;
  manifestSha256: string;
  expectedAuditCount: number;
  statements: readonly string[];
  evidence: Readonly<Record<'G0' | 'G1' | 'G2' | 'G3' | 'G4', { path: string; sha256: string }>>;
}>;

function sha256(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function absoluteEvidencePaths(input: HistoricalEvidencePaths): HistoricalEvidencePaths {
  return Object.fromEntries(Object.entries(input).map(([gate, filePath]) => [
    gate,
    path.resolve(REPO_ROOT, filePath),
  ])) as unknown as HistoricalEvidencePaths;
}

function evidenceKey(kind: 'manifest' | 'report', sha: string): string {
  return `evidence/${kind}/v1/${TOPIK_PRACTICE_V2_RELEASE_ID}/${sha}/artifact.json`;
}

export function buildHistoricalTopikV2ReleasePlan(input: HistoricalEvidencePaths): HistoricalReleasePlan {
  const paths = absoluteEvidencePaths(input);
  for (const [gate, filePath] of Object.entries(paths)) {
    if (!fs.statSync(filePath, { throwIfNoEntry: false })?.isFile()) {
      throw new Error(`${gate} historical evidence file is missing: ${filePath}`);
    }
  }
  const predeploy = JSON.parse(fs.readFileSync(paths.G4, 'utf8')) as Record<string, unknown>;
  if (predeploy.release_id !== TOPIK_PRACTICE_V2_RELEASE_ID || predeploy.phase !== 'production-predeploy' || predeploy.passed !== true) {
    throw new Error('G4 must be the passed production-predeploy record for the TOPIK practice v2 release');
  }

  const manifest = buildTopikPracticeV2SeedPlan().manifest;
  const evidence = Object.fromEntries(Object.entries(paths).map(([gate, filePath]) => [
    gate,
    { path: path.relative(REPO_ROOT, filePath).split(path.sep).join('/'), sha256: sha256(filePath) },
  ])) as HistoricalReleasePlan['evidence'];
  const releaseId = TOPIK_PRACTICE_V2_RELEASE_ID;
  const source = manifest.source;
  const sourceUrl = source.provenance.origin.url;
  const license = source.provenance.license;
  const allowedUse = 'Self-authored personal learning questions and structured language facts; no official TOPIK item, answer, transcript, or audio.';
  const artifactForJob = {
    ingest: evidence.G0,
    validate: evidence.G2,
    ai_draft: evidence.G1,
    qa: evidence.G2,
    human_approval: evidence.G3,
    preview_candidate: evidence.G4,
  } as const;

  const statements: string[] = [
    [
      'INSERT OR IGNORE INTO `content_releases`',
      '  (`id`, `learning_track`, `content_version`, `release_state`, `manifest_sha256`, `parser_version`)',
      `VALUES (${esc(releaseId)}, 'topik-ko', ${esc(manifest.contentVersion)}, 'draft', ${esc(manifest.manifestSha256)}, ${esc(manifest.parserVersion)});`,
    ].join('\n'),
    [
      'INSERT OR IGNORE INTO `content_release_sources`',
      '  (`release_id`, `source_code`, `source_type`, `source_url`, `retrieved_at`, `source_sha256`, `license_id`, `license_url`, `allowed_use`, `attribution_text`, `author`, `first_reviewer`, `second_reviewer`, `reviewed_at`, `first_review_status`, `first_reviewed_at`, `second_review_status`, `second_reviewed_at`)',
      `VALUES (${esc(releaseId)}, ${esc(TOPIK_PRACTICE_V2_SOURCE_CODE)}, 'self-authored', ${esc(sourceUrl)}, '2026-08-17', ${esc(source.sourceChecksum)}, ${esc(license.id)}, ${esc(license.url)}, ${esc(allowedUse)}, ${esc(source.provenance.origin.name)}, 'JLPT-TOPIK Study item author', ${esc(source.provenance.authorReviewer)}, ${esc(source.provenance.secondReviewer)}, ${esc(source.provenance.reviewedAt)}, 'signed', ${esc(source.provenance.reviewedAt)}, 'signed', ${esc(source.provenance.reviewedAt)});`,
    ].join('\n'),
    ...Object.entries(artifactForJob).map(([jobKind, artifact]) => [
      'INSERT OR IGNORE INTO `content_release_jobs`',
      '  (`id`, `release_id`, `job_kind`, `job_state`, `artifact_key`, `artifact_sha256`, `idempotency_key`, `queue_attempts`)',
      `VALUES (${esc(`${releaseId}-${jobKind}`)}, ${esc(releaseId)}, ${esc(jobKind)}, 'succeeded', ${esc(evidenceKey('report', artifact.sha256))}, ${esc(artifact.sha256)}, ${esc(`crcp:v1:${releaseId}:${jobKind}:${artifact.sha256}`)}, 1);`,
    ].join('\n')),
    [
      'INSERT OR IGNORE INTO `content_release_quality_requirements`',
      '  (`release_id`, `content_type`, `expected_audit_count`, `validator_version`)',
      `VALUES (${esc(releaseId)}, 'topik-practice', ${manifest.questions.expectedRows}, ${esc(TOPIK_PRACTICE_V2_PARSER_VERSION)});`,
    ].join('\n'),
    [
      'INSERT OR IGNORE INTO `content_release_quality_audit_links` (`release_id`, `audit_id`)',
      `SELECT ${esc(releaseId)}, a.id FROM content_quality_audits a`,
      `WHERE a.learning_track = 'topik-ko' AND a.content_type = 'topik-practice'`,
      `  AND a.content_version = ${esc(manifest.contentVersion)}`,
      `  AND a.validator_version = ${esc(TOPIK_PRACTICE_V2_PARSER_VERSION)}`,
      "  AND a.automated_status = 'passed' AND a.author_review_status = 'signed'",
      "  AND a.adversarial_review_status = 'signed' AND a.author_reviewer <> a.adversarial_reviewer",
      "  AND a.release_state IN ('approved', 'published');",
    ].join('\n'),
    `UPDATE content_releases SET release_state = 'automated_checked', updated_at = unixepoch() WHERE id = ${esc(releaseId)} AND release_state = 'draft';`,
    `UPDATE content_releases SET release_state = 'human_reviewed', updated_at = unixepoch() WHERE id = ${esc(releaseId)} AND release_state = 'automated_checked';`,
    `UPDATE content_releases SET release_state = 'preview', updated_at = unixepoch() WHERE id = ${esc(releaseId)} AND release_state = 'human_reviewed';`,
    `UPDATE content_releases SET release_state = 'approved', updated_at = unixepoch() WHERE id = ${esc(releaseId)} AND release_state = 'preview';`,
    [
      'INSERT OR IGNORE INTO `content_release_preview_candidates`',
      '  (`id`, `release_id`, `candidate_state`, `manifest_key`, `manifest_sha256`, `ready_at`)',
      `VALUES (${esc(`${releaseId}-preview`)}, ${esc(releaseId)}, 'ready', ${esc(evidenceKey('manifest', manifest.manifestSha256))}, ${esc(manifest.manifestSha256)}, unixepoch());`,
    ].join('\n'),
    ...Object.entries(evidence).map(([gate, artifact]) => [
      'INSERT OR IGNORE INTO `content_release_gate_evidence`',
      '  (`release_id`, `gate`, `gate_state`, `artifact_key`, `artifact_sha256`, `recorded_by`)',
      `VALUES (${esc(releaseId)}, ${esc(gate)}, 'passed', ${esc(evidenceKey('report', artifact.sha256))}, ${esc(artifact.sha256)}, ${gate === 'G3' ? "'operator'" : "'system'"});`,
    ].join('\n')),
    `UPDATE content_releases SET release_state = 'published', published_at = COALESCE(published_at, unixepoch()), updated_at = unixepoch() WHERE id = ${esc(releaseId)} AND release_state = 'approved';`,
  ];

  return {
    releaseId,
    contentVersion: manifest.contentVersion,
    manifestSha256: manifest.manifestSha256,
    expectedAuditCount: manifest.questions.expectedRows,
    statements,
    evidence,
  };
}

function defaultEvidence(): HistoricalEvidencePaths {
  return {
    G0: '.artifacts/release/topik-v2-source-intake-2026-08-17.json',
    G1: 'docs/07_topik/T10_topik_i_ii_practice_bank_v2.md',
    G2: '.artifacts/release/question-bank-quality-production-final-2026-08-17.json',
    G3: '.artifacts/release/topik-v2-production-final-verification-2026-08-17.json',
    G4: '.artifacts/release/topik-v2-production-predeploy-gate-result-2026-08-17.json',
  };
}

export function runHistoricalTopikV2Backfill(): void {
  const target = parseD1Target();
  if (target.remote && target.database !== PRODUCTION_TARGET) {
    throw new Error(`Historical TOPIK v2 release backfill is restricted to ${PRODUCTION_TARGET}`);
  }
  if (target.remote && (process.env.ALLOW_PRODUCTION_CHANGE !== 'content-release-backfill-v2' || !process.argv.includes('--publish'))) {
    throw new Error('Production backfill requires --publish and ALLOW_PRODUCTION_CHANGE=content-release-backfill-v2');
  }
  const defaults = defaultEvidence();
  const paths: HistoricalEvidencePaths = {
    G0: argValue('--g0') ?? defaults.G0,
    G1: argValue('--g1') ?? defaults.G1,
    G2: argValue('--g2') ?? defaults.G2,
    G3: argValue('--g3') ?? defaults.G3,
    G4: argValue('--g4') ?? defaults.G4,
  };
  const plan = buildHistoricalTopikV2ReleasePlan(paths);
  const existing = querySql<{ manifest_sha256: string; content_version: string }>(target,
    `SELECT manifest_sha256, content_version FROM content_releases WHERE id = ${esc(plan.releaseId)}`,
  )[0];
  if (existing && (existing.manifest_sha256 !== plan.manifestSha256 || existing.content_version !== plan.contentVersion)) {
    throw new Error('Existing historical release identity does not match the current immutable TOPIK v2 manifest');
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'topik-v2-release-backfill-'));
  const sqlPath = path.join(directory, 'backfill.sql');
  try {
    fs.writeFileSync(sqlPath, `${plan.statements.join('\n\n')}\n`, 'utf8');
    executeSqlFile(target, sqlPath);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  const release = querySql<{ release_state: string }>(target,
    `SELECT release_state FROM content_releases WHERE id = ${esc(plan.releaseId)}`,
  )[0];
  const counts = querySql<{ audits: number; gates: number; jobs: number }>(target, [
    'SELECT',
    `  (SELECT count(*) FROM content_release_quality_audit_links WHERE release_id = ${esc(plan.releaseId)}) AS audits,`,
    `  (SELECT count(*) FROM content_release_gate_evidence WHERE release_id = ${esc(plan.releaseId)} AND gate_state = 'passed') AS gates,`,
    `  (SELECT count(*) FROM content_release_jobs WHERE release_id = ${esc(plan.releaseId)} AND job_state = 'succeeded') AS jobs`,
  ].join('\n'))[0];
  if (release?.release_state !== 'published' || counts?.audits !== plan.expectedAuditCount || counts.gates !== 5 || counts.jobs !== 6) {
    throw new Error(`Historical TOPIK v2 release backfill verification failed: state=${release?.release_state ?? 'missing'} audits=${counts?.audits ?? -1} gates=${counts?.gates ?? -1} jobs=${counts?.jobs ?? -1}`);
  }
  console.log(`Historical release linked: ${plan.releaseId}; audits=${counts.audits}; G0-G4=${counts.gates}; jobs=${counts.jobs}`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) runHistoricalTopikV2Backfill();
