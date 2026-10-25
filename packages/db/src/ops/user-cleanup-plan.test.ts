import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import {
  buildUserCleanupPlan,
  buildExactUserDeleteSql,
  maskEmail,
  verifyUserCleanupPlanHash,
  type CleanupUserRow,
} from "./user-cleanup-plan.js";
import {
  collectRelatedCounts,
  requireExplicitDatabase,
  safeWranglerFailure,
  type QuerySource,
} from "./d1-user-cleanup.js";

test("requires an explicit validated D1 target for destructive cleanup tooling", () => {
  assert.equal(requireExplicitDatabase("nihongo-n3-prod-v2"), "nihongo-n3-prod-v2");
  assert.throws(() => requireExplicitDatabase(undefined), /explicit D1 name/);
  assert.throws(() => requireExplicitDatabase("../prod"), /invalid D1 database name/);
});

function user(id: string, email: string): CleanupUserRow {
  return {
    id,
    email,
    role: id === "real-1" ? "admin" : "user",
    auth_provider: "password",
    created_at: 1_700_000_000,
    last_login_at: null,
  };
}

test("builds a PII-minimized cleanup plan for two allowlisted users", () => {
  const plan = buildUserCleanupPlan({
    users: [
      user("real-1", "owner@gmail.com"),
      user("real-2", "learner@icloud.com"),
      user("test-1", "e2e-123@example.com"),
      user("test-2", "owner@nihongo-n3.local"),
    ],
    keepUserIds: ["real-1", "real-2"],
    relatedCounts: [
      {
        table: "users",
        total: 4,
        keepRows: 2,
        deleteRows: 2,
        unmatchedRows: 0,
      },
      {
        table: "auth_sessions",
        total: 3,
        keepRows: 1,
        deleteRows: 2,
        unmatchedRows: 0,
      },
    ],
    source: "backup",
    database: "nihongo-n3-prod",
    generatedAt: "2026-07-16T00:00:00.000Z",
  });

  assert.equal(plan.summary.keepUsers, 2);
  assert.equal(plan.summary.deleteCandidates, 2);
  assert.equal(plan.summary.deleteRelatedRows, 4);
  assert.equal(plan.keepUsers[0]?.emailHint, "ow***@gmail.com");
  assert.equal(verifyUserCleanupPlanHash(plan), true);
  assert.equal(JSON.stringify(plan).includes("owner@gmail.com"), false);
  assert.equal(JSON.stringify(plan).includes("learner@icloud.com"), false);
});

test("refuses to delete a user on an unrecognized domain", () => {
  assert.throws(
    () =>
      buildUserCleanupPlan({
        users: [
          user("real-1", "owner@gmail.com"),
          user("real-2", "learner@icloud.com"),
          user("unknown", "third@company.co.kr"),
        ],
        keepUserIds: ["real-1", "real-2"],
        relatedCounts: [],
        source: "remote",
        database: "nihongo-n3-prod",
      }),
    /refusing to classify non-test domains/,
  );
});

test("requires exactly two real-user allowlist entries", () => {
  assert.throws(
    () =>
      buildUserCleanupPlan({
        users: [
          user("real-1", "owner@gmail.com"),
          user("test-1", "e2e@example.com"),
        ],
        keepUserIds: ["real-1"],
        relatedCounts: [],
        source: "backup",
        database: "nihongo-n3-prod",
      }),
    /exactly two unique keep user IDs/,
  );
});

test("refuses to keep a recognized test account", () => {
  assert.throws(
    () =>
      buildUserCleanupPlan({
        users: [
          user("real-1", "owner@gmail.com"),
          user("test-1", "e2e@example.com"),
          user("test-2", "smoke@example.com"),
        ],
        keepUserIds: ["real-1", "test-1"],
        relatedCounts: [],
        source: "backup",
        database: "nihongo-n3-prod",
      }),
    /keep allowlist contains recognized test accounts/,
  );
});

test("detects a modified plan", () => {
  const plan = buildUserCleanupPlan({
    users: [
      user("real-1", "owner@gmail.com"),
      user("real-2", "learner@icloud.com"),
      user("test-1", "e2e@example.com"),
    ],
    keepUserIds: ["real-1", "real-2"],
    relatedCounts: [],
    source: "remote",
    database: "nihongo-n3-prod",
  });
  plan.deleteCandidates[0]!.role = "admin";
  assert.equal(verifyUserCleanupPlanHash(plan), false);
});

test("verifies the signed plan independently from operational evidence", () => {
  const plan = buildUserCleanupPlan({
    users: [
      user("real-1", "owner@gmail.com"),
      user("real-2", "learner@icloud.com"),
      user("test-1", "e2e@example.com"),
    ],
    keepUserIds: ["real-1", "real-2"],
    relatedCounts: [],
    source: "backup",
    database: "nihongo-n3-prod",
  });
  const report = {
    ...plan,
    backupEvidence: { manifestSha256: "evidence-only" },
  };
  assert.equal(verifyUserCleanupPlanHash(report), true);
});

test("masks short and malformed email addresses", () => {
  assert.equal(maskEmail("a@example.com"), "a***@example.com");
  assert.equal(maskEmail("invalid"), "***");
});

test("queries related user data one table at a time for remote D1", () => {
  const queries: string[] = [];
  const source: QuerySource = {
    query(sql) {
      queries.push(sql);
      const table = sql.match(/SELECT '([^']+)' AS table_name/)?.[1];
      return [{ table_name: table, total: 0, keep_rows: 0, delete_rows: 0 }];
    },
    close() {},
  };

  const counts = collectRelatedCounts(source, ["real-1", "real-2"], ["test-1"]);

  assert.equal(counts.length, 13);
  assert.equal(queries.length, 13);
  assert.equal(queries.every((query) => !query.includes("UNION ALL")), true);
  assert.equal(queries.every((query) => query.includes("AS keep_rows")), true);
  assert.equal(queries.every((query) => query.includes("AS delete_rows")), true);
});

test("redacts Wrangler command details from operational failures", () => {
  const error = safeWranglerFailure({
    stdout: JSON.stringify({
      error: {
        code: 7500,
        text: "request includes account and SQL identifiers",
      },
    }),
    message: "raw SQL and user IDs",
  });

  assert.equal(error.message, "Remote D1 operation failed (Cloudflare code 7500)");
  assert.equal(error.message.includes("raw SQL"), false);
  assert.equal(error.message.includes("user IDs"), false);
});

const exactKeep = ["real-1", "real-2"];
function exactInventory(): CleanupUserRow[] {
  return [
    user("real-1", "owner@gmail.com"),
    user("real-2", "learner@icloud.com"),
    user("test-1", "e2e-1760000000000-abc123@example.com"),
    user("test-2", "topik-1760000000001-def456@example.com"),
  ];
}

function exactCleanupDb(rows = exactInventory()): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  try {
    const dir = new URL("../../drizzle-v2/", import.meta.url);
    for (const file of readdirSync(dir).filter((name) => /^00\d\d_.*\.sql$/.test(name) && name <= "0033_account_personalization.sql").sort()) {
      db.exec(readFileSync(new URL(file, dir), "utf8").replaceAll("--> statement-breakpoint", ""));
    }
    // Only the new :memory: migration-bootstrap account exists at this point.
    assert.deepEqual(db.prepare("SELECT id FROM users").all().map((row) => row.id), ["owner"]);
    db.exec("PRAGMA foreign_keys=ON; DELETE FROM users WHERE id='owner';");
    db.exec(`INSERT INTO content_source_assets(id,asset_kind,source_url,license_id,license_url,attribution_text,allowed_use,source_sha256)
      VALUES('cleanup-source','self-authored-fixture','fixture:cleanup','fixture','fixture:license','synthetic','test','${"a".repeat(64)}');
      INSERT INTO topik_owner_authored_curriculum_units(id,target_grade,stable_ref,section,title_ko,title_ja,title_en,source_asset_id)
      VALUES('cleanup-unit',1,'cleanup-unit-ref','vocab','test','test','test','cleanup-source');
      INSERT INTO topik_owner_authored_curriculum_items(id,unit_id,target_grade,stable_ref,item_type,prompt_ko,prompt_ja,prompt_en,explanation_ko,explanation_ja,explanation_en,source_asset_id)
      VALUES('cleanup-item','cleanup-unit',1,'cleanup-item-ref','vocab','test','test','test','test','test','test','cleanup-source');`);
    for (const row of rows) {
      db.prepare("INSERT INTO users(id,email,display_name,role,auth_provider,created_at,last_login_at) VALUES(?,?,?,?,?,?,?)")
        .run(row.id, row.email, "Synthetic cleanup fixture", row.role, row.auth_provider, row.created_at, row.last_login_at);
      db.prepare("INSERT INTO srs_cards(user_id,item_type,item_id,state,stability,reps) VALUES(?,'vocab',1,'review',12.5,9)").run(row.id);
      db.prepare("INSERT INTO daily_logs(user_id,date,items_new,items_review) VALUES(?,'2026-10-14',7,11)").run(row.id);
      db.prepare("INSERT INTO topik_owner_curriculum_progress(user_id,item_id,status,completed_at) VALUES(?,'cleanup-item','completed',1700000001)").run(row.id);
      db.prepare("INSERT INTO topik_owner_srs_cards(user_id,item_id,state,stability,reps) VALUES(?,'cleanup-item','review',8.5,6)").run(row.id);
      db.prepare("INSERT INTO login_events(user_id,email,provider,event_type) VALUES(?,?,'password','login_success')").run(row.id, row.email);
      db.prepare("INSERT INTO account_preferences(user_id,theme,updated_at) VALUES(?,'dark',1)").run(row.id);
      db.prepare("INSERT INTO account_avatars(user_id,jpeg,updated_at) VALUES(?,?,1)").run(row.id, new Uint8Array([255,216,255,217]));
    }
    return db;
  } catch (error) { db.close(); throw error; }
}

test("exact cleanup only accepts the approved synthetic pattern and plan invariants", () => {
  for (const email of ["e2e@example.com", "person@example.com", "e2e-123-ab@example.com", "e2e-1760000000000-a-b@example.com", "e2e-1760000000000-ABC@example.com", "e2e-1760000000000-abc@example.com\n", "owner@nihongo-n3.local"]) {
    const rows = exactInventory(); rows[2]!.email = email;
    assert.throws(() => buildExactUserDeleteSql(rows, exactKeep), /approved synthetic/);
  }
  for (const patch of [{ role: "admin" }, { auth_provider: "google" }, { created_at: NaN }, { created_at: 1.5 }, { created_at: Number.MAX_SAFE_INTEGER + 1 }, { id: "nul\0id" }]) {
    const rows = exactInventory(); Object.assign(rows[2]!, patch);
    assert.throws(() => buildExactUserDeleteSql(rows, exactKeep));
  }
  assert.throws(() => buildExactUserDeleteSql(exactInventory(), ["real-1"]), /exactly two/);
  assert.throws(() => buildExactUserDeleteSql(exactInventory(), ["real-1", "absent"]), /missing/);
  assert.throws(() => buildExactUserDeleteSql([...exactInventory(), exactInventory()[2]!], exactKeep), /duplicate/);
  assert.throws(() => buildExactUserDeleteSql(exactInventory().slice(0, 2), exactKeep), /no delete/);
});

test("0033 exact cleanup preserves real SRS/progress and nulls rather than deletes login audit rows", () => {
  const rows = exactInventory(), db = exactCleanupDb(rows);
  try {
    const tables = ["users", "srs_cards", "daily_logs", "topik_owner_curriculum_progress", "topik_owner_srs_cards", "account_preferences", "account_avatars"];
    const snapshot = () => tables.map((table) => db.prepare(`SELECT * FROM ${table} WHERE ${table === "users" ? "id" : "user_id"} IN ('real-1','real-2') ORDER BY 1`).all());
    const before = snapshot(), auditBefore = db.prepare("SELECT * FROM login_events ORDER BY id").all();
    const deleted = db.prepare(buildExactUserDeleteSql(rows, exactKeep)).all().map((row) => row.id).sort();
    assert.deepEqual(deleted, ["test-1", "test-2"]);
    assert.deepEqual(snapshot(), before);
    for (const table of tables) assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()!.n, 2);
    assert.deepEqual(db.prepare("SELECT * FROM login_events ORDER BY id").all().map((row) => ({ ...row })), auditBefore.map((row) => ({ ...row, user_id: String(row.user_id).startsWith("test-") ? null : row.user_id })));
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    assert.equal(db.prepare("PRAGMA integrity_check").get()!.integrity_check, "ok");
    assert.deepEqual(db.prepare(buildExactUserDeleteSql(rows, exactKeep)).all(), [], "stale rerun deletes nothing");
  } finally { db.close(); }
});

test("exact cleanup fails closed for every identity field, keep identity drift, and inventory count drift", () => {
  const drifts = [
    "UPDATE users SET id='changed' WHERE id='test-1'",
    "UPDATE users SET email='e2e-1760000000000-drift@example.com' WHERE id='test-1'",
    "UPDATE users SET role='admin' WHERE id='test-1'",
    "UPDATE users SET auth_provider='google' WHERE id='test-1'",
    "UPDATE users SET created_at=created_at+1 WHERE id='test-1'",
    "UPDATE users SET email='changed@gmail.com' WHERE id='real-1'",
    "INSERT INTO users(id,email,display_name) VALUES('extra','extra@example.com','extra')",
    "DELETE FROM users WHERE id='test-1'",
    "UPDATE users SET email='temporary@example.com' WHERE id='test-1'; UPDATE users SET email='e2e-1760000000000-abc123@example.com' WHERE id='test-2'; UPDATE users SET email='topik-1760000000001-def456@example.com' WHERE id='test-1'",
  ];
  for (const drift of drifts) {
    const rows = exactInventory(), db = exactCleanupDb(rows);
    try {
      // Identity-ID mutation alone needs temporarily deferred FK validation;
      // all actual cleanup executions below run with enforcement enabled.
      if (drift.startsWith("UPDATE users SET id=")) db.exec("PRAGMA defer_foreign_keys=ON; BEGIN;");
      db.exec(drift);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
      const snapshot = () => tables.map(({ name }) => db.prepare(`SELECT * FROM "${name}"`).all().sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
      const before = snapshot();
      assert.deepEqual(db.prepare(buildExactUserDeleteSql(rows, exactKeep)).all(), []);
      assert.deepEqual(snapshot(), before, "failed guard must not modify any table");
    } finally { db.close(); }
  }
});

test("exact cleanup escapes identity SQL metacharacters without broadening deletion", () => {
  const rows = exactInventory(); rows[2]!.id = "synthetic'); DELETE FROM users; --";
  const db = exactCleanupDb(rows);
  try {
    assert.deepEqual(db.prepare(buildExactUserDeleteSql(rows, exactKeep)).all().map((row) => row.id).sort(), [rows[2]!.id, "test-2"].sort());
    assert.deepEqual(db.prepare("SELECT id FROM users ORDER BY id").all().map((row) => row.id), exactKeep);
  } finally { db.close(); }
});

test("a restrictive foreign key aborts the entire cleanup statement without partial cascades", () => {
  const rows = exactInventory(), db = exactCleanupDb(rows);
  try {
    // Model an unexpected restrictive owner reference without bypassing schema FKs.
    db.exec("CREATE TABLE cleanup_restrict_probe(user_id TEXT REFERENCES users(id) ON DELETE RESTRICT); INSERT INTO cleanup_restrict_probe VALUES('test-2');");
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    const snapshot = () => tables.map(({ name }) => db.prepare(`SELECT * FROM "${name}"`).all().sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
    const before = snapshot();
    assert.throws(() => db.prepare(buildExactUserDeleteSql(rows, exactKeep)).all(), /FOREIGN KEY constraint failed/);
    assert.deepEqual(snapshot(), before);
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally { db.close(); }
});
