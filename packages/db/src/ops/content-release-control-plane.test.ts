import assert from 'node:assert/strict';
import test from 'node:test';

import {
  allReleaseGatesPassed,
  assertContentEvidenceRef,
  assertContentReleaseQueueMessage,
  buildContentEvidenceRef,
  createContentReleaseIdempotencyKey,
  operatorOnlyPublishInstruction,
  type ContentReleaseGateEvidence,
} from '@nihongo-n3/shared';

const SHA = 'a'.repeat(64);
const releaseId = 'topik-control-release-v1';
const jobId = 'topik-control-job-v1';

test('content evidence key and metadata are immutable, minimal, and versioned', () => {
  const evidence = buildContentEvidenceRef({
    kind: 'manifest',
    releaseId,
    sha256: SHA,
    sourceUrl: 'https://example.invalid/source',
    licenseId: 'LicenseRef-local-fixture',
    extension: 'json',
  });
  assert.doesNotThrow(() => assertContentEvidenceRef(evidence));
  assert.equal(evidence.key, `evidence/manifest/v1/${releaseId}/${SHA}/artifact.json`);
  assert.deepEqual(Object.keys(evidence.metadata).sort(), ['checksum', 'license', 'release_id', 'source_url']);
  const evidenceWithUnexpectedMetadata = {
    ...evidence,
    metadata: { ...evidence.metadata, reviewer_email: 'not-allowed@example.invalid' },
  } as unknown as typeof evidence;
  assert.throws(
    () => assertContentEvidenceRef(evidenceWithUnexpectedMetadata),
    /metadata/,
  );
});

test('queue message accepts references only and rejects content payloads', () => {
  const message = {
    version: 1 as const,
    releaseId,
    jobId,
    artifactKey: `evidence/manifest/v1/${releaseId}/${SHA}/artifact.json`,
    artifactSha256: SHA,
    idempotencyKey: createContentReleaseIdempotencyKey(releaseId, jobId, SHA),
  };
  assert.doesNotThrow(() => assertContentReleaseQueueMessage(message));
  assert.throws(() => assertContentReleaseQueueMessage({ ...message, content: 'forbidden' }), /references and hashes/);
});

test('only all passed G0-G4 evidence can produce an operator-only instruction', () => {
  const evidence = ['G0', 'G1', 'G2', 'G3', 'G4'].map((gate) => ({
    releaseId,
    gate: gate as ContentReleaseGateEvidence['gate'],
    state: 'passed' as const,
    artifactKey: `evidence/report/v1/${releaseId}/${SHA}/artifact.json`,
    artifactSha256: SHA,
    recordedBy: 'system' as const,
  }));
  assert.equal(allReleaseGatesPassed(evidence), true);
  assert.match(operatorOnlyPublishInstruction(releaseId, evidence) ?? '', /^\[OPERATOR-ONLY\]/);
  assert.equal(operatorOnlyPublishInstruction(releaseId, evidence.slice(0, 4)), null);
});
