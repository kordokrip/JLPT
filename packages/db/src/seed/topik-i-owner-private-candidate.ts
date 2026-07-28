import { createHash } from 'node:crypto';

import type { ContentReleaseProvenance } from './content-release-contract.js';
import {
  loadTopikIPreviewCandidate,
  type TopikIPreviewItem,
  type TopikIPreviewUnit,
} from './topik-i-preview-candidate.js';

export const TOPIK_I_OWNER_PRIVATE_RELEASE_ID = 'topik-i-self-authored-owner-private-v2';
export const TOPIK_I_OWNER_PRIVATE_OWNER_REF = 'author-ksh';
export const TOPIK_I_OWNER_PRIVATE_ATTESTED_AT = '2026-07-29';
export const TOPIK_I_OWNER_PRIVATE_CLAIM_METHOD = 'authenticated_admin_session' as const;

type Section = 'listening' | 'writing' | 'reading';

export interface TopikIOwnerPrivateCandidate {
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
  ownerPrivatePolicy: {
    ownerRef: string;
    ownerAttestedAt: string;
    attestationSha256: string;
    claimMethod: typeof TOPIK_I_OWNER_PRIVATE_CLAIM_METHOD;
    publicPublishProhibited: true;
  };
  manifest: {
    schemaVersion: 'topik-i-owner-private-manifest-v2';
    inputSha256: string;
    manifestSha256: string;
    sourceCode: string;
    contentVersion: string;
    parserVersion: string;
    reviewState: 'owner-attested-private-not-public';
    expectedRows: { units: number; items: number; bySection: Record<Section, number> };
    itemPayloadSha256: Readonly<Record<string, string>>;
    itemLearningPayloadSha256: Readonly<Record<string, string>>;
  };
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

/** Hash only learning material; release-specific IDs deliberately do not affect it. */
export function topikItemLearningPayloadSha256(item: TopikIPreviewItem): string {
  return sha256(canonicalJson({
    examLevel: item.examLevel,
    examBand: item.examBand,
    section: item.section,
    itemKind: item.itemKind,
    skill: item.skill,
    difficulty: item.difficulty,
    promptKo: item.promptKo,
    promptJa: item.promptJa,
    promptEn: item.promptEn,
    answerPayloadJson: item.answerPayloadJson,
    explanationKo: item.explanationKo,
    explanationJa: item.explanationJa,
    explanationEn: item.explanationEn,
  }));
}

export function loadTopikIOwnerPrivateCandidate(): TopikIOwnerPrivateCandidate {
  const base = loadTopikIPreviewCandidate();
  const unitIdByBaseId = new Map(base.units.map((unit, index) => [unit.id, `topik-i-owner-private-v2-unit-${index + 1}`]));
  const units = base.units.map((unit, index) => ({
    ...unit,
    id: unitIdByBaseId.get(unit.id)!,
    stableRef: `topik.i.owner-private.v2.unit.${index + 1}`,
  }));
  const items = base.items.map((item, index) => ({
    ...item,
    id: `topik-i-owner-private-v2-item-${index + 1}`,
    unitId: unitIdByBaseId.get(item.unitId)!,
    stableRef: `topik.i.owner-private.v2.item.${index + 1}`,
  }));
  const provenance: ContentReleaseProvenance = {
    ...base.provenance,
    sourceCode: 'TOPIK-I-SELF-AUTHORED-OWNER-PRIVATE-V2',
    author: TOPIK_I_OWNER_PRIVATE_OWNER_REF,
    // These satisfy legacy non-null columns only. They are explicit non-signing
    // sentinels and remain pending, so they cannot pass a public human-review gate.
    firstReviewer: 'owner-private-no-human-review-a',
    secondReviewer: 'owner-private-no-human-review-b',
    firstReviewStatus: 'pending',
    firstReviewedAt: null,
    secondReviewStatus: 'pending',
    secondReviewedAt: null,
    reviewedAt: TOPIK_I_OWNER_PRIVATE_ATTESTED_AT,
  };
  const ownerPrivatePolicy = {
    ownerRef: TOPIK_I_OWNER_PRIVATE_OWNER_REF,
    ownerAttestedAt: TOPIK_I_OWNER_PRIVATE_ATTESTED_AT,
    attestationSha256: sha256(canonicalJson({
      selfAuthored: true,
      noOfficialTopikMaterial: true,
      privateUseOnly: true,
      allFourItemsSelfReviewed: true,
    })),
    claimMethod: TOPIK_I_OWNER_PRIVATE_CLAIM_METHOD,
    publicPublishProhibited: true as const,
  };
  const itemPayloadSha256 = Object.fromEntries(items.map((item) => [item.stableRef, sha256(canonicalJson(item))]));
  const itemLearningPayloadSha256 = Object.fromEntries(items.map((item) => [item.stableRef, topikItemLearningPayloadSha256(item)]));
  const bySection: Record<Section, number> = { listening: 0, writing: 0, reading: 0 };
  for (const item of items) bySection[item.section] += 1;
  const inputSha256 = sha256(canonicalJson({
    baseSourceSha256: base.provenance.sourceSha256,
    releaseId: TOPIK_I_OWNER_PRIVATE_RELEASE_ID,
    sourceCode: provenance.sourceCode,
    ownerPrivatePolicy,
    units,
    items,
  }));
  const manifestWithoutHash = {
    schemaVersion: 'topik-i-owner-private-manifest-v2' as const,
    inputSha256,
    sourceCode: provenance.sourceCode,
    contentVersion: TOPIK_I_OWNER_PRIVATE_RELEASE_ID,
    parserVersion: 'topik-i-owner-private-parser-v2',
    reviewState: 'owner-attested-private-not-public' as const,
    expectedRows: { units: units.length, items: items.length, bySection },
    itemPayloadSha256,
    itemLearningPayloadSha256,
  };
  const manifestSha256 = sha256(canonicalJson(manifestWithoutHash));

  return {
    release: {
      id: TOPIK_I_OWNER_PRIVATE_RELEASE_ID,
      learningTrack: 'topik-ko',
      contentVersion: TOPIK_I_OWNER_PRIVATE_RELEASE_ID,
      releaseState: 'draft',
      parserVersion: manifestWithoutHash.parserVersion,
      manifestSha256,
    },
    provenance,
    units,
    items,
    ownerPrivatePolicy,
    manifest: { ...manifestWithoutHash, manifestSha256 },
  };
}

export function buildTopikIOwnerPrivateCandidateSql(): string[] {
  const candidate = loadTopikIOwnerPrivateCandidate();
  const { release, provenance, ownerPrivatePolicy } = candidate;
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
    `INSERT INTO content_release_private_policies (release_id, manifest_sha256, owner_ref, owner_attested_at, attestation_sha256, claim_method, public_publish_prohibited)
     VALUES (${sql(release.id)}, ${sql(release.manifestSha256)}, ${sql(ownerPrivatePolicy.ownerRef)}, ${sql(ownerPrivatePolicy.ownerAttestedAt)}, ${sql(ownerPrivatePolicy.attestationSha256)}, ${sql(ownerPrivatePolicy.claimMethod)}, 1)
     ON CONFLICT DO NOTHING;`,
  ];
}
