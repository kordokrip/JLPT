import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { sha256 } from './learning-path-v4-freeze.js';
import { REVIEWED_V7, PHASE_GATES, loadReviewedV7, type ReleaseTarget } from './learning-path-reviewed-release.js';
import { defaultPreview160V3Paths, validatePreview160V3 } from './preview160-v3-quality.js';
import { buildContentSeedPlan } from '../seed/content-manifest.js';
import { applyLearningPathV4DraftStage } from '../seed/learning-path-v4-draft.js';
import { buildReviewedLearningReleaseControlPlan } from './learning-path-reviewed-publish.js';
import { LEARNING_COHORT_ID, LEARNING_COHORT_RELEASE_IDS, LEARNING_COHORT_HASHES, AUTH_GATES, loadLearningCohort, buildLearningCohortStagePlan, buildLearningCohortControlPlan, applyLearningCohortPublication, verifyLearningCohort, learningCohortWithdrawSql, type CohortTarget } from './learning-cohort-release.js';

const target:CohortTarget={phase:'local',database:':memory:unit-test-only',worker:'unit-test-only',pages:'unit-test-only',candidateSha:'1'.repeat(40)};
const v7Target:ReleaseTarget={phase:target.phase,database:target.database,worker:target.worker,pages:target.pages};
function fixture() {
  // Synthetic gate records only for control-flow regression. These are NOT executed release evidence.
  const root=mkdtempSync(join(tmpdir(),'cohort600-unit-only-'));
  const write=(name:string,v:unknown)=>{const path=join(root,name);writeFileSync(path,JSON.stringify(v));return path;};
  const artifact=(path:string)=>({path,sha256:sha256(readFileSync(path))});
  const cohort=fileURLToPath(new URL('../content/learning-path-v7-2026-10-11/frozen-cohort-01/',import.meta.url));
  const reviewA=fileURLToPath(new URL('../content/reviews/learning-path-v7-full-reviewer-a-cohort01-2026-10-11.json',import.meta.url));
  const reviewB=fileURLToPath(new URL('../content/reviews/learning-path-v7-full-reviewer-b-cohort01-2026-10-11.json',import.meta.url));
  const v7=loadReviewedV7({cohort,reviewA,reviewB});
  const readiness=write('synthetic-readiness.json',v7.readiness);
  const reviews=write('synthetic-v7-review-index.json',{schema:'learning-path-reviewed-review-index-v1',draft_sha256:REVIEWED_V7.draft,reviews:v7.artifacts.reviews});
  const log=write('synthetic-log.json',{warning:'UNIT TEST ONLY - no command executed'});
  const source:Record<string,string>={source_intake:v7.artifacts.source.path,self_authorship:v7.artifacts.bundle.path,quality_validator:readiness,independent_review:reviews};
  const scopes={audio:'mock',family:'not-observed',human_audible:false};
  const attestation={operator:'UNIT TEST ONLY',recorded_at:'2026-10-13T00:00:00Z',exact_cohort_and_logs_verified:true};
  const record=(name:string,path=log)=>({passed:true,exit_code:0,command:'synthetic unit test only',artifact:path,sha256:artifact(path).sha256,...(['google_only_audio','audio_guard'].includes(name)?{provider:'google-browser',r2_pronunciation_references:0,legacy_audio_requests:0}:{})});
  const report={schema:'learning-path-reviewed-release-report-v1',passed:true,publication_gate_evidence:true,evidence_scope:'actual-command-logs-and-operator-attestation',phase:'local',release_id:REVIEWED_V7.group,release_ids:REVIEWED_V7.releases,cohort:{draft_sha256:REVIEWED_V7.draft,source_evidence_sha256:REVIEWED_V7.source,concept_inventory_sha256:REVIEWED_V7.inventory,review_sha256:REVIEWED_V7.reviews},deployment:{database:target.database,worker:target.worker,pages:target.pages},operator_attestation:attestation,proof_scopes:scopes,gates:Object.fromEntries(PHASE_GATES.local.map(n=>[n,record(n,source[n]??log)]))};
  const releaseReport=write('synthetic-v7-local-report.json',report);
  const v3=defaultPreview160V3Paths(),q=validatePreview160V3(v3);
  const v3Quality=write('synthetic-v3-quality.json',q);
  const v3Reviews=write('synthetic-v3-review-index.json',{schema:'preview160-v3-review-index-v1',reviews:[artifact(v3.reviewA),artifact(v3.reviewB)]});
  const authorization={schema:'learning-cohort-publication-authorization-v1',kind:'publication-authorization',cohort_id:LEARNING_COHORT_ID,release_ids:LEARNING_COHORT_RELEASE_IDS,phase:'local',target:v7Target,candidate_sha:target.candidateSha,cohort_hashes:LEARNING_COHORT_HASHES,passed:true,publication_gate_evidence:true,prerequisites:{v7_local:artifact(releaseReport),v3_quality:artifact(v3Quality),v3_reviews:artifact(v3Reviews)},operator_attestation:attestation,proof_scopes:scopes,gates:Object.fromEntries(AUTH_GATES.local.map(n=>[n,record(n)]))};
  const paths={v7:{cohort,reviewA,reviewB,readiness,reviews,releaseReport},v7Target,v3,v3Quality,v3Reviews,authorization:write('synthetic-authorization.json',authorization)};
  return {paths,authorization,write};
}
function database(last=31) {
  const db=new DatabaseSync(':memory:');
  const dir=new URL('../../drizzle-v2/',import.meta.url);
  for (const name of readdirSync(dir).filter(n=>/^00\d\d_.*\.sql$/.test(n)&&Number(n.slice(0,4))<=last).sort()) db.exec(readFileSync(new URL(name,dir),'utf8').replaceAll('--> statement-breakpoint',''));
  db.exec(buildContentSeedPlan().statements.join('\n'));return db;
}
const n=(db:DatabaseSync,sql:string)=>Number(db.prepare(sql).get()!.n);
const ids=LEARNING_COHORT_RELEASE_IDS.map(id=>`'${id}'`).join(',');
const publicCount=(db:DatabaseSync)=>n(db,`SELECT count(*) n FROM content_releases WHERE id IN (${ids}) AND release_state='published'`);

test('authorization binds five actual frozen/review inputs, target candidate and command bytes; receipts cannot authorize',()=>{
  const f=fixture();assert.equal(loadLearningCohort(f.paths,target).v3.counts.total,160);
  for (const mutate of [
    (r:any)=>{r.candidate_sha='2'.repeat(40);},(r:any)=>{r.kind='verification-receipt';},
    (r:any)=>{r.release_ids.pop();},(r:any)=>{r.cohort_hashes.v3.draft='0'.repeat(64);},
    (r:any)=>{r.publication_gate_evidence=false;},(r:any)=>{delete r.gates.local_gates;},
    (r:any)=>{r.gates.audio_guard.sha256='0'.repeat(64);},(r:any)=>{r.phase='preview';},
    (r:any)=>{r.target.database='wrong';},(r:any)=>{r.prerequisites.v3_reviews.sha256='0'.repeat(64);},
  ]) {const bad=structuredClone(f.authorization);mutate(bad);assert.throws(()=>loadLearningCohort({...f.paths,authorization:f.write('negative.json',bad)},target));}
});

test('native coordinator publishes 600 questions/220 lessons atomically, idempotent verification, reseed and all-five withdrawal preserve learners',()=>{
  const f=fixture(),db=database();
  try {
    db.exec("INSERT INTO srs_cards(user_id,item_type,item_id,state,stability,difficulty,due_at,reps) VALUES('owner','vocab',1,'review',9,4,2,3); INSERT INTO review_logs(card_id,rating) VALUES((SELECT max(id) FROM srs_cards),'good')");
    const snapshot=()=>['srs_cards','review_logs'].map(t=>JSON.stringify(db.prepare(`SELECT * FROM ${t}`).all()));const saved=snapshot();
    const plan=buildLearningCohortStagePlan(db,f.paths,target);
    assert.equal(n(db,`SELECT count(*) n FROM content_releases WHERE id IN (${ids})`),0,'planning is rolled back');
    assert(!plan.statements.some(s=>/^\s*(BEGIN|COMMIT)/i.test(s)));
    db.exec(plan.statements.slice(0,20).join('\n'));assert.equal(publicCount(db),0,'interrupted stage stays hidden');
    assert.throws(()=>db.exec(`UPDATE content_releases SET release_state='published' WHERE id='${LEARNING_COHORT_RELEASE_IDS[0]}'`),/coordinator preparation/,'missing fifth release cannot publish the coordinator');
    db.exec(buildLearningCohortStagePlan(db,f.paths,target).statements.join('\n'));
    // Planning and actual import need not share a clock tick; operational times
    // are deliberately excluded from seals, unlike all question semantics.
    db.exec("UPDATE jlpt_practice_questions SET created_at=created_at+100,updated_at=updated_at+100 WHERE bank_version='lp7-2026-10-11'");
    db.exec(buildLearningCohortStagePlan(db,f.paths,target).statements.join('\n'));
    assert.equal(verifyLearningCohort(db,f.paths,target,'draft').questions,600);
    db.exec(learningCohortWithdrawSql());assert.equal(n(db,`SELECT count(*) n FROM content_releases WHERE id IN (${ids}) AND release_state='draft'`),5);
    assert.equal(applyLearningCohortPublication(db,f.paths,target).idempotent,false);
    assert.equal(publicCount(db),5);
    assert.equal(applyLearningCohortPublication(db,f.paths,target).idempotent,true);
    assert.throws(()=>db.exec(`UPDATE content_releases SET release_state='withdrawn' WHERE id='${LEARNING_COHORT_RELEASE_IDS[2]}'`),/coordinator withdrawal/);
    assert.equal(publicCount(db),5);
    db.exec(buildContentSeedPlan().statements.join('\n'));verifyLearningCohort(db,f.paths,target);
    db.exec(learningCohortWithdrawSql());assert.equal(publicCount(db),0);
    assert.equal(verifyLearningCohort(db,f.paths,target,'withdrawn').quality_links,600);
    db.exec(learningCohortWithdrawSql());assert.deepEqual(snapshot(),saved);
  } finally {db.close();}
});

test('after preparation every partial/semantic/evidence mutation fails the one publication statement with no visibility',async t=>{
  const f=fixture(),db=database();
  try {
    db.exec(buildLearningCohortStagePlan(db,f.paths,target).statements.join('\n'));
    const plan=buildLearningCohortControlPlan(db,f.paths,target);db.exec(plan.statements.join('\n'));
    assert(Buffer.byteLength(plan.publishSql)<100_000,'bound visibility statement fits D1 SQL length limit');
    assert.deepEqual(buildLearningCohortStagePlan(db,f.paths,target).statements,[],'prepared retry verifies, does not demote or reseed');
    const v3="LIKE 'preview160-v3-2026-10-12%'";
    const corruptions=[
      ['missing fifth approval',`UPDATE content_releases SET release_state='withdrawn' WHERE id='${LEARNING_COHORT_RELEASE_IDS[4]}'`],
      ['V3 JLPT prompt',`UPDATE jlpt_practice_questions SET prompt_ko='tampered' WHERE id=(SELECT min(id) FROM jlpt_practice_questions WHERE bank_version ${v3})`],
      ['V3 TOPIK answer',"UPDATE topik_owner_authored_curriculum_items SET answer_json='{}' WHERE id=(SELECT min(id) FROM topik_owner_authored_curriculum_items WHERE source_asset_id='preview160-v3-2026-10-12-source')"],
      ['V3 TOPIK unit',"UPDATE topik_owner_authored_curriculum_units SET title_ja='tampered' WHERE id=(SELECT min(id) FROM topik_owner_authored_curriculum_units WHERE source_asset_id='preview160-v3-2026-10-12-source')"],
      ['V3 TOPIK audio',"UPDATE topik_owner_authored_curriculum_items SET audio_text_ko='tampered' WHERE id=(SELECT min(id) FROM topik_owner_authored_curriculum_items WHERE source_asset_id='preview160-v3-2026-10-12-source' AND audio_required=1)"],
      ['V7 cue',"UPDATE learning_lesson_entries SET cue_ko='tampered' WHERE rowid=(SELECT min(rowid) FROM learning_lesson_entries)"],
      ['missing G4',`DELETE FROM content_release_gate_evidence WHERE release_id='${LEARNING_COHORT_RELEASE_IDS[4]}' AND gate='G4'`],
      ['different G4',`UPDATE content_release_gate_evidence SET artifact_sha256='${'0'.repeat(64)}' WHERE release_id='${LEARNING_COHORT_RELEASE_IDS[4]}' AND gate='G4'`],
      ['V3 source binding',`UPDATE content_release_sources SET attribution_text='{}' WHERE release_id='${LEARNING_COHORT_RELEASE_IDS[4]}'`],
      ['V3 missing job',`DELETE FROM content_release_jobs WHERE release_id='${LEARNING_COHORT_RELEASE_IDS[4]}' AND job_kind='qa'`],
      ['V3 wrong signed reviewer',`UPDATE content_quality_audits SET author_reviewer='not-the-actual-reviewer' WHERE id=(SELECT audit_id FROM content_release_quality_audit_links WHERE release_id='${LEARNING_COHORT_RELEASE_IDS[4]}' LIMIT 1)`],
      ['unlinked same-bank JLPT row',`INSERT INTO jlpt_practice_questions(id,learning_track,level,mode,skill,difficulty,prompt_ko,prompt_ja,prompt_en,choices_json,answer_index,explanation_ko,explanation_ja,explanation_en,audio_script_ja,source_code,source_evidence_sha256,bank_version,is_published) SELECT 'unlinked-evil-row',learning_track,level,mode,skill,difficulty,prompt_ko,prompt_ja||'unlinked',prompt_en,choices_json,answer_index,explanation_ko,explanation_ja,explanation_en,audio_script_ja,source_code,source_evidence_sha256,bank_version,0 FROM jlpt_practice_questions WHERE bank_version ${v3} LIMIT 1`],
      ['changed candidate SHA',`UPDATE content_release_sources SET attribution_text=json_set(attribution_text,'$.candidate_sha','${'2'.repeat(40)}') WHERE release_id='${LEARNING_COHORT_RELEASE_IDS[4]}'`],
      ['changed authorization phase',`UPDATE content_release_sources SET attribution_text=json_set(attribution_text,'$.phase','production-predeploy') WHERE release_id='${LEARNING_COHORT_RELEASE_IDS[4]}'`],
      ['changed deployment target',`UPDATE content_release_sources SET attribution_text=json_set(attribution_text,'$.deployment.database','WRONG-DB') WHERE release_id='${LEARNING_COHORT_RELEASE_IDS[4]}'`],
      ['changed G4 artifact key',`UPDATE content_release_gate_evidence SET artifact_key='evidence/wrong' WHERE release_id='${LEARNING_COHORT_RELEASE_IDS[4]}' AND gate='G4'`],
      ['changed job idempotency',`UPDATE content_release_jobs SET idempotency_key=idempotency_key||':tampered' WHERE release_id='${LEARNING_COHORT_RELEASE_IDS[4]}' AND job_kind='qa'`],
    ];
    for (const [name,sql] of corruptions) await t.test(name!,()=>{
      db.exec('SAVEPOINT mutation');
      try { if(name==='missing fifth approval') assert.throws(()=>db.exec(sql!)); else {db.exec(sql!);assert.throws(()=>db.exec(plan.publishSql));}
        assert.equal(publicCount(db),0);assert.equal(n(db,"SELECT count(*) n FROM learning_lessons WHERE is_published=1"),0);
        assert.equal(n(db,`SELECT count(*) n FROM jlpt_practice_questions WHERE bank_version IN (SELECT content_version FROM content_releases WHERE id IN (${ids})) AND is_published=1`),0);
      } finally {db.exec('ROLLBACK TO mutation; RELEASE mutation');}
    });
    for(const id of LEARNING_COHORT_RELEASE_IDS.slice(1)) assert.throws(()=>db.exec(`UPDATE content_releases SET release_state='published' WHERE id='${id}'`),/coordinator/);
    assert.throws(()=>db.exec(`UPDATE content_releases SET publication_cohort_id=NULL WHERE id='${LEARNING_COHORT_RELEASE_IDS[0]}'`),/immutable/);
    db.exec(`INSERT OR REPLACE INTO content_releases(id,learning_track,content_version,release_state,manifest_sha256,parser_version) VALUES('${LEARNING_COHORT_RELEASE_IDS[2]}','jlpt-ja','replacement','draft','${'0'.repeat(64)}','replacement')`);
    assert.equal(db.prepare('SELECT publication_cohort_id,release_state FROM content_releases WHERE id=?').get(LEARNING_COHORT_RELEASE_IDS[2]!)!.release_state,'approved','REPLACE cannot erase an opted-in release');
    assert.throws(()=>db.exec(`DELETE FROM content_release_quality_audit_links WHERE release_id='${LEARNING_COHORT_RELEASE_IDS[2]}'`),/cannot be deleted/);
    db.exec(plan.publishSql);assert.equal(publicCount(db),5);
  } finally {db.close();}
});

test('first import statement enrolls existing standalone V7 drafts before a partial all-five stage',()=>{
  const f=fixture(),db=database();
  try {
    const loaded=loadReviewedV7(f.paths.v7);applyLearningPathV4DraftStage(db,loaded.input);
    const oldControl=buildReviewedLearningReleaseControlPlan(db,f.paths.v7,v7Target);
    const stage=buildLearningCohortStagePlan(db,f.paths,target);db.exec(stage.statements[0]!);
    assert.equal(n(db,`SELECT count(*) n FROM content_releases WHERE publication_cohort_id='${LEARNING_COHORT_ID}'`),2);
    db.exec(oldControl.statements.join('\n'));
    assert.throws(()=>db.exec(oldControl.publishSql),/coordinator preparation/);
    assert.equal(publicCount(db),0);
  } finally {db.close();}
});

test('Wrangler splitter applies all-five migration as complete native statements; no new table or legacy NULL regression',async()=>{
  const {unstable_splitSqlQuery}=await import('wrangler');const db=database(30);
  try {
    const before=n(db,"SELECT count(*) n FROM pragma_table_list WHERE schema='main' AND type='table' AND name NOT LIKE 'sqlite_%'");
    const sql=readFileSync(new URL('../../drizzle-v2/0031_learning_lessons.sql',import.meta.url),'utf8');
    for(const statement of unstable_splitSqlQuery(sql)) db.exec(statement);
    assert.equal(n(db,"SELECT count(*) n FROM pragma_table_list WHERE schema='main' AND type='table' AND name NOT LIKE 'sqlite_%'"),before+2,'only the two pre-existing 0031 lesson tables; cohort adds zero tables');
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
    assert.equal(n(db,"SELECT count(*) n FROM content_releases WHERE publication_cohort_id IS NOT NULL"),0);
  } finally {db.close();}
});

test('actual local Wrangler D1 executes bound coordinator SQL under runtime limits; synthetic gates are not publication evidence',()=>{
  const f=fixture(),persist=mkdtempSync(join(tmpdir(),'cohort600-d1-unit-only-'));
  const cwd=fileURLToPath(new URL('../../',import.meta.url));
  const options=['--local','--config','../../apps/api/wrangler.toml','--persist-to',persist];
  const run=(args:string[])=>execFileSync('pnpm',['exec','wrangler',...args,...options],{cwd,encoding:'utf8',env:{...process.env,CLOUDFLARE_SEND_METRICS:'false'},maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
  writeFileSync(join(persist,'migration.log'),run(['d1','migrations','apply','DB']));
  const storage=join(persist,'v3/d1/miniflare-D1DatabaseObject');
  const sqlite=readdirSync(storage).filter(n=>/^[a-f0-9]{64}\.sqlite$/.test(n));assert.equal(sqlite.length,1);
  const path=join(storage,sqlite[0]!);let db=new DatabaseSync(path);
  db.exec(buildContentSeedPlan().statements.join('\n'));
  db.exec(buildLearningCohortStagePlan(db,f.paths,target).statements.join('\n'));
  const plan=buildLearningCohortControlPlan(db,f.paths,target);db.exec(plan.statements.join('\n'));
  const victim=LEARNING_COHORT_RELEASE_IDS[4]!;
  const original=db.prepare('SELECT attribution_text FROM content_release_sources WHERE release_id=?').get(victim)!.attribution_text!;
  db.prepare("UPDATE content_release_sources SET attribution_text=json_set(attribution_text,'$.candidate_sha',?) WHERE release_id=?").run('2'.repeat(40),victim);
  const sql=join(persist,'synthetic-fixture-publish.sql');writeFileSync(sql,plan.publishSql);db.close();
  assert.throws(()=>run(['d1','execute','DB','--file',sql]),/invalid release state|CHECK|transition|constraint/i);
  db=new DatabaseSync(path);assert.equal(publicCount(db),0);
  db.prepare('UPDATE content_release_sources SET attribution_text=? WHERE release_id=?').run(original,victim);db.close();
  writeFileSync(join(persist,'synthetic-fixture-publish.log'),run(['d1','execute','DB','--file',sql]));
  db=new DatabaseSync(path);assert.equal(verifyLearningCohort(db,f.paths,target).questions,600);db.close();
  writeFileSync(join(persist,'synthetic-fixture-withdraw.log'),run(['d1','execute','DB','--command',learningCohortWithdrawSql()]));
  db=new DatabaseSync(path);assert.equal(verifyLearningCohort(db,f.paths,target,'withdrawn').quality_links,600);db.close();
});
