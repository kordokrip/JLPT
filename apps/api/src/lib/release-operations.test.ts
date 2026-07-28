import { describe, expect, it } from 'vitest';

import {
  assertContentReleaseRolloutConfigMatchesCatalog,
  assertPrivacySafeMetricEvent,
  evaluateContentReleaseRollout,
  releaseEvidenceRecordKey,
  type ContentReleaseRolloutConfig,
  type ReleaseEvidenceRecord,
} from '@nihongo-n3/shared';

const SHA = 'a'.repeat(64);
const REPORT_SHA = 'b'.repeat(64);
const RELEASE_ID = 'topik-i-practice-v1';

function evidenceRecord(): ReleaseEvidenceRecord {
  const report = { key: `evidence/report/v1/${RELEASE_ID}/${REPORT_SHA}/artifact.json`, sha256: REPORT_SHA };
  return {
    evidence_version: 1,
    release_id: RELEASE_ID,
    learning_track: 'topik-ko',
    content_release: 'topik-i',
    lifecycle_state: 'approved',
    source_branch: 'feature/topik-product-expansion',
    commit_sha: 'ec796f898ebcf900a18d18e33206cd1e84cdeb50',
    pull_request_ref: null,
    manifest: { key: `evidence/manifest/v1/${RELEASE_ID}/${SHA}/artifact.json`, sha256: SHA },
    verification_report: report,
    migration_ids: ['0012_content_release_contract.sql', '0013_content_release_control_plane.sql'],
    deployments: { worker_release: null, pages_deployment: null },
    gates: ['G0', 'G1', 'G2', 'G3', 'G4'].map((gate) => ({
      gate: gate as 'G0' | 'G1' | 'G2' | 'G3' | 'G4',
      state: 'passed' as const,
      report,
      recorded_by: 'system' as const,
    })),
    generated_at: '2026-07-28T00:00:00Z',
  };
}

describe('release operations contracts', () => {
  it('links source, manifest, migrations, deployment identifiers, and all gates without learner data', () => {
    const record = evidenceRecord();
    expect(releaseEvidenceRecordKey(record)).toBe(`evidence/report/v1/${RELEASE_ID}/${SHA}/artifact.json`);
    expect(() => releaseEvidenceRecordKey({ ...record, gates: record.gates.slice(1) })).toThrow(/missing G0/);
    expect(() => releaseEvidenceRecordKey({ ...record, manifest: { ...record.manifest, key: record.manifest.key.replace(SHA, REPORT_SHA) } })).toThrow(/digest/);
  });

  it('accepts only the metric dimensions that are safe for aggregate product analytics', () => {
    const event = {
      metric: 'answer_quality_proxy' as const,
      occurred_at: '2026-07-28T00:00:00Z',
      dimensions: {
        learning_track: 'topik-ko',
        content_release: 'topik-i',
        release_sha: 'ec796f8',
        item_kind: 'practice',
        section: 'reading',
        outcome: 'correct',
      },
      measures: { count: 1 },
    };
    expect(() => assertPrivacySafeMetricEvent(event)).not.toThrow();
    expect(() => assertPrivacySafeMetricEvent({
      ...event,
      dimensions: { ...event.dimensions, email: 'learner@example.invalid' },
    })).toThrow(/PII/);
    expect(() => assertPrivacySafeMetricEvent({
      ...event,
      dimensions: { ...event.dimensions, raw_answer: '비공개 답안' },
    })).toThrow(/PII/);
  });

  it('keeps rollout track-scoped, release-scoped, deterministic, and kill-switchable', () => {
    const config: ContentReleaseRolloutConfig = {
      version: 1,
      rollouts: [{
        flag_id: 'topik-i-practice-rollout',
        learning_track: 'topik-ko',
        content_release: 'topik-i',
        enabled: true,
        rollout_percentage: 100,
        kill_switch: false,
        rollout_key_version: 'pseudonymous-v1',
      }],
    };
    const initialRollout = config.rollouts[0]!;
    assertContentReleaseRolloutConfigMatchesCatalog(config, [{
      releaseId: 'topik-i',
      learningTrack: 'topik-ko',
      lifecycleState: 'approved',
    }]);
    expect(evaluateContentReleaseRollout(config, {
      learningTrack: 'topik-ko', contentRelease: 'topik-i', pseudonymousBucket: '0'.repeat(64),
    })).toEqual({ enabled: true, reason: 'enabled' });
    expect(evaluateContentReleaseRollout(config, {
      learningTrack: 'jlpt-ja', contentRelease: 'topik-i', pseudonymousBucket: '0'.repeat(64),
    })).toEqual({ enabled: false, reason: 'not_configured' });
    expect(evaluateContentReleaseRollout({
      ...config,
      rollouts: [{ ...initialRollout, kill_switch: true }],
    }, {
      learningTrack: 'topik-ko', contentRelease: 'topik-i', pseudonymousBucket: '0'.repeat(64),
    })).toEqual({ enabled: false, reason: 'kill_switch' });
    expect(() => assertContentReleaseRolloutConfigMatchesCatalog(config, [{
      releaseId: 'topik-i', learningTrack: 'jlpt-ja', lifecycleState: 'approved',
    }])).toThrow(/track mismatch/);
  });
});
