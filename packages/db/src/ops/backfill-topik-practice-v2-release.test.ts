import assert from 'node:assert/strict';
import test from 'node:test';

import { buildHistoricalTopikV2ReleasePlan, TOPIK_PRACTICE_V2_RELEASE_ID } from './backfill-topik-practice-v2-release.js';

test('historical TOPIK v2 backfill binds 300 audits, six jobs, and real G0-G4 evidence without changing practice rows', () => {
  const plan = buildHistoricalTopikV2ReleasePlan({
    G0: '.artifacts/release/topik-v2-source-intake-2026-08-17.json',
    G1: 'docs/07_topik/T10_topik_i_ii_practice_bank_v2.md',
    G2: '.artifacts/release/question-bank-quality-production-final-2026-08-17.json',
    G3: '.artifacts/release/topik-v2-production-final-verification-2026-08-17.json',
    G4: '.artifacts/release/topik-v2-production-predeploy-gate-result-2026-08-17.json',
  });
  assert.equal(plan.releaseId, TOPIK_PRACTICE_V2_RELEASE_ID);
  assert.equal(plan.expectedAuditCount, 300);
  assert.equal(Object.keys(plan.evidence).length, 5);
  assert.match(plan.manifestSha256, /^[a-f0-9]{64}$/u);
  const sql = plan.statements.join('\n');
  assert.equal((sql.match(/INSERT OR IGNORE INTO `content_release_jobs`/gu) ?? []).length, 6);
  assert.equal((sql.match(/INSERT OR IGNORE INTO `content_release_gate_evidence`/gu) ?? []).length, 5);
  assert.match(sql, /content_release_quality_audit_links/);
  assert.match(sql, /expected_audit_count`, `validator_version`\)\nVALUES \([^\n]+, 'topik-practice', 300,/u);
  assert.doesNotMatch(sql, /INSERT[^\n]*topik_practice_questions|UPDATE\s+topik_practice_questions/iu);
  assert.doesNotMatch(sql, /content_audio_bindings|audio_r2_key|immutable_r2_key/iu);
});
