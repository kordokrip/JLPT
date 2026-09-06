import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { REPO_ROOT } from "../seed/constants.js";
import { executeSqlFile, parseD1Target, querySql } from "../seed/d1-cli.js";
import {
  buildTopikPlacementV2SeedPlan,
  TOPIK_PLACEMENT_V2_TRACK,
} from "../seed/topik-placement-bank-v2.js";

const PREVIEW_DATABASE = "nihongo-n3-topik-preview";
const target = parseD1Target();
const reportArg = process.argv.find((arg) => arg.startsWith("--report="));
const reportPath = path.resolve(
  reportArg?.slice("--report=".length) ??
    path.join(
      REPO_ROOT,
      ".artifacts/db/topik-preview-placement-verification.json",
    ),
);

if (!target.remote || target.database !== PREVIEW_DATABASE) {
  throw new Error(
    `This command is restricted to --remote --database=${PREVIEW_DATABASE}.`,
  );
}
if (process.env.ALLOW_TOPIK_PREVIEW_CHANGE !== "seed") {
  throw new Error(
    "Set ALLOW_TOPIK_PREVIEW_CHANGE=seed to modify the dedicated TOPIK preview D1.",
  );
}

type Check = {
  name: string;
  expected: number | string;
  actual: number | string;
  passed: boolean;
};

const checks: Check[] = [];

function addCheck(
  name: string,
  expected: number | string,
  actual: number | string,
): void {
  checks.push({ name, expected, actual, passed: expected === actual });
}

function count(sql: string): number {
  const row = querySql<Record<string, unknown>>(target, sql)[0];
  const value = row ? Object.values(row)[0] : undefined;
  if (typeof value !== "number")
    throw new Error(`Invalid count result for ${sql}`);
  return value;
}

const plan = buildTopikPlacementV2SeedPlan();
const tempDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "nihongo-topik-preview-seed-"),
);
const sqlPath = path.join(tempDir, "seed.sql");

try {
  fs.writeFileSync(sqlPath, `${plan.statements.join("\n\n")}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  executeSqlFile(target, sqlPath);

  addCheck(
    "migration ledger",
    10,
    count("SELECT count(*) AS count FROM d1_migrations"),
  );
  addCheck(
    "placement questions",
    plan.manifest.questions.expectedRows,
    count(
      `SELECT count(*) AS count FROM topik_placement_questions WHERE learning_track = '${TOPIK_PLACEMENT_V2_TRACK}' AND bank_version = 'v2'`,
    ),
  );
  addCheck(
    "listening questions",
    12,
    count(
      "SELECT count(*) AS count FROM topik_placement_questions WHERE bank_version = 'v2' AND section = 'listening'",
    ),
  );
  addCheck(
    "reading questions",
    12,
    count(
      "SELECT count(*) AS count FROM topik_placement_questions WHERE bank_version = 'v2' AND section = 'reading'",
    ),
  );
  addCheck(
    "answer choice positions",
    4,
    count(
      "SELECT count(DISTINCT answer_index) AS count FROM topik_placement_questions WHERE bank_version = 'v2'",
    ),
  );
  addCheck(
    "unbalanced answer distribution",
    0,
    count(
      "SELECT count(*) AS count FROM (SELECT answer_index FROM topik_placement_questions WHERE bank_version = 'v2' GROUP BY answer_index HAVING count(*) != 6)",
    ),
  );
  addCheck(
    "blank required fields",
    0,
    count(`SELECT count(*) AS count FROM topik_placement_questions WHERE bank_version = 'v2' AND (
      trim(prompt_ko) = '' OR trim(prompt_en) = '' OR trim(gloss_en) = ''
      OR trim(choices_json) = '' OR trim(explanation_en) = '' OR trim(explanation_ko) = ''
      OR trim(source_code) = '' OR trim(author_reviewer) = '' OR trim(second_reviewer) = ''
      OR trim(reviewed_at) = ''
    )`),
  );
  addCheck(
    "duplicate prompt",
    0,
    count(
      "SELECT count(*) AS count FROM (SELECT section, prompt_ko FROM topik_placement_questions WHERE bank_version = 'v2' GROUP BY section, prompt_ko HAVING count(*) > 1)",
    ),
  );
  addCheck(
    "foreign key violations",
    0,
    querySql<Record<string, unknown>>(target, "PRAGMA foreign_key_check")
      .length,
  );

  const run = querySql<{ manifest_sha256: string; parser_version: string }>(
    target,
    `SELECT manifest_sha256, parser_version FROM track_content_seed_runs
     WHERE id = '${plan.manifest.seedRunId}' AND learning_track = '${TOPIK_PLACEMENT_V2_TRACK}'`,
  )[0];
  addCheck(
    "manifest checksum",
    plan.manifest.manifestSha256,
    run?.manifest_sha256 ?? "missing",
  );
  addCheck(
    "parser version",
    plan.manifest.parserVersion,
    run?.parser_version ?? "missing",
  );

  const source = querySql<{ source_checksum: string }>(
    target,
    `SELECT source_checksum FROM track_content_seed_sources
     WHERE seed_run_id = '${plan.manifest.seedRunId}' AND source_code = '${plan.manifest.source.code}'`,
  )[0];
  addCheck(
    "source checksum",
    plan.manifest.source.sourceChecksum,
    source?.source_checksum ?? "missing",
  );

  for (const check of checks) {
    console.log(
      `  ${check.passed ? "OK" : "FAIL"} ${check.name}: expected=${check.expected} actual=${check.actual}`,
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    target: { database: PREVIEW_DATABASE, location: "remote-preview" },
    manifest: plan.manifest,
    checks,
    passed: checks.every((check) => check.passed),
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`TOPIK preview verification report: ${reportPath}`);
  if (!report.passed) process.exitCode = 1;
} finally {
  fs.rmSync(tempDir, { force: true, recursive: true });
}
