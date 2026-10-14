// 강성호 2026-10-13: INC-QUIZ-098의 additive 보존, typed ID, 버전/철회 경쟁과 원자적 rollback 회귀. 합성 DB만 사용한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync,readdirSync } from 'node:fs';
const directory=new URL('../../drizzle-v2/',import.meta.url);
const migration=readFileSync(new URL('0032_quiz_publication_guards.sql',directory),'utf8');
function fixture(){
 const db=new DatabaseSync(':memory:');
 for(const file of readdirSync(directory).filter(f=>/^\d{4}_.*\.sql$/.test(f)&&f.slice(0,4)<='0031').sort())db.exec(readFileSync(new URL(file,directory),'utf8').replaceAll('--> statement-breakpoint',''));
 db.exec(`INSERT INTO content_releases(id,learning_track,content_version,release_state,manifest_sha256,parser_version) VALUES('test-release','jlpt-ja','test-version','published','${'f'.repeat(64)}','test-only');
 INSERT INTO content_release_quality_requirements(release_id,content_type,expected_audit_count,validator_version) VALUES('test-release','jlpt-quiz',1,'test-only');
 INSERT INTO content_quality_audits(id,learning_track,content_type,content_id,content_version,evidence_sha256,validator_version,automated_status,author_review_status,adversarial_review_status,author_reviewer,adversarial_reviewer,release_state,checked_at) VALUES('test-audit','jlpt-ja','jlpt-quiz','123','test-version','${'f'.repeat(64)}','test-only','passed','signed','signed','test-a','test-b','published','2026-10-13');
 INSERT INTO content_release_quality_audit_links(release_id,audit_id) VALUES('test-release','test-audit');`);
 const choices=['가','나','다','라'].map(x=>({ko:x,ja:x,en:x}));
 db.prepare(`INSERT INTO jlpt_practice_questions(id,level,mode,skill,difficulty,prompt_ko,prompt_ja,prompt_en,choices_json,answer_index,explanation_ko,explanation_ja,explanation_en,source_code,source_evidence_sha256,bank_version,is_published) VALUES('123','N2','vocab_mc','test',1,'테스트','テスト','Test',?,0,'설명','説明','Explanation','test-only',?,'test-version',1)`).run(JSON.stringify(choices),'f'.repeat(64));
 return db;
}
const canonical={id:'q-numeric',type:'vocab_mc',item_id:123,answer:'나'};
const authored={id:'q-text',type:'vocab_mc',item_id:'123',bank_version:'test-version',answer:'가'};
function insert(db:DatabaseSync,questions:unknown,level='N2',mode='vocab_mc'){
 return Number(db.prepare(`INSERT INTO quiz_attempts(user_id,learning_track,quiz_type,mode,level,total,correct,questions_json) VALUES('owner','jlpt-ja','vocab_mc',?,?,?,0,?)`).run(mode,level,Array.isArray(questions)?questions.length:1,JSON.stringify(questions)).lastInsertRowid);
}
test('0032 changes no learner row or regular table, and preserves legacy NULL summary rows',()=>{
 const db=fixture();try{
  insert(db,[authored,canonical]);
  db.exec(`INSERT INTO quiz_attempts(user_id,learning_track,quiz_type,total,correct,detail_json,finished_at) VALUES('owner','jlpt-ja','practice',1,1,'[]','2026-10-13');`);
  const before=db.prepare('SELECT * FROM quiz_attempts ORDER BY id').all();
  const tables=db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all();
  db.exec(migration);
  assert.deepEqual(db.prepare('SELECT * FROM quiz_attempts ORDER BY id').all(),before);
  assert.deepEqual(db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all(),tables);
  assert.equal(db.prepare("SELECT count(*) n FROM sqlite_schema WHERE type='trigger' AND name LIKE 'quiz_attempts_%'").get()!.n,5);
 }finally{db.close();}
});
test('0032 rejects malformed snapshots and unavailable/mismatched typed refs',async t=>{
 const db=fixture();try{db.exec(migration);
  const invalid:[string,unknown][]=[['non-array',{}],['primitive',[1]],['missing id',[{...authored,id:undefined}]],['missing ref',[{...authored,item_id:undefined}]],['null ref',[{...authored,item_id:null}]],['object ref',[{...authored,item_id:{}}]],['boolean ref',[{...authored,item_id:true}]],['real ref',[{...canonical,item_id:1.5}]],['zero ref',[{...canonical,item_id:0}]],['null version',[{...authored,bank_version:null}]],['empty version',[{...authored,bank_version:''}]],['wrong version',[{...authored,bank_version:'wrong'}]],['missing bank',[{...authored,item_id:'missing'}]],['wrong type',[{...authored,type:'listening'}]],['duplicate',[authored,authored]]];
  for(const [name,value]of invalid)await t.test(name,()=>assert.throws(()=>insert(db,value),/Quiz (snapshot invalid|content unavailable)/));
  assert.throws(()=>insert(db,[authored],'N1'),/content unavailable/);
  assert.throws(()=>insert(db,[authored],'N2','grammar_fill'),/snapshot invalid/);
  const legacy={...authored};delete (legacy as {bank_version?:string}).bank_version;
  assert.ok(insert(db,[legacy])>0,'legacy versionless static accepted only while exact row is public');
  db.exec("UPDATE jlpt_practice_questions SET is_published=0 WHERE id='123'");
  assert.throws(()=>insert(db,[authored,canonical]),/content unavailable/);
  assert.ok(insert(db,[canonical])>0,'numeric canonical is not coerced into text static');
 }finally{db.close();}
});
test('0032 blocks snapshot replacement and rolls back all grading/activity writes after withdrawal',()=>{
 const db=fixture();try{
  const id=insert(db,[authored,canonical]);db.exec(migration);
  assert.throws(()=>db.prepare('UPDATE quiz_attempts SET questions_json=? WHERE id=?').run(JSON.stringify([canonical]),id),/snapshot immutable/);
  assert.throws(()=>db.prepare("INSERT OR REPLACE INTO quiz_attempts(id,user_id,learning_track,quiz_type,total,correct,finished_at) VALUES(?,'owner','jlpt-ja','practice',1,0,'2026-10-13')").run(id),/snapshot immutable/);
  db.exec("UPDATE jlpt_practice_questions SET is_published=0 WHERE id='123'");
  const before=db.prepare('SELECT * FROM quiz_attempts WHERE id=?').get(id);
  db.exec('BEGIN');try{
   assert.throws(()=>db.prepare("UPDATE quiz_attempts SET correct=1,detail_json='[]',finished_at='2026-10-13' WHERE id=?").run(id),/content unavailable/);
  }finally{db.exec('ROLLBACK');}
  assert.deepEqual(db.prepare('SELECT * FROM quiz_attempts WHERE id=?').get(id),before);
  const numeric=insert(db,[canonical]);
  db.prepare("UPDATE quiz_attempts SET correct=1,detail_json='[]',finished_at='2026-10-13' WHERE id=?").run(numeric);
  assert.throws(()=>db.prepare('UPDATE quiz_attempts SET correct=0 WHERE id=?').run(numeric),/finished result immutable/);
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
 }finally{db.close();}
});
test('installed Wrangler splits 0032 into complete trigger statements',async()=>{
 const {unstable_splitSqlQuery}=await import('wrangler');
 const db=fixture();try{
  const statements=unstable_splitSqlQuery(migration);
  assert.equal(statements.filter(sql=>/^END\s*;?$/i.test(sql.trim())).length,0);
  assert.equal(statements.filter(sql=>/^CREATE TRIGGER\b/i.test(sql.trim())).length,5);
  for(const sql of statements)db.exec(sql);
  assert.ok(insert(db,[canonical])>0);
 }finally{db.close();}
});
