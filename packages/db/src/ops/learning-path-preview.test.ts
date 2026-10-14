// 강성호 2026-10-12: Preview gate가 Production 대상/가짜 보고서를 수락하지 않도록 CLI 앞단에서 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { learningPreviewEvidenceTarget } from './learning-path-preview.js';
import { requireCompletedLocalReleaseDrill, LOCAL_DRILL_LEARNER_TABLES } from './learning-path-preview.js';
import { REVIEWED_V7 } from './learning-path-reviewed-release.js';
import { PREVIEW160_V3_MANIFEST_SHA256 } from './preview160-v3-quality.js';
import { createHash } from 'node:crypto';
import type { ReviewedReleasePaths } from './learning-path-reviewed-release.js';
test('Preview evidence target accepts explicit local coverage but rejects Production or mislabeled targets', () => {
  const dir=mkdtempSync(join(tmpdir(),'learning-preview-gate-test-'));
  for (const [index,input] of [
    {phase:'local',deployment:{database:'isolated-local-d1',worker:'local-worker',pages:'local-vite'}},
    {phase:'preview',deployment:{database:'nihongo-n3-topik-preview',worker:'preview-worker',pages:'preview-pages'}},
    {phase:'production-predeploy',deployment:{database:'nihongo-n3-prod-v2',worker:'prod',pages:'prod'}},
    {phase:'local',deployment:{database:'nihongo-n3-prod-v2',worker:'prod',pages:'prod'}},
    {phase:'preview',deployment:{database:'DB',worker:'alias',pages:'alias'}},
  ].entries()) {
    const report=join(dir,`${index}.json`);writeFileSync(report,JSON.stringify(input),{flag:'wx'});
    const paths={releaseReport:report} as ReviewedReleasePaths;
    if(index<2)assert.equal(learningPreviewEvidenceTarget(paths).database,input.deployment.database);
    else assert.throws(()=>learningPreviewEvidenceTarget(paths),/reject|does not match/);
  }
});

test('local preflight alone cannot authorize Preview; exact successful drill is required', () => {
  assert.throws(()=>requireCompletedLocalReleaseDrill({phase:'local',gates:{}}),/Completed local release drill/);
  const dir=mkdtempSync(join(tmpdir(),'local-drill-contract-'));
  const fixture={schema:'learning-path-local-release-drill-v1',cohort:{draft_sha256:REVIEWED_V7.draft,source_evidence_sha256:REVIEWED_V7.source,concept_inventory_sha256:REVIEWED_V7.inventory,review_sha256:[...REVIEWED_V7.reviews],preview160_manifest_sha256:PREVIEW160_V3_MANIFEST_SHA256},scope:'new-local-SQLite-only',remote_writes:0,learner_row_hashes_unchanged:true,preserved_learner_tables:[...LOCAL_DRILL_LEARNER_TABLES],preview160:{publication:'draft-unpublished',reseed_unchanged:true,stored_rows:543,counts:{jlpt_questions:120,topik_items:40}},v7:{published:{state:'published',items:440,lessons:220,idempotent:false},publishedReplay:{idempotent:true},withdrawn:{state:'withdrawn',items:440,lessons:220}}};
  const artifact=join(dir,'synthetic-validator-fixture.json'),bytes=Buffer.from(JSON.stringify(fixture));writeFileSync(artifact,bytes,{flag:'wx'});
  const report={phase:'local',collector_stage:'complete',gates:{local_release_drill:{passed:true,exit_code:0,artifact,sha256:createHash('sha256').update(bytes).digest('hex')}}};
  requireCompletedLocalReleaseDrill(report);
  assert.throws(()=>requireCompletedLocalReleaseDrill({...report,gates:{local_release_drill:{...report.gates.local_release_drill,sha256:'0'.repeat(64)}}}),/hash mismatch/);
  assert.throws(()=>requireCompletedLocalReleaseDrill({...report,gates:{local_release_drill:{...report.gates.local_release_drill,passed:false}}}),/Completed local/);
  assert.throws(()=>requireCompletedLocalReleaseDrill({...report,collector_stage:'preflight'}),/Completed local/);
  const wrong=Buffer.from(JSON.stringify({...fixture,cohort:{...fixture.cohort,draft_sha256:'0'.repeat(64)}}));
  const wrongPath=join(dir,'wrong-cohort.json');writeFileSync(wrongPath,wrong,{flag:'wx'});
  assert.throws(()=>requireCompletedLocalReleaseDrill({...report,gates:{local_release_drill:{...report.gates.local_release_drill,artifact:wrongPath,sha256:createHash('sha256').update(wrong).digest('hex')}}}),/proof required/);
  requireCompletedLocalReleaseDrill({phase:'preview'});
});
