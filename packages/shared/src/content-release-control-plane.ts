/**
 * Content release control-plane contracts.
 *
 * Queue payloads and R2 metadata deliberately contain references only. They
 * must never carry item bodies, learner data, answers, or reviewer PII.
 */

export const CONTENT_EVIDENCE_KINDS = [
  'raw',
  'normalized',
  'manifest',
  'report',
] as const;
export type ContentEvidenceKind = (typeof CONTENT_EVIDENCE_KINDS)[number];

export const CONTENT_RELEASE_JOB_KINDS = [
  'ingest',
  'validate',
  'ai_draft',
  'qa',
  'human_approval',
  'preview_candidate',
] as const;
export type ContentReleaseJobKind = (typeof CONTENT_RELEASE_JOB_KINDS)[number];

export const CONTENT_RELEASE_JOB_STATES = [
  'queued',
  'processing',
  'succeeded',
  'waiting_for_approval',
  'retryable_failed',
  'failed',
  'poisoned',
  'cancelled',
] as const;
export type ContentReleaseJobState = (typeof CONTENT_RELEASE_JOB_STATES)[number];

export const CONTENT_RELEASE_GATES = ['G0', 'G1', 'G2', 'G3', 'G4'] as const;
export type ContentReleaseGate = (typeof CONTENT_RELEASE_GATES)[number];

export const CONTENT_RELEASE_GATE_STATES = ['passed', 'failed'] as const;
export type ContentReleaseGateState = (typeof CONTENT_RELEASE_GATE_STATES)[number];

export const CONTENT_RELEASE_PREVIEW_STATES = ['created', 'ready', 'withdrawn'] as const;
export type ContentReleasePreviewState = (typeof CONTENT_RELEASE_PREVIEW_STATES)[number];

export interface ContentEvidenceInput {
  kind: ContentEvidenceKind;
  releaseId: string;
  sha256: string;
  sourceUrl: string;
  licenseId: string;
  extension: 'bin' | 'json';
}

export interface ContentEvidenceRef {
  kind: ContentEvidenceKind;
  key: string;
  sha256: string;
  metadata: Record<'source_url' | 'checksum' | 'license' | 'release_id', string>;
}

export interface ContentReleaseQueueMessage {
  version: 1;
  releaseId: string;
  jobId: string;
  artifactKey: string;
  artifactSha256: string;
  idempotencyKey: string;
}

export interface ContentReleaseWorkflowParams extends ContentReleaseQueueMessage {
  workflowVersion: 1;
}

export interface ContentReleaseApprovalEvent {
  releaseId: string;
  jobId: string;
  decision: 'approved' | 'rejected';
  /** Opaque operator reference, never an email address or display name. */
  operatorRef: string;
}

export interface ContentReleaseGateEvidence {
  releaseId: string;
  gate: ContentReleaseGate;
  state: ContentReleaseGateState;
  artifactKey: string;
  artifactSha256: string;
  recordedBy: 'system' | 'operator';
}

const SHA256 = /^[a-f0-9]{64}$/i;
const SAFE_ID = /^[a-z0-9][a-z0-9._-]{2,127}$/;
const ALLOWED_METADATA_KEYS = ['checksum', 'license', 'release_id', 'source_url'] as const;

function assertSafeId(value: string, name: string): void {
  if (!SAFE_ID.test(value)) {
    throw new Error(`${name} must be a stable opaque identifier`);
  }
}

function assertSha256(value: string, name: string): void {
  if (!SHA256.test(value)) throw new Error(`${name} must be a SHA-256 hex digest`);
}

function assertSourceUrl(value: string): void {
  // Shared is compiled without the DOM library. Keep URL validation portable
  // across Node, Workers, and the content tooling without importing node:url.
  const absoluteHttpsUrl = /^https:\/\/(?![^/]*@)[a-z0-9.-]+(?::\d{1,5})?(?:\/[^\s?#]*)?$/i;
  if (!absoluteHttpsUrl.test(value)) {
    throw new Error('sourceUrl must not contain credentials, query data, fragments, or identifiers');
  }
}

export function buildContentEvidenceRef(input: ContentEvidenceInput): ContentEvidenceRef {
  assertSafeId(input.releaseId, 'releaseId');
  assertSha256(input.sha256, 'sha256');
  assertSourceUrl(input.sourceUrl);
  if (!input.licenseId.trim()) throw new Error('licenseId is required');

  const key = `evidence/${input.kind}/v1/${input.releaseId}/${input.sha256}/artifact.${input.extension}`;
  return {
    kind: input.kind,
    key,
    sha256: input.sha256.toLowerCase(),
    metadata: {
      source_url: input.sourceUrl,
      checksum: input.sha256.toLowerCase(),
      license: input.licenseId,
      release_id: input.releaseId,
    },
  };
}

export function assertContentEvidenceRef(ref: ContentEvidenceRef): void {
  assertSha256(ref.sha256, 'evidence sha256');
  const expectedPrefix = `evidence/${ref.kind}/v1/`;
  if (!ref.key.startsWith(expectedPrefix) || ref.key.includes('..') || ref.key.includes('//')) {
    throw new Error('evidence key must use a versioned, normalized evidence prefix');
  }
  const metadataKeys = Object.keys(ref.metadata).sort();
  if (metadataKeys.join(',') !== [...ALLOWED_METADATA_KEYS].sort().join(',')) {
    throw new Error('evidence metadata may only contain source URL, checksum, license, and release ID');
  }
  assertSourceUrl(ref.metadata.source_url);
  assertSha256(ref.metadata.checksum, 'metadata checksum');
  assertSafeId(ref.metadata.release_id, 'metadata release ID');
  if (!ref.metadata.license.trim()) throw new Error('metadata license is required');
  if (ref.metadata.checksum.toLowerCase() !== ref.sha256.toLowerCase()) {
    throw new Error('evidence metadata checksum must match the artifact digest');
  }
}

export function createContentReleaseIdempotencyKey(
  releaseId: string,
  jobId: string,
  artifactSha256: string,
): string {
  assertSafeId(releaseId, 'releaseId');
  assertSafeId(jobId, 'jobId');
  assertSha256(artifactSha256, 'artifactSha256');
  return `crcp:v1:${releaseId}:${jobId}:${artifactSha256.toLowerCase()}`;
}

export function assertContentReleaseQueueMessage(value: unknown): asserts value is ContentReleaseQueueMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('queue message must be an object');
  }
  const message = value as Record<string, unknown>;
  const keys = Object.keys(message).sort();
  const expected = ['artifactKey', 'artifactSha256', 'idempotencyKey', 'jobId', 'releaseId', 'version'];
  if (keys.join(',') !== expected.join(',')) {
    throw new Error('queue message may only contain release/job references and hashes');
  }
  if (message.version !== 1) throw new Error('unsupported content release queue message version');
  if (typeof message.releaseId !== 'string' || typeof message.jobId !== 'string') {
    throw new Error('queue message releaseId and jobId are required');
  }
  if (typeof message.artifactKey !== 'string' || typeof message.artifactSha256 !== 'string' || typeof message.idempotencyKey !== 'string') {
    throw new Error('queue message artifact references are required');
  }
  assertSafeId(message.releaseId, 'releaseId');
  assertSafeId(message.jobId, 'jobId');
  assertSha256(message.artifactSha256, 'artifactSha256');
  if (!message.artifactKey.startsWith('evidence/') || message.artifactKey.includes('..') || message.artifactKey.includes('//')) {
    throw new Error('queue message artifactKey must reference a normalized evidence object');
  }
  const expectedIdempotencyKey = createContentReleaseIdempotencyKey(
    message.releaseId,
    message.jobId,
    message.artifactSha256,
  );
  if (message.idempotencyKey !== expectedIdempotencyKey) {
    throw new Error('queue message idempotency key does not match its immutable references');
  }
}

export function toWorkflowParams(message: ContentReleaseQueueMessage): ContentReleaseWorkflowParams {
  assertContentReleaseQueueMessage(message);
  return { ...message, workflowVersion: 1 };
}

export function allReleaseGatesPassed(evidence: readonly ContentReleaseGateEvidence[]): boolean {
  return CONTENT_RELEASE_GATES.every((gate) =>
    evidence.some((entry) => entry.gate === gate && entry.state === 'passed'),
  );
}

/**
 * This only produces a human-reviewable instruction. It never calls D1,
 * Worker, R2, Pages, or any remote API.
 */
export function operatorOnlyPublishInstruction(
  releaseId: string,
  evidence: readonly ContentReleaseGateEvidence[],
): string | null {
  assertSafeId(releaseId, 'releaseId');
  if (!allReleaseGatesPassed(evidence)) return null;
  return `[OPERATOR-ONLY] pnpm exec wrangler d1 execute DB --remote --config apps/api/wrangler.toml --command "UPDATE content_releases SET release_state = 'published', published_at = unixepoch(), updated_at = unixepoch() WHERE id = '${releaseId}' AND release_state = 'approved';"`;
}
