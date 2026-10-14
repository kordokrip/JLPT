/** Native all-five coordinator publication. No network, target selection, or synthetic approval generation. */
import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { sha256 } from './learning-path-v4-freeze.js';
import { esc } from '../seed/utils.js';
import { buildLearningPathV4DraftPlan, buildLearningPathV4LessonPlan, type Db } from '../seed/learning-path-v4-draft.js';
import { buildPreview160V3DraftPlan, PREVIEW160_V3_RELEASE_IDS } from '../seed/preview160-v3-draft.js';
import { defaultPreview160V3Paths, validatePreview160V3, PREVIEW160_V3_DRAFT_SHA256, PREVIEW160_V3_SOURCE_SHA256, PREVIEW160_V3_MANIFEST_SHA256, PREVIEW160_V3_REVIEW_A_SHA256, PREVIEW160_V3_REVIEW_B_SHA256, type Preview160Paths } from './preview160-v3-quality.js';
import { REVIEWED_V7, validateReviewedV7Evidence, type ReviewedReleasePaths, type ReleaseTarget } from './learning-path-reviewed-release.js';
import { verifyReviewedLearningContent } from './learning-path-reviewed-publish.js';

export const LEARNING_COHORT_ID = 'learning-cohort-600-2026-10-13';
export const LEARNING_COHORT_RELEASE_IDS = [...REVIEWED_V7.releases, ...Object.values(PREVIEW160_V3_RELEASE_IDS)] as const;
export const LEARNING_COHORT_HASHES = {
  v7: { bundle: REVIEWED_V7.bundle, draft: REVIEWED_V7.draft, source: REVIEWED_V7.source, inventory: REVIEWED_V7.inventory, reviews: REVIEWED_V7.reviews },
  v3: { draft: PREVIEW160_V3_DRAFT_SHA256, source: PREVIEW160_V3_SOURCE_SHA256, manifest: PREVIEW160_V3_MANIFEST_SHA256, reviews: [PREVIEW160_V3_REVIEW_A_SHA256, PREVIEW160_V3_REVIEW_B_SHA256] },
} as const;
export const AUTH_GATES = {
  local: ['local_gates','audio_guard'],
  preview: ['local_gates','target_preflight','migration_preflight','rollback_plan','audio_guard'],
  'production-predeploy': ['local_gates','target_preflight','migration_preflight','rollback_plan','audio_guard','preview_receipt','predeploy_backup','restore_drill','maintenance','family_observation','actual_audio'],
} as const;
export type CohortTarget = ReleaseTarget & { candidateSha: string };
export type LearningCohortPaths = { v7: ReviewedReleasePaths; v7Target: ReleaseTarget; v3?: Preview160Paths; v3Quality: string; v3Reviews: string; authorization: string };
type Row = Record<string, unknown>;
type Artifact = { path: string; sha256: string };
const json = JSON.stringify;
const ids = LEARNING_COHORT_RELEASE_IDS.map(esc).join(',');
const scalar = (db: Db, sql: string) => Number(db.prepare(sql).all()[0]?.n);
const value = (v: unknown) => typeof v === 'number' ? String(v) : v == null ? 'NULL' : esc(String(v));
const artifact = (path: string): Artifact => ({ path: resolve(path), sha256: sha256(readFileSync(path)) });
const readRecord = (path:string):{value:any;artifact:Artifact} => { const bytes=readFileSync(path); return {value:JSON.parse(bytes.toString('utf8')),artifact:{path:resolve(path),sha256:sha256(bytes)}}; };
function pinnedArtifact(path:string, expected:string) { const a=artifact(path);check(a.sha256===expected,'Frozen artifact bytes changed');return a; }
const stable = (v: unknown): string => json(v && typeof v === 'object' ? Array.isArray(v) ? v.map(x=>JSON.parse(stable(x))) : Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,JSON.parse(stable(x))])) : v);
const equal = (a: unknown,b: unknown) => stable(a) === stable(b);
function check(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
function exactArtifact(expected: Artifact, actual: any, label: string) {
  check(actual && actual.sha256 === expected.sha256 && typeof actual.path === 'string' && realpathSync(actual.path) === realpathSync(expected.path), `${label} artifact binding mismatch`);
  check(sha256(readFileSync(actual.path)) === expected.sha256,`${label} artifact bytes changed`);
}
function insert(db: Db, table: string, row: Row, keys: readonly string[]) {
  const old = db.prepare(`SELECT * FROM ${table} WHERE ${keys.map(k=>`${k}=?`).join(' AND ')}`).all(...keys.map(k=>row[k]))[0];
  check(!old || Object.entries(row).every(([k,v])=>old[k] === v),`Cohort collision: ${table}`);
  return `INSERT OR IGNORE INTO ${table} (${Object.keys(row).join(',')}) VALUES (${Object.values(row).map(value).join(',')});`;
}

/** Original pinned bytes are always validated, even when reusing an existing DB. */
function loadInputs(paths: LearningCohortPaths) {
  check(paths.v7Target.phase === 'local','V7 prerequisite must be the retained local report');
  const v7 = validateReviewedV7Evidence(paths.v7, paths.v7Target);
  const v3Paths = paths.v3 ?? defaultPreview160V3Paths();
  const v3 = validatePreview160V3(v3Paths);
  check(v3.passed,`V3 input validation failed: ${v3.errors.join('; ')}`);
  const qualityRecord=readRecord(paths.v3Quality),quality=qualityRecord.value;
  for (const key of ['passed','validator_version','hashes','counts','errors'] as const) check(equal(quality[key],v3[key]),`V3 quality ${key} mismatch`);
  const reviews = [pinnedArtifact(v3Paths.reviewA,PREVIEW160_V3_REVIEW_A_SHA256),pinnedArtifact(v3Paths.reviewB,PREVIEW160_V3_REVIEW_B_SHA256)];
  const indexRecord=readRecord(paths.v3Reviews),index=indexRecord.value;
  check(index.schema === 'preview160-v3-review-index-v1' && Array.isArray(index.reviews) && index.reviews.length === 2,'V3 review index shape mismatch');
  reviews.forEach((a,i)=>exactArtifact(a,index.reviews[i],`V3 review ${i}`));
  const v3Artifacts={source:pinnedArtifact(v3Paths.source,PREVIEW160_V3_SOURCE_SHA256),draft:pinnedArtifact(v3Paths.draft,PREVIEW160_V3_DRAFT_SHA256)};
  return { v7, v3, v3Paths, reviews, v3Artifacts, prerequisites: { v7_local: v7.evidence.G4!, v3_quality: qualityRecord.artifact, v3_reviews: indexRecord.artifact } };
}

export function loadLearningCohort(paths: LearningCohortPaths, target: CohortTarget) {
  const inputs = loadInputs(paths), record=readRecord(paths.authorization),authorization=record.value;
  const { candidateSha, ...deployment } = target;
  check(/^[a-f0-9]{40}$/.test(candidateSha) && authorization.candidate_sha === candidateSha,'Candidate SHA binding mismatch');
  check(authorization.schema === 'learning-cohort-publication-authorization-v1' && authorization.kind === 'publication-authorization','Publication authorization required, not a verification receipt');
  check(authorization.cohort_id === LEARNING_COHORT_ID && equal(authorization.release_ids,LEARNING_COHORT_RELEASE_IDS) && equal(authorization.cohort_hashes,LEARNING_COHORT_HASHES),'Exact five-release cohort binding required');
  check(authorization.phase === target.phase && equal(authorization.target,deployment),'Authorization target/phase mismatch');
  check(authorization.passed === true && authorization.publication_gate_evidence === true,'Failed/fixture authorization is not publication evidence');
  for (const [name,a] of Object.entries(inputs.prerequisites)) exactArtifact(a,authorization.prerequisites?.[name],name);
  const operator = authorization.operator_attestation;
  check(operator && typeof operator.operator === 'string' && operator.operator.trim() && Number.isFinite(Date.parse(operator.recorded_at)) && operator.exact_cohort_and_logs_verified === true,'Exact cohort operator attestation required');
  const scopes = authorization.proof_scopes;
  check(scopes && ['mock','actual-browser'].includes(scopes.audio) && ['not-observed','actual-family'].includes(scopes.family) && typeof scopes.human_audible === 'boolean','Explicit proof scopes required');
  if (target.phase === 'production-predeploy') check(scopes.audio === 'actual-browser' && scopes.family === 'actual-family' && scopes.human_audible === true,'Production requires actual family and audible browser evidence');
  for (const name of AUTH_GATES[target.phase]) {
    const gate = authorization.gates?.[name];
    check(gate?.passed === true && gate.exit_code === 0 && typeof gate.command === 'string' && gate.command.trim() && typeof gate.artifact === 'string' && /^[a-f0-9]{64}$/.test(gate.sha256),'Authorization gate missing/failed: '+name);
    check(sha256(readFileSync(gate.artifact)) === gate.sha256,`Authorization gate bytes changed: ${name}`);
    if (name === 'audio_guard') check(gate.provider === 'google-browser' && gate.r2_pronunciation_references === 0 && gate.legacy_audio_requests === 0,'Audio policy evidence mismatch');
  }
  return { ...inputs, authorization, authorizationArtifact: record.artifact, target };
}

/** V3 seals are authored from the immutable plan, never from an already-mutated target DB. */
export function buildLearningCohortV3DraftPlan(paths?: Preview160Paths) {
  const plan = buildPreview160V3DraftPlan(paths);
  const find = (table: string, key: string, id: unknown) => plan.rows.find(r=>r.table === table && r.value[key] === id)?.value;
  return { ...plan, rows: plan.rows.map(r=> {
    if (r.table !== 'content_release_quality_audit_links') return r;
    const audit = find('content_quality_audits','id',r.value.audit_id)!;
    const row = find(audit.learning_track === 'jlpt-ja' ? 'jlpt_practice_questions' : 'topik_owner_authored_curriculum_items','id',audit.content_id)!;
    const unit = audit.learning_track === 'topik-ko' ? find('topik_owner_authored_curriculum_units','id',row.unit_id)! : null;
    const speech = audit.learning_track === 'topik-ko' && row.audio_required === 1 ? find('content_speech_bindings','item_id',row.id)! : null;
    return { ...r, value: { ...r.value, expected_question_json: json({row,unit,speech}) } };
  }) };
}

/** Requires a writable isolated mirror. SAVEPOINT changes are rolled back; returned SQL contains no transaction statements. */
export function buildLearningCohortStagePlan(db: Db, paths: LearningCohortPaths, _target?: CohortTarget) {
  const input = loadInputs(paths), statements: string[] = [];
  const counts = { releases:5,questions:600,lessons:220,entries:880,quality_links:600,speech:56 };
  // A failed file import can leave a complete cohort partway through control
  // preparation. Verify it without demoting lifecycle or rewriting signed rows.
  if (scalar(db,`SELECT count(*) n FROM content_releases WHERE id IN (${ids}) AND release_state<>'draft'`)>0) {
    verifyContent(db,paths,input,'draft'); return {statements,counts};
  }
  db.exec('SAVEPOINT learning_cohort_plan');
  try {
    const append = (sql: string) => {
      // New V7 release rows opt into coordinator protection in their own INSERT,
      // including when a remote file import stops before the remaining releases.
      if (sql.startsWith('INSERT OR IGNORE INTO content_releases (')) sql=sql.replace(') VALUES (',',publication_cohort_id) VALUES (').replace(/\);$/,`,${esc(LEARNING_COHORT_ID)});`);
      db.exec(sql); statements.push(sql);
    };
    // Existing standalone V7 drafts must opt in before any resumable import
    // prefix; leaving this until the end would retain their two-release path.
    append(`UPDATE content_releases SET publication_cohort_id=${esc(LEARNING_COHORT_ID)} WHERE id IN (${ids}) AND release_state='draft' AND publication_cohort_id IS NULL;`);
    for (const sql of buildLearningPathV4DraftPlan(db,input.v7.input).statements) append(sql);
    for (const sql of buildLearningPathV4LessonPlan(db,input.v7.input).statements) append(sql);
    for (const row of buildLearningCohortV3DraftPlan(paths.v3).rows) append(insert(db,row.table,row.value,row.key));
    append(`UPDATE content_releases SET publication_cohort_id=${esc(LEARNING_COHORT_ID)} WHERE id IN (${ids}) AND release_state='draft' AND publication_cohort_id IS NULL;`);
    check(scalar(db,`SELECT count(*) n FROM content_releases WHERE id IN (${ids}) AND publication_cohort_id=${esc(LEARNING_COHORT_ID)} AND release_state='draft'`) === 5,'Stage requires all five exact draft releases');
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Cohort stage FK failure');
    return { statements, counts };
  } finally { db.exec('ROLLBACK TO learning_cohort_plan; RELEASE learning_cohort_plan'); }
}

export function applyLearningCohortStage(db: Db, paths: LearningCohortPaths, target?: CohortTarget) {
  if (target) check(target.phase === 'local','Native apply only accepts local phase');
  db.exec('BEGIN IMMEDIATE');
  try { const plan=buildLearningCohortStagePlan(db,paths,target); db.exec(plan.statements.join('\n')); db.exec('COMMIT'); return plan; }
  catch(error) { db.exec('ROLLBACK'); throw error; }
}

const jobs = { ingest:'G0', validate:'G2', ai_draft:'G1', qa:'G2', human_approval:'G3', preview_candidate:'G4' } as const;
const artifactKey = (gate: string, hash: string) => `evidence/report/${LEARNING_COHORT_ID}/${gate}/${hash}/artifact.json`;
function controls(loaded: ReturnType<typeof loadLearningCohort>) {
  const { v7,v3,v3Paths,reviews,authorizationArtifact,target,authorization }=loaded;
  const { candidateSha, ...deployment } = target;
  return LEARNING_COHORT_RELEASE_IDS.map((id,index)=> {
    const isV7=index<2, source=isV7 ? REVIEWED_V7.source : PREVIEW160_V3_SOURCE_SHA256;
    const artifacts: Record<string,Artifact> = isV7 ? {...v7.evidence,G4:authorizationArtifact} : {G0:loaded.v3Artifacts.source,G1:loaded.v3Artifacts.draft,G2:loaded.prerequisites.v3_quality,G3:loaded.prerequisites.v3_reviews,G4:authorizationArtifact};
    const metadata = { schema:isV7 ? 'learning-path-v7-evidence-binding-v1' : 'preview160-v3-evidence-binding-v1', phase:target.phase, deployment, candidate_sha:candidateSha, publication_cohort_id:LEARNING_COHORT_ID, artifacts, reviews:isV7?v7.artifacts.reviews:reviews,
      ...(isV7 ? {inventory:v7.artifacts.inventory,draft_sha256:REVIEWED_V7.draft,source_evidence_sha256:REVIEWED_V7.source,concept_inventory_sha256:REVIEWED_V7.inventory} : {draft_sha256:PREVIEW160_V3_DRAFT_SHA256,source_evidence_sha256:source,manifest_sha256:PREVIEW160_V3_MANIFEST_SHA256}), proof_scopes:authorization.proof_scopes };
    const reviewer = isV7 ? v7.input.reviews : v3.reviews;
    const date=isV7?'2026-10-11':'2026-10-12', group=isV7?REVIEWED_V7.group:'preview160-v3-2026-10-12';
    return {id,artifacts,manifest:isV7?REVIEWED_V7.draft:PREVIEW160_V3_MANIFEST_SHA256,source:{release_id:id,source_code:group,source_type:'self-authored',source_url:`https://github.com/kordokrip/JLPT/tree/main/packages/db/src/content/${group}`,retrieved_at:date,source_sha256:source,license_id:'LicenseRef-self-authored',license_url:'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md',allowed_use:'self-authored personal learning; not official exam content',attribution_text:json(metadata),author:'JLPT-TOPIK independent item author',first_reviewer:reviewer[0]!.reviewer_id,second_reviewer:reviewer[1]!.reviewer_id,reviewed_at:date,first_review_status:'signed',first_reviewed_at:date,second_review_status:'signed',second_reviewed_at:date}};
  });
}

type ControlRecord = {table:string;value:Row;key:readonly string[]};
function controlRecords(loaded:ReturnType<typeof loadLearningCohort>):ControlRecord[] {
  const records:ControlRecord[]=[];
  for(const c of controls(loaded)) {
    records.push({table:'content_release_sources',value:c.source,key:['release_id','source_code']});
    for(const [kind,gate] of Object.entries(jobs)) { const a=c.artifacts[gate]!;records.push({table:'content_release_jobs',value:{id:`${c.id}-${kind}`,release_id:c.id,job_kind:kind,job_state:'succeeded',artifact_key:artifactKey(gate,a.sha256),artifact_sha256:a.sha256,idempotency_key:`crcp:v1:${c.id}:${kind}:${a.sha256}`,queue_attempts:1},key:['id']}); }
    for(const [gate,a] of Object.entries(c.artifacts)) records.push({table:'content_release_gate_evidence',value:{release_id:c.id,gate,gate_state:'passed',artifact_key:artifactKey(gate,a.sha256),artifact_sha256:a.sha256,recorded_by:gate==='G3'||gate==='G4'?'operator':'system'},key:['release_id','gate']});
    records.push({table:'content_release_preview_candidates',value:{id:`${c.id}-preview`,release_id:c.id,candidate_state:'ready',manifest_key:`evidence/manifest/${LEARNING_COHORT_ID}/${c.manifest}/artifact.json`,manifest_sha256:c.manifest,ready_at:Math.floor(Date.parse(loaded.authorization.operator_attestation.recorded_at)/1000)},key:['id']});
  }
  return records;
}
/** The visibility statement carries exact, independently validated expectations.
 * Self-consistent but changed DB metadata cannot authorize a different SHA/target.
 * IIF's invalid state deliberately raises existing lifecycle/CHECK guards, not a
 * silent zero-row WHERE result. JSON rowsets keep D1 expression depth bounded. */
function learningCohortPublishSql(records:readonly ControlRecord[]) {
  const predicates=[...new Set(records.map(r=>r.table))].map(table=>{
    const rows=records.filter(r=>r.table===table).map(r=>r.value);
    const matches=Object.keys(rows[0]!).map(k=>`a.${k} IS json_extract(e.value,'$.${k}')`).join(' AND ');
    return `((SELECT count(*) FROM json_each(${esc(json(rows))}) e JOIN ${table} a ON (${matches}))=${rows.length} AND (SELECT count(*) FROM ${table} WHERE release_id IN (${ids}))=${rows.length})`;
  }).join(' AND ');
  return `UPDATE content_releases SET release_state=iif((${predicates}),'published','INVALID_COHORT_EVIDENCE'),published_at=COALESCE(published_at,unixepoch()) WHERE id=${esc(REVIEWED_V7.releases[0])} AND publication_cohort_id=${esc(LEARNING_COHORT_ID)} AND release_state='approved';`;
}
export function learningCohortWithdrawSql() { return `UPDATE content_releases SET release_state='withdrawn',withdrawn_at=unixepoch() WHERE id=${esc(REVIEWED_V7.releases[0])} AND publication_cohort_id=${esc(LEARNING_COHORT_ID)} AND release_state='published';`; }

function verifyContent(db: Db, paths: LearningCohortPaths, loaded: ReturnType<typeof loadInputs>, state: 'draft'|'published'|'withdrawn') {
  verifyReviewedLearningContent(db,loaded.v7,state);
  for (const r of buildLearningCohortV3DraftPlan(paths.v3).rows) {
    const old = db.prepare(`SELECT * FROM ${r.table} WHERE ${r.key.map(k=>`${k}=?`).join(' AND ')}`).all(...r.key.map(k=>r.value[k]))[0];
    check(old,`Missing V3 row: ${r.table}`);
    const normalized={...old};
    if (r.table==='content_releases') normalized.release_state='draft';
    if (r.table==='content_quality_audits') normalized.release_state='approved';
    if (r.table==='jlpt_practice_questions') normalized.is_published=0;
    check(Object.entries(r.value).every(([k,v])=>normalized[k]===v),`V3 semantic collision: ${r.table}`);
  }
  const expectedState = state === 'draft' ? "IN ('draft','automated_checked','human_reviewed','preview','approved')" : `=${esc(state)}`;
  check(scalar(db,`SELECT count(*) n FROM content_releases WHERE id IN (${ids}) AND publication_cohort_id=${esc(LEARNING_COHORT_ID)} AND release_state ${expectedState}`)===5,'Five-release lifecycle mismatch');
  check(scalar(db,`SELECT count(*) n FROM content_release_quality_audit_links WHERE release_id IN (${ids})`)===600,'600 exact quality links required');
  const v3ids=Object.values(PREVIEW160_V3_RELEASE_IDS).map(esc).join(',');
  check(scalar(db,`SELECT count(*) n FROM jlpt_practice_questions WHERE bank_version IN (SELECT content_version FROM content_releases WHERE id IN (${v3ids}))`)===120,'V3 total question count mismatch');
  for (const table of ['topik_owner_authored_curriculum_items','topik_owner_authored_curriculum_units']) check(scalar(db,`SELECT count(*) n FROM ${table} WHERE source_asset_id='preview160-v3-2026-10-12-source'`)===40,'V3 total TOPIK count mismatch');
  check(scalar(db,`SELECT count(*) n FROM content_speech_bindings s JOIN content_quality_audits a ON a.content_id=s.item_id JOIN content_release_quality_audit_links q ON q.audit_id=a.id WHERE q.release_id IN (${v3ids})`)===8,'V3 speech count mismatch');
  check(scalar(db,`SELECT count(*) n FROM content_audio_bindings s JOIN content_quality_audits a ON a.content_id=s.item_id JOIN content_release_quality_audit_links q ON q.audit_id=a.id WHERE q.release_id IN (${v3ids})`)===0,'V3 legacy audio forbidden');
  check(scalar(db,`SELECT count(*) n FROM content_quality_audits a JOIN content_release_quality_audit_links q ON a.id=q.audit_id WHERE q.release_id IN (${v3ids}) AND a.release_state=${esc(state==='draft'?'approved':state)}`)===160,'V3 audit state mismatch');
  check(scalar(db,`SELECT count(*) n FROM jlpt_practice_questions WHERE bank_version IN (SELECT content_version FROM content_releases WHERE id IN (${v3ids})) AND is_published=${state==='published'?1:0}`)===120,'V3 question visibility mismatch');
  check(db.prepare('PRAGMA foreign_key_check').all().length===0,'Cohort FK failure');
  return {releases:5,questions:600,lessons:220,entries:880,quality_links:600,speech:56,state};
}

export function buildLearningCohortControlPlan(db: Db, paths: LearningCohortPaths, target: CohortTarget) {
  const loaded=loadLearningCohort(paths,target); verifyContent(db,paths,loaded,'draft');
  const statements:string[]=[],records=controlRecords(loaded);
  for(const r of records.filter(r=>r.table!=='content_release_preview_candidates')) statements.push(insert(db,r.table,r.value,r.key));
  for (const [from,to] of [['draft','automated_checked'],['automated_checked','human_reviewed'],['human_reviewed','preview'],['preview','approved']]) statements.push(`UPDATE content_releases SET release_state=${esc(to!)} WHERE id IN (${ids}) AND publication_cohort_id=${esc(LEARNING_COHORT_ID)} AND release_state=${esc(from!)};`);
  for(const r of records.filter(r=>r.table==='content_release_preview_candidates')) statements.push(insert(db,r.table,r.value,r.key));
  return {statements,publishSql:learningCohortPublishSql(records),withdrawSql:learningCohortWithdrawSql(),evidence:loaded};
}

export function verifyLearningCohort(db: Db, paths: LearningCohortPaths, target: CohortTarget, state: 'draft'|'published'|'withdrawn'='published') {
  const loaded = state === 'draft' ? loadInputs(paths) : loadLearningCohort(paths,target);
  const counts=verifyContent(db,paths,loaded,state);
  if(state!=='draft') for(const r of controlRecords(loaded as ReturnType<typeof loadLearningCohort>)) {
    const rows=db.prepare(`SELECT * FROM ${r.table} WHERE ${r.key.map(k=>`${k}=?`).join(' AND ')}`).all(...r.key.map(k=>r.value[k]));
    check(rows.length===1 && Object.entries(r.value).every(([k,v])=>rows[0]![k]===v),`Published exact control binding mismatch: ${r.table}`);
  }
  if (state !== 'draft') for (const c of controls(loaded as ReturnType<typeof loadLearningCohort>)) {
    const source=db.prepare('SELECT * FROM content_release_sources WHERE release_id=?').all(c.id);
    check(source.length===1 && Object.entries(c.source).every(([k,v])=>source[0]![k]===v),'Published source binding mismatch');
    const gates=db.prepare('SELECT * FROM content_release_gate_evidence WHERE release_id=?').all(c.id);
    check(gates.length===5 && Object.entries(c.artifacts).every(([gate,a])=>gates.some(g=>g.gate===gate && g.gate_state==='passed' && g.artifact_sha256===a.sha256 && g.artifact_key===artifactKey(gate,a.sha256))),'Published G0-G4 mismatch');
    const records=db.prepare('SELECT * FROM content_release_jobs WHERE release_id=?').all(c.id);
    check(records.length===6 && Object.entries(jobs).every(([kind,gate])=>records.some(j=>j.job_kind===kind && j.job_state==='succeeded' && j.artifact_sha256===c.artifacts[gate]!.sha256 && j.artifact_key===artifactKey(gate,c.artifacts[gate]!.sha256))),'Published six-job evidence mismatch');
    const candidates=db.prepare('SELECT * FROM content_release_preview_candidates WHERE release_id=?').all(c.id);
    check(candidates.length===1 && candidates[0]!.candidate_state==='ready' && candidates[0]!.manifest_sha256===c.manifest,'Published preview manifest mismatch');
  }
  return {...counts,cohort_id:LEARNING_COHORT_ID,phase:target.phase,remote_writes:0};
}

export function applyLearningCohortPublication(db: Db, paths: LearningCohortPaths, target: CohortTarget) {
  check(target.phase==='local','Native apply only accepts local phase');
  db.exec('BEGIN IMMEDIATE');
  try {
    const already=scalar(db,`SELECT count(*) n FROM content_releases WHERE id IN (${ids}) AND release_state='published'`)===5;
    if (!already) {const plan=buildLearningCohortControlPlan(db,paths,target);db.exec(plan.statements.join('\n'));db.exec(plan.publishSql);}
    const result=verifyLearningCohort(db,paths,target);db.exec('COMMIT');return {...result,idempotent:already};
  } catch(error) {db.exec('ROLLBACK');throw error;}
}
