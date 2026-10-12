// 강성호 2026-10-13: 600문항/220레슨의 통합 출판을 정확한 clean SHA와 대상에 연결한다.
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { executeSqlFile } from '../seed/d1-cli.js';
import { learningContentMirror } from './learning-path-preview-target.js';
import { requireCompletedLocalReleaseDrill, LOCAL_DRILL_LEARNER_TABLES } from './learning-path-preview.js';
import { requireCohortRemoteTarget, readLearningCohortSnapshot, type CohortRemoteTarget } from './learning-cohort-target.js';
import { loadLearningCohort, buildLearningCohortStagePlan, buildLearningCohortControlPlan,
  verifyLearningCohort, learningCohortWithdrawSql, LEARNING_COHORT_RELEASE_IDS, LEARNING_COHORT_HASHES,
  type LearningCohortPaths } from './learning-cohort-release.js';

export type CohortOperation = 'stage' | 'publish' | 'verify' | 'withdraw';
const hash = (bytes:Buffer) => createHash('sha256').update(bytes).digest('hex');

export function requireCurrentCohortLocalProof(authorizationPath:string,candidateSha:string):void {
  const authorization=JSON.parse(readFileSync(authorizationPath,'utf8'));
  const gate=authorization.gates?.local_gates;
  if(!gate || gate.passed!==true || gate.exit_code!==0 || typeof gate.artifact!=='string') throw new Error('Completed current-cohort local gate required');
  const bytes=readFileSync(gate.artifact);
  if(hash(bytes)!==gate.sha256) throw new Error('Local summary hash changed');
  const summary=JSON.parse(bytes.toString('utf8'));
  if(summary.schema!=='learning-cohort-local-summary-v1' || summary.passed!==true || summary.exit_code!==0 || summary.candidate_sha!==candidateSha || JSON.stringify(summary.cohort_hashes)!==JSON.stringify(LEARNING_COHORT_HASHES)) throw new Error('Past/other-candidate local gates cannot authorize remote writes');
  const proof=summary.all_five_drill;
  if(!proof || typeof proof.path!=='string') throw new Error('All-five local drill missing');
  const drillBytes=readFileSync(proof.path);
  if(hash(drillBytes)!==proof.sha256) throw new Error('All-five local drill hash changed');
  const drill=JSON.parse(drillBytes.toString('utf8'));
  if(drill.schema!=='learning-cohort-local-drill-v1' || drill.candidate_sha!==candidateSha || JSON.stringify(drill.cohort_hashes)!==JSON.stringify(LEARNING_COHORT_HASHES) || drill.passed!==true || drill.exit_code!==0 || drill.remote_writes!==0 || drill.learner_row_hashes_unchanged!==true ||
    JSON.stringify(drill.preserved_learner_tables)!==JSON.stringify(LOCAL_DRILL_LEARNER_TABLES) ||
    drill.published?.state!=='published' || drill.published.releases!==5 || drill.published.questions!==600 || drill.published.lessons!==220 || drill.published.quality_links!==600 ||
    drill.replay?.idempotent!==true || drill.withdrawn?.state!=='withdrawn' || drill.withdrawn.questions!==600 || drill.withdrawn.lessons!==220) throw new Error('Complete all-five publication/reseed/withdraw/preservation proof required');
}

export function runLearningCohortRemote(mode:CohortOperation,target:CohortRemoteTarget,paths:LearningCohortPaths,output:string,token?:string,state:'draft'|'published'|'withdrawn'='published') {
  if (!['stage','publish','verify','withdraw'].includes(mode)) throw new Error('Unsupported operation');
  if (existsSync(output)) throw new Error('Operation receipt already exists; immutable evidence cannot be overwritten');
  requireCohortRemoteTarget(target,mode!=='verify',token);
  requireCompletedLocalReleaseDrill(JSON.parse(readFileSync(paths.v7.releaseReport,'utf8')));
  requireCurrentCohortLocalProof(paths.authorization,target.releaseSha);
  const releaseTarget = {phase:target.scope==='production'?'production-predeploy' as const:'preview' as const,database:target.database,worker:target.worker,pages:target.pages,candidateSha:target.releaseSha};
  loadLearningCohort(paths,releaseTarget); // All exact reviews/source/authorization before D1 access.
  const directory = mkdtempSync(join(tmpdir(),'learning-cohort-remote-'));
  const execute = (name:string,statements:readonly string[]) => {
    if (!statements.length) return;
    const file=join(directory,`${name}.sql`);
    writeFileSync(file,statements.join('\n')+'\n',{flag:'wx',mode:0o600});
    try { executeSqlFile(target,file); }
    catch { throw new Error(`${name} failed; private generated SQL preserved at ${file}`); }
  };
  const withMirror = <T>(action:(db:ReturnType<typeof learningContentMirror>)=>T):T => {
    const db=learningContentMirror(readLearningCohortSnapshot(target));
    try { return action(db); } finally { db.close(); }
  };
  let visibilityAttempted=false;
  try {
    let result:Record<string,unknown>;
    if(mode==='verify') result=withMirror(db=>verifyLearningCohort(db,paths,releaseTarget,state));
    else if(mode==='withdraw') {
      execute('withdraw-all-five',[learningCohortWithdrawSql()]);
      result=withMirror(db=>verifyLearningCohort(db,paths,releaseTarget,'withdrawn'));
    } else {
      const states=withMirror(db=>db.prepare(`SELECT release_state FROM content_releases WHERE id IN (${LEARNING_COHORT_RELEASE_IDS.map(id=>`'${id}'`).join(',')})`).all());
      if(states.length===5 && states.every(row=>row.release_state==='published')) {
        result={...withMirror(db=>verifyLearningCohort(db,paths,releaseTarget,'published')),idempotent:true};
      } else {
        if(states.some(row=>!['draft','automated_checked','human_reviewed','preview','approved'].includes(String(row.release_state)))) throw new Error('Mixed/terminal lifecycle cannot be reseeded or republished');
        const staged=withMirror(db=>buildLearningCohortStagePlan(db,paths,releaseTarget));
        execute('stage',staged.statements);
        const verified=withMirror(db=>verifyLearningCohort(db,paths,releaseTarget,'draft'));
        if(mode==='stage') result={...verified,published:false};
        else {
          const control=withMirror(db=>buildLearningCohortControlPlan(db,paths,releaseTarget));
          execute('control',control.statements);
          visibilityAttempted=true;
          execute('publish-all-five',[control.publishSql]);
          result=withMirror(db=>verifyLearningCohort(db,paths,releaseTarget,'published'));
        }
      }
    }
    const receipt={schema:'learning-cohort-remote-receipt-v1',kind:'post-operation-verification',operation:mode,
      release_ids:LEARNING_COHORT_RELEASE_IDS,cohort_hashes:LEARNING_COHORT_HASHES,candidate_sha:target.releaseSha,
      target:{scope:target.scope,database:target.database,worker:target.worker,pages:target.pages},
      authorization_sha256:hash(readFileSync(paths.authorization)),recorded_at:new Date().toISOString(),
      generated_sql_directory:directory,...result,passed:true,
      family_observed:false,actual_browser_audio:false,human_audible:false,
      production_writes:target.scope==='production' && mode!=='verify',remote_writes:mode!=='verify'};
    writeFileSync(output,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
    return receipt;
  } catch(error) {
    let withdrawal='not-attempted-no-visibility-write';
    if(visibilityAttempted) {
      try {
        execute('failed-publication-withdraw-all-five',[learningCohortWithdrawSql()]);
        withMirror(db=>verifyLearningCohort(db,paths,releaseTarget,'withdrawn'));
        withdrawal='all-five-withdrawn-public-zero-verified';
      } catch { withdrawal='unverified-keep-maintenance-do-not-return-old-worker'; }
    }
    writeFileSync(output,JSON.stringify({schema:'learning-cohort-remote-receipt-v1',operation:mode,candidate_sha:target.releaseSha,passed:false,withdrawal,generated_sql_directory:directory,
      error:error instanceof Error?error.message:'Remote operation failed'},null,2)+'\n',{flag:'wx',mode:0o600});
    throw error;
  }
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const args=process.argv.slice(2), names=['mode','scope','database','config','worker','pages','release-sha','paths','output'];
    const option=(name:string)=>args.find(arg=>arg.startsWith(`--${name}=`))?.slice(name.length+3);
    if(!args.includes('--remote') || names.some(name=>args.filter(arg=>arg.startsWith(`--${name}=`)).length!==1) || args.some(arg=>arg!=='--remote'&&!names.concat(['env','state']).some(name=>arg.startsWith(`--${name}=`))) || ['env','state'].some(name=>args.filter(arg=>arg.startsWith(`--${name}=`)).length>1)) throw new Error('Every exact target option is required once; aliases and unknown flags are rejected');
    const paths=JSON.parse(readFileSync(resolve(option('paths')!),'utf8')) as LearningCohortPaths;
    const state=option('state')??'published';
    if(!['draft','published','withdrawn'].includes(state)) throw new Error('Unsupported verification state');
    const environment=option('env');
    const report=runLearningCohortRemote(option('mode') as CohortOperation,{remote:true,scope:option('scope') as CohortRemoteTarget['scope'],database:option('database')!,config:resolve(option('config')!),worker:option('worker')!,pages:option('pages')!,releaseSha:option('release-sha')!,...(environment?{env:environment}:{})},paths,resolve(option('output')!),process.env.ALLOW_LEARNING_COHORT_CHANGE,state as 'draft'|'published'|'withdrawn');
    console.log(JSON.stringify(report));
  } catch(error) { console.error(error instanceof Error?error.message:'Remote operation failed'); process.exitCode=1; }
}
