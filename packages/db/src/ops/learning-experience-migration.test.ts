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
    db.exec(
      "PRAGMA foreign_keys=ON; INSERT INTO users(id,email,display_name) VALUES('upgrade-test','upgrade@example.invalid','Test');",
    );
    db.exec(
      "INSERT INTO daily_logs(user_id,date,notes,items_review) VALUES('upgrade-test','2026-09-06','preserve exactly',5);",
    );
    db.exec(
      "INSERT INTO srs_cards(user_id,learning_track,item_type,item_id,reps,stability,due_at) VALUES('upgrade-test','jlpt-ja','vocab',1,7,12.75,1788650000);",
    );
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
