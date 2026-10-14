import { PREVIEW160_V3_MANIFEST_SHA256, PREVIEW160_V3_SOURCE_SHA256, PREVIEW160_V3_VALIDATOR_VERSION, PREVIEW160_V3_VERSION, type Preview160Paths, validatePreview160V3 } from '../ops/preview160-v3-quality.js';

export const PREVIEW160_V3_RELEASE_IDS = { N2: 'preview160-v3-n2-2026-10-12', N1: 'preview160-v3-n1-2026-10-12', TOPIK: 'preview160-v3-topik-2026-10-12' } as const;
export const PREVIEW160_V3_SOURCE_ASSET_ID = 'preview160-v3-2026-10-12-source';
type Row = { table: string; key: readonly string[]; value: Record<string, unknown> };
export type Preview160V3DraftPlan = { rows: readonly Row[]; counts: Record<string, number>; bankVersionMapping: Readonly<Record<'N2' | 'N1' | 'TOPIK', string>> };
type Db = { exec(sql: string): void; prepare(sql: string): { get(...values: unknown[]): Record<string, unknown> | undefined; run(...values: unknown[]): unknown; all(...values: unknown[]): Record<string, unknown>[] } };
const releaseVersion = (scope: string) => `${PREVIEW160_V3_VERSION}:${scope}`;
const review = (quality: ReturnType<typeof validatePreview160V3>, index: number) => quality.reviews[index] as Record<string, unknown>;

export function buildPreview160V3DraftPlan(paths?: Preview160Paths): Preview160V3DraftPlan {
  const q = validatePreview160V3(paths); if (!q.passed) throw new Error(`Preview160 v3 quality failed: ${q.errors.join('; ')}`);
  const a = review(q, 0), b = review(q, 1); const rows: Row[] = [];
  rows.push({ table: 'content_source_assets', key: ['id'], value: { id: PREVIEW160_V3_SOURCE_ASSET_ID, asset_kind: 'self-authored-fixture', source_url: 'repo://preview160-v3/source-derivative.json', license_id: 'self-authored-existing-facts', license_url: 'repo://preview160-v3/source-derivative.json', attribution_text: 'Self-authored personal study content; existing intake facts reused.', allowed_use: 'personal study draft only', source_sha256: PREVIEW160_V3_SOURCE_SHA256 } });
  const groups = [
    { scope: 'N2', release: PREVIEW160_V3_RELEASE_IDS.N2, track: 'jlpt-ja', type: 'jlpt-quiz', items: q.draft.jlpt.filter(x => x.level === 'N2') },
    { scope: 'N1', release: PREVIEW160_V3_RELEASE_IDS.N1, track: 'jlpt-ja', type: 'jlpt-quiz', items: q.draft.jlpt.filter(x => x.level === 'N1') },
    { scope: 'TOPIK', release: PREVIEW160_V3_RELEASE_IDS.TOPIK, track: 'topik-ko', type: 'topik-owner', items: q.draft.topik },
  ];
  for (const g of groups) {
    const cv = releaseVersion(g.scope);
    rows.push({ table: 'content_releases', key: ['id'], value: { id: g.release, learning_track: g.track, content_version: cv, release_state: 'draft', manifest_sha256: PREVIEW160_V3_MANIFEST_SHA256, parser_version: PREVIEW160_V3_VALIDATOR_VERSION } });
    rows.push({ table: 'content_release_quality_requirements', key: ['release_id'], value: { release_id: g.release, content_type: g.type, expected_audit_count: g.items.length, validator_version: PREVIEW160_V3_VALIDATOR_VERSION } });
    for (const item of g.items) {
      const audit = `quality-audit:${g.release}:${item.id}`;
      rows.push({ table: 'content_quality_audits', key: ['id'], value: { id: audit, learning_track: g.track, content_type: g.type, content_id: item.id, content_version: cv, evidence_sha256: PREVIEW160_V3_MANIFEST_SHA256, validator_version: PREVIEW160_V3_VALIDATOR_VERSION, automated_status: 'passed', author_review_status: 'signed', adversarial_review_status: 'signed', author_reviewer: a.reviewer_id, adversarial_reviewer: b.reviewer_id, release_state: 'approved', details_json: JSON.stringify({ draft_sha256: q.hashes.draft, source_sha256: q.hashes.source, review_a_sha256: q.hashes.review_a, review_b_sha256: q.hashes.review_b }), checked_at: '2026-10-12' } });
      rows.push({ table: 'content_release_quality_audit_links', key: ['release_id','audit_id'], value: { release_id: g.release, audit_id: audit } });
    }
  }
  // Frozen JSON uses one group version; the DB codec namespaces each release so
  // release/audit/question versions remain join-compatible under the schema's unique key.
  for (const item of q.draft.jlpt) rows.push({ table: 'jlpt_practice_questions', key: ['id'], value: { id: item.id, learning_track: 'jlpt-ja', level: item.level, mode: item.mode, skill: item.skill, difficulty: item.difficulty, prompt_ko: item.prompt.ko, prompt_ja: item.prompt.ja, prompt_en: item.prompt.en, choices_json: JSON.stringify(item.choices), answer_index: item.answer_index, explanation_ko: item.explanation.ko, explanation_ja: item.explanation.ja, explanation_en: item.explanation.en, audio_script_ja: item.audio_script_ja, source_code: PREVIEW160_V3_SOURCE_ASSET_ID, source_evidence_sha256: PREVIEW160_V3_SOURCE_SHA256, bank_version: releaseVersion(String(item.level)), is_published: 0 } });
  for (const item of q.draft.topik) {
    const unitId = `${item.id}:unit`, stable = `preview160:v3:topik:${item.grade}:${item.section}:${item.sequence}`;
    if (!item.title) throw new Error(`TOPIK item missing title: ${item.id}`);
    rows.push({ table: 'topik_owner_authored_curriculum_units', key: ['id'], value: { id: unitId, target_grade: item.grade, stable_ref: `${stable}:unit`, section: item.section, title_ko: item.title.ko, title_ja: item.title.ja, title_en: item.title.en, source_asset_id: PREVIEW160_V3_SOURCE_ASSET_ID } });
    if (!item.choices && !item.rubric) throw new Error(`TOPIK writing item missing rubric: ${item.id}`);
    const answer = item.choices ? { choices: item.choices.map((x)=>x.ko), choices_i18n: item.choices, answer_index: item.answer_index } : { rubric_ko:item.rubric!.ko,rubric_ja:item.rubric!.ja,rubric_en:item.rubric!.en,sample_answer_ko:item.explanation.ko.replace(/^예: /u,''),sample_answer_ja:item.explanation.ja.replace(/^例：/u,''),sample_answer_en:item.explanation.en.replace(/^Example: /u,'') };
    rows.push({ table: 'topik_owner_authored_curriculum_items', key: ['id'], value: { id: item.id, unit_id: unitId, target_grade: item.grade, stable_ref: stable, item_type: item.section, prompt_ko: item.prompt.ko, prompt_ja: item.prompt.ja, prompt_en: item.prompt.en, answer_json: JSON.stringify(answer), explanation_ko: item.explanation.ko, explanation_ja: item.explanation.ja, explanation_en: item.explanation.en, audio_required: item.section === 'listening' ? 1 : 0, audio_text_ko:item.audio_text_ko, source_asset_id: PREVIEW160_V3_SOURCE_ASSET_ID } });
    if (item.section === 'listening') {
      rows.push({ table: 'learning_content_stable_refs', key: ['stable_ref'], value: { stable_ref: stable, learning_track: 'topik-ko', item_type: 'topik-owner-item', item_id: item.id, level_tag: `grade-${item.grade}`, source_asset_id: PREVIEW160_V3_SOURCE_ASSET_ID } });
      rows.push({ table: 'content_speech_bindings', key: ['id'], value: { id: `speech:${stable}`, stable_ref: stable, item_type: 'topik-owner-item', item_id: item.id, language: 'ko', speech_role: 'listening', provider: 'google-browser', binding_state: 'ready', text_source: 'audio-script', unavailable_reason: null } });
    }
  }
  return { rows, counts: { source_assets:1, releases:3, requirements:3, audits:160, links:160, jlpt_questions:120, topik_units:40, topik_items:40, stable_refs:8, speech_bindings:8 }, bankVersionMapping: { N2: releaseVersion('N2'), N1: releaseVersion('N1'), TOPIK: releaseVersion('TOPIK') } };
}

export function applyPreview160V3Draft(db: Db, plan: Preview160V3DraftPlan): void {
  db.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE;');
  try {
    for (const row of plan.rows) {
      const where = row.key.map(k => `\`${k}\` IS ?`).join(' AND '), keys = Object.keys(row.value), expected = row.value;
      const existing = db.prepare(`SELECT ${keys.map(k=>`\`${k}\``).join(',')} FROM \`${row.table}\` WHERE ${where}`).get(...row.key.map(k=>expected[k]));
      if (existing) { for (const k of keys) if (existing[k] !== expected[k]) throw new Error(`Immutable collision ${row.table}.${row.key.map(x=>expected[x]).join('/')}.${k}`); continue; }
      db.prepare(`INSERT OR IGNORE INTO \`${row.table}\` (${keys.map(k=>`\`${k}\``).join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>expected[k]));
      const inserted = db.prepare(`SELECT ${keys.map(k=>`\`${k}\``).join(',')} FROM \`${row.table}\` WHERE ${where}`).get(...row.key.map(k=>expected[k]));
      if (!inserted || keys.some(k=>inserted[k] !== expected[k])) throw new Error(`Insert verification failed: ${row.table}`);
    }
    const fk = db.prepare('PRAGMA foreign_key_check').all(); if (fk.length) throw new Error(`foreign_key_check failed: ${fk.length}`);
    db.exec('COMMIT;');
  } catch (error) { db.exec('ROLLBACK;'); throw error; }
}
