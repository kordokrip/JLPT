import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { REPO_ROOT } from "../seed/constants.js";
import {
  executeSqlFile,
  parseD1Target,
  querySql,
  type D1TargetOptions,
} from "../seed/d1-cli.js";
import {
  buildTopikPlacementV2SeedPlan,
  TOPIK_PLACEMENT_V2_TRACK,
} from "../seed/topik-placement-bank-v2.js";

type Check = {
  name: string;
  expected: number | string;
  actual: number | string;
  passed: boolean;
};

const PRODUCTION_TARGET = "nihongo-n3-prod-v2";
const target = parseD1Target();
const publish = process.argv.includes("--publish");
const reportArg = process.argv.find((arg) => arg.startsWith("--report="));
const reportPath = path.resolve(
  reportArg?.slice("--report=".length) ??
    path.join(REPO_ROOT, ".artifacts/db/topik-placement-seed.json"),
);

function assertRemoteReleaseTarget(options: D1TargetOptions): void {
  if (!options.remote) return;
  if (options.database !== PRODUCTION_TARGET) {
    throw new Error(
      `Remote TOPIK seed is restricted to --database=${PRODUCTION_TARGET}.`,
    );
  }
  if (!publish) {
    throw new Error("Remote TOPIK seed requires --publish.");
  }
  if (process.env.ALLOW_PRODUCTION_CHANGE !== "topik-seed") {
    throw new Error(
      "Set ALLOW_PRODUCTION_CHANGE=topik-seed after local verification and a Cloudflare maintenance review.",
    );
  }
}

function count(options: D1TargetOptions, sql: string): number {
  const row = querySql<Record<string, unknown>>(options, sql)[0];
  const value = row ? Object.values(row)[0] : undefined;
  if (typeof value !== "number") throw new Error(`Invalid count result for ${sql}`);
  return value;
}

function addCheck(
  checks: Check[],
  name: string,
  expected: number | string,
  actual: number | string,
): void {
  checks.push({ name, expected, actual, passed: expected === actual });
}

function seed(): void {
  assertRemoteReleaseTarget(target);
  const plan = buildTopikPlacementV2SeedPlan();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nihongo-topik-placement-seed-"));
  const sqlPath = path.join(tempDir, "seed.sql");
  const checks: Check[] = [];

  try {
    fs.writeFileSync(sqlPath, `${plan.statements.join("\n\n")}\n`, "utf8");
    executeSqlFile(target, sqlPath);

    addCheck(
      checks,
      "placement questions",
      plan.manifest.questions.expectedRows,
      count(
        target,
        `SELECT count(*) AS count FROM topik_placement_questions WHERE learning_track = '${TOPIK_PLACEMENT_V2_TRACK}' AND bank_version = 'v2'`,
      ),
    );
    addCheck(
      checks,
      "published placement questions",
      plan.manifest.questions.expectedRows,
      count(
        target,
        "SELECT count(*) AS count FROM topik_placement_questions WHERE bank_version = 'v2' AND is_published = 1",
      ),
    );
    addCheck(
      checks,
      "track content source",
      1,
      count(
        target,
        `SELECT count(*) AS count FROM track_content_sources WHERE learning_track = '${TOPIK_PLACEMENT_V2_TRACK}' AND source_code = '${plan.manifest.source.code}'`,
      ),
    );
    addCheck(
      checks,
      "foreign key violations",
      0,
      querySql<Record<string, unknown>>(target, "PRAGMA foreign_key_check").length,
    );

    const report = {
      generatedAt: new Date().toISOString(),
      target: { database: target.database, location: target.remote ? "remote" : "local" },
      release: target.remote ? "production-candidate" : "local-verification",
      manifest: plan.manifest,
      checks,
      passed: checks.every((check) => check.passed),
    };
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    for (const check of checks) {
      console.log(`  ${check.passed ? "OK" : "FAIL"} ${check.name}: expected=${check.expected} actual=${check.actual}`);
    }
    console.log(`TOPIK placement seed report: ${reportPath}`);
    if (!report.passed) process.exitCode = 1;
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true });
  }
}

seed();
