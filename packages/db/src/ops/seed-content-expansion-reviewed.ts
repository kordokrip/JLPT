import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTENT_EXPANSION_RELEASE_GROUP_ID,
  JLPT_N3_PRACTICE_RELEASE_ID,
  TOPIK_OWNER_BATCH_5_RELEASE_ID,
  buildContentExpansionReviewedReleasePlan,
  defaultContentExpansionEvidence,
} from "../seed/content-expansion-reviewed-release.js";
import {
  argValue,
  executeSqlFile,
  parseD1Target,
  querySql,
  type D1TargetOptions,
} from "../seed/d1-cli.js";
import { esc } from "../seed/utils.js";

const PREVIEW_TARGET = "nihongo-n3-topik-preview";
const PRODUCTION_TARGET = "nihongo-n3-prod-v2";
const CHANGE_TOKEN = CONTENT_EXPANSION_RELEASE_GROUP_ID;

type ReleaseCount = {
  release_state: string;
  audits: number;
  gates: number;
  jobs: number;
};

function requireAuthorizedTarget(target: D1TargetOptions): void {
  if (!target.remote) return;
  if (target.database === PREVIEW_TARGET) {
    if (
      target.env !== "topik-preview" ||
      process.env.ALLOW_TOPIK_PREVIEW_CHANGE !== CHANGE_TOKEN
    ) {
      throw new Error(
        `Preview seed requires --env=topik-preview and ALLOW_TOPIK_PREVIEW_CHANGE=${CHANGE_TOKEN}`,
      );
    }
    return;
  }
  if (target.database === PRODUCTION_TARGET) {
    if (
      !process.argv.includes("--publish") ||
      process.env.ALLOW_PRODUCTION_CHANGE !== CHANGE_TOKEN
    ) {
      throw new Error(
        `Production seed requires --publish and ALLOW_PRODUCTION_CHANGE=${CHANGE_TOKEN}`,
      );
    }
    return;
  }
  throw new Error(
    `Remote content expansion seed is restricted to ${PREVIEW_TARGET} or ${PRODUCTION_TARGET}`,
  );
}

function releaseCount(
  target: D1TargetOptions,
  releaseId: string,
): ReleaseCount | undefined {
  return querySql<ReleaseCount>(
    target,
    [
      "SELECT r.release_state,",
      "  (SELECT count(*) FROM content_release_quality_audit_links l WHERE l.release_id = r.id) AS audits,",
      "  (SELECT count(*) FROM content_release_gate_evidence e WHERE e.release_id = r.id AND e.gate_state = 'passed') AS gates,",
      "  (SELECT count(*) FROM content_release_jobs j WHERE j.release_id = r.id AND j.job_state = 'succeeded') AS jobs",
      `FROM content_releases r WHERE r.id = ${esc(releaseId)}`,
    ].join("\n"),
  )[0];
}

function verifyPublished(target: D1TargetOptions): void {
  const jlpt = releaseCount(target, JLPT_N3_PRACTICE_RELEASE_ID);
  const topik = releaseCount(target, TOPIK_OWNER_BATCH_5_RELEASE_ID);
  const content = querySql<{
    jlpt: number;
    jlpt_0: number;
    jlpt_1: number;
    jlpt_2: number;
    jlpt_3: number;
    topik: number;
    speech: number;
    bad_speech: number;
  }>(
    target,
    [
      "SELECT",
      "  (SELECT count(*) FROM jlpt_practice_questions WHERE bank_version = 'jlpt-n3-practice-v1' AND is_published = 1) AS jlpt,",
      "  (SELECT count(*) FROM jlpt_practice_questions WHERE bank_version = 'jlpt-n3-practice-v1' AND is_published = 1 AND answer_index = 0) AS jlpt_0,",
      "  (SELECT count(*) FROM jlpt_practice_questions WHERE bank_version = 'jlpt-n3-practice-v1' AND is_published = 1 AND answer_index = 1) AS jlpt_1,",
      "  (SELECT count(*) FROM jlpt_practice_questions WHERE bank_version = 'jlpt-n3-practice-v1' AND is_published = 1 AND answer_index = 2) AS jlpt_2,",
      "  (SELECT count(*) FROM jlpt_practice_questions WHERE bank_version = 'jlpt-n3-practice-v1' AND is_published = 1 AND answer_index = 3) AS jlpt_3,",
      "  (SELECT count(*) FROM topik_owner_authored_curriculum_items WHERE source_asset_id = 'source-asset:topik-owner-authored-grades-1-2-batch-5-2026-08-19') AS topik,",
      "  (SELECT count(*) FROM content_speech_bindings WHERE stable_ref LIKE 'topik:owner:batch5:%') AS speech,",
      "  (SELECT count(*) FROM content_speech_bindings WHERE stable_ref LIKE 'topik:owner:batch5:%' AND provider <> 'google-browser') AS bad_speech",
    ].join("\n"),
  )[0];
  const validRelease = (value: ReleaseCount | undefined, audits: number) =>
    value?.release_state === "published" &&
    value.audits === audits &&
    value.gates === 5 &&
    value.jobs === 6;
  if (
    !validRelease(jlpt, 120) ||
    !validRelease(topik, 20) ||
    content?.jlpt !== 120 ||
    [content.jlpt_0, content.jlpt_1, content.jlpt_2, content.jlpt_3].some(
      (count) => count !== 30,
    ) ||
    content.topik !== 20 ||
    content.speech !== 4 ||
    content.bad_speech !== 0
  ) {
    throw new Error(
      `Reviewed content release verification failed: ${JSON.stringify({ jlpt, topik, content })}`,
    );
  }
}

export function runContentExpansionReviewedSeed(): void {
  const target = parseD1Target();
  requireAuthorizedTarget(target);
  const g4 = argValue("--g4");
  if (!g4)
    throw new Error("--g4=<passed release gate result JSON> is required");

  const existing = [
    releaseCount(target, JLPT_N3_PRACTICE_RELEASE_ID),
    releaseCount(target, TOPIK_OWNER_BATCH_5_RELEASE_ID),
  ];
  if (existing.every((release) => release?.release_state === "published")) {
    verifyPublished(target);
    console.log(
      `Reviewed content already published and verified: ${CONTENT_EXPANSION_RELEASE_GROUP_ID}`,
    );
    return;
  }

  const plan = buildContentExpansionReviewedReleasePlan(
    defaultContentExpansionEvidence(g4),
  );
  for (const release of plan.releases) {
    const stored = querySql<{
      manifest_sha256: string;
      content_version: string;
    }>(
      target,
      `SELECT manifest_sha256, content_version FROM content_releases WHERE id = ${esc(release.releaseId)}`,
    )[0];
    if (
      stored &&
      (stored.manifest_sha256 !== release.manifestSha256 ||
        stored.content_version !== release.contentVersion)
    ) {
      throw new Error(
        `Immutable release identity mismatch: ${release.releaseId}`,
      );
    }
  }

  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "content-expansion-reviewed-"),
  );
  const sqlPath = path.join(directory, "seed.sql");
  try {
    fs.writeFileSync(sqlPath, `${plan.statements.join("\n\n")}\n`, "utf8");
    executeSqlFile(target, sqlPath);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  verifyPublished(target);
  console.log(
    `Reviewed content published: ${CONTENT_EXPANSION_RELEASE_GROUP_ID}; JLPT=120; TOPIK=20; G0-G4=passed`,
  );
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    runContentExpansionReviewedSeed();
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Reviewed content seed failed",
    );
    process.exitCode = 1;
  }
}
