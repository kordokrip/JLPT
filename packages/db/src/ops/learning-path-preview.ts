// 강성호 2026-10-12: 검수된 v7만 전용 Preview에 적재/공개/검증하며 Production 명령은 제공하지 않는다.
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { parseD1Target, executeSqlFile, type D1TargetOptions } from '../seed/d1-cli.js';
import { buildLearningPathV4DraftPlan, buildLearningPathV4LessonPlan } from '../seed/learning-path-v4-draft.js';
import { loadReviewedV7, validateReviewedV7Evidence, REVIEWED_V7, type ReviewedReleasePaths, type ReleaseTarget } from './learning-path-reviewed-release.js';
import { buildReviewedLearningReleaseControlPlan, verifyReviewedLearningContent, verifyReviewedLearningPublished, reviewedLearningWithdrawSql } from './learning-path-reviewed-publish.js';
import { requireLearningPreviewTarget, readLearningPreviewSnapshot, learningContentMirror } from './learning-path-preview-target.js';
import { PREVIEW160_V3_MANIFEST_SHA256 } from './preview160-v3-quality.js';
const modes = ['stage','publish','verify','withdraw'] as const;
type Mode = (typeof modes)[number];
const statesSql = `SELECT release_state FROM content_releases WHERE id IN ('${REVIEWED_V7.releases.join("','")}') ORDER BY id`;
export const LOCAL_DRILL_LEARNER_TABLES=['users','study_sessions','study_steps','learning_annotations','learning_activity_events','srs_cards','review_logs','daily_logs','topik_owner_curriculum_progress','topik_owner_srs_cards','topik_owner_review_logs','study_reward_events'] as const;

export function learningPreviewEvidenceTarget(paths: ReviewedReleasePaths): ReleaseTarget {
  const report = JSON.parse(readFileSync(paths.releaseReport, 'utf8')) as Record<string, unknown>;
  if (report.phase !== 'local' && report.phase !== 'preview') throw new Error('Preview operations reject Production-predeploy evidence');
  const deployment = report.deployment as Record<string, unknown> | undefined;
  if (!deployment || (report.phase === 'local' && deployment.database !== 'isolated-local-d1') ||
      (report.phase === 'preview' && deployment.database !== 'nihongo-n3-topik-preview')) throw new Error('Evidence target does not match its local/Preview phase');
  return { phase:report.phase, database:String(deployment.database), worker:String(deployment.worker ?? ''), pages:String(deployment.pages ?? '') };
}

// 강성호 2026-10-12: 중간 G4 통과 뒤 출판/철회 drill이 실패한 수집본으로 Preview에 진입하지 못하게 한다.
export function requireCompletedLocalReleaseDrill(report: Record<string, unknown>): void {
  if (report.phase !== 'local') return;
  const gate=(report.gates as any)?.local_release_drill;
  if (report.collector_stage !== 'complete' || !gate || gate.passed !== true || gate.exit_code !== 0 || typeof gate.artifact !== 'string' || !/^[a-f0-9]{64}$/.test(String(gate.sha256))) throw new Error('Completed local release drill required; preflight G4 is insufficient');
  const bytes=readFileSync(gate.artifact);
  if (createHash('sha256').update(bytes).digest('hex') !== gate.sha256) throw new Error('Local drill evidence hash mismatch');
  const drill=JSON.parse(bytes.toString('utf8'));
  const cohort={draft_sha256:REVIEWED_V7.draft,source_evidence_sha256:REVIEWED_V7.source,concept_inventory_sha256:REVIEWED_V7.inventory,review_sha256:[...REVIEWED_V7.reviews],preview160_manifest_sha256:PREVIEW160_V3_MANIFEST_SHA256};
  if (drill.schema !== 'learning-path-local-release-drill-v1' || JSON.stringify(drill.cohort) !== JSON.stringify(cohort) ||
      drill.scope !== 'new-local-SQLite-only' || drill.remote_writes !== 0 || drill.learner_row_hashes_unchanged !== true ||
      JSON.stringify(drill.preserved_learner_tables) !== JSON.stringify(LOCAL_DRILL_LEARNER_TABLES) ||
      drill.preview160?.publication !== 'draft-unpublished' || drill.preview160?.reseed_unchanged !== true ||
      drill.preview160?.counts?.jlpt_questions !== 120 || drill.preview160?.counts?.topik_items !== 40 ||
      drill.preview160?.stored_rows !== 543 ||
      drill.v7?.published?.state !== 'published' || drill.v7?.published?.items !== 440 || drill.v7?.published?.lessons !== 220 || drill.v7?.published?.idempotent !== false ||
      drill.v7?.publishedReplay?.idempotent !== true || drill.v7?.withdrawn?.state !== 'withdrawn' || drill.v7?.withdrawn?.items !== 440 || drill.v7?.withdrawn?.lessons !== 220)
    throw new Error('Local release/reseed/withdraw and learner-preservation proof required');
}

export function runLearningPreview(mode: Mode, target: D1TargetOptions, paths: ReviewedReleasePaths, output: string, token?: string) {
  if (!modes.includes(mode)) throw new Error('Unsupported Preview operation');
  if (existsSync(output)) throw new Error('Report exists; refuse overwriting evidence');
  requireLearningPreviewTarget(target, mode !== 'verify', token);
  const loaded = loadReviewedV7(paths); // same actual frozen bytes/two approvals, before any D1 access
  const evidenceTarget = learningPreviewEvidenceTarget(paths);
  const evidence = validateReviewedV7Evidence(paths, evidenceTarget);
  requireCompletedLocalReleaseDrill(evidence.report);
  const directory = mkdtempSync(join(tmpdir(), 'learning-preview-v7-')); // preserve generated SQL on failures
  const execute = (name: string, statements: readonly string[]) => {
    if (!statements.length) return;
    const file = join(directory, `${name}.sql`);
    writeFileSync(file, `${statements.join('\n')}\n`, { flag:'wx', mode:0o600 });
    try { executeSqlFile(target, file); }
    catch { throw new Error(`Preview ${name} command failed; preserved SQL at ${file}; remote response is not printed`); }
  };
  let visibilityAttempted = false;
  try {
    let mirror = learningContentMirror(readLearningPreviewSnapshot(target));
    let result: Record<string, unknown>;
    try {
      if (mode === 'verify') {
        result = verifyReviewedLearningPublished(mirror, paths, evidenceTarget);
      } else if (mode === 'withdraw') {
        execute('withdraw', [reviewedLearningWithdrawSql()]);
        mirror.close();
        mirror = learningContentMirror(readLearningPreviewSnapshot(target));
        result = verifyReviewedLearningContent(mirror, evidence, 'withdrawn');
      } else {
        const states = mirror.prepare(statesSql).all();
        if (states.length === 2 && states.every(row => row.release_state === 'published')) {
          result = { ...verifyReviewedLearningPublished(mirror,paths,evidenceTarget), idempotent:true };
        } else {
          let existingComplete = false;
          try { verifyReviewedLearningContent(mirror,evidence); existingComplete=true; } catch { /* Incomplete draft may be safely resumed below; immutable collisions still fail. */ }
          if (!existingComplete) {
            if (states.some(row => row.release_state !== 'draft')) throw new Error('Incomplete or mixed release lifecycle; refuse reseed/publication');
            const draft = buildLearningPathV4DraftPlan(mirror, loaded.input);
            execute('draft', draft.statements);
            mirror.close();
            mirror = learningContentMirror(readLearningPreviewSnapshot(target));
            const lessons = buildLearningPathV4LessonPlan(mirror, loaded.input);
            execute('lessons', lessons.statements);
            mirror.close();
            mirror = learningContentMirror(readLearningPreviewSnapshot(target));
          }
          const staged = verifyReviewedLearningContent(mirror, evidence);
          if (mode === 'stage') result = { ...staged, idempotent:existingComplete, published:false };
          else {
            const plan = buildReviewedLearningReleaseControlPlan(mirror,paths,evidenceTarget);
            execute('control', plan.statements);
            visibilityAttempted = true;
            execute('visibility-commit', [plan.publishSql]); // a single SQL UPDATE, not an assumed transaction around a D1 import
            mirror.close();
            mirror = learningContentMirror(readLearningPreviewSnapshot(target));
            result = { ...verifyReviewedLearningPublished(mirror,paths,evidenceTarget), idempotent:false };
          }
        }
      }
    } finally { mirror.close(); }
    const report = { schema:'learning-path-preview-operation-v1', operation:mode, database:target.database, environment:target.env,
      cohort:{draft_sha256:REVIEWED_V7.draft,source_evidence_sha256:REVIEWED_V7.source,concept_inventory_sha256:REVIEWED_V7.inventory},
      local_gate_phase:evidenceTarget.phase, generated_sql_directory:directory, ...result,
      // This is real remote content verification, not browser/family/audio evidence or a Production authorization.
      remote_writes:mode === 'verify' ? 0 : 'content-only-operation', production_writes:0,
      family_observation:false, actual_browser_audio:false, passed:true };
    writeFileSync(output, `${JSON.stringify(report,null,2)}\n`, {flag:'wx',mode:0o600});
    return report;
  } catch (error) {
    // A partial draft is never made public. An ambiguous/failed visibility commit is withdrawn, preserving learning records.
    let rollback = 'not-attempted-no-visibility-write';
    if (visibilityAttempted) {
      try { execute('failed-publication-withdraw', [reviewedLearningWithdrawSql()]); rollback='withdraw-command-succeeded'; }
      catch { rollback='withdraw-command-failed'; }
    }
    writeFileSync(output, `${JSON.stringify({schema:'learning-path-preview-operation-v1',operation:mode,database:target.database,passed:false,
      rollback,generated_sql_directory:directory,production_writes:0,error:error instanceof Error ? error.message : 'Preview operation failed'},null,2)}\n`, {flag:'wx',mode:0o600});
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const flags = ['mode','database','env','config','cohort','review-a','review-b','readiness','reviews','release-report','output'];
  const args = process.argv.slice(2), option = (name:string) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length+3);
  try {
    if (!args.includes('--remote') || args.some(arg => arg !== '--remote' && !flags.some(name => arg.startsWith(`--${name}=`))) ||
        flags.some(name => args.filter(arg => arg.startsWith(`--${name}=`)).length !== 1)) throw new Error('Every explicit Preview option is required once; unknown/local/Production options are rejected');
    const report = runLearningPreview(option('mode') as Mode,parseD1Target(args),{
      cohort:resolve(option('cohort')!),reviewA:resolve(option('review-a')!),reviewB:resolve(option('review-b')!),
      readiness:resolve(option('readiness')!),reviews:resolve(option('reviews')!),releaseReport:resolve(option('release-report')!),
    },resolve(option('output')!),process.env.ALLOW_LEARNING_PATH_PREVIEW_CHANGE);
    console.log(JSON.stringify(report));
  } catch (error) { console.error(error instanceof Error ? error.message : 'Preview operation failed'); process.exitCode=1; }
}
