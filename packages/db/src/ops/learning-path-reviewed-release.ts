// V7-only evidence boundary. No approvals, reports, deployment or database writes are generated here.
import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { sha256, type FrozenLearningPathV4 } from './learning-path-v4-freeze.js';
import { learningPathV4Readiness } from './learning-path-v4-readiness.js';
import { resolveLearningPathV4SourceBinding } from './learning-path-v4-source-binding.js';
import type { IndependentReview } from './learning-path-evidence.js';

export const REVIEWED_V7 = Object.freeze({
  group: 'learning-path-v7-2026-10-11', version: 'lp7-2026-10-11',
  releases: ['learning-path-jlpt-lp7-2026-10-11', 'learning-path-topik-lp7-2026-10-11'] as const,
  bundle: '6868d1b20cb6782904371891ec5927dd3b45ec69e28f1aed2a2df18353d1a878',
  draft: 'b1c7dda3b31d4bac030348f882c1786826588df83485a0f5573063a0a41b5871',
  source: 'f7f130d0322271ce5c264d728f423212fc3a37dfaf98d8169ffe7844d7cde2a7',
  inventory: '85515cb49ac8462875c4863c38083880f426939e8f681d20d26a7e88b5989027',
  reviews: ['db1f4a0f9f174b48a02d730aeb93a2241cd9889770f6bf090e067d2a0a8ff52a', 'ac0697d587f71816333a1931c181fa254477d72758731e85b150c88781d1d554'] as const,
});
export type ReleasePhase = 'local' | 'preview' | 'production-predeploy';
export type Artifact = { path: string; sha256: string };
export type ReviewedReleasePaths = { cohort: string; reviewA: string; reviewB: string; readiness: string; reviews: string; releaseReport: string };
export type ReleaseTarget = { phase: ReleasePhase; database: string; worker: string; pages: string };
export const PHASE_GATES: Record<ReleasePhase, readonly string[]> = {
  local: ['source_intake','self_authorship','quality_validator','independent_review','openapi','typecheck','tests','build','fresh_d1','content_contract','google_only_audio','e2e_chromium','e2e_webkit'],
  preview: ['source_intake','self_authorship','quality_validator','independent_review','preview_d1','preview_verifier','google_only_audio','e2e_chromium','e2e_webkit'],
  'production-predeploy': ['source_intake','self_authorship','quality_validator','independent_review','fresh_d1','content_contract','google_only_audio','e2e_chromium','e2e_webkit','predeploy_backup','restore_drill','migration_ledger','remote_verifier','r2_pronunciation_guard','rollback_plan','family_observation','actual_audio'],
};
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Evidence must be a JSON object');
  return v as Record<string, unknown>;
};
const nonempty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
function read(path: string, expected?: string) {
  const absolute = realpathSync(resolve(path)), bytes = readFileSync(absolute), hash = sha256(bytes);
  if (expected && expected !== hash) throw new Error(`Evidence bytes/hash mismatch: ${absolute}`);
  return { bytes, artifact: { path: absolute, sha256: hash } };
}
function record(path: string) { const result = read(path); return { ...result, value: object(JSON.parse(result.bytes.toString('utf8'))) }; }
function same(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} mismatch`);
}

/** Re-evaluates actual frozen bytes and the original public-selection/immutable Git binding. */
export function loadReviewedV7(paths: Pick<ReviewedReleasePaths, 'cohort' | 'reviewA' | 'reviewB'>) {
  const bundle = read(resolve(paths.cohort, 'bundle.json'), REVIEWED_V7.bundle);
  const source = read(resolve(paths.cohort, 'source.json'), REVIEWED_V7.source);
  const inventory = read(resolve(paths.cohort, 'concepts.json'), REVIEWED_V7.inventory);
  const reviews = [read(paths.reviewA, REVIEWED_V7.reviews[0]), read(paths.reviewB, REVIEWED_V7.reviews[1])] as const;
  const publicSelectionBytes = readFileSync(new URL('../content/learning-path-v4-2026-10-11/selected-concepts.json', import.meta.url));
  const input = {
    bundle: JSON.parse(bundle.bytes.toString('utf8')) as FrozenLearningPathV4,
    sourceBytes: source.bytes, inventoryBytes: inventory.bytes, publicSelectionBytes,
    trustedSourceBinding: resolveLearningPathV4SourceBinding(publicSelectionBytes),
    reviews: reviews.map(r => JSON.parse(r.bytes.toString('utf8')) as IndependentReview),
  };
  if (input.bundle.version !== REVIEWED_V7.version || input.bundle.bundle !== REVIEWED_V7.group || input.bundle.draft_sha256 !== REVIEWED_V7.draft) throw new Error('V7 profile mismatch');
  const readiness = learningPathV4Readiness(input);
  if (!readiness.full_bank_ready) throw new Error(`V7 readiness failed: ${readiness.failures.join('; ')}`);
  return { input, readiness, artifacts: { bundle: bundle.artifact, source: source.artifact, inventory: inventory.artifact, reviews: reviews.map(r => r.artifact) } };
}

/** Logs are read and hashed; operator attestation is explicit, never inferred from a boolean/mock callback. */
export function validateReviewedReleaseReport(path: string, target: ReleaseTarget) {
  const report = record(path), r = report.value;
  if (!Object.hasOwn(PHASE_GATES, target.phase)) throw new Error('Unsupported release phase');
  if (r.schema !== 'learning-path-reviewed-release-report-v1' || r.passed !== true || r.publication_gate_evidence !== true || r.evidence_scope !== 'actual-command-logs-and-operator-attestation') throw new Error('Actual release report required; runtime/test fixture is not publication evidence');
  same(r.phase, target.phase, 'Release phase'); same(r.release_id, REVIEWED_V7.group, 'Release group');
  same(r.release_ids, REVIEWED_V7.releases, 'Release IDs');
  same(r.cohort, { draft_sha256: REVIEWED_V7.draft, source_evidence_sha256: REVIEWED_V7.source, concept_inventory_sha256: REVIEWED_V7.inventory, review_sha256: [...REVIEWED_V7.reviews] }, 'Cohort hashes');
  for (const field of ['database','worker','pages'] as const) if (!nonempty(target[field])) throw new Error(`Target ${field} required`);
  same(r.deployment, { database: target.database, worker: target.worker, pages: target.pages }, 'Deployment');
  const attestation = object(r.operator_attestation);
  if (!nonempty(attestation.operator) || !nonempty(attestation.recorded_at) || !Number.isFinite(Date.parse(attestation.recorded_at)) || attestation.exact_cohort_and_logs_verified !== true) throw new Error('Dated operator attestation required');
  const scopes = object(r.proof_scopes);
  if (!['mock','actual-browser'].includes(String(scopes.audio)) || !['not-observed','actual-family'].includes(String(scopes.family)) || typeof scopes.human_audible !== 'boolean') throw new Error('Explicit audio/family/human proof scopes required');
  if (target.phase === 'production-predeploy' && (scopes.audio !== 'actual-browser' || scopes.family !== 'actual-family' || scopes.human_audible !== true)) throw new Error('Production requires actual family and human-audible audio evidence');
  const gates = object(r.gates);
  const artifacts: Record<string, Artifact> = {};
  for (const name of PHASE_GATES[target.phase]) {
    const gate = object(gates[name]);
    if (gate.passed !== true || gate.exit_code !== 0 || !nonempty(gate.command) || !nonempty(gate.artifact) || !/^[a-f0-9]{64}$/.test(String(gate.sha256))) throw new Error(`Gate ${name} requires successful command and hashed actual log`);
    artifacts[name] = read(gate.artifact, String(gate.sha256)).artifact;
  }
  const audio = object(gates.google_only_audio);
  if (audio.provider !== 'google-browser' || audio.r2_pronunciation_references !== 0 || audio.legacy_audio_requests !== 0) throw new Error('Google browser / zero legacy and R2 audio guard failed');
  if (target.phase === 'production-predeploy') {
    const rollback = object(gates.rollback_plan);
    for (const field of ['d1_backup','worker_version','pages_deployment']) if (!nonempty(rollback[field])) throw new Error(`Rollback ${field} required`);
    if (object(gates.r2_pronunciation_guard).referenced_keys !== 0) throw new Error('R2 pronunciation references must be zero');
  }
  return { artifact: report.artifact, report: r, artifacts };
}

export function validateReviewedV7Evidence(paths: ReviewedReleasePaths, target: ReleaseTarget) {
  const loaded = loadReviewedV7(paths), g2 = record(paths.readiness), g3 = record(paths.reviews);
  // A readiness report must be the actual deterministic report, including its precise failure/coverage fields.
  for (const [key, value] of Object.entries(loaded.readiness)) same(g2.value[key], value, `G2 ${key}`);
  if (g3.value.schema !== 'learning-path-reviewed-review-index-v1') throw new Error('G3 requires an actual two-review artifact index');
  same(g3.value.draft_sha256, REVIEWED_V7.draft, 'G3 draft');
  const refs = g3.value.reviews;
  if (!Array.isArray(refs) || refs.length !== 2) throw new Error('G3 requires two actual reviews');
  refs.forEach((ref, index) => {
    const entry = object(ref);
    if (!nonempty(entry.path) || entry.sha256 !== REVIEWED_V7.reviews[index]) throw new Error('G3 exact review hash required');
    same(read(entry.path, String(entry.sha256)).artifact, loaded.artifacts.reviews[index], 'G3 actual review binding');
  });
  const g4 = validateReviewedReleaseReport(paths.releaseReport, target);
  // Bind source/authoring/quality/review G4 inputs to the exact G0-G3 files, not unrelated successful logs.
  const expected = { source_intake: loaded.artifacts.source, self_authorship: loaded.artifacts.bundle, quality_validator: g2.artifact, independent_review: g3.artifact };
  for (const [name, artifact] of Object.entries(expected)) same(g4.artifacts[name], artifact, `G4 ${name} input`);
  return { ...loaded, target, evidence: { G0: loaded.artifacts.source, G1: loaded.artifacts.bundle, G2: g2.artifact, G3: g3.artifact, G4: g4.artifact }, report: g4.report };
}
