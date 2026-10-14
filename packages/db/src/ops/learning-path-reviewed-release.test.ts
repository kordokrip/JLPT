import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './learning-path-v4-freeze.js';
import { REVIEWED_V7, PHASE_GATES, loadReviewedV7, validateReviewedV7Evidence, validateReviewedReleaseReport, type ReleaseTarget } from './learning-path-reviewed-release.js';
import { applyReviewedLearningRelease, buildReviewedLearningReleaseControlPlan, reviewedLearningWithdrawSql, verifyReviewedLearningContent, verifyReviewedLearningPublished } from './learning-path-reviewed-publish.js';
import { applyLearningPathV4DraftStage } from '../seed/learning-path-v4-draft.js';
import { buildContentSeedPlan } from '../seed/content-manifest.js';

const cohort = fileURLToPath(new URL('../content/learning-path-v7-2026-10-11/frozen-cohort-01/', import.meta.url));
const reviewA = fileURLToPath(new URL('../content/reviews/learning-path-v7-full-reviewer-a-cohort01-2026-10-11.json', import.meta.url));
const reviewB = fileURLToPath(new URL('../content/reviews/learning-path-v7-full-reviewer-b-cohort01-2026-10-11.json', import.meta.url));
const target: ReleaseTarget = { phase: 'local', database: ':memory:unit-test-only', worker: 'unit-test-only', pages: 'unit-test-only' };
function fixture() {
  // Explicit synthetic report fixture in a fresh temporary directory. Never a real release gate artifact.
  const root = mkdtempSync(join(tmpdir(), 'v7-release-unit-fixture-'));
  const loaded = loadReviewedV7({ cohort, reviewA, reviewB });
  const write = (name: string, value: unknown) => { const path = join(root,name); writeFileSync(path,JSON.stringify(value)); return path; };
  const readiness = write('synthetic-readiness-copy.json', loaded.readiness);
  const reviews = write('synthetic-index.json', { schema: 'learning-path-reviewed-review-index-v1', draft_sha256: REVIEWED_V7.draft, reviews: loaded.artifacts.reviews });
  const log = write('synthetic-command-log.json',{ warning: 'UNIT TEST ONLY. Not executed release evidence.' });
  const source: Record<string,string> = { source_intake: loaded.artifacts.source.path, self_authorship: loaded.artifacts.bundle.path, quality_validator: readiness, independent_review: reviews };
  const gates = Object.fromEntries(PHASE_GATES.local.map(name => {
    const artifact = source[name] ?? log;
    return [name,{ passed: true, exit_code: 0, command: 'unit-test synthetic fixture', artifact, sha256: sha256(readFileSync(artifact)), ...(name === 'google_only_audio' ? { provider: 'google-browser', r2_pronunciation_references: 0, legacy_audio_requests: 0 } : {}) }];
  }));
  const report = { schema: 'learning-path-reviewed-release-report-v1', passed: true, publication_gate_evidence: true,
    evidence_scope: 'actual-command-logs-and-operator-attestation', phase: 'local', release_id: REVIEWED_V7.group, release_ids: REVIEWED_V7.releases,
    cohort: { draft_sha256: REVIEWED_V7.draft, source_evidence_sha256: REVIEWED_V7.source, concept_inventory_sha256: REVIEWED_V7.inventory, review_sha256: REVIEWED_V7.reviews },
    deployment: { database: target.database, worker: target.worker, pages: target.pages },
    operator_attestation: { operator: 'UNIT TEST ONLY', recorded_at: '2026-10-12T00:00:00Z', exact_cohort_and_logs_verified: true },
    proof_scopes: { audio: 'mock', family: 'not-observed', human_audible: false }, gates };
  const releaseReport = write('synthetic-report.json',report);
  return { paths: { cohort,reviewA,reviewB,readiness,reviews,releaseReport }, loaded, report, root, write };
}
function database(last = 31) {
  const db = new DatabaseSync(':memory:');
  const dir = new URL('../../drizzle-v2/',import.meta.url);
  for (const name of readdirSync(dir).filter(n => /^00\d\d_.*\.sql$/.test(n) && Number(n.slice(0,4)) <= last).sort()) db.exec(readFileSync(new URL(name,dir),'utf8').replaceAll('--> statement-breakpoint',''));
  db.exec(buildContentSeedPlan().statements.join('\n'));
  return db;
}
const n = (db: DatabaseSync,sql: string) => Number(db.prepare(sql).get()!.n);

test('V7 actual frozen/review hashes load; old profile and changed raw review bytes reject', () => {
  const f = fixture();
  assert.equal(f.loaded.readiness.counts.items,440);
  assert.throws(() => loadReviewedV7({ cohort: cohort.replace('v7','v4'), reviewA,reviewB }), /hash mismatch/);
  const changed = join(f.root,'changed-review.json'); writeFileSync(changed,readFileSync(reviewA,'utf8')+' ');
  assert.throws(() => loadReviewedV7({cohort,reviewA:changed,reviewB}),/hash mismatch/);
});

test('G4 rejects missing gate, wrong phase/cohort/deployment, runtime fixture and changed log bytes', () => {
  const f = fixture();
  assert.doesNotThrow(() => validateReviewedV7Evidence(f.paths,target));
  for (const mutate of [
    (r: any) => { delete r.gates.tests; },
    (r: any) => { r.phase='preview'; },
    (r: any) => { r.cohort.draft_sha256='0'.repeat(64); },
    (r: any) => { r.deployment.database='production'; },
    (r: any) => { r.publication_gate_evidence=false; },
    (r: any) => { r.operator_attestation={}; },
    (r: any) => { r.gates.tests.sha256='0'.repeat(64); },
  ]) {
    const report=structuredClone(f.report); mutate(report);
    const path=f.write('negative-report.json',report);
    assert.throws(()=>validateReviewedReleaseReport(path,target));
  }
  const changed=structuredClone(f.report); changed.gates.source_intake!.artifact=f.paths.readiness; changed.gates.source_intake!.sha256=sha256(readFileSync(f.paths.readiness));
  assert.throws(()=>validateReviewedV7Evidence({...f.paths,releaseReport:f.write('wrong-input.json',changed)},target),/input mismatch/);
});

test('G3 refuses changed review hash and readiness rejects forged count', () => {
  const f=fixture();
  const bad=f.write('bad-index.json',{schema:'learning-path-reviewed-review-index-v1',draft_sha256:REVIEWED_V7.draft,reviews:[{path:reviewA,sha256:'0'.repeat(64)},{path:reviewB,sha256:REVIEWED_V7.reviews[1]}]});
  assert.throws(()=>validateReviewedV7Evidence({...f.paths,reviews:bad},target),/exact review hash/);
  const readiness=structuredClone(f.loaded.readiness); readiness.counts.items=160;
  assert.throws(()=>validateReviewedV7Evidence({...f.paths,readiness:f.write('bad-readiness.json',readiness)},target),/G2 counts/);
});

test('local synthetic control-flow fixture publishes exact cohort atomically, replays, withdraws without touching legacy rows', () => {
  const f=fixture(),db=database(30);
  try {
    db.exec("INSERT INTO srs_cards(user_id,item_type,item_id,state,stability,difficulty,due_at,reps) VALUES('owner','vocab',1,'review',9,4,2,3); INSERT INTO review_logs(card_id,rating) VALUES((SELECT max(id) FROM srs_cards),'good'); INSERT INTO study_sessions(id,user_id,learning_track,level,daily_minutes,status,request_id,notices_json,created_at,updated_at) VALUES('old-session','owner','jlpt-ja','N5',20,'completed','old-request','[]',1,1)");
    const saved = ['srs_cards','review_logs'].map(t=>JSON.stringify(db.prepare(`SELECT * FROM ${t}`).all()));
    db.exec(readFileSync(new URL('../../drizzle-v2/0031_learning_lessons.sql',import.meta.url),'utf8'));
    applyLearningPathV4DraftStage(db,f.loaded.input);
    applyLearningPathV4DraftStage(db,f.loaded.input); // Equal sealed OR IGNORE replay remains allowed.
    const plan=buildReviewedLearningReleaseControlPlan(db,f.paths,target);
    db.exec(plan.statements.join('\n'));
    assert.equal(n(db,"SELECT count(*) n FROM learning_lessons WHERE is_published=1"),0);
    assert.equal(n(db,"SELECT count(*) n FROM jlpt_practice_questions WHERE bank_version='lp7-2026-10-11' AND is_published=1"),0);
    db.exec(plan.publishSql);
    assert.equal(verifyReviewedLearningPublished(db,f.paths,target).lessons,220);
    assert.equal(applyReviewedLearningRelease(db,f.paths,target).idempotent,true);
    db.exec(reviewedLearningWithdrawSql());
    verifyReviewedLearningContent(db,plan.evidence,'withdrawn');
    assert.deepEqual(['srs_cards','review_logs'].map(t=>JSON.stringify(db.prepare(`SELECT * FROM ${t}`).all())),saved);
    assert.equal(n(db,"SELECT count(*) n FROM study_sessions WHERE id='old-session' AND lesson_id IS NULL AND lesson_version IS NULL"),1);
    assert.equal(n(db,"SELECT count(*) n FROM learning_lessons WHERE version='lp7-2026-10-11'"),220);
  } finally { db.close(); }
});

test('second-release failure rolls back first-release visibility in the final single UPDATE', () => {
  const f=fixture(),db=database();
  try {
    applyLearningPathV4DraftStage(db,f.loaded.input);
    const plan=buildReviewedLearningReleaseControlPlan(db,f.paths,target); db.exec(plan.statements.join('\n'));
    db.exec(`DELETE FROM content_release_gate_evidence WHERE release_id='${REVIEWED_V7.releases[1]}' AND gate='G4'`);
    assert.throws(()=>db.exec(plan.publishSql),/V7 publication|G0-G4/);
    assert.equal(n(db,"SELECT count(*) n FROM content_releases WHERE content_version='lp7-2026-10-11' AND release_state='published'"),0);
    assert.equal(n(db,"SELECT count(*) n FROM learning_lessons WHERE is_published=1"),0);
    assert.equal(n(db,"SELECT count(*) n FROM jlpt_practice_questions WHERE bank_version='lp7-2026-10-11' AND is_published=1"),0);
  } finally {db.close();}
});

test('stage missing rows/collision, mismatched quality count and remote SQLite apply fail closed', () => {
  const f=fixture(),db=database();
  try {
    applyLearningPathV4DraftStage(db,f.loaded.input);
    assert.throws(()=>applyReviewedLearningRelease(db,f.paths,{...target,phase:'preview'}),/only accepts local/);
    db.exec("UPDATE learning_lesson_entries SET cue_ko='changed' WHERE rowid=(SELECT min(rowid) FROM learning_lesson_entries)");
    assert.throws(()=>buildReviewedLearningReleaseControlPlan(db,f.paths,target),/collision/);
  } finally { db.close(); }
  const clean=database();
  try {
    applyLearningPathV4DraftStage(clean,f.loaded.input);
    const plan=buildReviewedLearningReleaseControlPlan(clean,f.paths,target); clean.exec(plan.statements.join('\n'));
    clean.exec(`UPDATE content_release_quality_requirements SET expected_audit_count=160 WHERE release_id='${REVIEWED_V7.releases[0]}'`);
    assert.throws(()=>clean.exec(plan.publishSql),/integrity|complete linked/);
    assert.equal(n(clean,"SELECT count(*) n FROM learning_lessons WHERE is_published=1"),0);
  } finally {clean.close();}
});

test('prepared publication compares sealed semantics in the visibility statement and preserves existing SRS', async t => {
  const f=fixture(),db=database();
  try {
    db.exec("INSERT INTO srs_cards(user_id,item_type,item_id,state,stability,difficulty,due_at,reps) VALUES('owner','vocab',1,'review',9,4,2,3); INSERT INTO review_logs(card_id,rating) VALUES((SELECT max(id) FROM srs_cards),'good')");
    const snapshot=()=>['srs_cards','review_logs'].map(table=>JSON.stringify(db.prepare(`SELECT * FROM ${table}`).all()));
    const saved=snapshot();
    applyLearningPathV4DraftStage(db,f.loaded.input);
    const plan=buildReviewedLearningReleaseControlPlan(db,f.paths,target);
    db.exec(plan.statements.join('\n'));
    const corruptions = [
      ['JLPT prompt', "UPDATE jlpt_practice_questions SET prompt_ko='changed after preparation' WHERE id=(SELECT min(id) FROM jlpt_practice_questions WHERE bank_version='lp7-2026-10-11')"],
      ['JLPT answer', "UPDATE jlpt_practice_questions SET answer_index=(answer_index+1)%4 WHERE id=(SELECT min(id) FROM jlpt_practice_questions WHERE bank_version='lp7-2026-10-11')"],
      ['TOPIK explanation', "UPDATE topik_owner_authored_curriculum_items SET explanation_ja='changed after preparation' WHERE id=(SELECT min(id) FROM topik_owner_authored_curriculum_items WHERE id LIKE 'lp7-%')"],
      ['TOPIK unit title', "UPDATE topik_owner_authored_curriculum_units SET title_ko='changed after preparation' WHERE id=(SELECT min(id) FROM topik_owner_authored_curriculum_units WHERE source_asset_id='learning-path-v7-2026-10-11-source')"],
      ['TOPIK audio text', "UPDATE topik_owner_authored_curriculum_items SET audio_text_ko='changed after preparation' WHERE id=(SELECT min(id) FROM topik_owner_authored_curriculum_items WHERE id LIKE 'lp7-%' AND audio_required=1)"],
      ['lesson title', "UPDATE learning_lessons SET title_en='changed after preparation' WHERE id=(SELECT min(id) FROM learning_lessons WHERE version='lp7-2026-10-11')"],
      ['learn cue', "UPDATE learning_lesson_entries SET cue_ja='changed after preparation' WHERE rowid=(SELECT min(rowid) FROM learning_lesson_entries WHERE lesson_version='lp7-2026-10-11' AND phase='learn')"],
      ['practice ref', "UPDATE learning_lesson_entries SET content_ref=content_ref||':changed' WHERE rowid=(SELECT min(rowid) FROM learning_lesson_entries WHERE lesson_version='lp7-2026-10-11' AND phase='practice')"],
      ['missing question', "DELETE FROM jlpt_practice_questions WHERE id=(SELECT min(id) FROM jlpt_practice_questions WHERE bank_version='lp7-2026-10-11')"],
    ] as const;
    for (const [name,sql] of corruptions) await t.test(name,()=> {
      db.exec('SAVEPOINT corruption');
      try {
        db.exec(sql);
        assert.throws(()=>db.exec(plan.publishSql),/V7 sealed content changed/);
        assert.equal(n(db,"SELECT count(*) n FROM content_releases WHERE content_version='lp7-2026-10-11' AND release_state='published'"),0);
        assert.equal(n(db,"SELECT count(*) n FROM learning_lessons WHERE version='lp7-2026-10-11' AND is_published=1"),0);
        assert.equal(n(db,"SELECT count(*) n FROM jlpt_practice_questions WHERE bank_version='lp7-2026-10-11' AND is_published=1"),0);
        assert.deepEqual(snapshot(),saved);
      } finally {db.exec('ROLLBACK TO corruption; RELEASE corruption');}
    });
    db.exec(plan.publishSql);
    assert.equal(verifyReviewedLearningPublished(db,f.paths,target).items,440);
    assert.deepEqual(snapshot(),saved);
  } finally {db.close();}
});

test('sealed links cannot be rewritten/deleted while legacy NULL links remain editable; missing seal fails final publish',()=> {
  const f=fixture(),db=database();
  try {
    applyLearningPathV4DraftStage(db,f.loaded.input);
    const plan=buildReviewedLearningReleaseControlPlan(db,f.paths,target); db.exec(plan.statements.join('\n'));
    assert.equal(n(db,"SELECT count(*) n FROM content_learning_links WHERE expected_question_json IS NOT NULL AND expected_lesson_json IS NOT NULL AND expected_entries_json IS NOT NULL"),440);
    for (const sql of [
      "UPDATE content_learning_links SET expected_question_json='{}' WHERE question_ref LIKE '%:lp7-%'",
      "UPDATE content_learning_links SET evidence_sha256='0000000000000000000000000000000000000000000000000000000000000000' WHERE question_ref LIKE '%:lp7-%'",
      "DELETE FROM content_learning_links WHERE question_ref LIKE '%:lp7-%'",
      "INSERT OR REPLACE INTO content_learning_links(learning_track,question_ref,concept_ref,evidence_sha256,reviewer_a,reviewer_b,status,created_at) SELECT learning_track,question_ref,concept_ref,evidence_sha256,reviewer_a,reviewer_b,status,created_at FROM content_learning_links WHERE question_ref LIKE '%:lp7-%' LIMIT 1",
    ]) assert.throws(()=>db.exec(sql),/sealed learning link/);
    db.exec("INSERT INTO content_learning_links(learning_track,question_ref,concept_ref,evidence_sha256,reviewer_a,reviewer_b,status,created_at) VALUES('jlpt-ja','old-null-q','old-null-c','0000000000000000000000000000000000000000000000000000000000000000','old-a','old-b','approved',0); UPDATE content_learning_links SET status='draft' WHERE question_ref='old-null-q'");
    assert.equal(n(db,"SELECT count(*) n FROM content_learning_links WHERE question_ref='old-null-q' AND status='draft' AND expected_question_json IS NULL"),1);
    // Deliberately simulate damaged/restored pre-seal rows in an isolated fixture, not a supported operation.
    db.exec("DROP TRIGGER content_learning_links_sealed_update; UPDATE content_learning_links SET expected_question_json=NULL WHERE rowid=(SELECT min(rowid) FROM content_learning_links WHERE question_ref LIKE '%:lp7-%')");
    assert.throws(()=>db.exec(plan.publishSql),/V7 sealed content changed/);
    assert.equal(n(db,"SELECT count(*) n FROM content_releases WHERE content_version='lp7-2026-10-11' AND release_state='published'"),0);
    assert.equal(n(db,"SELECT count(*) n FROM learning_lessons WHERE is_published=1"),0);
  } finally {db.close();}
});

test('atomic seal explicitly covers every current semantic column without adding a table',()=> {
  const db=database(30);
  try {
    const count=()=>n(db,"SELECT count(*) n FROM sqlite_master WHERE type='table'");
    const before=count(), migration=readFileSync(new URL('../../drizzle-v2/0031_learning_lessons.sql',import.meta.url),'utf8');
    db.exec(migration);
    assert.equal(count()-before,2,'Only the existing lesson and entry tables may be added; seals use three nullable link columns');
    const targets=[
      ['jlpt_practice_questions','jq','x.expected_question_json','$.row'],
      ['topik_owner_authored_curriculum_items','tq','x.expected_question_json','$.row'],
      ['topik_owner_authored_curriculum_units','u','x.expected_question_json','$.unit'],
      ['content_speech_bindings','s','x.expected_question_json','$.speech'],
      ['learning_lessons','l','x.expected_lesson_json','$'],
      ['learning_lesson_entries','c','x.expected_entries_json','$[0]'],
      ['learning_lesson_entries','p','x.expected_entries_json','$[1]'],
    ] as const;
    for(const [table,alias,seal,path] of targets) for(const column of db.prepare(`PRAGMA table_info(${table})`).all()) {
      if(['created_at','updated_at'].includes(String(column.name)))continue;
      assert.ok(migration.includes(`${alias}.${column.name} IS json_extract(${seal},'${path}.${column.name}')`),`Unsealed semantic column: ${table}.${column.name}`);
    }
  } finally {db.close();}
});

test('installed Wrangler splits 0031 into complete statements that apply after 0030',async()=> {
  const { unstable_splitSqlQuery }=await import('wrangler');
  const sql=readFileSync(new URL('../../drizzle-v2/0031_learning_lessons.sql',import.meta.url),'utf8');
  const statements=unstable_splitSqlQuery(sql), db=database(30);
  try {
    assert.equal(statements.filter(statement=>/^END\s*;?$/i.test(statement.trim())).length,0,'Wrangler must not detach a trigger END');
    assert.equal(statements.filter(statement=>/^CREATE TRIGGER\b/i.test(statement.trim())).length,(sql.match(/CREATE TRIGGER\b/g)??[]).length);
    for(const statement of statements)db.exec(statement);
    // Compile all release UPDATE triggers even when no V7 row matches.
    db.exec("UPDATE content_releases SET release_state='automated_checked' WHERE id='nonexistent-wrangler-regression'");
    assert.equal(n(db,"SELECT count(*) n FROM sqlite_master WHERE type='trigger' AND name='learning_path_v7_publish_sealed_content'"),1);
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
  } finally {db.close();}
});
