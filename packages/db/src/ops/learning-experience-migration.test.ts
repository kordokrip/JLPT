import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

test("0028 upgrades 0000–0027 without replacing content, FSRS, progress, or history", async () => {
  const dir = new URL("../../drizzle-v2/", import.meta.url);
  const db = new DatabaseSync(":memory:");
  try {
    for (const name of (await readdir(dir))
      .filter((n) => /^00\d\d_.*\.sql$/.test(n) && n < "0028")
      .sort()) {
      db.exec(
        (await readFile(new URL(name, dir), "utf8")).replaceAll(
          "--> statement-breakpoint",
          "",
        ),
      );
    }
    const fixtureCounts = {
      users: 2,
      track_srs_settings: 3,
      vocab: 1,
      daily_logs: 3,
      srs_cards: 2,
      review_logs: 2,
      topik_owner_curriculum_progress: 1,
      topik_owner_srs_cards: 1,
      topik_owner_review_logs: 1,
      quiz_attempts: 2,
      learning_activity_events: 3,
    };
    const baselineCounts = Object.fromEntries(Object.keys(fixtureCounts).map((table) => [
      table, Number(db.prepare(`SELECT count(*) AS n FROM "${table}"`).get()?.n),
    ]));
    // Synthetic pre-upgrade accounts, never a Production export. The active
    // track differs from some stored history so neither track can be reset.
    db.exec(`
      PRAGMA foreign_keys=ON;
      INSERT INTO users(id,email,display_name,learning_track,fsrs_options,fsrs_weights,srs_settings,created_at,updated_at)
      VALUES('upgrade-test','upgrade@example.invalid','Test','topik-ko','{"desiredRetention":0.93}','[0.4,0.6]','{"dailyNewLimit":17}',1788000000,1788500000),
            ('upgrade-other','other@example.invalid','Other','jlpt-ja','{"desiredRetention":0.87}','[0.5,0.7]','{"dailyNewLimit":9}',1788000001,1788500001);
      INSERT INTO track_srs_settings(user_id,learning_track,fsrs_options,fsrs_weights,srs_settings,created_at,updated_at)
      VALUES('upgrade-test','jlpt-ja','{"desiredRetention":0.91}','[0.4,0.8]','{"dailyNewLimit":13}',1788000000,1788500000),
            ('upgrade-test','topik-ko','{"desiredRetention":0.95}','[0.6,0.9]','{"dailyNewLimit":7}',1788000000,1788500002),
            ('upgrade-other','jlpt-ja','{"desiredRetention":0.87}','[0.5,0.7]','{"dailyNewLimit":9}',1788000001,1788500001);
      INSERT INTO sources(id,code,title,file_path) VALUES(51,'upgrade-source','Synthetic upgrade source','fixture://upgrade');
      INSERT INTO vocab(id,source_id,level,ja,kana,ko,pos) VALUES(51,51,'N3','記録','きろく','기록','noun');
      INSERT INTO daily_logs(id,user_id,learning_track,date,notes,items_new,items_review,accuracy,time_min,audio_min,created_at,updated_at)
      VALUES(61,'upgrade-test','jlpt-ja','2026-09-05','日本語 기록 keep exactly',2,5,0.8,17.5,2.25,1788500000,1788500010),
            (62,'upgrade-test','topik-ko','2026-09-05','한국어 메모 preserve separately',3,8,0.75,21.5,1.25,1788500000,1788500020),
            (63,'upgrade-other','jlpt-ja','2026-09-05','other account note',1,2,1.0,10,0,1788500001,1788500011);
      INSERT INTO srs_cards(id,user_id,learning_track,item_type,item_id,state,reps,lapses,stability,difficulty,due_at,last_reviewed_at,learning_steps_idx,desired_retention,created_at,updated_at)
      VALUES(41,'upgrade-test','jlpt-ja','vocab',51,'review',7,2,12.75,6.25,1789650000,1788550000,1,0.93,1788000000,1788550000),
            (42,'upgrade-other','jlpt-ja','vocab',51,'learning',2,1,3.5,4.75,1788650000,1788550010,0,0.87,1788000001,1788550010);
      INSERT INTO review_logs(id,card_id,rating,elapsed_days,scheduled_days,response_ms,reviewed_at)
      VALUES(71,41,'good',4,13,1800,1788550000),(72,42,'hard',1,2,2700,1788550010);
      INSERT INTO content_source_assets(id,asset_kind,source_url,license_id,license_url,attribution_text,allowed_use,source_sha256)
      VALUES('upgrade-asset','self-authored-fixture','fixture://upgrade','owner-test','fixture://license','Synthetic fixture','test-only','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      INSERT INTO topik_owner_authored_curriculum_units(id,target_grade,stable_ref,section,title_ko,title_ja,title_en,source_asset_id)
      VALUES('upgrade-unit',3,'topik-ko:unit:upgrade:v1','vocab','기록','記録','Record','upgrade-asset');
      INSERT INTO topik_owner_authored_curriculum_items(id,unit_id,target_grade,stable_ref,item_type,prompt_ko,prompt_ja,prompt_en,answer_json,explanation_ko,explanation_ja,explanation_en,source_asset_id)
      VALUES('upgrade-item','upgrade-unit',3,'topik-ko:item:upgrade:v1','vocab','기록','記録','Record','{"answer":"기록"}','설명','説明','Explanation','upgrade-asset');
      INSERT INTO topik_owner_curriculum_progress(user_id,item_id,status,completed_at,last_studied_at,created_at,updated_at)
      VALUES('upgrade-test','upgrade-item','completed',1788400000,1788550020,1788000000,1788550020);
      INSERT INTO topik_owner_srs_cards(id,user_id,item_id,state,reps,lapses,stability,difficulty,due_at,last_reviewed_at,learning_steps_idx,desired_retention,created_at,updated_at)
      VALUES(41,'upgrade-test','upgrade-item','relearning',11,3,18.5,7.25,1789750000,1788550020,1,0.95,1788000000,1788550020);
      INSERT INTO topik_owner_review_logs(id,card_id,rating,elapsed_days,scheduled_days,response_ms,reviewed_at)
      VALUES(71,41,'again',6,1,3200,1788550020);
      INSERT INTO quiz_attempts(id,user_id,learning_track,quiz_type,mode,level,total,correct,score,duration_sec,detail_json,questions_json,started_at,finished_at,created_at,updated_at)
      VALUES(81,'upgrade-test','jlpt-ja','practice','vocab_mc','N3',1,1,100,24,'[{"question_id":"q-51","answer":"記録","correct":true}]','[{"id":"q-51","item_id":51}]','2026-09-05T02:00:00Z','2026-09-05T02:00:24Z',1788550000,1788550024),
            (82,'upgrade-test','topik-ko','practice',NULL,'3',1,0,0,31,'[{"question_id":"topik-51","answer":"초안","correct":false}]','[{"id":"topik-51","item_id":"upgrade-item"}]','2026-09-05T03:00:00Z','2026-09-05T03:00:31Z',1788553600,1788553631);
      INSERT INTO learning_activity_events(id,event_id,user_id,learning_track,event_type,content_type,content_id,level_tag,section,correct,rating,duration_ms,occurred_at)
      VALUES(91,'quiz:81:q-51','upgrade-test','jlpt-ja','quiz_answered','vocab','51','N3','vocab',1,NULL,24000,1788550024),
            (92,'topik-complete:upgrade-item','upgrade-test','topik-ko','content_completed','topik-owner-item','upgrade-item','grade-3','vocab',NULL,NULL,1200,1788400000),
            (93,'topik-review:41:rep:11','upgrade-test','topik-ko','review_rated','topik-owner-item','upgrade-item','grade-3','vocab',NULL,'again',3200,1788550020);
    `);
    // Guard against accidentally returning to empty-table preservation tests.
    for (const [table, count] of Object.entries(fixtureCounts)) {
      assert.equal(db.prepare(`SELECT count(*) AS n FROM "${table}"`).get()?.n, baselineCounts[table]! + count, table);
    }
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%fts%' ORDER BY name",
      )
      .all() as Array<{ name: string }>;
    const snapshot = () =>
      tables.map(({ name }) => ({
        name,
        rows: db.prepare(`SELECT * FROM "${name}"`).all(),
      }));
    const before = snapshot();
    const fkBefore = db.prepare("PRAGMA foreign_key_check").all();
    assert.deepEqual(fkBefore, [], "legacy fixtures must be valid before upgrade");
    db.exec(
      await readFile(new URL("0028_learning_experience.sql", dir), "utf8"),
    );
    assert.deepEqual(snapshot(), before);
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), fkBefore);
    assert.equal(
      db.prepare("SELECT count(*) AS n FROM study_sessions").get()?.n,
      0,
    );
    assert.throws(
      () =>
        db.exec(
          "INSERT INTO learning_profiles VALUES('upgrade-test','jlpt-ja','6','ko',20,'Asia/Seoul',1)",
        ),
      /CHECK/,
    );
    db.exec(
      "INSERT INTO learning_profiles VALUES('upgrade-test','jlpt-ja','N3','ko',20,'Asia/Seoul',1)",
    );
    assert.throws(
      () =>
        db.exec(
          "INSERT INTO learning_profiles VALUES('missing','jlpt-ja','N3','ko',20,'Asia/Seoul',1)",
        ),
      /FOREIGN KEY/,
    );
    db.exec(
      "INSERT INTO study_sessions VALUES('session','upgrade-test','jlpt-ja','N3',20,'active','request','[]',1,1)",
    );
    db.exec(
      "INSERT INTO study_steps(id,session_id,ordinal,phase,content_ref,content_type,content_id,section,level,public_json,solution_json) VALUES('step','session',0,'learn','jlpt-ja:vocab:1:v1','vocab','1','vocab','N3','{}','{}')",
    );
    db.exec("BEGIN");
    db.exec("UPDATE study_steps SET request_id='accepted' WHERE id='step'");
    assert.throws(
      () =>
        db.exec(
          "UPDATE study_steps SET request_id='duplicate' WHERE id='step'",
        ),
      /already submitted/,
    );
    db.exec("ROLLBACK");
    assert.equal(
      db.prepare("SELECT request_id FROM study_steps WHERE id='step'").get()
        ?.request_id,
      null,
    );
    db.exec("UPDATE study_sessions SET status='abandoned' WHERE id='session'");
    assert.throws(
      () => db.exec("UPDATE study_steps SET request_id='stale' WHERE id='step'"),
      /session is closed/,
    );
    assert.equal(db.prepare("SELECT request_id FROM study_steps WHERE id='step'").get()?.request_id, null);
    db.exec(
      "INSERT INTO study_sessions VALUES('next','upgrade-test','jlpt-ja','N3',20,'active','next-request','[]',2,2)",
    );
    assert.deepEqual(snapshot(), before);
  } finally {
    db.close();
  }
});
