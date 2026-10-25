import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
test('0033 additive upgrade preserves all existing rows and constrains private account data',async()=>{
  const dir=new URL('../../drizzle-v2/',import.meta.url), db=new DatabaseSync(':memory:');
  try {
    for(const file of (await readdir(dir)).filter(f=>/^\d{4}_.*sql$/.test(f)&&f<'0033').sort()) db.exec((await readFile(new URL(file,dir),'utf8')).replaceAll('--> statement-breakpoint',''));
    db.exec("PRAGMA foreign_keys=ON; INSERT INTO users(id,email,display_name) VALUES('upgrade-account','upgrade@example.invalid','Test'); INSERT INTO daily_logs(user_id,learning_track,date,items_new) VALUES('upgrade-account','jlpt-ja','2026-10-14',1)");
    const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as {name:string}[];
    const snapshot=()=>tables.map(({name})=>({name,rows:db.prepare(`SELECT * FROM "${name}"`).all()}));
    const before=snapshot();
    db.exec(await readFile(new URL('0033_account_personalization.sql',dir),'utf8'));
    assert.deepEqual(snapshot(),before);
    assert.equal(db.prepare("SELECT count(*) AS count FROM sqlite_schema WHERE type='trigger' AND name IN ('quiz_attempts_no_replace','quiz_attempts_snapshot_immutable','quiz_attempts_finished_immutable','quiz_attempts_publication_insert','quiz_attempts_publication_grade')").get()?.count,5,'0033 must retain the 0032 publication guards');
    db.exec("INSERT INTO account_preferences(user_id,updated_at) VALUES('upgrade-account',1)");
    assert.throws(()=>db.exec("UPDATE account_preferences SET reminder_time='24:00'"),/CHECK/);
    assert.throws(()=>db.exec("UPDATE account_preferences SET reminder_time='07:03'"),/CHECK/);
    assert.throws(()=>db.exec("INSERT INTO account_avatars VALUES('upgrade-account','not a blob',1)"),/CHECK/);
    db.prepare('INSERT INTO account_avatars VALUES(?,?,?)').run('upgrade-account',new Uint8Array([255,216,255,217]),1);
    assert.throws(()=>db.prepare('INSERT INTO account_avatars VALUES(?,?,?)').run('upgrade-account',new Uint8Array(131073),2));
    db.exec("INSERT INTO custom_reminder_deliveries VALUES('endpoint','2026-10-14','upgrade-account','claimed',1,NULL)");
    assert.throws(()=>db.exec("INSERT INTO custom_reminder_deliveries VALUES('endpoint','2026-10-14','upgrade-account','sent',2,2)"),/UNIQUE/);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{db.close();}
});
