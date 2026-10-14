// 강성호 2026-10-11: 실제 Miniflare metadata 파일 때문에 정상 D1을 둘로 오인하는 준비 단계 회귀를 방지한다.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { assertReviewedBootstrapRecords, assertReviewedBootstrapUsers, reviewedD1DatabaseName } from "./seed-reviewed-learning-e2e-fixture.js";
const data = `${"a".repeat(64)}.sqlite`;
test("reviewed D1 selects its sole hashed data file rather than metadata or journals", () => {
  assert.equal(reviewedD1DatabaseName([data, "metadata.sqlite", `${data}-wal`, "metadata.sqlite-shm"]), data);
});
test("reviewed bootstrap preserves only the credential-free migration owner, not learner accounts", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE users(id TEXT,email TEXT,display_name TEXT,role TEXT,auth_provider TEXT,password_hash TEXT,google_sub TEXT,last_login_at INTEGER,fsrs_options TEXT,fsrs_weights TEXT,srs_settings TEXT,learning_track TEXT DEFAULT 'jlpt-ja')");
    assertReviewedBootstrapUsers(db);
    db.exec("INSERT INTO users(id,email,display_name,role,auth_provider) VALUES('owner','owner@nihongo-n3.local','Owner','admin','password')");
    assertReviewedBootstrapUsers(db);
    assert.equal(db.prepare("SELECT count(*) n FROM users").get()!.n, 1);
    db.exec("UPDATE users SET learning_track='topik-ko'");
    assert.throws(() => assertReviewedBootstrapUsers(db), /existing learner accounts/);
    db.exec("UPDATE users SET learning_track='jlpt-ja'");
    db.exec("UPDATE users SET password_hash='not-a-real-secret'");
    assert.throws(() => assertReviewedBootstrapUsers(db), /existing learner accounts/);
    db.exec("UPDATE users SET password_hash=NULL; INSERT INTO users(id) VALUES('learner')");
    assert.throws(() => assertReviewedBootstrapUsers(db), /existing learner accounts/);
  } finally { db.close(); }
});
test("reviewed bootstrap rejects quiz, authentication, profile and dependent records without deleting them", () => {
  for (const [table, column] of [["quiz_attempts", "user_id"], ["self_check", "user_id"], ["auth_sessions", "user_id"], ["learning_profiles", "user_id"], ["future_owned_records", "user_id"], ["study_steps", "session_id"], ["review_logs", "card_id"], ["oauth_states", "id"]]) {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`CREATE TABLE ${table}(${column} TEXT)`);
      assertReviewedBootstrapRecords(db);
      db.exec(`INSERT INTO ${table} VALUES('synthetic')`);
      assert.throws(() => assertReviewedBootstrapRecords(db), /existing learner records/);
      assert.equal(db.prepare(`SELECT count(*) n FROM ${table}`).get()!.n, 1);
    } finally { db.close(); }
  }
});
test("actual 0000–0031 bootstrap owner and empty copied settings pass; changed settings fail", () => {
  const db = new DatabaseSync(":memory:");
  try {
    const dir = new URL("../../drizzle-v2/", import.meta.url);
    for (const name of readdirSync(dir).filter(name => /^00\d\d_.*\.sql$/u.test(name) && Number(name.slice(0, 4)) <= 31).sort())
      db.exec(readFileSync(new URL(name, dir), "utf8").replaceAll("--> statement-breakpoint", ""));
    assertReviewedBootstrapUsers(db);
    assertReviewedBootstrapRecords(db);
    assert.equal(db.prepare("SELECT count(*) n FROM track_srs_settings").get()!.n, 1);
    db.exec("UPDATE track_srs_settings SET srs_settings='changed'");
    assert.throws(() => assertReviewedBootstrapRecords(db), /existing learner settings/);
    assert.equal(db.prepare("SELECT srs_settings FROM track_srs_settings").get()!.srs_settings, "changed");
  } finally { db.close(); }
});
test("reviewed D1 rejects missing, ambiguous and unknown SQLite targets", () => {
  for (const names of [["metadata.sqlite"], [data, `${"b".repeat(64)}.sqlite`], [data, "unknown.sqlite"]])
    assert.throws(() => reviewedD1DatabaseName(names), /exactly one isolated Worker D1 data/);
});
