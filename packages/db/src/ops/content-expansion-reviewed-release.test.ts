import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  CONTENT_EXPANSION_RELEASE_GROUP_ID,
  CONTENT_EXPANSION_VALIDATOR_VERSION,
  JLPT_N3_PRACTICE_RELEASE_ID,
  TOPIK_OWNER_BATCH_5_RELEASE_ID,
  buildContentExpansionReviewedReleasePlan,
} from "../seed/content-expansion-reviewed-release.js";

function fixture(): {
  directory: string;
  evidence: Record<"G0" | "G1" | "G2" | "G3" | "G4", string>;
} {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "content-expansion-release-test-"),
  );
  const evidence = {} as Record<"G0" | "G1" | "G2" | "G3" | "G4", string>;
  for (const gate of ["G0", "G1", "G2", "G3"] as const) {
    const file = path.join(directory, `${gate}.json`);
    fs.writeFileSync(file, JSON.stringify({ gate, passed: true }));
    evidence[gate] = file;
  }
  evidence.G4 = path.join(directory, "G4.json");
  fs.writeFileSync(
    evidence.G4,
    JSON.stringify({
      phase: "local",
      release_id: CONTENT_EXPANSION_RELEASE_GROUP_ID,
      passed: true,
      errors: [],
    }),
  );
  return { directory, evidence };
}

test("reviewed expansion plan binds 140 audits to two independently gated releases", () => {
  const value = fixture();
  try {
    const plan = buildContentExpansionReviewedReleasePlan(value.evidence);
    assert.deepEqual(
      plan.releases.map((release) => [
        release.releaseId,
        release.itemIds.length,
      ]),
      [
        [JLPT_N3_PRACTICE_RELEASE_ID, 120],
        [TOPIK_OWNER_BATCH_5_RELEASE_ID, 20],
      ],
    );
    assert.equal(
      plan.releases.every((release) =>
        /^[a-f0-9]{64}$/u.test(release.manifestSha256),
      ),
      true,
    );
    const sql = plan.statements.join("\n");
    assert.equal(
      (sql.match(/INSERT OR IGNORE INTO `content_quality_audits`/gu) ?? [])
        .length,
      140,
    );
    assert.equal(
      (sql.match(/INSERT OR IGNORE INTO `content_release_jobs`/gu) ?? [])
        .length,
      12,
    );
    assert.equal(
      (
        sql.match(/INSERT OR IGNORE INTO `content_release_gate_evidence`/gu) ??
        []
      ).length,
      10,
    );
    assert.match(sql, new RegExp(CONTENT_EXPANSION_VALIDATOR_VERSION, "u"));
    assert.doesNotMatch(
      sql,
      /content_audio_bindings|audio_r2_key|r2-ready|r2:\/\//iu,
    );
  } finally {
    fs.rmSync(value.directory, { recursive: true, force: true });
  }
});

test("quality audit rows are staged before TOPIK owner content and publication", () => {
  const value = fixture();
  try {
    const sql = buildContentExpansionReviewedReleasePlan(
      value.evidence,
    ).statements.join("\n");
    const audit = sql.indexOf("quality-audit:topik-owner-batch5");
    const item = sql.indexOf(
      "INSERT OR IGNORE INTO `topik_owner_authored_curriculum_items`",
    );
    const publish = sql.indexOf("SET release_state = 'published'", item);
    assert.ok(audit >= 0 && item > audit && publish > item);
    assert.ok(
      sql.lastIndexOf("UPDATE jlpt_practice_questions SET is_published = 1") >
        publish,
    );
  } finally {
    fs.rmSync(value.directory, { recursive: true, force: true });
  }
});

test("reviewed expansion rejects missing or non-passed G4 evidence", () => {
  const value = fixture();
  try {
    fs.writeFileSync(
      value.evidence.G4,
      JSON.stringify({
        phase: "local",
        release_id: CONTENT_EXPANSION_RELEASE_GROUP_ID,
        passed: false,
      }),
    );
    assert.throws(
      () => buildContentExpansionReviewedReleasePlan(value.evidence),
      /G4 must be a passed/u,
    );
  } finally {
    fs.rmSync(value.directory, { recursive: true, force: true });
  }
});
