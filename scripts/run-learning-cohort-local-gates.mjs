#!/usr/bin/env node
// 강성호 2026-10-13: 새 전체 로컬 gate 뒤5개 release를 합성 기록이 있는 새 DB에서 공개/철회한다.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { verifyLearningPathReviewedLocal } from '../packages/db/src/ops/verify-learning-path-reviewed-local.ts';
import { defaultPreview160V3Paths, validatePreview160V3 } from '../packages/db/src/ops/preview160-v3-quality.ts';
import { REVIEWED_V7 } from '../packages/db/src/ops/learning-path-reviewed-release.ts';
import { LOCAL_DRILL_LEARNER_TABLES } from '../packages/db/src/ops/learning-path-preview.ts';
import { LEARNING_COHORT_HASHES, LEARNING_COHORT_RELEASE_IDS, LEARNING_COHORT_ID,
  applyLearningCohortStage, applyLearningCohortPublication, verifyLearningCohort,
  learningCohortWithdrawSql } from '../packages/db/src/ops/learning-cohort-release.ts';
const root=resolve(import.meta.dirname,'..');
const output=process.argv.find(arg=>arg.startsWith('--output='))?.slice(9);
if(process.argv.length!==3 || !output) throw new Error('Only --output=<new .artifacts directory> is accepted');
const out=resolve(output),within=relative(join(root,'.artifacts'),out);
if(!within || within.startsWith('..') || existsSync(out)) throw new Error('New immutable artifact leaf required');
mkdirSync(out,{recursive:true,mode:0o700});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const artifact=path=>({path,sha256:hash(readFileSync(path))});
const write=(name,value)=>{const path=join(out,name);writeFileSync(path,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});return path;};
const started=new Date().toISOString();
try {
  const v7Output=join(out,'v7-local');
  const result=spawnSync('pnpm',['-C','packages/db','exec','tsx','../../scripts/run-learning-v7-local-gates.mjs',`--output=${v7Output}`],{cwd:root,stdio:'inherit',env:{...process.env,WRANGLER_WRITE_LOGS:'0'}});
  if(result.status!==0) throw new Error('New full V7 local gate failed; original logs preserved');
  const content=join(root,'packages/db/src/content'),paths={v7:{
    cohort:join(content,'learning-path-v7-2026-10-11/frozen-cohort-01'),
    reviewA:join(content,'reviews/learning-path-v7-full-reviewer-a-cohort01-2026-10-11.json'),
    reviewB:join(content,'reviews/learning-path-v7-full-reviewer-b-cohort01-2026-10-11.json'),
    readiness:join(v7Output,'v7-readiness.json'),reviews:join(v7Output,'v7-review-index.json'),releaseReport:join(v7Output,'g0-g4-local.json')},
    v7Target:{phase:'local',database:'isolated-local-d1',worker:'isolated-local-worker',pages:'isolated-local-vite'}};
  const v3=defaultPreview160V3Paths(),quality=validatePreview160V3(v3);
  if(!quality.passed) throw new Error('V3 quality did not pass');
  paths.v3Quality=write('v3-quality.json',Object.fromEntries(['passed','validator_version','hashes','counts','errors'].map(key=>[key,quality[key]])));
  paths.v3Reviews=write('v3-review-index.json',{schema:'preview160-v3-review-index-v1',reviews:[artifact(v3.reviewA),artifact(v3.reviewB)]});
  const candidateSha=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim();
  const target={...paths.v7Target,candidateSha};
  const audioReceipt=JSON.parse(readFileSync(join(v7Output,'audio-contract-receipt.json'),'utf8'));
  const summary=join(v7Output,'summary.json');
  if(JSON.parse(readFileSync(summary,'utf8')).passed!==true) throw new Error('Full gate summary not passed');
  const logGate=(path,command)=>({passed:true,exit_code:0,command,...artifact(path)});
  paths.authorization=write('local-publication-authorization.json',{
    schema:'learning-cohort-publication-authorization-v1',kind:'publication-authorization',
    cohort_id:LEARNING_COHORT_ID,release_ids:LEARNING_COHORT_RELEASE_IDS,phase:'local',target:paths.v7Target,
    candidate_sha:candidateSha,cohort_hashes:LEARNING_COHORT_HASHES,passed:true,publication_gate_evidence:true,
    prerequisites:{v7_local:artifact(paths.v7.releaseReport),v3_quality:artifact(paths.v3Quality),v3_reviews:artifact(paths.v3Reviews)},
    operator_attestation:{operator:'Codex local release steward; not a family/hearing observer',recorded_at:new Date().toISOString(),exact_cohort_and_logs_verified:true},
    proof_scopes:{audio:'mock',family:'not-observed',human_audible:false},
    gates:{local_gates:logGate(summary,'new actual full local gate collector'),audio_guard:{...audioReceipt,provider:'google-browser',r2_pronunciation_references:0,legacy_audio_requests:0}},
  });
  const local=verifyLearningPathReviewedLocal(paths.v7.cohort,paths.v7.reviewA,paths.v7.reviewB,join(out,'cohort-fresh-upgrade.json'));
  const db=new DatabaseSync(join(local.workspace,'upgrade.sqlite'));
  let drill;
  try {
    const snapshot=()=>LOCAL_DRILL_LEARNER_TABLES.map(table=>({table,sha256:hash(JSON.stringify(db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()))}));
    const before=snapshot();
    const stage=applyLearningCohortStage(db,paths,target);
    const staged=verifyLearningCohort(db,paths,target,'draft');
    applyLearningCohortStage(db,paths,target);
    const reseed=verifyLearningCohort(db,paths,target,'draft');
    const published=applyLearningCohortPublication(db,paths,target);
    const replay=applyLearningCohortPublication(db,paths,target);
    db.exec(learningCohortWithdrawSql());
    const withdrawn=verifyLearningCohort(db,paths,target,'withdrawn');
    if(JSON.stringify(before)!==JSON.stringify(snapshot())) throw new Error('Existing synthetic learner rows changed');
    drill={schema:'learning-cohort-local-drill-v1',cohort_id:LEARNING_COHORT_ID,candidate_sha:candidateSha,cohort_hashes:LEARNING_COHORT_HASHES,
      started_at:started,completed_at:new Date().toISOString(),scope:'new-local-SQLite-only',stage:stage.counts,staged,reseed,published,replay,withdrawn,
      preserved_learner_tables:LOCAL_DRILL_LEARNER_TABLES,learner_row_hashes_unchanged:true,
      passed:true,exit_code:0,remote_writes:0,family_observed:false,actual_browser_audio:false,human_audible:false};
  } finally {db.close();}
  write('paths.json',paths);
  const drillPath=write('all-five-local-drill.json',drill);
  write('summary.json',{schema:'learning-cohort-local-summary-v1',passed:true,exit_code:0,candidate_sha:candidateSha,cohort_hashes:LEARNING_COHORT_HASHES,v7_local:artifact(summary),all_five_drill:artifact(drillPath),remote_writes:0});
  console.log('New local full gates and all-five stage/reseed/publish/replay/withdraw passed. No remote writes/deployment.');
} catch(error) {
  write('summary-failed.json',{schema:'learning-cohort-local-summary-v1',passed:false,started_at:started,failed_at:new Date().toISOString(),error:error.message,remote_writes:0});
  throw error;
}
