import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  JLPT_N1_PRACTICE_RELEASE_ID,
  JLPT_N2_PRACTICE_RELEASE_ID,
  NEXT_CONTENT_EXPANSION_RELEASE_GROUP_ID,
  TOPIK_OWNER_BATCH_6_RELEASE_ID,
  buildNextContentExpansionReviewedReleasePlan,
  defaultNextContentExpansionEvidence,
} from '../seed/next-content-expansion-reviewed-release.js';
import {
  argValue,
  executeSqlFile,
  parseD1Target,
  querySql,
  type D1TargetOptions,
} from '../seed/d1-cli.js';
import { REPO_ROOT } from '../seed/constants.js';
import { esc } from '../seed/utils.js';

const PREVIEW_TARGET = 'nihongo-n3-topik-preview';
const PRODUCTION_TARGET = 'nihongo-n3-prod-v2';
const CHANGE_TOKEN = NEXT_CONTENT_EXPANSION_RELEASE_GROUP_ID;

type ReleaseCount = { release_state: string; audits: number; gates: number; jobs: number };

export function requireNextContentExpansionGatePhase(
  target: D1TargetOptions,
  g4Path: string,
): void {
  let gate: Record<string, unknown>;
  try {
    const resolved = path.isAbsolute(g4Path) ? g4Path : path.resolve(REPO_ROOT, g4Path);
    gate = JSON.parse(fs.readFileSync(resolved, 'utf8')) as Record<string, unknown>;
  } catch {
    throw new Error(`G4 must be a readable JSON object: ${g4Path}`);
  }
  if (!gate || Array.isArray(gate) || gate.release_id !== NEXT_CONTENT_EXPANSION_RELEASE_GROUP_ID || gate.passed !== true) {
    throw new Error(`G4 must be passed for ${NEXT_CONTENT_EXPANSION_RELEASE_GROUP_ID}`);
  }
  const phase = String(gate.phase ?? '');
  if (!target.remote && phase !== 'local') {
    throw new Error('Local publication requires the passed local G4 record');
  }
  if (target.remote && target.database === PREVIEW_TARGET && !['local', 'preview'].includes(phase)) {
    throw new Error('Preview publication requires a passed local or preview G4 record');
  }
  if (target.remote && target.database === PRODUCTION_TARGET && phase !== 'production-predeploy') {
    throw new Error('Production publication requires the passed production-predeploy G4 record');
  }
}

function requireAuthorizedTarget(target: D1TargetOptions): void {
  if (!target.remote) return;
  if (target.database === PREVIEW_TARGET) {
    if (target.env !== 'topik-preview' || process.env.ALLOW_TOPIK_PREVIEW_CHANGE !== CHANGE_TOKEN) {
      throw new Error(`Preview seed requires --env=topik-preview and ALLOW_TOPIK_PREVIEW_CHANGE=${CHANGE_TOKEN}`);
    }
    return;
  }
  if (target.database === PRODUCTION_TARGET) {
    if (!process.argv.includes('--publish') || process.env.ALLOW_PRODUCTION_CHANGE !== CHANGE_TOKEN) {
      throw new Error(`Production seed requires --publish and ALLOW_PRODUCTION_CHANGE=${CHANGE_TOKEN}`);
    }
    return;
  }
  throw new Error(`Remote next expansion seed is restricted to ${PREVIEW_TARGET} or ${PRODUCTION_TARGET}`);
}

function releaseCount(target: D1TargetOptions, releaseId: string): ReleaseCount | undefined {
  return querySql<ReleaseCount>(target, [
    'SELECT r.release_state,',
    '  (SELECT count(*) FROM content_release_quality_audit_links l WHERE l.release_id = r.id) AS audits,',
    "  (SELECT count(*) FROM content_release_gate_evidence e WHERE e.release_id = r.id AND e.gate_state = 'passed') AS gates,",
    "  (SELECT count(*) FROM content_release_jobs j WHERE j.release_id = r.id AND j.job_state = 'succeeded') AS jobs",
    `FROM content_releases r WHERE r.id = ${esc(releaseId)}`,
  ].join('\n'))[0];
}

export function verifyNextContentExpansionPublished(target: D1TargetOptions): void {
  const releases = [
    [JLPT_N2_PRACTICE_RELEASE_ID, 60],
    [JLPT_N1_PRACTICE_RELEASE_ID, 60],
    [TOPIK_OWNER_BATCH_6_RELEASE_ID, 40],
  ] as const;
  const releaseRows = releases.map(([id]) => releaseCount(target, id));
  const validRelease = (value: ReleaseCount | undefined, audits: number) => (
    value?.release_state === 'published' && value.audits === audits && value.gates === 5 && value.jobs === 6
  );
  if (!releaseRows.every((row, index) => validRelease(row, releases[index]![1]))) {
    throw new Error(`Next expansion release control verification failed: ${JSON.stringify(releaseRows)}`);
  }

  const content = querySql<Record<string, number>>(target, [
    'SELECT',
    "  (SELECT count(*) FROM jlpt_practice_questions WHERE bank_version = 'jlpt-n2-practice-v1' AND is_published = 1) AS n2,",
    "  (SELECT count(*) FROM jlpt_practice_questions WHERE bank_version = 'jlpt-n1-practice-v1' AND is_published = 1) AS n1,",
    ...(['n2', 'n1'] as const).flatMap((level) => [0, 1, 2, 3].map((answer) => (
      `  (SELECT count(*) FROM jlpt_practice_questions WHERE bank_version = 'jlpt-${level}-practice-v1' AND is_published = 1 AND answer_index = ${answer}) AS ${level}_${answer},`
    ))),
    "  (SELECT count(*) FROM topik_owner_authored_curriculum_units WHERE source_asset_id = 'source-asset-next-content-expansion-20260823') AS topik_units,",
    "  (SELECT count(*) FROM topik_owner_authored_curriculum_items WHERE source_asset_id = 'source-asset-next-content-expansion-20260823') AS topik_items,",
    "  (SELECT count(*) FROM learning_content_stable_refs WHERE stable_ref LIKE 'topik:owner:batch6:%') AS topik_refs,",
    "  (SELECT count(*) FROM content_speech_bindings WHERE stable_ref LIKE 'topik:owner:batch6:%' AND provider = 'google-browser' AND binding_state = 'ready') AS speech,",
    "  (SELECT count(*) FROM content_speech_bindings WHERE stable_ref LIKE 'topik:owner:batch6:%' AND provider <> 'google-browser') AS bad_speech,",
    "  (SELECT count(*) FROM (SELECT level, mode FROM jlpt_practice_questions WHERE bank_version IN ('jlpt-n2-practice-v1', 'jlpt-n1-practice-v1') AND is_published = 1 GROUP BY level, mode HAVING count(*) <> 15)) AS bad_jlpt_mode,",
    "  (SELECT count(*) FROM (SELECT level, mode, difficulty FROM jlpt_practice_questions WHERE bank_version IN ('jlpt-n2-practice-v1', 'jlpt-n1-practice-v1') AND is_published = 1 GROUP BY level, mode, difficulty HAVING count(*) <> 3)) AS bad_jlpt_difficulty,",
    "  (SELECT count(*) FROM (SELECT target_grade FROM topik_owner_authored_curriculum_items GROUP BY target_grade HAVING count(*) <> 30)) AS bad_grade_total,",
    "  (SELECT count(*) FROM (SELECT target_grade, item_type FROM topik_owner_authored_curriculum_items GROUP BY target_grade, item_type HAVING count(*) <> 6)) AS bad_grade_section",
  ].join('\n'))[0];
  if (
    !content
    || content.n2 !== 60
    || content.n1 !== 60
    || [0, 1, 2, 3].some((answer) => content[`n2_${answer}`] !== 15 || content[`n1_${answer}`] !== 15)
    || content.topik_units !== 40
    || content.topik_items !== 40
    || content.topik_refs !== 40
    || content.speech !== 8
    || content.bad_speech !== 0
    || content.bad_jlpt_mode !== 0
    || content.bad_jlpt_difficulty !== 0
    || content.bad_grade_total !== 0
    || content.bad_grade_section !== 0
  ) throw new Error(`Next expansion content verification failed: ${JSON.stringify(content)}`);
}

export function runNextContentExpansionReviewedSeed(): void {
  const target = parseD1Target();
  requireAuthorizedTarget(target);
  const g4 = argValue('--g4');
  if (!g4) throw new Error('--g4=<passed release gate result JSON> is required');
  requireNextContentExpansionGatePhase(target, g4);

  const releaseIds = [JLPT_N2_PRACTICE_RELEASE_ID, JLPT_N1_PRACTICE_RELEASE_ID, TOPIK_OWNER_BATCH_6_RELEASE_ID];
  if (releaseIds.every((releaseId) => releaseCount(target, releaseId)?.release_state === 'published')) {
    verifyNextContentExpansionPublished(target);
    console.log(`Reviewed content already published and verified: ${NEXT_CONTENT_EXPANSION_RELEASE_GROUP_ID}`);
    return;
  }

  const plan = buildNextContentExpansionReviewedReleasePlan(defaultNextContentExpansionEvidence(g4));
  for (const release of plan.releases) {
    const stored = querySql<{ manifest_sha256: string; content_version: string }>(
      target,
      `SELECT manifest_sha256, content_version FROM content_releases WHERE id = ${esc(release.releaseId)}`,
    )[0];
    if (stored && (stored.manifest_sha256 !== release.manifestSha256 || stored.content_version !== release.contentVersion)) {
      throw new Error(`Immutable release identity mismatch: ${release.releaseId}`);
    }
  }

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'next-content-expansion-reviewed-'));
  const sqlPath = path.join(directory, 'seed.sql');
  try {
    fs.writeFileSync(sqlPath, `${plan.statements.join('\n\n')}\n`, 'utf8');
    executeSqlFile(target, sqlPath);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  verifyNextContentExpansionPublished(target);
  console.log(`Reviewed content published: ${NEXT_CONTENT_EXPANSION_RELEASE_GROUP_ID}; N2=60; N1=60; TOPIK=40; G0-G4=passed`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    runNextContentExpansionReviewedSeed();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Next expansion seed failed');
    process.exitCode = 1;
  }
}
