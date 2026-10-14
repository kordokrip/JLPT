/** Read-only Preview verification of a new app over an already published cohort.
 * The original authorization/control plane remains immutable. No publication or withdrawal API is exposed.
 * Cloudflare proofs are captured by the authorized read-only collector, not created from passed flags here.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadLearningCohort, verifyLearningCohort, LEARNING_COHORT_HASHES, LEARNING_COHORT_RELEASE_IDS, type LearningCohortPaths, type CohortTarget } from './learning-cohort-release.js';
import { requireCurrentCohortLocalProof } from './learning-cohort-remote.js';
import { requireCompletedLocalReleaseDrill, LOCAL_DRILL_LEARNER_TABLES } from './learning-path-preview.js';
import { learningContentMirror, type ContentSnapshot } from './learning-path-preview-target.js';
import { readLearningCohortSnapshot, requireCohortRemoteTarget, type CohortRemoteTarget } from './learning-cohort-target.js';
import { DEPLOYMENT_PREVIEW, DEPLOYMENT_RECEIPT_SCHEMA, requireCondition as check, requireEvidenceFile, requirePreviewDeployment, requireDeploymentReceipt, requireDeploymentMetadata, type EvidenceFile, type CloudflareGetProof, type DeploymentIdentity } from './learning-cohort-deployment-contract.js';

export type DeploymentVerificationRequest = {
  schema: 'learning-cohort-deployment-request-v1';
  currentTarget: CohortRemoteTarget;
  originalPaths: LearningCohortPaths;
  originalPublicationReceipt: EvidenceFile;
  currentLocalSummary: EvidenceFile;
  metadataEvidence: { database: EvidenceFile; worker: EvidenceFile; pages: EvidenceFile };
};
/** Actual sanitized GET response: retain checked fields, never tokens, credentials or learner rows.
 * This is an operator/collector trust boundary, not cryptographic attestation by Cloudflare.
 */
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function readHashedJson(file: EvidenceFile): any {
  requireEvidenceFile(file);
  const bytes = readFileSync(file.path);
  check(hash(bytes) === file.sha256, 'Evidence bytes changed: ' + file.path);
  return JSON.parse(bytes.toString('utf8'));
}
function artifact(path: string): EvidenceFile { return { path: resolve(path), sha256: hash(readFileSync(path)) }; }
export function requireCurrentDeploymentLocalProof(file: EvidenceFile, candidateSha: string): void {
  const summary = readHashedJson(file);
  check(summary.schema === 'learning-cohort-local-summary-v1' && summary.passed === true && summary.exit_code === 0 &&
    summary.remote_writes === 0 && summary.candidate_sha === candidateSha && same(summary.cohort_hashes, LEARNING_COHORT_HASHES), 'Complete same-candidate local summary required');
  const drill = readHashedJson(summary.all_five_drill);
  check(drill.schema === 'learning-cohort-local-drill-v1' && drill.candidate_sha === candidateSha && same(drill.cohort_hashes, LEARNING_COHORT_HASHES) &&
    drill.passed === true && drill.exit_code === 0 && drill.remote_writes === 0 && drill.learner_row_hashes_unchanged === true &&
    same(drill.preserved_learner_tables, LOCAL_DRILL_LEARNER_TABLES) && drill.published?.state === 'published' && drill.published.releases === 5 &&
    drill.published.questions === 600 && drill.published.lessons === 220 && drill.published.quality_links === 600 && drill.replay?.idempotent === true &&
    drill.withdrawn?.state === 'withdrawn' && drill.withdrawn.questions === 600 && drill.withdrawn.lessons === 220, 'Complete current five-release local drill required');
  const local = readHashedJson(summary.v7_local);
  check(local.passed === true && local.remote_writes === 0 && Array.isArray(local.gates), 'Actual full local command receipts required');
  for (const name of ['preview160-quality', 'openapi', 'typecheck', 'tests', 'build', 'audio-contract', 'fresh-d1', 'reviewed-e2e']) {
    const gates = local.gates.filter((g: any) => g.name === name);
    check(gates.length === 1 && gates[0].passed === true && gates[0].exit_code === 0 && typeof gates[0].command === 'string' && gates[0].command.trim(), 'Missing/failed local command: ' + name);
    const ref = { path: gates[0].artifact, sha256: gates[0].sha256 };
    requireEvidenceFile(ref);
    check(hash(readFileSync(ref.path)) === ref.sha256, 'Local command log bytes changed');
  }
  check(local.reviewed_browser?.expected === 44 && local.reviewed_browser.unexpected === 0 && local.reviewed_browser.flaky === 0 && local.reviewed_browser.skipped === 0, 'Complete 44-case reviewed browser proof required');
  requireCompletedLocalReleaseDrill(JSON.parse(readFileSync(local.actual_source_paths.releaseReport, 'utf8')));
}
function identity(target: CohortRemoteTarget) {
  return { scope: target.scope, database: target.database, database_id: DEPLOYMENT_PREVIEW.database_id, worker: target.worker, pages: target.pages };
}
export function validateDeploymentMetadata(target: CohortRemoteTarget, proofs: { database: CloudflareGetProof; worker: CloudflareGetProof; pages: CloudflareGetProof }, now = Date.now()) {
  return requireDeploymentMetadata(identity(target) as DeploymentIdentity, target.releaseSha, proofs, now);
}

/** Validate both evidence chains before any D1 or HTTP call. No new approval is manufactured. */
export function prepareDeploymentVerification(request: DeploymentVerificationRequest) {
  check(request?.schema === 'learning-cohort-deployment-request-v1', 'Deployment request schema required');
  const target = request.currentTarget;
  requirePreviewDeployment(identity(target) as Parameters<typeof requirePreviewDeployment>[0], target.releaseSha);
  requireCohortRemoteTarget(target, false);
  const original = readHashedJson(request.originalPublicationReceipt);
  check(original.schema === 'learning-cohort-remote-receipt-v1' && original.kind === 'post-operation-verification' &&
    ['publish', 'verify'].includes(original.operation) && original.passed === true && original.state === 'published' &&
    original.target?.scope === 'preview' && original.target.database === target.database && original.target.worker === target.worker &&
    original.production_writes === false && original.releases === 5 && original.questions === 600 && original.lessons === 220 &&
    same(original.release_ids, LEARNING_COHORT_RELEASE_IDS) && same(original.cohort_hashes, LEARNING_COHORT_HASHES), 'Original published Preview receipt mismatch');
  requirePreviewDeployment({ ...original.target, database_id: DEPLOYMENT_PREVIEW.database_id }, original.candidate_sha);
  const authorization = artifact(request.originalPaths.authorization);
  check(authorization.sha256 === original.authorization_sha256, 'Original publication authorization changed');
  const originalTarget: CohortTarget = { phase: 'preview', database: original.target.database, worker: original.target.worker, pages: original.target.pages, candidateSha: original.candidate_sha };
  loadLearningCohort(request.originalPaths, originalTarget);
  requireCompletedLocalReleaseDrill(JSON.parse(readFileSync(request.originalPaths.v7.releaseReport, 'utf8')));
  requireCurrentCohortLocalProof(request.originalPaths.authorization, original.candidate_sha);
  requireCurrentDeploymentLocalProof(request.currentLocalSummary, target.releaseSha);
  const proofs = { database: readHashedJson(request.metadataEvidence.database), worker: readHashedJson(request.metadataEvidence.worker), pages: readHashedJson(request.metadataEvidence.pages) };
  const metadata = validateDeploymentMetadata(target, proofs);
  return { original, originalTarget, authorization, metadata };
}

/** GET only, redirects rejected so a Preview endpoint cannot silently redirect to Production. */
export async function observeDeployment(target: CohortRemoteTarget, get: typeof fetch = fetch) {
  requirePreviewDeployment(identity(target) as Parameters<typeof requirePreviewDeployment>[0], target.releaseSha);
  const worker = await get(`${DEPLOYMENT_PREVIEW.worker_origin}/health`, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15_000) });
  check(worker.status === 200, 'Worker health failed');
  const body: any = await worker.json();
  check(body.release === target.releaseSha && body.environment === 'preview' && body.maintenanceMode === 'off', 'Live Worker source/environment/mode mismatch');
  const proxy = await get(`${target.pages}/api/v1/auth/config`, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15_000) });
  check(proxy.status === 200 && proxy.headers.get('x-release') === target.releaseSha, 'Live Pages proxy source mismatch');
  return { recorded_at: new Date().toISOString(), worker: { status: worker.status, release: body.release, maintenance_mode: body.maintenanceMode }, proxy: { status: proxy.status, release: proxy.headers.get('x-release') } };
}

/** Local validation of an explicitly supplied content-only snapshot; not remote evidence by itself. */
export function verifyDeploymentContentSnapshot(request: DeploymentVerificationRequest, snapshot: ContentSnapshot) {
  const prepared = prepareDeploymentVerification(request);
  const db = learningContentMirror(snapshot);
  try {
    db.exec('PRAGMA query_only=ON');
    return verifyLearningCohort(db, request.originalPaths, prepared.originalTarget, 'published');
  } finally { db.close(); }
}

export async function verifyLearningCohortDeployment(request: DeploymentVerificationRequest) {
  const prepared = prepareDeploymentVerification(request);
  const counts = verifyDeploymentContentSnapshot(request, readLearningCohortSnapshot(request.currentTarget));
  const observations = await observeDeployment(request.currentTarget);
  // Recheck immutable input files after observations; no old control-plane row is rewritten.
  const again = prepareDeploymentVerification(request);
  check(same(prepared, again), 'Publication/deployment evidence changed during verification');
  const receipt = {
    ...counts, schema: DEPLOYMENT_RECEIPT_SCHEMA, kind: 'deployment-verification', passed: true,
    candidate_sha: request.currentTarget.releaseSha, target: identity(request.currentTarget),
    publication: { candidate_sha: prepared.originalTarget.candidateSha, target: { ...prepared.original.target, database_id: DEPLOYMENT_PREVIEW.database_id }, receipt: request.originalPublicationReceipt, authorization: prepared.authorization },
    release_ids: LEARNING_COHORT_RELEASE_IDS, cohort_hashes: LEARNING_COHORT_HASHES,
    evidence: { current_local_summary: request.currentLocalSummary, metadata: request.metadataEvidence },
    ...prepared.metadata, observations, recorded_at: new Date().toISOString(),
    publication_gate_evidence: false, remote_writes: false, production_writes: false,
    family_observed: false, actual_browser_audio: false, human_audible: false,
  };
  requireDeploymentReceipt(receipt, request.currentTarget.pages);
  return receipt;
}

export async function runDeploymentVerification(requestPath: string, output: string) {
  check(!existsSync(output), 'Receipt exists; immutable evidence cannot be overwritten');
  const input = artifact(requestPath);
  try {
    const request = readHashedJson(input) as DeploymentVerificationRequest;
    const result = await verifyLearningCohortDeployment(request);
    check(hash(readFileSync(requestPath)) === input.sha256, 'Request bytes changed during verification');
    writeFileSync(output, JSON.stringify({ ...result, request: input }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return result;
  } catch (error) {
    if (!existsSync(output)) writeFileSync(output, JSON.stringify({ schema: DEPLOYMENT_RECEIPT_SCHEMA, kind: 'deployment-verification', passed: false, request: input, remote_writes: false, production_writes: false, error: error instanceof Error ? error.message : 'Verification failed' }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    check(args.length === 2 && args.filter(a => a.startsWith('--request=')).length === 1 && args.filter(a => a.startsWith('--output=')).length === 1, 'Only --request=<json> --output=<new-receipt.json> supported; no write operations');
    const option = (name: string) => resolve(args.find(a => a.startsWith(`--${name}=`))!.slice(name.length + 3));
    const result = await runDeploymentVerification(option('request'), option('output'));
    console.log(JSON.stringify({ passed: result.passed, candidate_sha: result.candidate_sha, publication_sha: result.publication.candidate_sha, remote_writes: false }));
  } catch (error) { console.error(error instanceof Error ? error.message : 'Verification failed'); process.exitCode = 1; }
}
