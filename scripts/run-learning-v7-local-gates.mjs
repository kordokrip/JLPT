#!/usr/bin/env node
// 강성호 2026-10-12: 실제 로컬 실행 증적을 한 번 수집한다. 원격·커밋·배포 및 가족/가청 승인은 생성하지 않는다.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync, readFileSync, openSync, closeSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { loadReviewedV7, REVIEWED_V7, PHASE_GATES, validateReviewedV7Evidence } from '../packages/db/src/ops/learning-path-reviewed-release.ts';
import { applyReviewedLearningRelease, reviewedLearningWithdrawSql, verifyReviewedLearningContent } from '../packages/db/src/ops/learning-path-reviewed-publish.ts';
import { verifyLearningPathReviewedLocal } from '../packages/db/src/ops/verify-learning-path-reviewed-local.ts';
import { defaultPreview160V3Paths, validatePreview160V3, toGenericQuestionBank, PREVIEW160_V3_MANIFEST_SHA256 } from '../packages/db/src/ops/preview160-v3-quality.ts';
import { buildPreview160V3DraftPlan, applyPreview160V3Draft } from '../packages/db/src/seed/preview160-v3-draft.ts';
import { requireCompletedLocalReleaseDrill } from '../packages/db/src/ops/learning-path-preview.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=process.argv.find(arg=>arg.startsWith('--output='))?.slice(9);
if(process.argv.length!==3 || !output)throw Error('Only --output=<new .artifacts directory> is supported; no remote/deploy option');
const out=resolve(output), within=relative(resolve(root,'.artifacts'),out);
if(!within || within.startsWith('..') || existsSync(out))throw Error('Choose a new directory within .artifacts; existing evidence is immutable');
mkdirSync(dirname(out),{recursive:true});mkdirSync(out);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const write=(name,value)=>{const path=join(out,name);writeFileSync(path,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});return path;};
const receipts=[];
async function run(name,args,extraEnv={}) {
  const log=join(out,`${name}.log`), fd=openSync(log,'wx',0o600), started_at=new Date().toISOString();
  let exit;
  try {
    exit=await new Promise((resolveExit,reject)=>{
      const child=spawn('pnpm',args,{cwd:root,env:{...process.env,CI:'true',WRANGLER_WRITE_LOGS:'0',...extraEnv},stdio:['ignore',fd,fd]});
      child.on('error',reject);child.on('exit',(code,signal)=>resolveExit(code ?? (signal ? 130 : 1)));
    });
  } finally {closeSync(fd);}
  const receipt={name,command:`pnpm ${args.join(' ')}`,started_at,finished_at:new Date().toISOString(),exit_code:exit,passed:exit===0,artifact:log,sha256:sha(readFileSync(log))};
  receipts.push(receipt);write(`${name}-receipt.json`,receipt);
  console.log(`${name}: exit ${exit}`);
  if(exit!==0)throw Error(`${name} failed; original log/receipt preserved`);
  return receipt;
}
try {
  const content=resolve(root,'packages/db/src/content'), paths={
    cohort:join(content,'learning-path-v7-2026-10-11/frozen-cohort-01'),
    reviewA:join(content,'reviews/learning-path-v7-full-reviewer-a-cohort01-2026-10-11.json'),
    reviewB:join(content,'reviews/learning-path-v7-full-reviewer-b-cohort01-2026-10-11.json'),
  };
  const loaded=loadReviewedV7(paths);
  paths.readiness=write('v7-readiness.json',loaded.readiness);
  paths.reviews=write('v7-review-index.json',{schema:'learning-path-reviewed-review-index-v1',draft_sha256:REVIEWED_V7.draft,reviews:loaded.artifacts.reviews});
  const quality=validatePreview160V3(defaultPreview160V3Paths());
  const portable=write('preview160-v3-portable.json',toGenericQuestionBank(quality));
  await run('preview160-quality',['exec','python3','.codex/skills/question-bank-quality/scripts/check_question_bank.py','--input',portable,'--output',join(out,'preview160-v3-quality.json'),'--max-answer-imbalance','1']);
  const openapi=await run('openapi',['openapi:check']);
  const types=await run('typecheck',['typecheck']);
  const tests=await run('tests',['test']);
  const build=await run('build',['build']);
  const audio=await run('audio-contract',['release:verify:audio-contract']);
  // Independent new local workspaces, after the only shared build; no caller-owned local D1 is opened/reset.
  const parallel=await Promise.allSettled([
    run('fresh-d1',['-F','@nihongo-n3/db','verify:fresh']),
    run('reviewed-e2e',['-C','e2e','exec','playwright','test','reviewed-learning-lessons.spec.ts','--reporter=line,json'],{
      CI:'',E2E_REVIEWED_COHORT:paths.cohort,E2E_REVIEW_A:paths.reviewA,E2E_REVIEW_B:paths.reviewB,
      E2E_REVIEWED_FIXTURE_REPORT:join(out,'e2e-fixture.json'),PLAYWRIGHT_JSON_OUTPUT_NAME:join(out,'e2e-results.json'),
    }),
  ]);
  const failed=parallel.find(result=>result.status==='rejected');
  if(failed)throw failed.reason;
  const [fresh,e2e]=parallel.map(result=>result.value);
  const browser=JSON.parse(readFileSync(join(out,'e2e-results.json'),'utf8'));
  if(browser.stats.expected!==44 || browser.stats.unexpected || browser.stats.skipped || browser.stats.flaky)throw Error('Actual new-cohort browser coverage is not exactly 44 passed / 0 skipped / 0 failed');
  const freshText=readFileSync(fresh.artifact,'utf8');
  if(!freshText.includes('Fresh D1 verification complete.'))throw Error('Fresh wrapper did not report complete contract/provenance verification');
  const actual=verifyLearningPathReviewedLocal(paths.cohort,paths.reviewA,paths.reviewB,join(out,'actual-fresh-upgrade-reseed.json'));
  const first=(artifact,command)=>({passed:true,exit_code:0,command,artifact:artifact.path,sha256:artifact.sha256});
  const gates={
    source_intake:first(loaded.artifacts.source,'loadReviewedV7: exact complete source + 220 trusted lookups'),
    self_authorship:first(loaded.artifacts.bundle,'loadReviewedV7: immutable authorship bundle/contract'),
    quality_validator:first({path:paths.readiness,sha256:sha(readFileSync(paths.readiness))},'loadReviewedV7: actual deterministic readiness'),
    independent_review:first({path:paths.reviews,sha256:sha(readFileSync(paths.reviews))},'loadReviewedV7: two exact independent 440 approvals'),
    openapi,typecheck:types,tests,build,fresh_d1:fresh,content_contract:fresh,
    google_only_audio:{...audio,provider:'google-browser',r2_pronunciation_references:0,legacy_audio_requests:0},
    e2e_chromium:e2e,e2e_webkit:e2e,
  };
  const target={phase:'local',database:'isolated-local-d1',worker:'isolated-local-worker',pages:'isolated-local-vite'};
  const preflightReport={
    schema:'learning-path-reviewed-release-report-v1',collector_stage:'preflight',release_id:REVIEWED_V7.group,release_ids:REVIEWED_V7.releases,
    content_manifest:REVIEWED_V7.draft,validator_version:'learning-path-quality-v1',phase:'local',passed:true,
    publication_gate_evidence:true,evidence_scope:'actual-command-logs-and-operator-attestation',
    cohort:{draft_sha256:REVIEWED_V7.draft,source_evidence_sha256:REVIEWED_V7.source,concept_inventory_sha256:REVIEWED_V7.inventory,review_sha256:[...REVIEWED_V7.reviews]},
    deployment:{database:target.database,worker:target.worker,pages:target.pages},
    operator_attestation:{operator:'Codex local release steward (not a family/hearing observer)',recorded_at:new Date().toISOString(),exact_cohort_and_logs_verified:true},
    proof_scopes:{audio:'mock',family:'not-observed',human_audible:false},gates,
  };
  paths.releaseReport=write('g0-g4-local-preflight.json',preflightReport);
  for(const name of PHASE_GATES.local)if(!gates[name])throw Error(`Missing actual local gate ${name}`);
  validateReviewedV7Evidence(paths,target);
  await run('local-gate-check',['exec','python3','.codex/skills/content-release-automation/scripts/check_release_gates.py','--input',paths.releaseReport,'--phase','local','--output',join(out,'local-gate-check.json')]);
  const db=new DatabaseSync(join(actual.workspace,'upgrade.sqlite'));
  try {
    const learnerTables=['users','study_sessions','study_steps','learning_annotations','learning_activity_events','srs_cards','review_logs','daily_logs','topik_owner_curriculum_progress','topik_owner_srs_cards','topik_owner_review_logs','study_reward_events'];
    const snapshot=()=>learnerTables.map(table=>sha(JSON.stringify(db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all())));
    const before=snapshot();
    const plan=buildPreview160V3DraftPlan();
    applyPreview160V3Draft(db,plan);
    const storedRows=()=>plan.rows.map(({table,key,value})=>({table,row:db.prepare(`SELECT * FROM ${table} WHERE ${key.map(column=>`\`${column}\` IS ?`).join(' AND ')}`).get(...key.map(column=>value[column]))}));
    const staged=storedRows();
    if(staged.some(result=>!result.row))throw Error('Preview160 draft has missing stored rows');
    const draftHash=sha(JSON.stringify(staged));
    applyPreview160V3Draft(db,plan);
    const replay=storedRows();
    if(draftHash!==sha(JSON.stringify(replay)))throw Error('Preview160 reseed changed stored rows');
    const published=applyReviewedLearningRelease(db,paths,target);
    const publishedReplay=applyReviewedLearningRelease(db,paths,target);
    db.exec(reviewedLearningWithdrawSql());
    const withdrawn=verifyReviewedLearningContent(db,validateReviewedV7Evidence(paths,target),'withdrawn');
    if(JSON.stringify(before)!==JSON.stringify(snapshot()))throw Error('Local publication changed existing synthetic learner records');
    const drill=write('actual-local-release-and-withdraw.json',{schema:'learning-path-local-release-drill-v1',cohort:{...preflightReport.cohort,preview160_manifest_sha256:PREVIEW160_V3_MANIFEST_SHA256},scope:'new-local-SQLite-only',preview160:{counts:plan.counts,stored_rows:staged.length,reseed_unchanged:true,row_hash:draftHash,bank_versions:plan.bankVersionMapping,publication:'draft-unpublished'},v7:{published,publishedReplay,withdrawn},preserved_learner_tables:learnerTables,learner_row_hashes_unchanged:true,remote_writes:0,actual_audio:false,family_observed:false});
    paths.releaseReport=write('g0-g4-local.json',{...preflightReport,collector_stage:'complete',gates:{...gates,local_release_drill:{passed:true,exit_code:0,command:'actual isolated applyPreview160V3Draft twice / applyReviewedLearningRelease twice / withdraw / 12 learner table hashes',artifact:drill,sha256:sha(readFileSync(drill))}}});
    requireCompletedLocalReleaseDrill(validateReviewedV7Evidence(paths,target).report);
  } finally {db.close();}
  write('summary.json',{passed:true,scope:'local-only-no-commit-no-deploy',gates:receipts,reviewed_browser:browser.stats,actual_source_paths:paths,remote_writes:0,commit:false,push:false,preview_deploy:false,production_deploy:false});
  console.log('Local gates and actual isolated release/reseed/withdraw completed. No external writes or human-audio/family claims.');
} catch(error) {
  write('summary-failed.json',{passed:false,scope:'local-only',gates:receipts,error:error instanceof Error?error.message:'Local gate failed',remote_writes:0});
  console.error(error instanceof Error?error.message:'Local gate failed');process.exitCode=1;
}
