import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS } from '../content/reviews/next-content-expansion-independent-reviews.js';
import {
  NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256,
  NEXT_CONTENT_EXPANSION_VALIDATOR_VERSION,
} from './next-content-expansion-quality.js';
import {
  JLPT_N1_PRACTICE_RELEASE_ID,
  JLPT_N2_PRACTICE_RELEASE_ID,
  NEXT_CONTENT_EXPANSION_RELEASE_GROUP_ID,
  TOPIK_OWNER_BATCH_6_RELEASE_ID,
  buildNextContentExpansionReviewedReleasePlan,
} from '../seed/next-content-expansion-reviewed-release.js';
import {
  NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256,
  NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_PATH,
  NEXT_CONTENT_EXPANSION_SOURCE_PATH,
} from '../seed/next-content-expansion-source.js';
import { REPO_ROOT } from '../seed/constants.js';
import { requireNextContentExpansionGatePhase } from './seed-next-content-expansion-reviewed.js';

type Gate = 'G0' | 'G1' | 'G2' | 'G3' | 'G4';

function fixture(): { directory: string; evidence: Record<Gate, string> } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'next-expansion-release-test-'));
  const g2 = path.join(directory, 'G2.json');
  const g3 = path.join(directory, 'G3.json');
  const g4 = path.join(directory, 'G4.json');
  fs.writeFileSync(g2, JSON.stringify({
    passed: true,
    final_draft_sha256: NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256,
    validator_version: NEXT_CONTENT_EXPANSION_VALIDATOR_VERSION,
  }));
  fs.writeFileSync(g3, JSON.stringify({
    passed: true,
    final_draft_sha256: NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256,
    source_evidence_sha256: NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256,
    artifact_sha256: NEXT_CONTENT_EXPANSION_INDEPENDENT_REVIEWS.artifact_sha256,
  }));
  fs.writeFileSync(g4, JSON.stringify({
    phase: 'local',
    release_id: NEXT_CONTENT_EXPANSION_RELEASE_GROUP_ID,
    passed: true,
    errors: [],
  }));
  return {
    directory,
    evidence: {
      G0: path.resolve(REPO_ROOT, NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_PATH),
      G1: path.resolve(REPO_ROOT, NEXT_CONTENT_EXPANSION_SOURCE_PATH),
      G2: g2,
      G3: g3,
      G4: g4,
    },
  };
}

test('reviewed plan binds 60/60/40 audits to three independent gated releases', () => {
  const value = fixture();
  try {
    const first = buildNextContentExpansionReviewedReleasePlan(value.evidence);
    const second = buildNextContentExpansionReviewedReleasePlan(value.evidence);
    assert.deepEqual(first, second, 'same immutable evidence must generate an idempotent plan');
    assert.deepEqual(first.releases.map((release) => [release.releaseId, release.itemIds.length]), [
      [JLPT_N2_PRACTICE_RELEASE_ID, 60],
      [JLPT_N1_PRACTICE_RELEASE_ID, 60],
      [TOPIK_OWNER_BATCH_6_RELEASE_ID, 40],
    ]);
    assert.equal(first.releases.every((release) => /^[a-f0-9]{64}$/u.test(release.manifestSha256)), true);
    const sql = first.statements.join('\n');
    assert.equal((sql.match(/INSERT OR IGNORE INTO `content_quality_audits`/gu) ?? []).length, 160);
    assert.equal((sql.match(/INSERT OR IGNORE INTO `content_release_quality_audit_links`/gu) ?? []).length, 3);
    assert.equal((sql.match(/INSERT OR IGNORE INTO `content_release_jobs`/gu) ?? []).length, 18);
    assert.equal((sql.match(/INSERT OR IGNORE INTO `content_release_gate_evidence`/gu) ?? []).length, 15);
    assert.doesNotMatch(sql, /content_audio_bindings|audio_r2_key|r2-ready|r2:\/\//iu);
  } finally {
    fs.rmSync(value.directory, { recursive: true, force: true });
  }
});

test('quality links and draft rows precede publication', () => {
  const value = fixture();
  try {
    const sql = buildNextContentExpansionReviewedReleasePlan(value.evidence).statements.join('\n');
    const topikAudit = sql.indexOf(`quality-audit:${TOPIK_OWNER_BATCH_6_RELEASE_ID}`);
    const topikItem = sql.indexOf('INSERT OR IGNORE INTO `topik_owner_authored_curriculum_items`');
    const topikLink = sql.indexOf('INSERT OR IGNORE INTO `content_release_quality_audit_links`', topikItem);
    const topikReleasePublish = sql.indexOf("SET release_state = 'published'", topikLink);
    const jlptPublish = sql.indexOf('UPDATE jlpt_practice_questions SET is_published = 1');
    assert.ok(topikAudit >= 0 && topikItem > topikAudit && topikLink > topikItem);
    assert.ok(topikReleasePublish > topikLink && jlptPublish > topikReleasePublish);
  } finally {
    fs.rmSync(value.directory, { recursive: true, force: true });
  }
});

test('reviewed plan rejects a failed or mismatched evidence gate', () => {
  const value = fixture();
  try {
    fs.writeFileSync(value.evidence.G2, JSON.stringify({
      passed: false,
      final_draft_sha256: NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256,
      validator_version: NEXT_CONTENT_EXPANSION_VALIDATOR_VERSION,
    }));
    assert.throws(
      () => buildNextContentExpansionReviewedReleasePlan(value.evidence),
      /G2 must be a passed quality report/u,
    );
    fs.writeFileSync(value.evidence.G2, JSON.stringify({
      passed: true,
      final_draft_sha256: NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256,
      validator_version: NEXT_CONTENT_EXPANSION_VALIDATOR_VERSION,
    }));
    fs.writeFileSync(value.evidence.G4, JSON.stringify({
      phase: 'local',
      release_id: NEXT_CONTENT_EXPANSION_RELEASE_GROUP_ID,
      passed: false,
    }));
    assert.throws(
      () => buildNextContentExpansionReviewedReleasePlan(value.evidence),
      /G4 must be a passed release gate/u,
    );
  } finally {
    fs.rmSync(value.directory, { recursive: true, force: true });
  }
});

test('production publication rejects local or preview G4 evidence', () => {
  const value = fixture();
  try {
    const productionTarget = {
      remote: true,
      database: 'nihongo-n3-prod-v2',
      config: path.join(value.directory, 'wrangler.toml'),
    };
    assert.throws(
      () => requireNextContentExpansionGatePhase(productionTarget, value.evidence.G4),
      /production-predeploy G4/u,
    );
    fs.writeFileSync(value.evidence.G4, JSON.stringify({
      phase: 'production-predeploy',
      release_id: NEXT_CONTENT_EXPANSION_RELEASE_GROUP_ID,
      passed: true,
    }));
    assert.doesNotThrow(() => requireNextContentExpansionGatePhase(productionTarget, value.evidence.G4));
  } finally {
    fs.rmSync(value.directory, { recursive: true, force: true });
  }
});
