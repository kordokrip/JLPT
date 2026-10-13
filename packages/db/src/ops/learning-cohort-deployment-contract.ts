/** Preview app verification is not a new content publication authorization.
 * Kept free of DB/import.meta dependencies so the E2E loader uses the same contract.
 */
export const DEPLOYMENT_RECEIPT_SCHEMA = 'learning-cohort-deployment-verification-v1';
export const DEPLOYMENT_PREVIEW = {
  database: 'nihongo-n3-topik-preview', database_id: '5c8863e9-09ea-4180-adb5-e097f4b8de34',
  worker: 'nihongo-n3-api-topik-preview', worker_origin: 'https://nihongo-n3-api-topik-preview.kordokrip.workers.dev',
  pages_project: 'nihongo-n3',
} as const;
export type EvidenceFile = { path: string; sha256: string };
export type DeploymentIdentity = { scope: 'preview'; database: string; database_id: string; worker: string; pages: string };
/** Captured by an authorized actual GET collector; not a cryptographic Cloudflare signature. */
export type CloudflareGetProof = {
  schema: 'cloudflare-readonly-get-proof-v1'; collected_at: string;
  request: { method: 'GET'; url: string }; status: number;
  response: { success: boolean; result: any };
};
export function requireCondition(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
export function requirePreviewDeployment(target: DeploymentIdentity, sha: string): void {
  requireCondition(/^[a-f0-9]{40}$/.test(sha), 'Exact deployment SHA required');
  requireCondition(target.scope === 'preview' && target.database === DEPLOYMENT_PREVIEW.database &&
    target.database_id === DEPLOYMENT_PREVIEW.database_id && target.worker === DEPLOYMENT_PREVIEW.worker &&
    /^https:\/\/[a-f0-9]{8}\.nihongo-n3\.pages\.dev$/.test(target.pages), 'Dedicated immutable Preview target required; Production prohibited');
}
export function requireEvidenceFile(value: any): asserts value is EvidenceFile {
  requireCondition(value && typeof value.path === 'string' && value.path.startsWith('/') && /^[a-f0-9]{64}$/.test(value.sha256), 'Absolute hashed evidence file required');
}
function proofResult(proof: CloudflareGetProof, suffix: string, now: number): { account: string; result: any } {
  requireCondition(proof?.schema === 'cloudflare-readonly-get-proof-v1' && proof.request?.method === 'GET' && proof.status === 200 &&
    proof.response?.success === true, 'Actual successful Cloudflare GET proof required');
  const time = Date.parse(proof.collected_at);
  requireCondition(Number.isFinite(time) && time <= now + 30_000 && now - time <= 4 * 60 * 60 * 1000, 'Stale/future Cloudflare proof');
  const match = /^https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/([a-f0-9]{32})(\/.*)$/.exec(proof.request.url);
  requireCondition(match && match[2] === suffix, 'Cloudflare proof endpoint mismatch');
  return { account: match[1]!, result: proof.response.result };
}
export function requireDeploymentMetadata(target: DeploymentIdentity, sha: string, proofs: { database: CloudflareGetProof; worker: CloudflareGetProof; pages: CloudflareGetProof }, now = Date.now()) {
  requirePreviewDeployment(target, sha);
  const d1 = proofResult(proofs.database, `/d1/database/${DEPLOYMENT_PREVIEW.database_id}`, now);
  requireCondition(d1.result?.uuid === DEPLOYMENT_PREVIEW.database_id && d1.result.name === target.database, 'Actual D1 identity mismatch');
  const worker = proofResult(proofs.worker, `/workers/scripts/${target.worker}/settings`, now);
  const bindings: any[] = worker.result?.bindings;
  requireCondition(Array.isArray(bindings), 'Actual Worker bindings missing');
  const databases = bindings.filter(b => b.type === 'd1'), releases = bindings.filter(b => b.name === 'RELEASE_SHA');
  requireCondition(databases.length === 1 && databases[0].name === 'DB' && databases[0].id === DEPLOYMENT_PREVIEW.database_id &&
    (databases[0].database_id === undefined || databases[0].database_id === DEPLOYMENT_PREVIEW.database_id), 'Worker D1 binding mismatch');
  requireCondition(releases.length === 1 && releases[0].type === 'plain_text' && releases[0].text === sha, 'Worker source binding mismatch');
  const deploymentId = proofs.pages?.response?.result?.id;
  requireCondition(typeof deploymentId === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(deploymentId), 'Exact Pages deployment ID required');
  const pages = proofResult(proofs.pages, `/pages/projects/${DEPLOYMENT_PREVIEW.pages_project}/deployments/${deploymentId}`, now), p = pages.result;
  requireCondition(d1.account === worker.account && worker.account === pages.account, 'Cloudflare account mismatch');
  requireCondition(p.project_name === DEPLOYMENT_PREVIEW.pages_project && p.environment === 'preview' && p.url === target.pages &&
    p.latest_stage?.status === 'success' && p.deployment_trigger?.metadata?.commit_hash === sha, 'Pages deployment/source mismatch');
  requireCondition(p.env_vars?.API_ORIGIN?.value === DEPLOYMENT_PREVIEW.worker_origin, 'Pages deployment proxy binding mismatch');
  return { pages_deployment_id: deploymentId, cloudflare_account: d1.account };
}

/** Shape checking is followed by actual file hashes and live health/proxy checks in callers. */
export function requireDeploymentReceipt(value: any, pages: string): void {
  requireCondition(value?.schema === DEPLOYMENT_RECEIPT_SCHEMA && value.kind === 'deployment-verification' && value.passed === true &&
    value.publication_gate_evidence === false && value.remote_writes === false && value.production_writes === false,
  'Read-only deployment receipt required, not publication authorization');
  requirePreviewDeployment(value.target, value.candidate_sha);
  requireCondition(value.target.pages === pages && value.state === 'published' && value.releases === 5 && value.questions === 600 &&
    value.lessons === 220 && value.entries === 880 && value.quality_links === 600 && value.speech === 56, 'Exact published cohort/deployment receipt required');
  requireCondition(/^[a-f0-9]{40}$/.test(value.publication?.candidate_sha), 'Original publication SHA required');
  requirePreviewDeployment(value.publication.target, value.publication.candidate_sha);
  requireEvidenceFile(value.publication.receipt);
  requireEvidenceFile(value.publication.authorization);
  requireEvidenceFile(value.evidence?.current_local_summary);
  for (const name of ['database', 'worker', 'pages']) requireEvidenceFile(value.evidence?.metadata?.[name]);
  requireCondition(value.observations?.worker?.status === 200 && value.observations.worker.release === value.candidate_sha &&
    value.observations.worker.maintenance_mode === 'off' && value.observations.proxy?.status === 200 &&
    value.observations.proxy.release === value.candidate_sha && typeof value.pages_deployment_id === 'string', 'Actual runtime/proxy observations required');
}

/** Same evidence chain in the CLI's consumer and E2E. read() must verify each file's SHA256. */
export function requireDeploymentReceiptChain(receipt: any, pages: string, read: (file: EvidenceFile) => any): void {
  requireDeploymentReceipt(receipt, pages);
  const original = read(receipt.publication.receipt), authorization = read(receipt.publication.authorization);
  requireCondition(original.schema === 'learning-cohort-remote-receipt-v1' && original.kind === 'post-operation-verification' &&
    ['publish', 'verify'].includes(original.operation) && original.passed === true && original.state === 'published' && original.target?.scope === 'preview' &&
    original.production_writes === false && original.candidate_sha === receipt.publication.candidate_sha &&
    original.releases === 5 && original.questions === 600 && original.lessons === 220 &&
    original.authorization_sha256 === receipt.publication.authorization.sha256 && original.target.database === receipt.target.database &&
    original.target.worker === receipt.target.worker && original.target.pages === receipt.publication.target.pages &&
    JSON.stringify(original.cohort_hashes) === JSON.stringify(receipt.cohort_hashes) && JSON.stringify(original.release_ids) === JSON.stringify(receipt.release_ids) &&
    authorization.candidate_sha === original.candidate_sha && authorization.kind === 'publication-authorization' &&
    authorization.schema === 'learning-cohort-publication-authorization-v1' && authorization.phase === 'preview' &&
    authorization.target?.phase === 'preview' && authorization.target.database === original.target.database &&
    authorization.target.worker === original.target.worker && authorization.target.pages === original.target.pages &&
    JSON.stringify(authorization.cohort_hashes) === JSON.stringify(receipt.cohort_hashes) &&
    JSON.stringify(authorization.release_ids) === JSON.stringify(receipt.release_ids), 'Original publication chain mismatch');
  const local = read(receipt.evidence.current_local_summary);
  requireCondition(local.schema === 'learning-cohort-local-summary-v1' && local.passed === true && local.exit_code === 0 && local.remote_writes === 0 &&
    local.candidate_sha === receipt.candidate_sha && JSON.stringify(local.cohort_hashes) === JSON.stringify(receipt.cohort_hashes), 'Current deployment local proof mismatch');
  const proofs = { database: read(receipt.evidence.metadata.database), worker: read(receipt.evidence.metadata.worker), pages: read(receipt.evidence.metadata.pages) };
  const metadata = requireDeploymentMetadata(receipt.target, receipt.candidate_sha, proofs);
  requireCondition(metadata.pages_deployment_id === receipt.pages_deployment_id && metadata.cloudflare_account === receipt.cloudflare_account, 'Deployment metadata identity changed');
}
