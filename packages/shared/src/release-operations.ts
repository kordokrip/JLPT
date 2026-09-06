import { z } from 'zod';

import {
  CONTENT_RELEASE_GATES,
  CONTENT_RELEASE_GATE_STATES,
  type ContentReleaseGate,
} from './content-release-control-plane.js';
import {
  CONTENT_PUBLISH_STATES,
  LEARNING_TRACK_IDS,
  type LearningTrackId,
} from './learning-tracks.js';

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const GIT_SHA_PATTERN = /^[a-f0-9]{7,64}$/i;
const OPAQUE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,127}$/;
const BRANCH_PATTERN = /^(?!\/|.*(?:^|\/)\.?(?:\/|$))[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/;
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

const sha256Schema = z.string().regex(SHA256_PATTERN, 'must be a SHA-256 hex digest').transform((value) => value.toLowerCase());
const opaqueIdSchema = z.string().regex(OPAQUE_ID_PATTERN, 'must be a stable opaque identifier');
const isoDateTimeSchema = z.string().regex(ISO_DATE_TIME_PATTERN, 'must be a UTC ISO-8601 timestamp');
const deploymentIdentifierSchema = z.string().trim().min(3).max(160).regex(/^[A-Za-z0-9._:-]+$/, 'must not contain a URL, path, or personal data');

export const RELEASE_EVIDENCE_RECORD_VERSION = 1 as const;

export const releaseArtifactRefSchema = z.object({
  key: z.string().regex(/^evidence\/(?:manifest|report)\/v1\/[a-z0-9][a-z0-9._-]{2,127}\/[a-f0-9]{64}\/artifact\.(?:json|bin)$/i),
  sha256: sha256Schema,
}).strict();
export type ReleaseArtifactRef = z.infer<typeof releaseArtifactRefSchema>;

export const releaseEvidenceGateSchema = z.object({
  gate: z.enum(CONTENT_RELEASE_GATES),
  state: z.enum(CONTENT_RELEASE_GATE_STATES),
  report: releaseArtifactRefSchema,
  recorded_by: z.enum(['system', 'operator']),
}).strict();
export type ReleaseEvidenceGate = z.infer<typeof releaseEvidenceGateSchema>;

/**
 * A privacy-safe, immutable release ledger record. It deliberately records
 * deployment and artifact identifiers only: no email, IP, user ID, content
 * body, answer, reviewer name, or credential is a valid field.
 */
export const releaseEvidenceRecordSchema = z.object({
  evidence_version: z.literal(RELEASE_EVIDENCE_RECORD_VERSION),
  release_id: opaqueIdSchema,
  learning_track: z.enum(LEARNING_TRACK_IDS),
  content_release: opaqueIdSchema,
  lifecycle_state: z.enum(CONTENT_PUBLISH_STATES),
  source_branch: z.string().regex(BRANCH_PATTERN, 'must be a normalized source branch'),
  commit_sha: z.string().regex(GIT_SHA_PATTERN, 'must be a Git commit SHA').transform((value) => value.toLowerCase()),
  pull_request_ref: z.string().regex(/^PR-\d+$/).nullable(),
  manifest: releaseArtifactRefSchema,
  verification_report: releaseArtifactRefSchema,
  migration_ids: z.array(z.string().regex(/^\d{4}_[a-z0-9_]+\.sql$/)).max(64),
  deployments: z.object({
    worker_release: deploymentIdentifierSchema.nullable(),
    pages_deployment: deploymentIdentifierSchema.nullable(),
  }).strict(),
  gates: z.array(releaseEvidenceGateSchema).length(CONTENT_RELEASE_GATES.length),
  generated_at: isoDateTimeSchema,
}).strict().superRefine((record, ctx) => {
  const seenGates = new Set<string>();
  for (const gate of record.gates) {
    if (seenGates.has(gate.gate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gates'], message: 'each gate may appear exactly once' });
    }
    seenGates.add(gate.gate);
  }
  for (const gate of CONTENT_RELEASE_GATES) {
    if (!seenGates.has(gate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gates'], message: `missing ${gate} evidence` });
    }
  }
  if (record.manifest.sha256 !== record.manifest.key.split('/')[4]?.toLowerCase()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['manifest'], message: 'manifest key digest must match manifest SHA-256' });
  }
  if (record.verification_report.sha256 !== record.verification_report.key.split('/')[4]?.toLowerCase()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['verification_report'], message: 'report key digest must match report SHA-256' });
  }
});
export type ReleaseEvidenceRecord = z.infer<typeof releaseEvidenceRecordSchema>;

export function assertReleaseEvidenceRecord(value: unknown): asserts value is ReleaseEvidenceRecord {
  releaseEvidenceRecordSchema.parse(value);
}

export function releaseEvidenceRecordKey(record: ReleaseEvidenceRecord): string {
  assertReleaseEvidenceRecord(record);
  return `evidence/report/v1/${record.release_id}/${record.manifest.sha256}/artifact.json`;
}

export const PRODUCT_METRIC_NAMES = [
  'release_adoption',
  'completion_review_retention',
  'answer_quality_proxy',
  'cache_staleness',
  'queue_dlq',
  'workflow_failure',
  'ai_latency',
  'ai_cost',
  'ai_refusal',
  'd1_error',
  'd1_overload',
] as const;
export type ProductMetricName = (typeof PRODUCT_METRIC_NAMES)[number];

const COMMON_METRIC_DIMENSIONS = ['learning_track', 'content_release', 'release_sha'] as const;
const PRODUCT_METRIC_DIMENSIONS: Record<ProductMetricName, readonly string[]> = {
  release_adoption: [...COMMON_METRIC_DIMENSIONS, 'entrypoint'],
  completion_review_retention: [...COMMON_METRIC_DIMENSIONS, 'activity_kind', 'retention_window'],
  answer_quality_proxy: [...COMMON_METRIC_DIMENSIONS, 'item_kind', 'section', 'outcome'],
  cache_staleness: [...COMMON_METRIC_DIMENSIONS, 'cache_scope', 'age_bucket', 'invalidation_result'],
  queue_dlq: [...COMMON_METRIC_DIMENSIONS, 'queue_name', 'reason_code'],
  workflow_failure: [...COMMON_METRIC_DIMENSIONS, 'workflow_name', 'step_name', 'reason_code'],
  ai_latency: [...COMMON_METRIC_DIMENSIONS, 'feature', 'provider', 'model', 'latency_bucket'],
  ai_cost: [...COMMON_METRIC_DIMENSIONS, 'feature', 'provider', 'model', 'cost_bucket'],
  ai_refusal: [...COMMON_METRIC_DIMENSIONS, 'feature', 'policy_code'],
  d1_error: [...COMMON_METRIC_DIMENSIONS, 'route_template', 'error_class'],
  d1_overload: [...COMMON_METRIC_DIMENSIONS, 'route_template', 'signal'],
};

const DISALLOWED_METRIC_DIMENSION = /(?:email|ip(?:_address)?|answer|response|token|cookie|password|raw|free[_-]?text|user(?:_id)?|account(?:_id)?|prompt|reviewer)/i;
const safeMetricValueSchema = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9._:/=-]+$/, 'must be an opaque, bucketed value');

export const privacySafeMetricEventSchema = z.object({
  metric: z.enum(PRODUCT_METRIC_NAMES),
  occurred_at: isoDateTimeSchema,
  dimensions: z.record(safeMetricValueSchema),
  measures: z.record(z.number().finite().min(0).max(1_000_000)),
}).strict().superRefine((event, ctx) => {
  const allowedDimensions = new Set(PRODUCT_METRIC_DIMENSIONS[event.metric]);
  for (const [key, value] of Object.entries(event.dimensions)) {
    if (DISALLOWED_METRIC_DIMENSION.test(key)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dimensions', key], message: 'PII and raw learner input are prohibited' });
    }
    if (!allowedDimensions.has(key)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dimensions', key], message: `dimension is not allowed for ${event.metric}` });
    }
    if (value.includes('@')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dimensions', key], message: 'dimension may not contain an email address' });
    }
  }
  for (const dimension of COMMON_METRIC_DIMENSIONS) {
    if (!event.dimensions[dimension]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dimensions', dimension], message: 'track, content release, and release SHA are required' });
    }
  }
  if (event.metric === 'answer_quality_proxy' && !event.dimensions.outcome) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dimensions', 'outcome'], message: 'answer quality uses an aggregate outcome only' });
  }
});
export type PrivacySafeMetricEvent = z.infer<typeof privacySafeMetricEventSchema>;

export const PRODUCT_METRIC_DICTIONARY = Object.fromEntries(
  PRODUCT_METRIC_NAMES.map((metric) => [metric, {
    dimensions: PRODUCT_METRIC_DIMENSIONS[metric],
    pii: 'prohibited',
    raw_learner_answer: 'prohibited',
  }]),
) as Record<ProductMetricName, {
  dimensions: readonly string[];
  pii: 'prohibited';
  raw_learner_answer: 'prohibited';
}>;

export function assertPrivacySafeMetricEvent(value: unknown): asserts value is PrivacySafeMetricEvent {
  privacySafeMetricEventSchema.parse(value);
}

export const CONTENT_RELEASE_ROLLOUT_CONFIG_VERSION = 1 as const;

export const contentReleaseRolloutSchema = z.object({
  flag_id: opaqueIdSchema,
  learning_track: z.enum(LEARNING_TRACK_IDS),
  content_release: opaqueIdSchema,
  enabled: z.boolean(),
  rollout_percentage: z.number().int().min(0).max(100),
  kill_switch: z.boolean(),
  rollout_key_version: z.literal('pseudonymous-v1'),
}).strict();
export type ContentReleaseRollout = z.infer<typeof contentReleaseRolloutSchema>;

export const contentReleaseRolloutConfigSchema = z.object({
  version: z.literal(CONTENT_RELEASE_ROLLOUT_CONFIG_VERSION),
  rollouts: z.array(contentReleaseRolloutSchema).max(100),
}).strict().superRefine((config, ctx) => {
  const seenFlags = new Set<string>();
  const seenTrackReleases = new Set<string>();
  for (const rollout of config.rollouts) {
    const trackRelease = `${rollout.learning_track}:${rollout.content_release}`;
    if (seenFlags.has(rollout.flag_id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rollouts'], message: 'flag_id must be unique' });
    }
    if (seenTrackReleases.has(trackRelease)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rollouts'], message: 'each track/release may have one rollout rule' });
    }
    seenFlags.add(rollout.flag_id);
    seenTrackReleases.add(trackRelease);
  }
});
export type ContentReleaseRolloutConfig = z.infer<typeof contentReleaseRolloutConfigSchema>;

export interface ContentReleaseRolloutContext {
  learningTrack: LearningTrackId;
  contentRelease: string;
  /** Server-generated HMAC bucket. Never send an account or learner ID here. */
  pseudonymousBucket: string;
}

export type ContentReleaseRolloutDecision = {
  enabled: boolean;
  reason: 'not_configured' | 'disabled' | 'kill_switch' | 'outside_rollout' | 'enabled';
};

function stablePercent(value: string): number {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) % 100;
}

export function evaluateContentReleaseRollout(
  config: ContentReleaseRolloutConfig,
  context: ContentReleaseRolloutContext,
): ContentReleaseRolloutDecision {
  contentReleaseRolloutConfigSchema.parse(config);
  if (!/^[a-f0-9]{16,128}$/i.test(context.pseudonymousBucket)) {
    throw new Error('rollout context requires a server-generated pseudonymous bucket');
  }
  const rollout = config.rollouts.find((candidate) =>
    candidate.learning_track === context.learningTrack && candidate.content_release === context.contentRelease,
  );
  if (!rollout) return { enabled: false, reason: 'not_configured' };
  if (rollout.kill_switch) return { enabled: false, reason: 'kill_switch' };
  if (!rollout.enabled || rollout.rollout_percentage === 0) return { enabled: false, reason: 'disabled' };
  if (stablePercent(`${context.learningTrack}:${context.contentRelease}:${context.pseudonymousBucket}`) >= rollout.rollout_percentage) {
    return { enabled: false, reason: 'outside_rollout' };
  }
  return { enabled: true, reason: 'enabled' };
}

export interface ReleaseCatalogEntry {
  releaseId: string;
  learningTrack: LearningTrackId;
  lifecycleState: (typeof CONTENT_PUBLISH_STATES)[number];
}

/**
 * Fails a build/test when a config points to the wrong track, a missing
 * release, or a release that has not passed the approved/published boundary.
 */
export function assertContentReleaseRolloutConfigMatchesCatalog(
  config: ContentReleaseRolloutConfig,
  catalog: readonly ReleaseCatalogEntry[],
): void {
  contentReleaseRolloutConfigSchema.parse(config);
  for (const rollout of config.rollouts) {
    const release = catalog.find((entry) => entry.releaseId === rollout.content_release);
    if (!release) throw new Error(`rollout references unknown content release: ${rollout.content_release}`);
    if (release.learningTrack !== rollout.learning_track) {
      throw new Error(`rollout track mismatch for ${rollout.content_release}`);
    }
    if (!['approved', 'published'].includes(release.lifecycleState)) {
      throw new Error(`rollout release is not approved: ${rollout.content_release}`);
    }
  }
}

export function releaseGateStates(record: ReleaseEvidenceRecord): Record<ContentReleaseGate, 'passed' | 'failed'> {
  assertReleaseEvidenceRecord(record);
  return Object.fromEntries(record.gates.map((gate) => [gate.gate, gate.state])) as Record<ContentReleaseGate, 'passed' | 'failed'>;
}
