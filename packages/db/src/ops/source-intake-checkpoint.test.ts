import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createIntakeCheckpoint, writeImmutableIntake, intakeDirectoryUrl } from "./source-intake-checkpoint.js";
test("successful records survive a later retrieval failure without a false full-bank result", () => {
  const directory = join(mkdtempSync(join(tmpdir(), "jlpt-intake-checkpoint-")), "run");
  const checkpoint = createIntakeCheckpoint(directory);
  const record = { source: { id: "actual-success", retrieved_at: "2026-10-11T00:00:00Z" }, facts: [{ value: "표제어" }] };
  checkpoint(record);
  assert.throws(() => { throw new Error("later HTTP failed"); });
  assert.deepEqual(JSON.parse(readFileSync(join(directory, "record-001.json"), "utf8")), record);
  assert.deepEqual(readdirSync(directory), ["record-001.json"]);
  assert.throws(() => createIntakeCheckpoint(directory), /already exists/);
});
test("a competing collector cannot overwrite an already completed intake", () => {
  const output = join(mkdtempSync(join(tmpdir(), "jlpt-intake-race-")), "intake.json");
  writeImmutableIntake(output, { acquisition: "first" });
  const original = readFileSync(output);
  assert.throws(() => writeImmutableIntake(output, { acquisition: "late" }), /EEXIST/);
  assert.deepEqual(readFileSync(output), original);
});
test("an output directory without a trailing slash cannot place reports in its parent", () => {
  const directory = join(tmpdir(), "jlpt intake output");
  assert.equal(new URL("report.json", intakeDirectoryUrl(directory)).pathname, directory.replaceAll(" ","%20") + "/report.json");
});
