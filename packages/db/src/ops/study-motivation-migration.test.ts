import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

test('0029 preserves existing sessions and history; cap clamps without blocking learning', async () => {
  const dir = new URL('../../drizzle-v2/', import.meta.url);
  const db = new DatabaseSync(':memory:');
  try {
    for (const name of (await readdir(dir)).filter((n) => /^00\d\d_.*\.sql$/.test(n) && n < '0029').sort()) {
      db.exec((await readFile(new URL(name, dir), 'utf8')).replaceAll('--> statement-breakpoint', ''));
    }
    db.exec(`PRAGMA foreign_keys=ON;
      INSERT INTO users(id,email,display_name) VALUES('rewards-owner','rewards@example.invalid','Test');
      INSERT INTO study_sessions(id,user_id,learning_track,level,daily_minutes,status,request_id,created_at,updated_at)
      VALUES('old-session','rewards-owner','jlpt-ja','N3',20,'active','old-request',1,2);
      INSERT INTO study_steps(id,session_id,ordinal,phase,content_ref,content_type,content_id,section,level,public_json,solution_json)
      VALUES('old-step','old-session',0,'learn','old-ref','vocab','1','vocab','N3','{}','{}');
      INSERT INTO daily_logs(user_id,learning_track,date,items_new) VALUES('rewards-owner','jlpt-ja','2026-09-24',1);`);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%fts%' AND name<>'study_sessions' ORDER BY name").all() as {name:string}[];
    const snapshot = () => tables.map(({name}) => ({ name, rows: db.prepare(`SELECT * FROM "${name}"`).all() }));
    const before = snapshot();
    const sessions = db.prepare('SELECT * FROM study_sessions').all();
    db.exec(await readFile(new URL('0029_study_motivation.sql', dir), 'utf8'));
    assert.deepEqual(snapshot(), before);
    assert.deepEqual(db.prepare('SELECT * FROM study_sessions').all().map((s) => ({...s})), sessions.map((s) => ({...s,mode:'daily'})));
    assert.equal(db.prepare('SELECT count(*) AS n FROM study_reward_events').get()?.n, 0, 'no retroactive XP');
    const insert = db.prepare("INSERT INTO study_reward_events VALUES('rewards-owner','jlpt-ja',?,'learn','2026-09-25','Asia/Seoul',5,10)");
    for (let n=0;n<21;n++) insert.run('source-'+n);
    assert.equal(db.prepare('SELECT sum(points) AS xp FROM study_reward_events').get()?.xp, 100);
    assert.equal(db.prepare("SELECT points FROM study_reward_events WHERE source_id='source-20'").get()?.points, 0);
    db.exec("UPDATE study_steps SET request_id='accepted',submitted_at=10 WHERE id='old-step'");
    assert.equal(db.prepare("SELECT request_id FROM study_steps WHERE id='old-step'").get()?.request_id, 'accepted');
    assert.throws(() => insert.run('source-0'), /UNIQUE/);
    db.exec("INSERT INTO study_reward_events VALUES('rewards-owner','topik-ko','source-0','review','2026-09-25','Asia/Tokyo',3,10)");
    assert.equal(db.prepare("SELECT sum(points) AS xp FROM study_reward_events WHERE learning_track='topik-ko'").get()?.xp, 3);
    assert.throws(() => db.exec("UPDATE study_sessions SET mode='invalid'"), /CHECK/);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { db.close(); }
});
