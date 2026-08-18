import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUserCleanupPlan,
  maskEmail,
  verifyUserCleanupPlanHash,
  type CleanupUserRow,
} from "./user-cleanup-plan.js";
import {
  collectRelatedCounts,
  safeWranglerFailure,
  type QuerySource,
} from "./d1-user-cleanup.js";

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
