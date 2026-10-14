// No CLI/remote connection. Callers must authorize their exact target separately.
import { buildLearningPathV4DraftPlan, buildLearningPathV4LessonPlan, type Db } from '../seed/learning-path-v4-draft.js';
import { LEARNING_PATH_VALIDATOR_VERSION } from './learning-path-quality.js';
import { esc } from '../seed/utils.js';
import { REVIEWED_V7, validateReviewedV7Evidence, type ReviewedReleasePaths, type ReleaseTarget } from './learning-path-reviewed-release.js';

export type ReviewedEvidence = ReturnType<typeof validateReviewedV7Evidence>;
const ids = REVIEWED_V7.releases.map(esc).join(',');
const scalar = (db: Db, sql: string) => Number(db.prepare(sql).all()[0]?.n);
const json = (v: unknown) => JSON.stringify(v);
const value = (v: unknown) => typeof v === 'number' ? String(v) : v == null ? 'NULL' : esc(String(v));
type Row = Record<string, unknown>;
function insert(db: Db, table: string, row: Row, keys: string[]) {
  const old = db.prepare(`SELECT * FROM ${table} WHERE ${keys.map(k => `${k}=?`).join(' AND ')}`).all(...keys.map(k => row[k]))[0];
  if (old && Object.entries(row).some(([k,v]) => old[k] !== v)) throw new Error(`Release evidence collision: ${table}`);
  return `INSERT OR IGNORE INTO ${table} (${Object.keys(row).join(',')}) VALUES (${Object.values(row).map(value).join(',')});`;
}
const artifactKey = (gate: string, hash: string) => `evidence/report/${REVIEWED_V7.group}/${gate}/${hash}/artifact.json`;

/** Check every staged content column against the frozen cohort, normalizing ONLY lifecycle columns. */
export function verifyReviewedLearningContent(db: Db, evidence: ReviewedEvidence, state: 'draft' | 'published' | 'withdrawn' = 'draft') {
  const { input } = evidence;
  const normalized: Db = {
    exec() { throw new Error('Verifier is read-only'); },
    prepare(sql) { return { all(...args) {
      const rows = db.prepare(sql).all(...args);
      if (sql.startsWith('SELECT * FROM ') && !rows.length) throw new Error(`Missing frozen cohort row: ${sql}`);
      return rows.map(row => {
        const copy = { ...row };
        if (sql.startsWith('SELECT * FROM content_releases WHERE')) copy.release_state = 'draft';
        if (sql.startsWith('SELECT * FROM content_quality_audits WHERE')) copy.release_state = 'approved';
        if (sql.startsWith('SELECT * FROM learning_lessons WHERE') || sql.startsWith('SELECT * FROM jlpt_practice_questions WHERE')) copy.is_published = 0;
        return copy;
      });
    } }; },
  };
  // Existing-row collision checks compare exact source, review, question, lesson, reference and audio fields.
  buildLearningPathV4DraftPlan(normalized, input);
  buildLearningPathV4LessonPlan(normalized, input);
  const version = esc(REVIEWED_V7.version), publicFlag = state === 'published' ? 1 : 0;
  const checks: [string, number][] = [
    [`SELECT count(*) n FROM content_releases WHERE id IN (${ids}) AND content_version=${version} AND manifest_sha256=${esc(REVIEWED_V7.draft)}${state === 'draft' ? " AND release_state IN ('draft','automated_checked','human_reviewed','preview','approved')" : ` AND release_state=${esc(state)}`}`,2],
    [`SELECT count(*) n FROM jlpt_practice_questions WHERE bank_version=${version}`,200],
    [`SELECT count(*) n FROM jlpt_practice_questions WHERE bank_version=${version} AND is_published=${publicFlag}`,200],
    [`SELECT count(*) n FROM topik_owner_authored_curriculum_items WHERE source_asset_id=${esc(`${REVIEWED_V7.group}-source`)}`,240],
    [`SELECT count(*) n FROM topik_owner_authored_curriculum_units WHERE source_asset_id=${esc(`${REVIEWED_V7.group}-source`)}`,240],
    [`SELECT count(*) n FROM learning_lessons WHERE version=${version} AND release_id IN (${ids}) AND is_published=${publicFlag}`,220],
    [`SELECT count(*) n FROM learning_lesson_entries WHERE lesson_version=${version}`,880],
    [`SELECT count(*) n FROM content_learning_links WHERE question_ref LIKE '%:lp7-%'`,440],
    [`SELECT count(*) n FROM content_quality_audits WHERE content_version=${version} AND release_state=${esc(state === 'draft' ? 'approved' : state)}`,440],
    [`SELECT count(*) n FROM content_release_quality_audit_links WHERE release_id IN (${ids})`,440],
    [`SELECT count(*) n FROM content_speech_bindings WHERE item_id LIKE 'lp7-%' AND language='ko' AND provider='google-browser' AND binding_state='ready'`,48],
    [`SELECT count(*) n FROM content_speech_bindings WHERE item_id LIKE 'lp7-%'`,48],
    [`SELECT count(*) n FROM content_audio_bindings WHERE item_id LIKE 'lp7-%'`,0],
  ];
  for (const [sql, expected] of checks) if (scalar(db, sql) !== expected) throw new Error(`Reviewed V7 ${state} count contract failed: ${sql}`);
  for (const [index, expected] of [200,240].entries()) {
    const id = esc(REVIEWED_V7.releases[index]!);
    if (scalar(db, `SELECT count(*) n FROM learning_lessons WHERE release_id=${id}`) !== expected / 2 || scalar(db, `SELECT count(*) n FROM content_release_quality_audit_links WHERE release_id=${id}`) !== expected) throw new Error('Per-track V7 counts mismatch');
    const linked = db.prepare(`SELECT a.content_id FROM content_release_quality_audit_links x JOIN content_quality_audits a ON a.id=x.audit_id WHERE x.release_id=${id} ORDER BY a.content_id`).all().map(r=>String(r.content_id));
    const expectedIds = input.bundle.items.filter(item=>item.track === (index===0 ? 'jlpt-ja' : 'topik-ko')).map(item=>item.id).sort();
    if (json(linked)!==json(expectedIds)) throw new Error('Exact quality audit membership mismatch');
  }
  if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Reviewed release FK failure');
  return { items: 440, lessons: 220, entries: 880, links: 440, audits: 440, speech: 48, state };
}

/** SQL precondition raises a CHECK failure without leaving a persistent sentinel row. */
function assertSql(predicate: string) {
  return `INSERT INTO content_release_gate_evidence(release_id,gate,gate_state,artifact_key,artifact_sha256,recorded_by) SELECT ${esc(REVIEWED_V7.releases[0])},'INVALID_ASSERTION','failed','evidence/assertion',${esc('0'.repeat(64))},'system' WHERE NOT (${predicate});`;
}

export function buildReviewedLearningReleaseControlPlan(db: Db, paths: ReviewedReleasePaths, target: ReleaseTarget) {
  const evidence = validateReviewedV7Evidence(paths, target);
  verifyReviewedLearningContent(db, evidence);
  const statements: string[] = [], { input } = evidence;
  const readyAt = Math.floor(Date.parse(String((evidence.report.operator_attestation as Row).recorded_at)) / 1000);
  const metadata = json({ schema: 'learning-path-v7-evidence-binding-v1', phase: target.phase, deployment: target,
    artifacts: evidence.evidence, reviews: evidence.artifacts.reviews, inventory: evidence.artifacts.inventory,
    draft_sha256: REVIEWED_V7.draft, source_evidence_sha256: REVIEWED_V7.source,
    concept_inventory_sha256: REVIEWED_V7.inventory, proof_scopes: evidence.report.proof_scopes });
  for (const id of REVIEWED_V7.releases) {
    statements.push(insert(db, 'content_release_sources', {
      release_id: id, source_code: REVIEWED_V7.group, source_type: 'self-authored',
      source_url: 'https://github.com/kordokrip/JLPT/tree/main/packages/db/src/content/learning-path-v7-2026-10-11',
      retrieved_at: '2026-10-11', source_sha256: REVIEWED_V7.source, license_id: 'LicenseRef-self-authored',
      license_url: 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md',
      allowed_use: 'self-authored personal learning; not official exam content', attribution_text: metadata,
      author: 'JLPT-TOPIK V7 item author', first_reviewer: input.reviews[0]!.reviewer_id, second_reviewer: input.reviews[1]!.reviewer_id,
      reviewed_at: '2026-10-11', first_review_status: 'signed', first_reviewed_at: '2026-10-11', second_review_status: 'signed', second_reviewed_at: '2026-10-11',
    }, ['release_id','source_code']));
    const jobs = { ingest: 'G0', validate: 'G2', ai_draft: 'G1', qa: 'G2', human_approval: 'G3', preview_candidate: 'G4' } as const;
    for (const [kind, gate] of Object.entries(jobs)) {
      const artifact = evidence.evidence[gate];
      statements.push(insert(db, 'content_release_jobs', { id: `${id}-${kind}`, release_id: id, job_kind: kind, job_state: 'succeeded',
        artifact_key: artifactKey(gate, artifact.sha256), artifact_sha256: artifact.sha256,
        idempotency_key: `crcp:v1:${id}:${kind}:${artifact.sha256}`, queue_attempts: 1 }, ['id']));
    }
    for (const [gate, artifact] of Object.entries(evidence.evidence)) statements.push(insert(db, 'content_release_gate_evidence', {
      release_id: id, gate, gate_state: 'passed', artifact_key: artifactKey(gate, artifact.sha256), artifact_sha256: artifact.sha256, recorded_by: gate === 'G3' || gate === 'G4' ? 'operator' : 'system',
    }, ['release_id','gate']));
  }
  for (const [from,to] of [['draft','automated_checked'],['automated_checked','human_reviewed'],['human_reviewed','preview'],['preview','approved']]) statements.push(`UPDATE content_releases SET release_state=${esc(to!)} WHERE id IN (${ids}) AND release_state=${esc(from!)};`);
  for (const id of REVIEWED_V7.releases) statements.push(insert(db, 'content_release_preview_candidates', {
    id: `${id}-preview`, release_id: id, candidate_state: 'ready', manifest_key: `evidence/manifest/${REVIEWED_V7.group}/${REVIEWED_V7.draft}/artifact.json`, manifest_sha256: REVIEWED_V7.draft, ready_at: readyAt,
  }, ['id']));
  statements.push(assertSql(`(SELECT count(*) FROM content_releases WHERE id IN (${ids}) AND release_state='approved' AND manifest_sha256=${esc(REVIEWED_V7.draft)})=2`));
  // This is the sole visibility commit; an AFTER trigger completes content/audit/lesson visibility in this statement.
  const publishSql = `UPDATE content_releases SET release_state='published',published_at=COALESCE(published_at,unixepoch()) WHERE id IN (${ids}) AND release_state='approved' AND (SELECT count(*) FROM content_releases WHERE id IN (${ids}) AND release_state='approved')=2;`;
  return { evidence, statements, publishSql };
}

export function verifyReviewedLearningPublished(db: Db, paths: ReviewedReleasePaths, target: ReleaseTarget) {
  const evidence = validateReviewedV7Evidence(paths, target);
  const counts = verifyReviewedLearningContent(db, evidence, 'published');
  for (const id of REVIEWED_V7.releases) {
    const sources = db.prepare('SELECT * FROM content_release_sources WHERE release_id=?').all(id);
    if (sources.length !== 1 || sources[0]!.source_sha256 !== REVIEWED_V7.source) throw new Error('Published source mismatch');
    const binding = JSON.parse(String(sources[0]!.attribution_text));
    if (json(binding.artifacts) !== json(evidence.evidence) || json(binding.reviews) !== json(evidence.artifacts.reviews) || binding.phase !== target.phase) throw new Error('Published evidence binding mismatch');
    for (const [gate, artifact] of Object.entries(evidence.evidence)) {
      const rows = db.prepare('SELECT * FROM content_release_gate_evidence WHERE release_id=? AND gate=?').all(id,gate);
      if (rows.length !== 1 || rows[0]!.gate_state !== 'passed' || rows[0]!.artifact_sha256 !== artifact.sha256 || rows[0]!.artifact_key !== artifactKey(gate,artifact.sha256)) throw new Error('Published G0-G4 mismatch');
    }
    const jobs = db.prepare('SELECT * FROM content_release_jobs WHERE release_id=?').all(id);
    const mapping = { ingest: 'G0', validate: 'G2', ai_draft: 'G1', qa: 'G2', human_approval: 'G3', preview_candidate: 'G4' } as const;
    if (jobs.length !== 6 || Object.entries(mapping).some(([kind,gate]) => {
      const matching = jobs.filter(j => j.job_kind === kind), artifact = evidence.evidence[gate];
      return matching.length !== 1 || matching[0]!.job_state !== 'succeeded' || matching[0]!.artifact_sha256 !== artifact.sha256 || matching[0]!.artifact_key !== artifactKey(gate,artifact.sha256) || matching[0]!.idempotency_key !== `crcp:v1:${id}:${kind}:${artifact.sha256}`;
    })) throw new Error('Published jobs mismatch');
    const preview = db.prepare('SELECT * FROM content_release_preview_candidates WHERE release_id=?').all(id);
    if (preview.length !== 1 || preview[0]!.candidate_state !== 'ready' || preview[0]!.manifest_sha256 !== REVIEWED_V7.draft) throw new Error('Published preview manifest mismatch');
    const req = db.prepare('SELECT * FROM content_release_quality_requirements WHERE release_id=?').all(id)[0];
    if (!req || req.validator_version !== LEARNING_PATH_VALIDATOR_VERSION || req.expected_audit_count !== (id === REVIEWED_V7.releases[0] ? 200 : 240)) throw new Error('Published quality requirement mismatch');
  }
  return { ...counts, publication_gate_evidence: true, phase: target.phase, remote_writes: 0 };
}

/** Local in-memory/new-temp callers only; target authorization remains outside this API. */
export function applyReviewedLearningRelease(db: Db, paths: ReviewedReleasePaths, target: ReleaseTarget) {
  if (target.phase !== 'local') throw new Error('SQLite apply only accepts local phase; remote target adapter required');
  db.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE');
  try {
    const states = db.prepare(`SELECT release_state FROM content_releases WHERE id IN (${ids})`).all();
    if (states.length === 2 && states.every(r => r.release_state === 'published')) {
      const result = verifyReviewedLearningPublished(db,paths,target); db.exec('COMMIT'); return { ...result, idempotent: true };
    }
    const plan = buildReviewedLearningReleaseControlPlan(db,paths,target);
    db.exec(plan.statements.join('\n')); db.exec(plan.publishSql);
    const result = verifyReviewedLearningPublished(db,paths,target);
    db.exec('COMMIT'); return { ...result, idempotent: false };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function reviewedLearningWithdrawSql() {
  // Existing schema has withdrawn, not rolled_back. Rollback records use withdrawn without deleting content/history.
  return `UPDATE content_releases SET release_state='withdrawn',withdrawn_at=unixepoch() WHERE id IN (${ids}) AND release_state='published';`;
}
