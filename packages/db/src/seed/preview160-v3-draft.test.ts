import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { applyPreview160V3Draft, buildPreview160V3DraftPlan, PREVIEW160_V3_RELEASE_IDS } from './preview160-v3-draft.js';
import { validatePreview160V3 } from '../ops/preview160-v3-quality.js';

test('draft plan contains exact private draft rows and no publication or R2 path', () => {
  const plan = buildPreview160V3DraftPlan();
  assert.deepEqual(plan.counts, { source_assets:1,releases:3,requirements:3,audits:160,links:160,jlpt_questions:120,topik_units:40,topik_items:40,stable_refs:8,speech_bindings:8 });
  const releases = plan.rows.filter(row=>row.table==='content_releases');
  assert.deepEqual(releases.map(row=>row.value.id), Object.values(PREVIEW160_V3_RELEASE_IDS));
  assert.equal(releases.every(row=>row.value.release_state==='draft'), true);
  assert.equal(plan.rows.filter(row=>row.table==='jlpt_practice_questions').every(row=>row.value.is_published===0), true);
  assert.deepEqual(plan.bankVersionMapping, { N2:'preview160-v3-2026-10-12:N2',N1:'preview160-v3-2026-10-12:N1',TOPIK:'preview160-v3-2026-10-12:TOPIK' });
  assert.deepEqual([...new Set(plan.rows.filter(row=>row.table==='jlpt_practice_questions').map(row=>row.value.bank_version))].sort(), ['preview160-v3-2026-10-12:N1','preview160-v3-2026-10-12:N2']);
  assert.equal(plan.rows.filter(row=>row.table==='content_speech_bindings').every(row=>row.value.provider==='google-browser'&&row.value.language==='ko'&&row.value.binding_state==='ready'), true);
  const topik=validatePreview160V3().draft.topik;
  const ownerRows=plan.rows.filter(row=>row.table==='topik_owner_authored_curriculum_items');
  for(const item of topik.filter(item=>item.section==='writing')){
    const row=ownerRows.find(candidate=>candidate.value.id===item.id); assert.ok(row);
    assert.ok(item.rubric);
    const answer=JSON.parse(String(row.value.answer_json));
    assert.deepEqual(answer,{rubric_ko:item.rubric.ko,rubric_ja:item.rubric.ja,rubric_en:item.rubric.en,sample_answer_ko:item.explanation.ko.replace(/^예: /u,''),sample_answer_ja:item.explanation.ja.replace(/^例：/u,''),sample_answer_en:item.explanation.en.replace(/^Example: /u,'')});
  }
  for(const item of topik.filter(item=>item.section==='listening')){
    const row=ownerRows.find(candidate=>candidate.value.id===item.id); assert.ok(row); assert.equal(row.value.audio_text_ko,item.audio_text_ko);
    const ref=plan.rows.find(candidate=>candidate.table==='learning_content_stable_refs'&&candidate.value.item_id===item.id); assert.equal(ref?.value.level_tag,`grade-${item.grade}`);
    assert.equal(plan.rows.filter(candidate=>candidate.table==='content_speech_bindings'&&candidate.value.item_id===item.id).length,1);
  }
  assert.doesNotMatch(JSON.stringify(plan), /r2-ready|r2:\/\/|immutable_r2_key|published_at/iu);
});

test('native transaction supports fresh/reseed, preserves old rows, and rejects immutable collision', () => {
  const db=new DatabaseSync(':memory:');
  db.exec(`PRAGMA foreign_keys=ON;
  CREATE TABLE content_source_assets(id TEXT PRIMARY KEY,asset_kind TEXT,source_url TEXT,license_id TEXT,license_url TEXT,attribution_text TEXT,allowed_use TEXT,source_sha256 TEXT);
  CREATE TABLE content_releases(id TEXT PRIMARY KEY,learning_track TEXT,content_version TEXT,release_state TEXT,manifest_sha256 TEXT,parser_version TEXT);
  CREATE TABLE content_release_quality_requirements(release_id TEXT PRIMARY KEY,content_type TEXT,expected_audit_count INTEGER,validator_version TEXT);
  CREATE TABLE content_quality_audits(id TEXT PRIMARY KEY,learning_track TEXT,content_type TEXT,content_id TEXT,content_version TEXT,evidence_sha256 TEXT,validator_version TEXT,automated_status TEXT,author_review_status TEXT,adversarial_review_status TEXT,author_reviewer TEXT,adversarial_reviewer TEXT,release_state TEXT,details_json TEXT,checked_at TEXT);
  CREATE TABLE content_release_quality_audit_links(release_id TEXT,audit_id TEXT,PRIMARY KEY(release_id,audit_id));
  CREATE TABLE jlpt_practice_questions(id TEXT PRIMARY KEY,learning_track TEXT,level TEXT,mode TEXT,skill TEXT,difficulty INTEGER,prompt_ko TEXT,prompt_ja TEXT,prompt_en TEXT,choices_json TEXT,answer_index INTEGER,explanation_ko TEXT,explanation_ja TEXT,explanation_en TEXT,audio_script_ja TEXT,source_code TEXT,source_evidence_sha256 TEXT,bank_version TEXT,is_published INTEGER);
  CREATE TABLE topik_owner_authored_curriculum_units(id TEXT PRIMARY KEY,target_grade INTEGER,stable_ref TEXT,section TEXT,title_ko TEXT,title_ja TEXT,title_en TEXT,source_asset_id TEXT);
  CREATE TABLE topik_owner_authored_curriculum_items(id TEXT PRIMARY KEY,unit_id TEXT,target_grade INTEGER,stable_ref TEXT,item_type TEXT,prompt_ko TEXT,prompt_ja TEXT,prompt_en TEXT,answer_json TEXT,explanation_ko TEXT,explanation_ja TEXT,explanation_en TEXT,audio_required INTEGER,audio_text_ko TEXT,source_asset_id TEXT);
  CREATE TABLE learning_content_stable_refs(stable_ref TEXT PRIMARY KEY,learning_track TEXT,item_type TEXT,item_id TEXT,level_tag TEXT,source_asset_id TEXT);
  CREATE TABLE content_speech_bindings(id TEXT PRIMARY KEY,stable_ref TEXT,item_type TEXT,item_id TEXT,language TEXT,speech_role TEXT,provider TEXT,binding_state TEXT,text_source TEXT,unavailable_reason TEXT);
  CREATE TABLE content_learning_links(id TEXT PRIMARY KEY,expected_question_json TEXT,expected_lesson_json TEXT,expected_entries_json TEXT);
  CREATE TABLE learner_srs(id TEXT PRIMARY KEY,payload TEXT); INSERT INTO content_learning_links VALUES('old',NULL,NULL,NULL); INSERT INTO learner_srs VALUES('old-srs','kept');`);
  const plan=buildPreview160V3DraftPlan(); applyPreview160V3Draft(db as any,plan); applyPreview160V3Draft(db as any,plan);
  assert.equal((db.prepare('SELECT count(*) n FROM jlpt_practice_questions').get() as any).n,120);
  assert.equal((db.prepare('SELECT count(*) n FROM content_quality_audits').get() as any).n,160);
  assert.deepEqual({ ...db.prepare('SELECT * FROM content_learning_links').get() },{id:'old',expected_question_json:null,expected_lesson_json:null,expected_entries_json:null});
  assert.equal((db.prepare('SELECT payload FROM learner_srs').get() as any).payload,'kept');
  db.exec("UPDATE jlpt_practice_questions SET prompt_ko='tampered' WHERE id=(SELECT id FROM jlpt_practice_questions LIMIT 1)");
  assert.throws(()=>applyPreview160V3Draft(db as any,plan),/Immutable collision/u);
  assert.equal((db.prepare('SELECT count(*) n FROM content_quality_audits').get() as any).n,160);
  db.close();
});

test('plan is deterministic and keeps one exact row per immutable key', () => {
  const first=buildPreview160V3DraftPlan(), second=buildPreview160V3DraftPlan();
  assert.deepEqual(first,second);
  assert.equal(new Set(first.rows.map(row=>`${row.table}:${row.key.map(key=>String(row.value[key])).join(':')}`)).size, first.rows.length);
});
