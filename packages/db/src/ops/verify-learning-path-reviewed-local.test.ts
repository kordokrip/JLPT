// Synthetic in-memory regression only; it is not a review artifact or semantic approval.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { assertLegacyRowsUnchanged, candidateRows, captureLegacyRows } from "./verify-learning-path-reviewed-local.js";

function legacyDb(){
  const db=new DatabaseSync(":memory:");
  db.exec("CREATE TABLE users(id TEXT PRIMARY KEY, label TEXT NOT NULL); CREATE TABLE study_sessions(id TEXT PRIMARY KEY, status TEXT NOT NULL); CREATE TABLE learning_activity_events(event_id TEXT PRIMARY KEY, label TEXT NOT NULL);");
  db.exec("INSERT INTO users VALUES('user-1','original-user'); INSERT INTO study_sessions VALUES('session-1','completed'); INSERT INTO learning_activity_events VALUES('event-1','original-event');");
  return db;
}

test("legacy snapshots use the actual users.id and activity event_id keys",()=>{
  const db=legacyDb();
  try {
    const snapshots=captureLegacyRows(db,[{table:"users",key:"id",value:"user-1"},{table:"learning_activity_events",key:"event_id",value:"event-1"}]);
    assert.equal(snapshots.length,2);
    assertLegacyRowsUnchanged(db,snapshots);
  } finally { db.close(); }
});

test("candidate row snapshots bind only tables that have a predicate",()=>{
  const db=new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE content_releases(id TEXT,content_version TEXT); CREATE TABLE content_source_assets(id TEXT); CREATE TABLE content_quality_audits(id TEXT,content_version TEXT); CREATE TABLE content_release_quality_audit_links(release_id TEXT,audit_id TEXT); CREATE TABLE jlpt_practice_questions(id TEXT,bank_version TEXT); CREATE TABLE topik_owner_authored_curriculum_units(id TEXT); CREATE TABLE topik_owner_authored_curriculum_items(id TEXT); CREATE TABLE learning_content_stable_refs(stable_ref TEXT,item_id TEXT); CREATE TABLE content_speech_bindings(id TEXT,item_id TEXT); CREATE TABLE learning_lessons(id TEXT,version TEXT); CREATE TABLE learning_lesson_entries(lesson_id TEXT,lesson_version TEXT,ordinal INTEGER); CREATE TABLE content_learning_links(question_ref TEXT,concept_ref TEXT);");
    db.exec("INSERT INTO topik_owner_authored_curriculum_units VALUES('learning-path-unit:lp6-2026-10-11:lp6-topik-001'); INSERT INTO topik_owner_authored_curriculum_items VALUES('lp6-topik-001');");
    const rows=candidateRows(db,"lp6-2026-10-11","lp6-","learning-path-v6-2026-10-11-source");
    assert.equal(rows.length,12);
    assert.match(rows.find(([name])=>name==="units")![1],/learning-path-unit:lp6-2026-10-11:lp6-topik-001/);
    assert.match(rows.find(([name])=>name==="topik")![1],/lp6-topik-001/);
  } finally { db.close(); }
});

test("0031-only study-session columns are excluded from the pre-migration comparison",()=>{
  const db=legacyDb();
  try {
    const snapshots=captureLegacyRows(db,[{table:"study_sessions",key:"id",value:"session-1"}]);
    db.exec("ALTER TABLE study_sessions ADD COLUMN lesson_id TEXT; ALTER TABLE study_sessions ADD COLUMN lesson_version TEXT;");
    assertLegacyRowsUnchanged(db,snapshots);
    const binding=db.prepare("SELECT lesson_id,lesson_version FROM study_sessions WHERE id=?").all("session-1")[0] as {lesson_id:null;lesson_version:null};
    assert.equal(binding.lesson_id,null);
    assert.equal(binding.lesson_version,null);
  } finally { db.close(); }
});

test("a changed original legacy field is rejected",()=>{
  const db=legacyDb();
  try {
    const snapshots=captureLegacyRows(db,[{table:"study_sessions",key:"id",value:"session-1"}]);
    db.exec("UPDATE study_sessions SET status='abandoned' WHERE id='session-1'");
    assert.throws(()=>assertLegacyRowsUnchanged(db,snapshots),/upgrade altered legacy study_sessions/);
  } finally { db.close(); }
});

test("expanded legacy snapshots retain TOPIK progress, FSRS, review, step, and reward rows",()=>{
  const db=new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE topik_owner_curriculum_progress(user_id TEXT,item_id TEXT,status TEXT); CREATE TABLE topik_owner_srs_cards(id INTEGER PRIMARY KEY,user_id TEXT,item_id TEXT,state TEXT); CREATE TABLE topik_owner_review_logs(id INTEGER PRIMARY KEY,card_id INTEGER,rating TEXT); CREATE TABLE review_logs(id INTEGER PRIMARY KEY,card_id INTEGER,rating TEXT); CREATE TABLE study_steps(id TEXT PRIMARY KEY,session_id TEXT,ordinal INTEGER); CREATE TABLE study_reward_events(user_id TEXT,learning_track TEXT,source_id TEXT,points INTEGER);");
    db.exec("INSERT INTO topik_owner_curriculum_progress VALUES('u','topik-owner-batch1-item-1-vocab','in_progress'); INSERT INTO topik_owner_srs_cards VALUES(21,'u','topik-owner-batch1-item-1-vocab','review'); INSERT INTO topik_owner_review_logs VALUES(22,21,'good'); INSERT INTO review_logs VALUES(23,24,'good'); INSERT INTO study_steps VALUES('step','session',0); INSERT INTO study_reward_events VALUES('u','jlpt-ja','reward',3);");
    const snapshots=captureLegacyRows(db,[{table:"topik_owner_curriculum_progress",key:"user_id",value:"u"},{table:"topik_owner_srs_cards",key:"id",value:"21"},{table:"topik_owner_review_logs",key:"id",value:"22"},{table:"review_logs",key:"id",value:"23"},{table:"study_steps",key:"id",value:"step"},{table:"study_reward_events",key:"user_id",value:"u"}]);
    assert.equal(snapshots.length,6);
    assertLegacyRowsUnchanged(db,snapshots);
    db.exec("UPDATE topik_owner_curriculum_progress SET status='completed' WHERE user_id='u'");
    assert.throws(()=>assertLegacyRowsUnchanged(db,snapshots),/topik_owner_curriculum_progress/);
  } finally { db.close(); }
});
