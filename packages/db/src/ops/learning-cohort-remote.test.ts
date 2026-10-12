// 합성 gate fixture는 입력 차단 로직 검사용이며 실제 출판/배포 증거가 아니다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { requireCurrentCohortLocalProof } from './learning-cohort-remote.js';
import { LEARNING_COHORT_HASHES } from './learning-cohort-release.js';
import { LOCAL_DRILL_LEARNER_TABLES } from './learning-path-preview.js';

test('remote operations reject old-candidate, incomplete or changed local drill before D1 access',()=>{
  const dir=mkdtempSync(join(tmpdir(),'synthetic-cohort-proof-')),sha='a'.repeat(40);
  const write=(name:string,value:unknown)=>{
    const path=join(dir,name),bytes=JSON.stringify(value);
    writeFileSync(path,bytes,{flag:'wx'});
    return {path,sha256:createHash('sha256').update(bytes).digest('hex')};
  };
  const drill={schema:'learning-cohort-local-drill-v1',candidate_sha:sha,cohort_hashes:LEARNING_COHORT_HASHES,passed:true,exit_code:0,remote_writes:0,learner_row_hashes_unchanged:true,preserved_learner_tables:LOCAL_DRILL_LEARNER_TABLES,
    published:{state:'published',releases:5,questions:600,lessons:220,quality_links:600},replay:{idempotent:true},withdrawn:{state:'withdrawn',questions:600,lessons:220}};
  const summary={schema:'learning-cohort-local-summary-v1',passed:true,exit_code:0,candidate_sha:sha,cohort_hashes:LEARNING_COHORT_HASHES,all_five_drill:write('drill.json',drill)};
  const authorize=(name:string,value:unknown)=>{
    const gate=write(`${name}-summary.json`,value);
    return write(`${name}-authorization.json`,{gates:{local_gates:{passed:true,exit_code:0,artifact:gate.path,sha256:gate.sha256}}}).path;
  };
  const valid=authorize('valid',summary);
  assert.doesNotThrow(()=>requireCurrentCohortLocalProof(valid,sha));
  assert.throws(()=>requireCurrentCohortLocalProof(valid,'b'.repeat(40)),/candidate/);
  assert.throws(()=>requireCurrentCohortLocalProof(authorize('failed',{...summary,passed:false}),sha));
  const partial=write('partial-drill.json',{...drill,withdrawn:{state:'withdrawn',questions:440,lessons:220}});
  assert.throws(()=>requireCurrentCohortLocalProof(authorize('partial',{...summary,all_five_drill:partial}),sha));
  writeFileSync(summary.all_five_drill.path,'changed');
  assert.throws(()=>requireCurrentCohortLocalProof(valid,sha),/hash changed/);
});
