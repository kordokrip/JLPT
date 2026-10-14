// Synthetic unit fixtures only. No remote command, deployment, human/audio claim or actual release proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { DEPLOYMENT_PREVIEW, DEPLOYMENT_RECEIPT_SCHEMA, requireDeploymentReceiptChain, type CloudflareGetProof, type EvidenceFile } from './learning-cohort-deployment-contract.js';
import { validateDeploymentMetadata, observeDeployment, readHashedJson, requireCurrentDeploymentLocalProof, prepareDeploymentVerification, verifyDeploymentContentSnapshot, runDeploymentVerification, type DeploymentVerificationRequest } from './learning-cohort-deployment.js';
import { LEARNING_COHORT_ID, LEARNING_COHORT_HASHES, LEARNING_COHORT_RELEASE_IDS, AUTH_GATES, buildLearningCohortStagePlan, buildLearningCohortControlPlan } from './learning-cohort-release.js';
import { REVIEWED_V7, PHASE_GATES, loadReviewedV7, type ReleaseTarget } from './learning-path-reviewed-release.js';
import { defaultPreview160V3Paths, validatePreview160V3, PREVIEW160_V3_MANIFEST_SHA256 } from './preview160-v3-quality.js';
import { LOCAL_DRILL_LEARNER_TABLES } from './learning-path-preview.js';
import { LEARNING_CONTENT_TABLES, type ContentSnapshot } from './learning-path-preview-target.js';
import { buildContentSeedPlan } from '../seed/content-manifest.js';
import type { CohortRemoteTarget } from './learning-cohort-target.js';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const candidate = 'b'.repeat(40), published = 'a'.repeat(40), account = 'c'.repeat(32);
const deploymentId = '11111111-2222-3333-4444-555555555555';
const target: CohortRemoteTarget = { remote: true, scope: 'preview', env: 'topik-preview', config: resolve(root, 'apps/api/wrangler.toml'), database: DEPLOYMENT_PREVIEW.database, worker: DEPLOYMENT_PREVIEW.worker, pages: 'https://abcdef12.nihongo-n3.pages.dev', releaseSha: candidate };
const identity = { scope: 'preview' as const, database: target.database, database_id: DEPLOYMENT_PREVIEW.database_id, worker: target.worker, pages: target.pages };
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
function files() {
  const dir = mkdtempSync(join(tmpdir(), 'synthetic-deployment-unit-')); let sequence = 0;
  const write = (name: string, value: unknown): EvidenceFile => {
    const path = join(dir, `${sequence++}-${name}.json`), text = JSON.stringify(value);
    writeFileSync(path, text, { flag: 'wx', mode: 0o600 }); return { path, sha256: digest(text) };
  };
  const ref = (path: string): EvidenceFile => ({ path, sha256: digest(readFileSync(path)) });
  return { dir, write, ref };
}
function metadata() {
  const proof = (suffix: string, result: any): CloudflareGetProof => ({ schema: 'cloudflare-readonly-get-proof-v1', collected_at: new Date().toISOString(), request: { method: 'GET', url: `https://api.cloudflare.com/client/v4/accounts/${account}${suffix}` }, status: 200, response: { success: true, result } });
  return {
    database: proof(`/d1/database/${DEPLOYMENT_PREVIEW.database_id}`, { uuid: DEPLOYMENT_PREVIEW.database_id, name: target.database }),
    worker: proof(`/workers/scripts/${target.worker}/settings`, { bindings: [{ name: 'DB', type: 'd1', id: DEPLOYMENT_PREVIEW.database_id }, { name: 'RELEASE_SHA', type: 'plain_text', text: candidate }] }),
    pages: proof(`/pages/projects/nihongo-n3/deployments/${deploymentId}`, { id: deploymentId, project_name: 'nihongo-n3', environment: 'preview', url: target.pages, latest_stage: { status: 'success' }, deployment_trigger: { metadata: { commit_hash: candidate } }, env_vars: { API_ORIGIN: { value: DEPLOYMENT_PREVIEW.worker_origin } } }),
  };
}
function fixture() {
  const f = files(), localTarget: ReleaseTarget = { phase: 'local', database: ':memory:unit-only', worker: 'unit-only', pages: 'unit-only' };
  const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
  const source = { cohort: path('../content/learning-path-v7-2026-10-11/frozen-cohort-01/'), reviewA: path('../content/reviews/learning-path-v7-full-reviewer-a-cohort01-2026-10-11.json'), reviewB: path('../content/reviews/learning-path-v7-full-reviewer-b-cohort01-2026-10-11.json') };
  const v7 = loadReviewedV7(source), readiness = f.write('readiness', v7.readiness), reviews = f.write('reviews', { schema: 'learning-path-reviewed-review-index-v1', draft_sha256: REVIEWED_V7.draft, reviews: v7.artifacts.reviews });
  const log = f.write('UNIT-ONLY-log', { warning: 'SYNTHETIC UNIT TEST: no operational command executed' });
  const record = (name: string, evidence = log) => ({ passed: true, exit_code: 0, command: 'SYNTHETIC UNIT TEST ONLY', artifact: evidence.path, sha256: evidence.sha256, ...(['google_only_audio', 'audio_guard'].includes(name) ? { provider: 'google-browser', r2_pronunciation_references: 0, legacy_audio_requests: 0 } : {}) });
  const v7drill = f.write('v7-unit-drill', { schema: 'learning-path-local-release-drill-v1', cohort: { draft_sha256: REVIEWED_V7.draft, source_evidence_sha256: REVIEWED_V7.source, concept_inventory_sha256: REVIEWED_V7.inventory, review_sha256: [...REVIEWED_V7.reviews], preview160_manifest_sha256: PREVIEW160_V3_MANIFEST_SHA256 }, scope: 'new-local-SQLite-only', remote_writes: 0, learner_row_hashes_unchanged: true, preserved_learner_tables: LOCAL_DRILL_LEARNER_TABLES, preview160: { publication: 'draft-unpublished', reseed_unchanged: true, counts: { jlpt_questions: 120, topik_items: 40 }, stored_rows: 543 }, v7: { published: { state: 'published', items: 440, lessons: 220, idempotent: false }, publishedReplay: { idempotent: true }, withdrawn: { state: 'withdrawn', items: 440, lessons: 220 } } });
  const sourceGates: Record<string, EvidenceFile> = { source_intake: v7.artifacts.source, self_authorship: v7.artifacts.bundle, quality_validator: readiness, independent_review: reviews };
  const scopes = { audio: 'mock', family: 'not-observed', human_audible: false }, attestation = { operator: 'SYNTHETIC UNIT TEST ONLY', recorded_at: '2026-10-13T00:00:00Z', exact_cohort_and_logs_verified: true };
  const report = f.write('v7-local-unit-report', { schema: 'learning-path-reviewed-release-report-v1', collector_stage: 'complete', passed: true, publication_gate_evidence: true, evidence_scope: 'actual-command-logs-and-operator-attestation', phase: 'local', release_id: REVIEWED_V7.group, release_ids: REVIEWED_V7.releases, cohort: { draft_sha256: REVIEWED_V7.draft, source_evidence_sha256: REVIEWED_V7.source, concept_inventory_sha256: REVIEWED_V7.inventory, review_sha256: REVIEWED_V7.reviews }, deployment: { database: localTarget.database, worker: localTarget.worker, pages: localTarget.pages }, operator_attestation: attestation, proof_scopes: scopes, gates: { ...Object.fromEntries(PHASE_GATES.local.map(n => [n, record(n, sourceGates[n] ?? log)])), local_release_drill: record('local_release_drill', v7drill) } });
  const v7local = f.write('v7-unit-summary', { passed: true, remote_writes: 0, gates: ['preview160-quality', 'openapi', 'typecheck', 'tests', 'build', 'audio-contract', 'fresh-d1', 'reviewed-e2e'].map(name => ({ name, ...record(name) })), reviewed_browser: { expected: 44, unexpected: 0, flaky: 0, skipped: 0 }, actual_source_paths: { releaseReport: report.path } });
  const localSummary = (sha: string) => f.write('cohort-unit-summary', { schema: 'learning-cohort-local-summary-v1', candidate_sha: sha, cohort_hashes: LEARNING_COHORT_HASHES, passed: true, exit_code: 0, remote_writes: 0, v7_local: v7local, all_five_drill: f.write('all-five-unit-drill', { schema: 'learning-cohort-local-drill-v1', candidate_sha: sha, cohort_hashes: LEARNING_COHORT_HASHES, passed: true, exit_code: 0, remote_writes: 0, learner_row_hashes_unchanged: true, preserved_learner_tables: LOCAL_DRILL_LEARNER_TABLES, published: { state: 'published', releases: 5, questions: 600, lessons: 220, quality_links: 600 }, replay: { idempotent: true }, withdrawn: { state: 'withdrawn', questions: 600, lessons: 220 } }) });
  const oldSummary = localSummary(published), currentSummary = localSummary(candidate), v3 = defaultPreview160V3Paths();
  const quality = f.write('v3-quality', validatePreview160V3(v3)), v3reviews = f.write('v3-reviews', { schema: 'preview160-v3-review-index-v1', reviews: [f.ref(v3.reviewA), f.ref(v3.reviewB)] });
  const originalTarget = { phase: 'preview' as const, database: target.database, worker: target.worker, pages: 'https://12345678.nihongo-n3.pages.dev', candidateSha: published };
  const authorization = f.write('original-unit-authorization', { schema: 'learning-cohort-publication-authorization-v1', kind: 'publication-authorization', cohort_id: LEARNING_COHORT_ID, release_ids: LEARNING_COHORT_RELEASE_IDS, phase: 'preview', target: { phase: 'preview', database: originalTarget.database, worker: originalTarget.worker, pages: originalTarget.pages }, candidate_sha: published, cohort_hashes: LEARNING_COHORT_HASHES, passed: true, publication_gate_evidence: true, prerequisites: { v7_local: report, v3_quality: quality, v3_reviews: v3reviews }, operator_attestation: attestation, proof_scopes: scopes, gates: Object.fromEntries(AUTH_GATES.preview.map(name => [name, record(name, name === 'local_gates' ? oldSummary : log)])) });
  const originalReceipt = f.write('original-unit-receipt', { schema: 'learning-cohort-remote-receipt-v1', kind: 'post-operation-verification', operation: 'publish', passed: true, state: 'published', target: { scope: 'preview', database: target.database, worker: target.worker, pages: originalTarget.pages }, candidate_sha: published, authorization_sha256: authorization.sha256, production_writes: false, releases: 5, questions: 600, lessons: 220, release_ids: LEARNING_COHORT_RELEASE_IDS, cohort_hashes: LEARNING_COHORT_HASHES });
  const m = metadata();
  const request: DeploymentVerificationRequest = { schema: 'learning-cohort-deployment-request-v1', currentTarget: target, originalPaths: { v7: { ...source, readiness: readiness.path, reviews: reviews.path, releaseReport: report.path }, v7Target: localTarget, v3, v3Quality: quality.path, v3Reviews: v3reviews.path, authorization: authorization.path }, originalPublicationReceipt: originalReceipt, currentLocalSummary: currentSummary, metadataEvidence: { database: f.write('d1-proof', m.database), worker: f.write('worker-proof', m.worker), pages: f.write('pages-proof', m.pages) } };
  return { ...f, request, originalTarget, authorization, currentSummary, log };
}

test('metadata accepts exact injected GET proofs, rejects source/DB/Pages/phase/account/staleness and passed-only claims', async t => {
  assert.equal(validateDeploymentMetadata(target, metadata()).pages_deployment_id, deploymentId);
  const cases: [string, (p: ReturnType<typeof metadata>) => void][] = [
    ['D1', p => { p.database.response.result.uuid = 'wrong'; }], ['D1 name', p => { p.database.response.result.name = 'production'; }],
    ['Worker DB', p => { p.worker.response.result.bindings[0].id = 'wrong'; }], ['Worker source', p => { p.worker.response.result.bindings[1].text = published; }],
    ['Worker conflicting DB alias', p => { p.worker.response.result.bindings[0].database_id = 'wrong'; }],
    ['Pages source', p => { p.pages.response.result.deployment_trigger.metadata.commit_hash = published; }], ['Pages URL', p => { p.pages.response.result.url = 'https://nihongo-n3.pages.dev'; }],
    ['Pages environment', p => { p.pages.response.result.environment = 'production'; }], ['Pages failed', p => { p.pages.response.result.latest_stage.status = 'failure'; }],
    ['Pages missing env', p => { delete p.pages.response.result.env_vars; }], ['Pages wrong proxy', p => { p.pages.response.result.env_vars.API_ORIGIN.value = 'https://nihongo-n3-api.kordokrip.workers.dev'; }],
    ['account', p => { p.pages.request.url = p.pages.request.url.replace(account, 'd'.repeat(32)); }], ['stale', p => { p.pages.collected_at = '2020-01-01'; }],
    ['future', p => { p.pages.collected_at = '2099-01-01'; }], ['wrong endpoint', p => { p.database.request.url += '?alias=prod'; }],
    ['manual passed only', p => { p.pages = { passed: true } as unknown as CloudflareGetProof; }],
  ];
  for (const [name, mutate] of cases) await t.test(name, () => { const p = metadata(); mutate(p); assert.throws(() => validateDeploymentMetadata(target, p)); });
  assert.throws(() => validateDeploymentMetadata({ ...target, scope: 'production' }, metadata()));
  assert.throws(() => validateDeploymentMetadata({ ...target, pages: 'https://nihongo-n3.pages.dev' }, metadata()));
});

test('same-candidate complete local proof cannot reuse old SHA, incomplete drill or changed command bytes', () => {
  const f = fixture();
  assert.doesNotThrow(() => requireCurrentDeploymentLocalProof(f.currentSummary, candidate));
  assert.throws(() => requireCurrentDeploymentLocalProof(f.currentSummary, published), /same-candidate/);
  const summary = readHashedJson(f.currentSummary), drill = readHashedJson(summary.all_five_drill);
  assert.throws(() => requireCurrentDeploymentLocalProof(f.write('incomplete-summary', { ...summary, all_five_drill: f.write('incomplete-drill', { ...drill, withdrawn: { state: 'withdrawn', questions: 440, lessons: 220 } }) }), candidate), /five-release/);
  writeFileSync(f.log.path, 'changed-unit-log');
  assert.throws(() => requireCurrentDeploymentLocalProof(f.currentSummary, candidate), /log bytes changed/);
});

test('new app SHA verifies actual frozen published content against original approval without modifying source/control rows', () => {
  const f = fixture(), prepared = prepareDeploymentVerification(f.request), db = new DatabaseSync(':memory:');
  try {
    const dir = new URL('../../drizzle-v2/', import.meta.url);
    for (const name of readdirSync(dir).filter(n => /^00\d\d_.*\.sql$/.test(n) && Number(n.slice(0, 4)) <= 31).sort()) db.exec(readFileSync(new URL(name, dir), 'utf8'));
    db.exec(buildContentSeedPlan().statements.join('\n'));
    db.exec(buildLearningCohortStagePlan(db, f.request.originalPaths, f.originalTarget).statements.join('\n'));
    const plan = buildLearningCohortControlPlan(db, f.request.originalPaths, f.originalTarget); db.exec(plan.statements.join('\n')); db.exec(plan.publishSql);
    const snapshot = Object.fromEntries(LEARNING_CONTENT_TABLES.map(table => [table, db.prepare(`SELECT * FROM ${table}`).all()])) as ContentSnapshot;
    const before = digest(JSON.stringify(snapshot));
    assert.equal(prepared.originalTarget.candidateSha, published);
    assert.equal(verifyDeploymentContentSnapshot(f.request, snapshot).questions, 600);
    assert.equal(digest(JSON.stringify(snapshot)), before);
    assert.equal(f.ref(f.authorization.path).sha256, f.authorization.sha256);
    const changed = structuredClone(snapshot); changed.content_release_sources![0]!.attribution_text = '{}';
    assert.throws(() => verifyDeploymentContentSnapshot(f.request, changed), /binding mismatch/);
    const terminal = structuredClone(snapshot); terminal.content_releases!.filter(r => (LEARNING_COHORT_RELEASE_IDS as readonly string[]).includes(String(r.id))).forEach(r => { r.release_state = 'withdrawn'; });
    assert.throws(() => verifyDeploymentContentSnapshot(f.request, terminal));
    const changedReceipt = readHashedJson(f.request.originalPublicationReceipt); changedReceipt.candidate_sha = candidate;
    assert.throws(() => prepareDeploymentVerification({ ...f.request, originalPublicationReceipt: f.write('changed-publication-sha', changedReceipt) }), /Candidate SHA/);
    writeFileSync(f.authorization.path, '{}');
    assert.throws(() => prepareDeploymentVerification(f.request), /authorization changed/);
  } finally { db.close(); }
});

test('live observations only GET exact Preview and reject stale Worker/proxy before use', async () => {
  const calls: string[] = [];
  const mock = (release = candidate, proxy = candidate) => (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push(String(url)); assert.equal(init?.method, 'GET'); assert.equal(init?.redirect, 'error');
    return String(url).endsWith('/health') ? Response.json({ release, environment: 'preview', maintenanceMode: 'off' }) : Response.json({}, { headers: { 'x-release': proxy } });
  }) as typeof fetch;
  assert.equal((await observeDeployment(target, mock())).proxy.release, candidate);
  await assert.rejects(observeDeployment(target, mock(published)), /Live Worker/);
  await assert.rejects(observeDeployment(target, mock(candidate, published)), /proxy/);
  const length = calls.length; await assert.rejects(observeDeployment({ ...target, scope: 'production' }, mock())); assert.equal(calls.length, length);
});

test('E2E dual-SHA chain rejects edited original/local/metadata evidence and cannot authorize publication', () => {
  const f = fixture(), prepared = prepareDeploymentVerification(f.request);
  const receipt = { schema: DEPLOYMENT_RECEIPT_SCHEMA, kind: 'deployment-verification', passed: true, publication_gate_evidence: false, remote_writes: false, production_writes: false, candidate_sha: candidate, target: identity, state: 'published', releases: 5, questions: 600, lessons: 220, entries: 880, quality_links: 600, speech: 56, release_ids: LEARNING_COHORT_RELEASE_IDS, cohort_hashes: LEARNING_COHORT_HASHES,
    publication: { candidate_sha: published, target: { ...identity, pages: f.originalTarget.pages }, receipt: f.request.originalPublicationReceipt, authorization: f.authorization }, evidence: { current_local_summary: f.currentSummary, metadata: f.request.metadataEvidence }, ...prepared.metadata,
    observations: { worker: { status: 200, release: candidate, maintenance_mode: 'off' }, proxy: { status: 200, release: candidate } } };
  assert.doesNotThrow(() => requireDeploymentReceiptChain(receipt, target.pages, readHashedJson));
  assert.throws(() => requireDeploymentReceiptChain({ ...receipt, candidate_sha: published }, target.pages, readHashedJson));
  assert.throws(() => requireDeploymentReceiptChain({ ...receipt, publication_gate_evidence: true }, target.pages, readHashedJson));
  assert.throws(() => requireDeploymentReceiptChain(receipt, 'https://nihongo-n3.pages.dev', readHashedJson));
  writeFileSync(f.request.metadataEvidence.pages.path, '{}');
  assert.throws(() => requireDeploymentReceiptChain(receipt, target.pages, readHashedJson), /bytes changed/);
});

test('CLI failure is immutable, read-only and cannot overwrite earlier evidence', async () => {
  const f = files(), request = f.write('invalid-request', { schema: 'learning-cohort-deployment-request-v1', currentTarget: { ...target, scope: 'production' } }), output = join(f.dir, 'failed-receipt.json');
  await assert.rejects(runDeploymentVerification(request.path, output), /Production prohibited/);
  const before = readFileSync(output, 'utf8'), receipt = JSON.parse(before);
  assert.equal(receipt.passed, false); assert.equal(receipt.remote_writes, false);
  await assert.rejects(runDeploymentVerification(request.path, output), /immutable evidence/);
  assert.equal(readFileSync(output, 'utf8'), before);
});
